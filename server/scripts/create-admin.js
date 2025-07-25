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
    
    // 找到admin用户并更新为管理员角色
    const admin = await User.findOneAndUpdate(
      { email: 'admin@example.com' },
      { role: 'admin' },
      { new: true }
    );

    if (admin) {
      console.log('管理员角色更新成功:');
      console.log(`- 用户名: ${admin.username}`);
      console.log(`- 邮箱: ${admin.email}`);
      console.log(`- 角色: ${admin.role}`);
    } else {
      console.log('未找到admin用户');
    }

    process.exit(0);
  } catch (error) {
    console.error('创建管理员失败:', error);
    process.exit(1);
  }
};

createAdmin();