const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function recreateAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('数据库连接成功');
    
    // 删除现有的admin用户
    await User.deleteOne({ email: 'admin@example.com' });
    console.log('删除现有admin用户');
    
    // 创建新的admin用户 - 让模型的中间件处理密码加密
    const admin = new User({
      username: 'admin',
      email: 'admin@example.com',
      password: 'admin123', // 让pre-save中间件处理加密
      profile: {
        firstName: '系统',
        lastName: '管理员'
      },
      role: 'admin',
      isActive: true,
      isEmailVerified: true
    });
    
    await admin.save(); // 这会触发pre-save中间件
    console.log('新admin用户创建成功');
    
    // 验证创建结果和密码
    const createdAdmin = await User.findOne({ email: 'admin@example.com' }).select('+password');
    console.log('Admin用户详情:', {
      hasPassword: !!createdAdmin.password,
      passwordLength: createdAdmin.password ? createdAdmin.password.length : 0
    });
    const passwordMatch = await createdAdmin.matchPassword('admin123');
    
    console.log('验证结果:', {
      username: createdAdmin.username,
      email: createdAdmin.email,
      role: createdAdmin.role,
      passwordMatch: passwordMatch ? '✅ 正确' : '❌ 错误'
    });
    
    process.exit(0);
  } catch (error) {
    console.error('创建失败:', error);
    process.exit(1);
  }
}

recreateAdmin();