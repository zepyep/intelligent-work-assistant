const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

async function fixAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('数据库连接成功');
    
    // 删除现有的admin用户
    await User.deleteOne({ email: 'admin@example.com' });
    console.log('删除现有admin用户');
    
    // 创建新的admin用户
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    const admin = new User({
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      profile: {
        firstName: '系统',
        lastName: '管理员'
      },
      role: 'admin',
      isActive: true,
      isEmailVerified: true
    });
    
    await admin.save();
    console.log('新admin用户创建成功');
    
    // 验证创建结果
    const createdAdmin = await User.findOne({ email: 'admin@example.com' }).select('+password');
    console.log('验证结果:', {
      username: createdAdmin.username,
      email: createdAdmin.email,
      role: createdAdmin.role,
      hasPassword: !!createdAdmin.password,
      passwordLength: createdAdmin.password ? createdAdmin.password.length : 0
    });
    
    process.exit(0);
  } catch (error) {
    console.error('修复失败:', error);
    process.exit(1);
  }
}

fixAdmin();