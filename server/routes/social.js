const express = require('express');
const socialController = require('../controllers/socialController');
const { protect } = require('../middleware/auth');
const multer = require('multer');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Configure multer for resume uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'server/uploads/documents/');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'resume-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for resumes
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'), false);
    }
  }
});

/**
 * @swagger
 * tags:
 *   name: Social
 *   description: Social networking and collaboration features
 */

/**
 * @swagger
 * /api/social/profile:
 *   get:
 *     summary: Get user's social profile
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Social profile retrieved successfully
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
 *                     profile:
 *                       type: object
 *                     socialSettings:
 *                       type: object
 *                     collaborationPreferences:
 *                       type: object
 *       404:
 *         description: Profile not found
 *       500:
 *         description: Internal server error
 */
router.get('/profile', socialController.getSocialProfile);

/**
 * @swagger
 * /api/social/profile:
 *   put:
 *     summary: Update user's social profile
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               profile:
 *                 type: object
 *               socialSettings:
 *                 type: object
 *               collaborationPreferences:
 *                 type: object
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Internal server error
 */
router.put('/profile', socialController.updateSocialProfile);

/**
 * @swagger
 * /api/social/resume/analyze:
 *   post:
 *     summary: Analyze resume and generate AI tags
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               resume:
 *                 type: string
 *                 format: binary
 *                 description: Resume file (PDF, DOC, DOCX, TXT)
 *     responses:
 *       200:
 *         description: Resume analyzed successfully
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
 *                     extractedData:
 *                       type: object
 *                     aiTags:
 *                       type: array
 *                       items:
 *                         type: string
 *                     analysis:
 *                       type: string
 *       400:
 *         description: No file uploaded or invalid file
 *       500:
 *         description: Internal server error
 */
router.post('/resume/analyze', upload.single('resume'), socialController.analyzeResume);

/**
 * @swagger
 * /api/social/recommend:
 *   post:
 *     summary: Get user recommendations for collaboration
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               criteria:
 *                 type: object
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 20
 *                 default: 10
 *     responses:
 *       200:
 *         description: Recommendations generated successfully
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
 *                       user:
 *                         type: object
 *                       matchScore:
 *                         type: number
 *                       matchReasons:
 *                         type: array
 *                         items:
 *                           type: string
 *       500:
 *         description: Internal server error
 */
router.post('/recommend', socialController.recommendUsers);

/**
 * @swagger
 * /api/social/users:
 *   get:
 *     summary: Search and browse users
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for name or skills
 *       - in: query
 *         name: skills
 *         schema:
 *           type: string
 *         description: Comma-separated list of skills to filter by
 *       - in: query
 *         name: industry
 *         schema:
 *           type: string
 *         description: Industry to filter by
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Location to filter by
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
 *           maximum: 50
 *           default: 20
 *     responses:
 *       200:
 *         description: Users retrieved successfully
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
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       500:
 *         description: Internal server error
 */
router.get('/users', socialController.searchUsers);

/**
 * @swagger
 * /api/social/users/{userId}:
 *   get:
 *     summary: Get specific user's public profile
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
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
 *       404:
 *         description: User not found or profile not public
 *       500:
 *         description: Internal server error
 */
router.get('/users/:userId', socialController.getUserProfile);

/**
 * @swagger
 * /api/social/collaboration-request:
 *   post:
 *     summary: Send collaboration request to another user
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipientId
 *               - projectDescription
 *             properties:
 *               recipientId:
 *                 type: string
 *                 description: ID of the user to send collaboration request to
 *               projectDescription:
 *                 type: string
 *                 description: Description of the collaboration project
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Skills required for the project
 *               timeline:
 *                 type: string
 *                 description: Project timeline
 *               message:
 *                 type: string
 *                 description: Personal message to the recipient
 *     responses:
 *       200:
 *         description: Collaboration request sent successfully
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
 *       400:
 *         description: Invalid request data or user not accepting collaborations
 *       404:
 *         description: Recipient user not found
 *       500:
 *         description: Internal server error
 */
router.post('/collaboration-request', socialController.sendCollaborationRequest);

/**
 * @swagger
 * /api/social/similar-users:
 *   get:
 *     summary: Get users with similar skills and background
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 10
 *         description: Number of similar users to return
 *     responses:
 *       200:
 *         description: Similar users retrieved successfully
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
 *                       user:
 *                         type: object
 *                       similarityScore:
 *                         type: number
 *                       commonSkills:
 *                         type: array
 *                         items:
 *                           type: string
 *       500:
 *         description: Internal server error
 */
router.get('/similar-users', socialController.findSimilarUsers);

// Error handler for multer errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'Resume file too large (maximum 10MB)'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected file field'
      });
    }
  }
  
  if (error.message && error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
  
  next(error);
});

module.exports = router;