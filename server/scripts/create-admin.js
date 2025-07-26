const mongoose = require('mongoose');
require('dotenv').config();

// 连接数据库
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB连接成功');
  } catch (error) {
    console.error('数据库连接失败:', error);
    process.exit(1);
  }
};

const User = require('../models/User');

const createAdmin = async () => {
  try {
    await connectDB();
    
    // 先查找是否已存在admin用户
    let admin = await User.findOne({ email: 'admin@example.com' });
    
    if (admin) {
      // 如果存在，更新为管理员角色
      admin = await User.findOneAndUpdate(
        { email: 'admin@example.com' },
        { role: 'admin' },
        { new: true }
      );
      console.log('管理员角色更新成功:');
    } else {
      // 如果不存在，创建新的admin用户
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      admin = await User.create({
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        fullName: '系统管理员',
        role: 'admin',
        isActive: true
      });
      console.log('管理员用户创建成功:');
    }
    
    console.log(`- 用户名: ${admin.username}`);
    console.log(`- 邮箱: ${admin.email}`);
    console.log(`- 角色: ${admin.role}`);
    console.log('- 密码: admin123');

    process.exit(0);
  } catch (error) {
    console.error('创建管理员失败:', error);
    process.exit(1);
  }
};

createAdmin();