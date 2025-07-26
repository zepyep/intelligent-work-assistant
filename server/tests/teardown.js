const mongoose = require('mongoose');

module.exports = async () => {
  // Close any remaining mongoose connections
  await mongoose.disconnect();
  
  // Give a moment for cleanup
  await new Promise(resolve => setTimeout(resolve, 100));
};