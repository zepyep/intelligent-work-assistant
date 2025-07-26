const mongoose = require('mongoose');
const User = require('./models/User');

async function fixUserCalendarIntegrations() {
  try {
    await mongoose.connect('mongodb://localhost:27017/intelligent-work-assistant');
    
    const user = await User.findOne({ email: 'plan@test.com' });
    if (user && user.calendarIntegrations.length > 0) {
      // Update calendar integrations to include type
      user.calendarIntegrations.forEach((integration, index) => {
        if (!integration.type) {
          integration.type = index === 0 ? 'google' : 'outlook';
        }
      });
      
      // Use markModified to ensure mongoose saves the changes
      user.markModified('calendarIntegrations');
      await user.save();
      console.log('User calendar integrations updated successfully');
      console.log('Updated integrations:', user.calendarIntegrations);
    } else {
      console.log('User not found or no calendar integrations');
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixUserCalendarIntegrations();