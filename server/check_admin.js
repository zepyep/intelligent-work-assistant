const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

async function checkAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('数据库连接成功');
    
    // 查找admin用户
    const admin = await User.findOne({ email: 'admin@example.com' }).select('+password');
    
    if (!admin) {
      console.log('❌ 未找到admin用户');
      return;
    }
    
    console.log('✅ 找到admin用户:', {
      username: admin.username,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
      isEmailVerified: admin.isEmailVerified,
      hasPassword: !!admin.password,
      passwordLength: admin.password ? admin.password.length : 0
    });
    
    // 测试密码
    const testPassword = 'admin123';
    const passwordMatch = await bcrypt.compare(testPassword, admin.password);
    console.log(`🔑 密码验证 (${testPassword}): ${passwordMatch ? '✅ 正确' : '❌ 错误'}`);
    
    process.exit(0);
  } catch (error) {
    console.error('检查失败:', error);
    process.exit(1);
  }
}

checkAdmin();