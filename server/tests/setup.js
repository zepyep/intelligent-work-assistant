const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

// Setup test database before all tests
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  
  // Close any existing connection
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Clean up database between tests
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Close database connection after all tests
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
});

// Suppress console logs during testing unless DEBUG env is set
if (!process.env.DEBUG) {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
}

// Global test utilities
global.createTestUser = async () => {
  const User = require('../models/User');
  const bcrypt = require('bcryptjs');
  
  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: await bcrypt.hash('testpassword123', 12),
    role: 'user',
    position: 'Developer',
    isActive: true
  };
  
  return await User.create(testUser);
};

global.createAdminUser = async () => {
  const User = require('../models/User');
  const bcrypt = require('bcryptjs');
  
  const adminUser = {
    name: 'Admin User',
    email: 'admin@example.com',
    password: await bcrypt.hash('adminpassword123', 12),
    role: 'admin',
    position: 'System Administrator',
    isActive: true
  };
  
  return await User.create(adminUser);
};

global.generateAuthToken = (user) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { 
      userId: user._id,
      email: user.email,
      role: user.role 
    },
    process.env.JWT_SECRET || 'test-jwt-secret',
    { expiresIn: '1h' }
  );
};

// Mock external services for testing
global.mockOpenAIService = {
  generateCompletion: jest.fn().mockResolvedValue({
    choices: [{ message: { content: 'Mocked AI response' } }]
  }),
  transcribeAudio: jest.fn().mockResolvedValue({
    text: 'Mocked transcription',
    segments: []
  }),
  analyzeDocument: jest.fn().mockResolvedValue({
    summary: 'Mocked document summary',
    keywords: ['test', 'document', 'analysis'],
    entities: []
  })
};

global.mockWechatService = {
  sendMessage: jest.fn().mockResolvedValue({ success: true }),
  generateBindingCode: jest.fn().mockResolvedValue('123456'),
  verifySignature: jest.fn().mockReturnValue(true)
};

global.mockCalendarService = {
  syncEvents: jest.fn().mockResolvedValue([]),
  createEvent: jest.fn().mockResolvedValue({ id: 'test-event-id' }),
  updateEvent: jest.fn().mockResolvedValue({ id: 'test-event-id' }),
  deleteEvent: jest.fn().mockResolvedValue({ success: true })
};

// Override environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.WECHAT_APP_ID = 'test-wechat-app-id';
process.env.WECHAT_APP_SECRET = 'test-wechat-secret';