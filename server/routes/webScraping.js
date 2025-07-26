const express = require('express');
const WebScrapingController = require('../controllers/webScrapingController');
const auth = require('../middleware/auth');
const router = express.Router();

// Initialize controller
const webScrapingController = new WebScrapingController();

/**
 * @swagger
 * components:
 *   schemas:
 *     WebpageContent:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           description: Webpage title
 *         description:
 *           type: string
 *           description: Meta description
 *         content:
 *           type: string
 *           description: Main content text
 *         headings:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               level:
 *                 type: integer
 *               text:
 *                 type: string
 *         links:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *               text:
 *                 type: string
 *               title:
 *                 type: string
 *         images:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *               alt:
 *                 type: string
 *               title:
 *                 type: string
 *         wordCount:
 *           type: integer
 *         extractedAt:
 *           type: string
 *           format: date-time
 *         sourceUrl:
 *           type: string
 *         summary:
 *           type: object
 *           properties:
 *             keySentences:
 *               type: array
 *               items:
 *                 type: string
 *             mainTopics:
 *               type: array
 *               items:
 *                 type: string
 *             linkCount:
 *               type: integer
 *             estimatedReadTime:
 *               type: integer
 *             contentType:
 *               type: string
 *             summary:
 *               type: string
 */

/**
 * @swagger
 * /api/web/read:
 *   post:
 *     summary: Read single webpage content
 *     tags: [Web Scraping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/article"
 *               options:
 *                 type: object
 *                 properties:
 *                   includeImages:
 *                     type: boolean
 *                     default: false
 *                   includeLinks:
 *                     type: boolean
 *                     default: true
 *                   maxContentLength:
 *                     type: integer
 *                     minimum: 1000
 *                     maximum: 50000
 *                     default: 10000
 *                   followRedirects:
 *                     type: boolean
 *                     default: true
 *     responses:
 *       200:
 *         description: Webpage content successfully extracted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/WebpageContent'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     responseTime:
 *                       type: integer
 *                     statusCode:
 *                       type: integer
 *                     readAt:
 *                       type: string
 *                       format: date-time
 *                     userId:
 *                       type: string
 *       400:
 *         description: Invalid URL or request parameters
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post('/read', 
  auth,
  webScrapingController.readRateLimit,
  WebScrapingController.validateReadWebpage(),
  (req, res) => webScrapingController.readWebpage(req, res)
);

/**
 * @swagger
 * /api/web/batch-read:
 *   post:
 *     summary: Read multiple webpages in batch
 *     tags: [Web Scraping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - urls
 *             properties:
 *               urls:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 10
 *                 items:
 *                   type: string
 *                   format: uri
 *                 example: ["https://example.com/page1", "https://example.com/page2"]
 *               options:
 *                 type: object
 *                 properties:
 *                   concurrency:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 5
 *                     default: 3
 *                   failFast:
 *                     type: boolean
 *                     default: false
 *                   includeImages:
 *                     type: boolean
 *                     default: false
 *                   includeLinks:
 *                     type: boolean
 *                     default: true
 *                   maxContentLength:
 *                     type: integer
 *                     minimum: 1000
 *                     maximum: 50000
 *                     default: 10000
 *     responses:
 *       200:
 *         description: Batch webpage reading completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       url:
 *                         type: string
 *                       index:
 *                         type: integer
 *                       success:
 *                         type: boolean
 *                       data:
 *                         $ref: '#/components/schemas/WebpageContent'
 *                       error:
 *                         type: string
 *                 meta:
 *                   type: object
 *                   properties:
 *                     totalRequests:
 *                       type: integer
 *                     successCount:
 *                       type: integer
 *                     failureCount:
 *                       type: integer
 *                     readAt:
 *                       type: string
 *                       format: date-time
 *                     userId:
 *                       type: string
 *       400:
 *         description: Invalid URLs or request parameters
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post('/batch-read',
  auth,
  webScrapingController.batchRateLimit,
  WebScrapingController.validateBatchRead(),
  (req, res) => webScrapingController.batchReadWebpages(req, res)
);

/**
 * @swagger
 * /api/web/analyze:
 *   post:
 *     summary: Analyze webpage content with AI
 *     tags: [Web Scraping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/article"
 *               analysisType:
 *                 type: string
 *                 enum: [general, summary, key_points, action_items, custom]
 *                 default: general
 *               customPrompt:
 *                 type: string
 *                 description: Required when analysisType is 'custom'
 *                 minLength: 10
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: Webpage content analyzed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     webpage:
 *                       type: object
 *                       properties:
 *                         url:
 *                           type: string
 *                         title:
 *                           type: string
 *                         summary:
 *                           type: string
 *                         wordCount:
 *                           type: integer
 *                     analysis:
 *                       type: object
 *                       properties:
 *                         type:
 *                           type: string
 *                         result:
 *                           type: string
 *                         generatedAt:
 *                           type: string
 *                           format: date-time
 *                 meta:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     responseTime:
 *                       type: integer
 *       400:
 *         description: Invalid URL or analysis parameters
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post('/analyze',
  auth,
  webScrapingController.readRateLimit,
  WebScrapingController.validateAnalyzeWebpage(),
  (req, res) => webScrapingController.analyzeWebpageContent(req, res)
);

/**
 * @swagger
 * /api/web/history:
 *   get:
 *     summary: Get webpage reading history
 *     tags: [Web Scraping]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in URL or title
 *     responses:
 *       200:
 *         description: Reading history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       url:
 *                         type: string
 *                       title:
 *                         type: string
 *                       readAt:
 *                         type: string
 *                         format: date-time
 *                       contentType:
 *                         type: string
 *                       wordCount:
 *                         type: integer
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       500:
 *         description: Internal server error
 */
router.get('/history',
  auth,
  (req, res) => webScrapingController.getReadingHistory(req, res)
);

/**
 * @swagger
 * /api/web/analysis-history:
 *   get:
 *     summary: Get AI analysis history
 *     tags: [Web Scraping]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: analysisType
 *         schema:
 *           type: string
 *           enum: [general, summary, key_points, action_items, custom]
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *           description: Comma-separated list of tags
 *       - in: query
 *         name: isBookmarked
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: includeShared
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: Analysis history retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/analysis-history',
  auth,
  (req, res) => webScrapingController.getAnalysisHistory(req, res)
);

/**
 * @swagger
 * /api/web/stats:
 *   get:
 *     summary: Get reading and analysis statistics
 *     tags: [Web Scraping]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 30
 *         description: Number of days to include in statistics
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     reading:
 *                       type: object
 *                     analysis:
 *                       type: object
 *                     timeRange:
 *                       type: integer
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 *       500:
 *         description: Internal server error
 */
router.get('/stats',
  auth,
  (req, res) => webScrapingController.getStats(req, res)
);

/**
 * @swagger
 * /api/web/test:
 *   get:
 *     summary: Test webpage reading functionality
 *     tags: [Web Scraping]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Test endpoint successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Web scraping service is operational"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/test', auth, (req, res) => {
  res.json({
    success: true,
    message: 'Web scraping service is operational',
    timestamp: new Date(),
    features: [
      'Single webpage reading',
      'Batch webpage reading',
      'AI-powered content analysis',
      'Content summarization',
      'Reading history tracking'
    ]
  });
});

module.exports = router;