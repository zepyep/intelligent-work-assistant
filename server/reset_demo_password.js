require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const bcryptjs = require('bcryptjs');

async function resetDemoPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ 数据库连接成功');
    
    // 查找demo用户
    let demoUser = await User.findOne({ username: 'demo' });
    
    if (!demoUser) {
      console.log('❌ 未找到demo用户，正在创建...');
      
      // 创建demo用户
      const hashedPassword = await bcryptjs.hash('demo123', 10);
      
      demoUser = new User({
        username: 'demo',
        email: 'demo@example.com',
        password: hashedPassword,
        role: 'user',
        isActive: true,
        isEmailVerified: true,
        profile: {
          firstName: 'Demo',
          lastName: 'User',
          position: '演示用户'
        }
      });
      
      await demoUser.save();
      console.log('✅ Demo用户创建成功');
      console.log('📧 邮箱: demo@example.com');
      console.log('🔑 密码: demo123');
      
    } else {
      console.log('🎭 找到demo用户，正在重置密码...');
      
      // 重置密码为demo123
      const hashedPassword = await bcryptjs.hash('demo123', 10);
      demoUser.password = hashedPassword;
      demoUser.isActive = true;
      demoUser.isEmailVerified = true;
      
      // 更新邮箱为更简单的格式
      demoUser.email = 'demo@example.com';
      
      await demoUser.save();
      console.log('✅ Demo用户密码重置成功');
      console.log('📧 邮箱: demo@example.com');
      console.log('🔑 密码: demo123');
    }
    
    // 同样为testuser重置密码
    let testUser = await User.findOne({ username: 'testuser' });
    if (testUser) {
      console.log('\\n🧪 找到testuser，正在重置密码...');
      const hashedPassword = await bcryptjs.hash('test123', 10);
      testUser.password = hashedPassword;
      testUser.email = 'test@example.com';
      testUser.isActive = true;
      testUser.isEmailVerified = true;
      
      await testUser.save();
      console.log('✅ Test用户密码重置成功');
      console.log('📧 邮箱: test@example.com');
      console.log('🔑 密码: test123');
    }
    
    console.log('\\n🎯 可用的演示账号:');
    console.log('1. 管理员账号: admin@example.com / admin123');
    console.log('2. Demo用户: demo@example.com / demo123');
    console.log('3. Test用户: test@example.com / test123');
    
  } catch (err) {
    console.error('❌ 操作失败:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

resetDemoPassword();