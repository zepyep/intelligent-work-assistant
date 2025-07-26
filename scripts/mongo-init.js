// 智能工作助手应用 - MongoDB初始化脚本
// ====================================

// 切换到应用数据库
db = db.getSiblingDB('intelligent-work-assistant');

// 创建应用用户
db.createUser({
  user: 'appuser',
  pwd: 'apppassword',
  roles: [
    {
      role: 'readWrite',
      db: 'intelligent-work-assistant'
    }
  ]
});

// 创建必要的集合和索引
print('🗄️ 初始化数据库集合和索引...');

// 用户集合索引
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ 'wechatBinding.openid': 1 });
db.users.createIndex({ isActive: 1 });
db.users.createIndex({ role: 1 });

// 任务集合索引
db.tasks.createIndex({ user: 1 });
db.tasks.createIndex({ status: 1 });
db.tasks.createIndex({ priority: 1 });
db.tasks.createIndex({ dueDate: 1 });
db.tasks.createIndex({ createdAt: -1 });

// 文档集合索引
db.documents.createIndex({ user: 1 });
db.documents.createIndex({ category: 1 });
db.documents.createIndex({ tags: 1 });
db.documents.createIndex({ createdAt: -1 });
db.documents.createIndex({ 'analysis.keywords': 1 });

// 会议集合索引
db.meetings.createIndex({ organizer: 1 });
db.meetings.createIndex({ 'participants.user': 1 });
db.meetings.createIndex({ startTime: 1 });
db.meetings.createIndex({ status: 1 });

// 日程集合索引
db.calendars.createIndex({ user: 1 });
db.calendars.createIndex({ startTime: 1 });
db.calendars.createIndex({ endTime: 1 });

// 通知集合索引
db.notifications.createIndex({ user: 1 });
db.notifications.createIndex({ isRead: 1 });
db.notifications.createIndex({ createdAt: -1 });

// 用户档案集合索引
db.userprofiles.createIndex({ user: 1 }, { unique: true });
db.userprofiles.createIndex({ 'profile.skills.technical': 1 });
db.userprofiles.createIndex({ 'profile.personalInfo.department': 1 });

// 微信绑定集合索引
db.wechatbindings.createIndex({ user: 1 });
db.wechatbindings.createIndex({ openid: 1 }, { unique: true });

// 网页分析集合索引
db.webpageanalyses.createIndex({ user: 1 });
db.webpageanalyses.createIndex({ url: 1 });
db.webpageanalyses.createIndex({ createdAt: -1 });

// 网页阅读集合索引
db.webpagereadings.createIndex({ user: 1 });
db.webpagereadings.createIndex({ url: 1 });
db.webpagereadings.createIndex({ createdAt: -1 });

print('✅ 数据库索引创建完成');

// 创建默认管理员用户 (如果不存在)
const bcrypt = require('bcryptjs');

const adminExists = db.users.findOne({ email: 'admin@example.com' });

if (!adminExists) {
  print('👤 创建默认管理员账户...');
  
  const adminUser = {
    username: 'admin',
    email: 'admin@example.com',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6pTcOkVm4G', // admin123
    profile: {
      firstName: '系统',
      lastName: '管理员',
      position: '管理员'
    },
    role: 'admin',
    isActive: true,
    isEmailVerified: true,
    loginCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  db.users.insertOne(adminUser);
  print('✅ 默认管理员账户创建完成 (admin@example.com / admin123)');
} else {
  print('ℹ️  管理员账户已存在，跳过创建');
}

// 创建系统配置集合
print('⚙️ 初始化系统配置...');

db.systemconfig.replaceOne(
  { _id: 'app-config' },
  {
    _id: 'app-config',
    appName: '智能工作助手',
    version: '1.0.0',
    features: {
      taskPlanning: true,
      documentAnalysis: true,
      meetingProcessing: true,
      calendarSync: true,
      wechatIntegration: true,
      socialFeatures: true,
      aiEnhancement: true
    },
    limits: {
      maxFileSize: 10485760, // 10MB
      maxFilesPerUser: 100,
      maxTasksPerUser: 500,
      maxMeetingsPerUser: 100
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  { upsert: true }
);

print('✅ 系统配置初始化完成');

print('🎉 MongoDB数据库初始化完成!');
print('📊 数据库统计:');
print(`   - 集合数量: ${db.getCollectionNames().length}`);
print(`   - 索引总数: ${db.runCommand("listCollections").cursor.firstBatch.reduce((total, collection) => total + db.getCollection(collection.name).getIndexes().length, 0)}`);
print('🚀 智能工作助手应用数据库准备就绪!');