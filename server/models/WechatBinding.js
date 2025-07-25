const mongoose = require('mongoose');

const WechatBindingSchema = new mongoose.Schema({
  // 绑定码
  bindingCode: {
    type: String,
    required: true,
    unique: true,
    length: 6
  },
  
  // 关联的用户ID
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // 微信OpenID（绑定完成后填充）
  wechatOpenId: {
    type: String,
    sparse: true // 允许多个null值，但不允许重复的非null值
  },
  
  // 绑定状态
  status: {
    type: String,
    enum: ['pending', 'completed', 'expired', 'cancelled'],
    default: 'pending'
  },
  
  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // 绑定完成时间
  boundAt: Date,
  
  // 过期时间（5分钟有效期）
  expiresAt: {
    type: Date,
    default: Date.now,
    expires: 300 // 5分钟后自动删除
  },
  
  // 尝试次数
  attempts: {
    type: Number,
    default: 0,
    max: 5
  },
  
  // 客户端信息
  clientInfo: {
    userAgent: String,
    ip: String,
    platform: String
  }
}, {
  timestamps: true
});

// 索引
WechatBindingSchema.index({ bindingCode: 1 });
WechatBindingSchema.index({ userId: 1 });
WechatBindingSchema.index({ wechatOpenId: 1 });
WechatBindingSchema.index({ status: 1 });
WechatBindingSchema.index({ expiresAt: 1 });

// 生成6位数字绑定码的静态方法
WechatBindingSchema.statics.generateBindingCode = function() {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 验证绑定码的静态方法
WechatBindingSchema.statics.validateBindingCode = async function(code, openId) {
  const binding = await this.findOne({
    bindingCode: code,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  }).populate('userId');
  
  if (!binding) {
    return { success: false, message: '绑定码无效或已过期' };
  }
  
  if (binding.attempts >= 5) {
    binding.status = 'cancelled';
    await binding.save();
    return { success: false, message: '尝试次数过多，绑定已取消' };
  }
  
  // 增加尝试次数
  binding.attempts += 1;
  
  // 完成绑定
  binding.wechatOpenId = openId;
  binding.status = 'completed';
  binding.boundAt = new Date();
  await binding.save();
  
  // 更新用户的微信绑定信息
  const user = binding.userId;
  user.wechatBinding.openid = openId;
  user.wechatBinding.bindTime = new Date();
  user.wechatBinding.isVerified = true;
  await user.save();
  
  return { success: true, user: user, binding: binding };
};

// 清理过期绑定码的静态方法
WechatBindingSchema.statics.cleanExpiredBindings = async function() {
  const result = await this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { status: { $in: ['cancelled', 'expired'] } }
    ]
  });
  
  console.log(`清理了 ${result.deletedCount} 个过期的绑定记录`);
  return result;
};

module.exports = mongoose.model('WechatBinding', WechatBindingSchema);