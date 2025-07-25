const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // 连接选项
    const options = {
      maxPoolSize: 10, // 连接池大小
      serverSelectionTimeoutMS: 5000, // 服务器选择超时时间
      socketTimeoutMS: 45000, // Socket超时时间
      family: 4, // 使用IPv4
      bufferCommands: false
    };

    // 连接数据库
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/intelligent-work-assistant',
      options
    );

    console.log(`📦 MongoDB连接成功: ${conn.connection.host}`);
    console.log(`🗄️  数据库名称: ${conn.connection.name}`);

    // 连接事件监听
    mongoose.connection.on('connected', () => {
      console.log('MongoDB 连接已建立');
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB 连接错误:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB 连接已断开');
    });

  } catch (error) {
    console.error('数据库连接失败:', error.message);
    // 退出进程
    process.exit(1);
  }
};

module.exports = connectDB;