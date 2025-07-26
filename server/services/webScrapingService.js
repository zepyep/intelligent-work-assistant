const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const rateLimit = require('express-rate-limit');

class WebScrapingService {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    this.timeout = 10000; // 10 seconds
    this.maxContentLength = 5 * 1024 * 1024; // 5MB
    
    // Rate limiting for external requests
    this.rateLimiter = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 30, // 30 requests per minute
      message: 'Too many webpage reading requests'
    });
  }

  /**
   * Validate URL format and domain
   * @param {string} url - URL to validate
   * @returns {boolean} - Whether URL is valid
   */
  validateUrl(url) {
    try {
      const parsedUrl = new URL(url);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return false;
      }
      
      // Block local/private IP ranges for security
      const hostname = parsedUrl.hostname;
      const blockedPatterns = [
        /^127\./,           // localhost
        /^10\./,            // private class A
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // private class B
        /^192\.168\./,      // private class C
        /^169\.254\./,      // link-local
        /^0\./,             // invalid range
        /^::1$/,            // IPv6 localhost
        /^fc00:/,           // IPv6 private
        /^fe80:/,           // IPv6 link-local
      ];
      
      return !blockedPatterns.some(pattern => pattern.test(hostname));
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract text content from HTML
   * @param {string} html - HTML content
   * @param {string} url - Original URL for context
   * @returns {object} - Extracted content
   */
  extractContent(html, url) {
    const $ = cheerio.load(html);
    
    // Remove script and style elements
    $('script, style, nav, footer, aside, .advertisement, .ad, .ads').remove();
    
    // Extract metadata
    const title = $('title').text() || $('h1').first().text() || 'No title';
    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || '';
    
    // Extract main content
    let mainContent = '';
    
    // Try to find main content area
    const contentSelectors = [
      'main',
      'article', 
      '[role="main"]',
      '.content',
      '.main-content',
      '#content',
      '#main'
    ];
    
    let contentFound = false;
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length && element.text().trim().length > 200) {
        mainContent = element.text();
        contentFound = true;
        break;
      }
    }
    
    // Fallback: extract from body
    if (!contentFound) {
      mainContent = $('body').text();
    }
    
    // Clean up whitespace
    mainContent = mainContent.replace(/\s+/g, ' ').trim();
    
    // Extract headings for structure
    const headings = [];
    $('h1, h2, h3, h4, h5, h6').each((_, elem) => {
      const heading = $(elem);
      headings.push({
        level: parseInt(heading.prop('tagName').charAt(1)),
        text: heading.text().trim()
      });
    });
    
    // Extract links
    const links = [];
    $('a[href]').each((_, elem) => {
      const link = $(elem);
      const href = link.attr('href');
      const text = link.text().trim();
      
      if (href && text && href.length < 200) {
        try {
          const absoluteUrl = new URL(href, url).href;
          links.push({
            url: absoluteUrl,
            text: text,
            title: link.attr('title') || ''
          });
        } catch (e) {
          // Skip invalid URLs
        }
      }
    });
    
    // Extract images
    const images = [];
    $('img[src]').each((_, elem) => {
      const img = $(elem);
      const src = img.attr('src');
      const alt = img.attr('alt') || '';
      
      if (src) {
        try {
          const absoluteUrl = new URL(src, url).href;
          images.push({
            url: absoluteUrl,
            alt: alt,
            title: img.attr('title') || ''
          });
        } catch (e) {
          // Skip invalid URLs
        }
      }
    });
    
    return {
      title: title.slice(0, 200),
      description: description.slice(0, 500),
      content: mainContent.slice(0, 10000), // Limit content length
      headings: headings.slice(0, 20),
      links: links.slice(0, 50),
      images: images.slice(0, 20),
      wordCount: mainContent.split(/\s+/).length,
      extractedAt: new Date(),
      sourceUrl: url
    };
  }

  /**
   * Read and analyze webpage content
   * @param {string} url - URL to read
   * @param {object} options - Reading options
   * @returns {Promise<object>} - Extracted content and analysis
   */
  async readWebpage(url, options = {}) {
    const {
      includeImages = false,
      includeLinks = true,
      maxContentLength = 10000,
      followRedirects = true
    } = options;

    if (!this.validateUrl(url)) {
      throw new Error('Invalid or unsafe URL provided');
    }

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: this.timeout,
        maxContentLength: this.maxContentLength,
        maxRedirects: followRedirects ? 5 : 0,
        validateStatus: (status) => status < 400
      });

      const contentType = response.headers['content-type'] || '';
      if (!contentType.includes('text/html')) {
        throw new Error(`Unsupported content type: ${contentType}`);
      }

      const extracted = this.extractContent(response.data, url);
      
      // Filter content based on options
      if (!includeImages) {
        delete extracted.images;
      }
      
      if (!includeLinks) {
        delete extracted.links;
      }
      
      // Limit content length
      if (extracted.content.length > maxContentLength) {
        extracted.content = extracted.content.slice(0, maxContentLength) + '...';
        extracted.truncated = true;
      }
      
      return {
        success: true,
        data: extracted,
        responseTime: response.responseTime || 0,
        statusCode: response.status
      };
      
    } catch (error) {
      console.error('Error reading webpage:', error.message);
      
      let errorMessage = 'Failed to read webpage';
      
      if (error.code === 'ENOTFOUND') {
        errorMessage = 'Website not found or unreachable';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Request timeout - website is taking too long to respond';
      } else if (error.response) {
        errorMessage = `Website returned error: ${error.response.status} ${error.response.statusText}`;
      } else if (error.message.includes('content-type')) {
        errorMessage = 'URL does not point to a readable webpage';
      }
      
      return {
        success: false,
        error: errorMessage,
        statusCode: error.response?.status || 0
      };
    }
  }

  /**
   * Extract text from multiple URLs in batch
   * @param {Array<string>} urls - URLs to process
   * @param {object} options - Processing options
   * @returns {Promise<Array>} - Results for each URL
   */
  async batchReadWebpages(urls, options = {}) {
    const { concurrency = 3, failFast = false } = options;
    
    if (!Array.isArray(urls) || urls.length === 0) {
      throw new Error('URLs array is required and cannot be empty');
    }
    
    if (urls.length > 10) {
      throw new Error('Maximum 10 URLs allowed per batch request');
    }
    
    const results = [];
    const chunks = [];
    
    // Create chunks for concurrency control
    for (let i = 0; i < urls.length; i += concurrency) {
      chunks.push(urls.slice(i, i + concurrency));
    }
    
    for (const chunk of chunks) {
      const promises = chunk.map(async (url, index) => {
        try {
          const result = await this.readWebpage(url, options);
          return { url, index: results.length + index, ...result };
        } catch (error) {
          const errorResult = {
            url,
            index: results.length + index,
            success: false,
            error: error.message
          };
          
          if (failFast) {
            throw error;
          }
          
          return errorResult;
        }
      });
      
      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults);
      
      // Small delay between chunks to be respectful
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return results;
  }

  /**
   * Generate summary of webpage content
   * @param {object} extractedContent - Previously extracted content
   * @returns {object} - Content summary
   */
  generateSummary(extractedContent) {
    const { title, content, headings, links, wordCount } = extractedContent;
    
    // Extract key sentences (first sentence, sentences with numbers, etc.)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const keySentences = [];
    
    if (sentences.length > 0) {
      keySentences.push(sentences[0]); // First sentence
      
      // Find sentences with numbers or important keywords
      const importantKeywords = ['important', 'key', 'main', 'significant', 'major', 'critical'];
      sentences.forEach(sentence => {
        if (sentence.match(/\d+/) || 
            importantKeywords.some(keyword => 
              sentence.toLowerCase().includes(keyword)
            )) {
          keySentences.push(sentence);
        }
      });
    }
    
    // Extract main topics from headings
    const mainTopics = headings
      .filter(h => h.level <= 3)
      .map(h => h.text)
      .slice(0, 5);
    
    return {
      title,
      keySentences: keySentences.slice(0, 3).map(s => s.trim()),
      mainTopics,
      linkCount: links?.length || 0,
      wordCount,
      estimatedReadTime: Math.ceil(wordCount / 200), // Assuming 200 words per minute
      contentType: this.classifyContent(content, headings),
      summary: keySentences.slice(0, 2).join('. ').slice(0, 300)
    };
  }

  /**
   * Classify content type based on content analysis
   * @param {string} content - Page content
   * @param {Array} headings - Page headings
   * @returns {string} - Content type classification
   */
  classifyContent(content, headings) {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('buy') && lowerContent.includes('price')) {
      return 'ecommerce';
    }
    
    if (lowerContent.includes('how to') || lowerContent.includes('tutorial')) {
      return 'tutorial';
    }
    
    if (lowerContent.includes('published') && lowerContent.includes('author')) {
      return 'article';
    }
    
    if (headings.filter(h => h.level === 1).length > 3) {
      return 'documentation';
    }
    
    if (lowerContent.includes('about us') || lowerContent.includes('contact')) {
      return 'corporate';
    }
    
    return 'general';
  }
}

module.exports = WebScrapingService;