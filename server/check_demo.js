require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcrypt');

async function checkDemoUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');
    
    const demoUser = await User.findOne({ username: 'demo' });
    
    if (!demoUser) {
      console.log('❌ 未找到demo用户');
      
      // 检查是否有其他可能的演示账号
      const possibleDemoUsers = await User.find({
        $or: [
          { username: /demo/i },
          { email: /demo/i },
          { username: /test/i }
        ]
      }).select('username email');
      
      console.log('📋 找到的可能的演示账号:');
      possibleDemoUsers.forEach(user => {
        console.log(`  - ${user.username} (${user.email})`);
      });
      
      return;
    }
    
    console.log('🎭 Demo用户详细信息:');
    console.log('  用户名:', demoUser.username);
    console.log('  邮箱:', demoUser.email);
    console.log('  角色:', demoUser.role);
    console.log('  激活状态:', demoUser.isActive);
    console.log('  邮箱验证:', demoUser.isEmailVerified);
    console.log('  是否有密码:', !!demoUser.password);
    console.log('  密码长度:', demoUser.password ? demoUser.password.length : 0);
    
    if (!demoUser.password) {
      console.log('⚠️ Demo用户没有设置密码!');
      return;
    }
    
    // 测试常见的demo密码
    const possiblePasswords = ['demo', 'demo123', 'password', '123456', 'test'];
    
    console.log('\n🔑 测试常见密码:');
    for (const pwd of possiblePasswords) {
      const isMatch = await bcrypt.compare(pwd, demoUser.password);
      console.log(`  ${pwd}: ${isMatch ? '✅ 正确' : '❌ 错误'}`);
      if (isMatch) {
        console.log(`\n🎯 找到正确密码: ${pwd}`);
        break;
      }
    }
    
  } catch (err) {
    console.error('❌ 检查失败:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkDemoUser();