const WebScrapingService = require('../services/webScrapingService');
const WebpageReading = require('../models/WebpageReading');
const WebpageAnalysis = require('../models/WebpageAnalysis');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

class WebScrapingController {
  constructor() {
    this.webScrapingService = new WebScrapingService();
    
    // Rate limiting for webpage reading
    this.readRateLimit = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 50, // 50 requests per IP per 15 minutes
      message: {
        error: 'Too many webpage reading requests. Please try again later.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    
    this.batchRateLimit = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // 10 batch requests per IP per hour
      message: {
        error: 'Too many batch reading requests. Please try again later.',
        retryAfter: '1 hour'
      }
    });
  }

  /**
   * Read single webpage
   * POST /api/web/read
   */
  async readWebpage(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { url, options = {} } = req.body;
      
      // Log request for monitoring
      console.log(`[WebScraping] Reading webpage: ${url} by user ${req.user.id}`);
      
      const result = await this.webScrapingService.readWebpage(url, {
        includeImages: options.includeImages || false,
        includeLinks: options.includeLinks !== false, // Default true
        maxContentLength: Math.min(options.maxContentLength || 10000, 50000), // Cap at 50k
        followRedirects: options.followRedirects !== false // Default true
      });
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
          statusCode: result.statusCode
        });
      }
      
      // Generate content summary
      const summary = this.webScrapingService.generateSummary(result.data);
      
      // Store reading history in database
      const readingRecord = await this.storeReadingHistory(req.user.id, url, result.data, summary);
      
      res.json({
        success: true,
        data: {
          ...result.data,
          summary
        },
        meta: {
          responseTime: result.responseTime,
          statusCode: result.statusCode,
          readAt: new Date(),
          userId: req.user.id
        }
      });
      
    } catch (error) {
      console.error('Error in readWebpage:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while reading webpage'
      });
    }
  }

  /**
   * Read multiple webpages in batch
   * POST /api/web/batch-read
   */
  async batchReadWebpages(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { urls, options = {} } = req.body;
      
      if (!Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'URLs array is required and cannot be empty'
        });
      }
      
      if (urls.length > 10) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 10 URLs allowed per batch request'
        });
      }
      
      console.log(`[WebScraping] Batch reading ${urls.length} webpages by user ${req.user.id}`);
      
      const results = await this.webScrapingService.batchReadWebpages(urls, {
        concurrency: Math.min(options.concurrency || 3, 5), // Cap at 5
        failFast: options.failFast || false,
        includeImages: options.includeImages || false,
        includeLinks: options.includeLinks !== false,
        maxContentLength: Math.min(options.maxContentLength || 10000, 50000)
      });
      
      // Generate summaries for successful results
      const processedResults = results.map(result => {
        if (result.success && result.data) {
          const summary = this.webScrapingService.generateSummary(result.data);
          return {
            ...result,
            data: {
              ...result.data,
              summary
            }
          };
        }
        return result;
      });
      
      // Store batch reading history in database
      const batchId = uuidv4();
      await this.storeBatchReadingHistory(req.user.id, urls, processedResults, batchId);
      
      const successCount = processedResults.filter(r => r.success).length;
      const failureCount = processedResults.length - successCount;
      
      res.json({
        success: true,
        data: processedResults,
        meta: {
          totalRequests: urls.length,
          successCount,
          failureCount,
          readAt: new Date(),
          userId: req.user.id
        }
      });
      
    } catch (error) {
      console.error('Error in batchReadWebpages:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while batch reading webpages'
      });
    }
  }

  /**
   * Get reading history for user
   * GET /api/web/history
   */
  async getReadingHistory(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        search,
        contentType,
        tags,
        isFavorite,
        dateRange,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;
      
      const userId = req.user.id;
      const options = {
        query: search,
        contentType,
        tags: tags ? tags.split(',') : undefined,
        isFavorite: isFavorite === 'true' ? true : isFavorite === 'false' ? false : undefined,
        dateRange: dateRange ? JSON.parse(dateRange) : undefined,
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100), // Cap at 100
        sortBy,
        sortOrder: sortOrder === 'desc' ? -1 : 1
      };
      
      const results = await WebpageReading.searchReadings(userId, options);
      const data = results[0]?.data || [];
      const totalCount = results[0]?.totalCount?.[0]?.count || 0;
      const totalPages = Math.ceil(totalCount / options.limit);
      
      res.json({
        success: true,
        data,
        meta: {
          page: options.page,
          limit: options.limit,
          total: totalCount,
          pages: totalPages,
          hasNext: options.page < totalPages,
          hasPrev: options.page > 1
        }
      });
      
    } catch (error) {
      console.error('Error in getReadingHistory:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while fetching reading history'
      });
    }
  }

  /**
   * Analyze webpage content with AI
   * POST /api/web/analyze
   */
  async analyzeWebpageContent(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { url, analysisType = 'general', customPrompt } = req.body;
      
      console.log(`[WebScraping] Analyzing webpage: ${url} by user ${req.user.id}`);
      
      // First read the webpage
      const readResult = await this.webScrapingService.readWebpage(url);
      
      if (!readResult.success) {
        return res.status(400).json({
          success: false,
          error: readResult.error,
          statusCode: readResult.statusCode
        });
      }
      
      // Then analyze with AI
      const aiService = require('../services/aiService');
      
      let analysisPrompt;
      switch (analysisType) {
        case 'summary':
          analysisPrompt = `Please provide a comprehensive summary of the following webpage content:\n\nTitle: ${readResult.data.title}\nContent: ${readResult.data.content.slice(0, 5000)}`;
          break;
        case 'key_points':
          analysisPrompt = `Extract the key points and main insights from this webpage:\n\nTitle: ${readResult.data.title}\nContent: ${readResult.data.content.slice(0, 5000)}`;
          break;
        case 'action_items':
          analysisPrompt = `Based on this webpage content, identify actionable items and recommendations:\n\nTitle: ${readResult.data.title}\nContent: ${readResult.data.content.slice(0, 5000)}`;
          break;
        case 'custom':
          if (!customPrompt) {
            return res.status(400).json({
              success: false,
              error: 'Custom prompt is required for custom analysis type'
            });
          }
          analysisPrompt = `${customPrompt}\n\nWebpage content:\nTitle: ${readResult.data.title}\nContent: ${readResult.data.content.slice(0, 5000)}`;
          break;
        default:
          analysisPrompt = `Analyze the following webpage and provide insights about its content, purpose, and main topics:\n\nTitle: ${readResult.data.title}\nContent: ${readResult.data.content.slice(0, 5000)}`;
      }
      
      const analysis = await aiService.chat([
        { role: 'user', content: analysisPrompt }
      ]);
      
      // Store analysis result in database
      const analysisRecord = await this.storeAnalysisHistory(req.user.id, url, analysisType, analysis, readResult.data, customPrompt);
      
      res.json({
        success: true,
        data: {
          webpage: {
            url,
            title: readResult.data.title,
            summary: readResult.data.description,
            wordCount: readResult.data.wordCount
          },
          analysis: {
            type: analysisType,
            result: analysis,
            generatedAt: new Date()
          }
        },
        meta: {
          userId: req.user.id,
          responseTime: readResult.responseTime
        }
      });
      
    } catch (error) {
      console.error('Error in analyzeWebpageContent:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while analyzing webpage content'
      });
    }
  }

  /**
   * Store reading history in database
   */
  async storeReadingHistory(userId, url, content, summary) {
    try {
      // Check if we already have a recent reading of this URL
      const existingReading = await WebpageReading.findByUrl(userId, url);
      
      if (existingReading && 
          (Date.now() - existingReading.createdAt.getTime()) < 24 * 60 * 60 * 1000) {
        // Update existing reading if it's less than 24 hours old
        existingReading.content = content.content;
        existingReading.summary = summary;
        existingReading.metadata.extractedAt = content.extractedAt;
        await existingReading.save();
        console.log(`[WebScraping] Updated existing reading record for user ${userId}: ${url}`);
        return existingReading;
      } else {
        // Create new reading record
        const readingRecord = new WebpageReading({
          userId,
          url,
          title: content.title,
          description: content.description,
          content: content.content,
          summary,
          headings: content.headings || [],
          links: content.links || [],
          images: content.images || [],
          metadata: {
            statusCode: 200,
            responseTime: 0,
            extractedAt: content.extractedAt,
            sourceUrl: url,
            truncated: content.truncated || false
          },
          readingType: 'single'
        });
        
        await readingRecord.save();
        console.log(`[WebScraping] Created new reading record for user ${userId}: ${url}`);
        return readingRecord;
      }
    } catch (error) {
      console.error('Error storing reading history:', error);
      throw error;
    }
  }

  /**
   * Store batch reading history
   */
  async storeBatchReadingHistory(userId, urls, results, batchId) {
    try {
      const readingRecords = [];
      
      for (const result of results) {
        if (result.success && result.data) {
          const summary = this.webScrapingService.generateSummary(result.data);
          
          const readingRecord = new WebpageReading({
            userId,
            url: result.url,
            title: result.data.title,
            description: result.data.description,
            content: result.data.content,
            summary,
            headings: result.data.headings || [],
            links: result.data.links || [],
            images: result.data.images || [],
            metadata: {
              statusCode: result.statusCode || 200,
              responseTime: result.responseTime || 0,
              extractedAt: result.data.extractedAt,
              sourceUrl: result.url,
              truncated: result.data.truncated || false
            },
            readingType: 'batch',
            batchId
          });
          
          readingRecords.push(readingRecord);
        }
      }
      
      if (readingRecords.length > 0) {
        await WebpageReading.insertMany(readingRecords);
        console.log(`[WebScraping] Stored ${readingRecords.length} batch reading records for user ${userId}`);
      }
      
      return readingRecords;
    } catch (error) {
      console.error('Error storing batch reading history:', error);
      throw error;
    }
  }

  /**
   * Store analysis history
   */
  async storeAnalysisHistory(userId, url, analysisType, analysis, webpageData, customPrompt = null) {
    try {
      // First, find or create the webpage reading record
      let webpageReading = await WebpageReading.findByUrl(userId, url);
      
      if (!webpageReading) {
        const summary = this.webScrapingService.generateSummary(webpageData);
        webpageReading = new WebpageReading({
          userId,
          url,
          title: webpageData.title,
          description: webpageData.description,
          content: webpageData.content,
          summary,
          headings: webpageData.headings || [],
          links: webpageData.links || [],
          images: webpageData.images || [],
          metadata: {
            statusCode: 200,
            responseTime: 0,
            extractedAt: webpageData.extractedAt,
            sourceUrl: url
          },
          readingType: 'single'
        });
        
        await webpageReading.save();
      }
      
      // Create analysis record
      const analysisRecord = new WebpageAnalysis({
        userId,
        webpageReadingId: webpageReading._id,
        url,
        analysisType,
        customPrompt,
        analysisResult: analysis,
        webpageSnapshot: {
          title: webpageData.title,
          description: webpageData.description,
          wordCount: webpageData.wordCount,
          contentType: webpageReading.summary?.contentType || 'general'
        },
        aiMetadata: {
          provider: 'default', // This would come from the AI service
          processingTime: Date.now() // Approximate
        },
        extractedInsights: this.extractInsightsFromAnalysis(analysis, analysisType)
      });
      
      await analysisRecord.save();
      console.log(`[WebScraping] Stored analysis record for user ${userId}: ${url} (${analysisType})`);
      return analysisRecord;
    } catch (error) {
      console.error('Error storing analysis history:', error);
      throw error;
    }
  }

  /**
   * Validation middleware for reading single webpage
   */
  static validateReadWebpage() {
    return [
      body('url')
        .isURL({ protocols: ['http', 'https'], require_protocol: true })
        .withMessage('Valid URL is required')
        .isLength({ max: 2048 })
        .withMessage('URL too long (max 2048 characters)'),
      body('options.includeImages')
        .optional()
        .isBoolean()
        .withMessage('includeImages must be a boolean'),
      body('options.includeLinks')
        .optional()
        .isBoolean()
        .withMessage('includeLinks must be a boolean'),
      body('options.maxContentLength')
        .optional()
        .isInt({ min: 1000, max: 50000 })
        .withMessage('maxContentLength must be between 1000 and 50000')
    ];
  }

  /**
   * Validation middleware for batch reading
   */
  static validateBatchRead() {
    return [
      body('urls')
        .isArray({ min: 1, max: 10 })
        .withMessage('urls must be an array with 1-10 items'),
      body('urls.*')
        .isURL({ protocols: ['http', 'https'], require_protocol: true })
        .withMessage('Each URL must be valid')
        .isLength({ max: 2048 })
        .withMessage('URL too long (max 2048 characters)'),
      body('options.concurrency')
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage('concurrency must be between 1 and 5')
    ];
  }

  /**
   * Validation middleware for analyzing webpage
   */
  static validateAnalyzeWebpage() {
    return [
      body('url')
        .isURL({ protocols: ['http', 'https'], require_protocol: true })
        .withMessage('Valid URL is required')
        .isLength({ max: 2048 })
        .withMessage('URL too long (max 2048 characters)'),
      body('analysisType')
        .optional()
        .isIn(['general', 'summary', 'key_points', 'action_items', 'custom'])
        .withMessage('Invalid analysis type'),
      body('customPrompt')
        .optional()
        .isLength({ min: 10, max: 1000 })
        .withMessage('Custom prompt must be between 10 and 1000 characters')
    ];
  }

  /**
   * Extract insights from AI analysis result
   */
  extractInsightsFromAnalysis(analysisResult, analysisType) {
    const insights = {
      keyTopics: [],
      sentiment: 'neutral',
      actionItems: [],
      relevantQuotes: [],
      estimatedComplexity: 'medium'
    };
    
    // Simple keyword extraction for topics
    const topicKeywords = analysisResult.match(/(?:topic|subject|theme|focus):\s*([^\n\.]+)/gi);
    if (topicKeywords) {
      insights.keyTopics = topicKeywords
        .map(match => match.replace(/^.*?:\s*/, '').trim())
        .slice(0, 5);
    }
    
    // Extract action items for action_items type
    if (analysisType === 'action_items') {
      const actionPatterns = [
        /[-•]\s*([^\n]+)/g,
        /\d+\.\s*([^\n]+)/g,
        /(?:action|todo|task|should):\s*([^\n\.]+)/gi
      ];
      
      actionPatterns.forEach(pattern => {
        const matches = analysisResult.match(pattern);
        if (matches) {
          insights.actionItems.push(...matches.map(match => 
            match.replace(/^[-•\d\.\s]*|^.*?:\s*/g, '').trim()
          ).slice(0, 10));
        }
      });
    }
    
    // Basic sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'positive', 'success', 'benefit'];
    const negativeWords = ['bad', 'poor', 'negative', 'problem', 'issue', 'concern'];
    
    const lowerAnalysis = analysisResult.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerAnalysis.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerAnalysis.includes(word)).length;
    
    if (positiveCount > negativeCount + 1) insights.sentiment = 'positive';
    else if (negativeCount > positiveCount + 1) insights.sentiment = 'negative';
    else if (positiveCount > 0 && negativeCount > 0) insights.sentiment = 'mixed';
    
    // Estimate complexity based on length and technical terms
    const wordCount = analysisResult.split(/\s+/).length;
    const technicalTerms = (analysisResult.match(/\b(?:technical|complex|advanced|sophisticated|intricate|detailed)\b/gi) || []).length;
    
    if (wordCount > 500 || technicalTerms > 3) {
      insights.estimatedComplexity = 'high';
    } else if (wordCount < 200 && technicalTerms === 0) {
      insights.estimatedComplexity = 'low';
    }
    
    return insights;
  }

  /**
   * Get analysis history for user
   * GET /api/web/analysis-history
   */
  async getAnalysisHistory(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        search,
        analysisType,
        tags,
        isBookmarked,
        minRating,
        dateRange,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        includeShared = false
      } = req.query;
      
      const userId = req.user.id;
      const options = {
        query: search,
        analysisType,
        tags: tags ? tags.split(',') : undefined,
        isBookmarked: isBookmarked === 'true' ? true : isBookmarked === 'false' ? false : undefined,
        minRating: minRating ? parseInt(minRating) : undefined,
        dateRange: dateRange ? JSON.parse(dateRange) : undefined,
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
        sortBy,
        sortOrder: sortOrder === 'desc' ? -1 : 1,
        includeShared: includeShared === 'true'
      };
      
      const results = await WebpageAnalysis.searchAnalyses(userId, options);
      const data = results[0]?.data || [];
      const totalCount = results[0]?.totalCount?.[0]?.count || 0;
      const aggregations = results[0]?.aggregations?.[0] || {};
      
      res.json({
        success: true,
        data,
        meta: {
          page: options.page,
          limit: options.limit,
          total: totalCount,
          pages: Math.ceil(totalCount / options.limit),
          aggregations
        }
      });
      
    } catch (error) {
      console.error('Error in getAnalysisHistory:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while fetching analysis history'
      });
    }
  }

  /**
   * Get reading and analysis statistics
   * GET /api/web/stats
   */
  async getStats(req, res) {
    try {
      const { timeRange = 30 } = req.query;
      const userId = req.user.id;
      
      const [readingStats, analysisStats] = await Promise.all([
        WebpageReading.getReadingStats(userId, parseInt(timeRange)),
        WebpageAnalysis.getAnalysisStats(userId, parseInt(timeRange))
      ]);
      
      res.json({
        success: true,
        data: {
          reading: readingStats[0] || {},
          analysis: analysisStats[0] || {},
          timeRange: parseInt(timeRange),
          generatedAt: new Date()
        }
      });
      
    } catch (error) {
      console.error('Error in getStats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while fetching statistics'
      });
    }
  }
}

module.exports = WebScrapingController;