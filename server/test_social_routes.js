const express = require('express');

const router = express.Router();

// Simple test route
router.get('/test', (req, res) => {
  res.json({ message: 'Social routes test successful' });
});

try {
  // Test basic imports
  const socialController = require('./controllers/socialController');
  console.log('✅ Social controller loaded');

  const auth = require('./middleware/auth');
  console.log('✅ Auth middleware loaded');

  // Test route definitions one by one
  console.log('Testing route definitions...');

  router.get('/profile', auth, socialController.getSocialProfile);
  console.log('✅ Profile GET route defined');

  router.put('/profile', auth, socialController.updateSocialProfile);
  console.log('✅ Profile PUT route defined');

  console.log('✅ All basic routes defined successfully');

} catch (error) {
  console.error('❌ Error in route setup:', error.message);
  console.error('Stack:', error.stack);
}

module.exports = router;