const User = require('../models/User');
const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');

/**
 * 用户注册
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  console.log('注册请求数据:', {
    body: req.body,
    headers: req.headers['content-type'],
    method: req.method
  });
  
  const { username, email, password, profile = {} } = req.body;

  // 验证必需字段
  if (!username || !email || !password) {
    return res.status(400).json({
      success: false,
      message: '用户名、邮箱和密码都是必需的'
    });
  }

  // 验证输入格式
  if (username.length < 3) {
    return res.status(400).json({
      success: false,
      message: '用户名至少需要3个字符'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: '密码至少需要6个字符'
    });
  }

  // 验证邮箱格式
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: '请提供有效的邮箱地址'
    });
  }

  // 检查用户是否已存在
  const existingUser = await User.findOne({
    $or: [{ email }, { username }]
  });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: '用户名或邮箱已存在'
    });
  }

  // 创建用户
  let user;
  try {
    user = await User.create({
      username,
      email,
      password,
      profile: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        department: profile.department,
        position: profile.position || '员工'
      }
    });
  } catch (error) {
    console.error('数据库错误:', error);
    
    // 处理重复键错误
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${field === 'email' ? '邮箱' : '用户名'}已存在`
      });
    }
    
    // 处理验证错误
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    // 其他错误
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }

  // 生成JWT令牌
  const token = user.getSignedJwtToken();

  // 隐藏敏感信息
  user.password = undefined;

  res.status(201).json({
    success: true,
    message: '注册成功',
    data: {
      token,
      user
    }
  });
});

/**
 * 用户登录
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password, rememberMe = false } = req.body;

  // 验证输入
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: '请提供邮箱和密码'
    });
  }

  // 查找用户并包含密码字段
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return res.status(401).json({
      success: false,
      message: '邮箱或密码错误'
    });
  }

  // 检查密码
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: '邮箱或密码错误'
    });
  }

  // 检查账号状态
  if (!user.isActive) {
    return res.status(401).json({
      success: false,
      message: '账号已被禁用，请联系管理员'
    });
  }

  // 更新登录记录
  user.lastLogin = new Date();
  user.loginCount += 1;
  await user.save({ validateBeforeSave: false });

  // 生成JWT令牌
  const token = user.getSignedJwtToken();

  // 隐藏密码
  user.password = undefined;

  res.status(200).json({
    success: true,
    message: '登录成功',
    data: {
      token,
      user,
      expiresIn: rememberMe ? '30d' : '7d'
    }
  });
});

/**
 * 获取当前用户信息
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate('calendarIntegrations', 'type email isActive');

  res.status(200).json({
    success: true,
    data: { user }
  });
});

/**
 * 更新用户资料
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const fieldsToUpdate = {
    username: req.body.username,
    email: req.body.email,
    'profile.firstName': req.body.firstName,
    'profile.lastName': req.body.lastName,
    'profile.phone': req.body.phone,
    'profile.department': req.body.department,
    'profile.position': req.body.position,
    'profile.bio': req.body.bio
  };

  // 移除未定义的字段
  Object.keys(fieldsToUpdate).forEach(key => {
    if (fieldsToUpdate[key] === undefined) {
      delete fieldsToUpdate[key];
    }
  });

  const user = await User.findByIdAndUpdate(
    req.user.id,
    fieldsToUpdate,
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    message: '资料更新成功',
    data: { user }
  });
});

/**
 * 修改密码
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: '请提供当前密码和新密码'
    });
  }

  // 获取用户（包含密码）
  const user = await User.findById(req.user.id).select('+password');

  // 验证当前密码
  const isMatch = await user.matchPassword(currentPassword);

  if (!isMatch) {
    return res.status(400).json({
      success: false,
      message: '当前密码错误'
    });
  }

  // 设置新密码
  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: '密码修改成功'
  });
});

/**
 * 忘记密码
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: '该邮箱地址未注册'
    });
  }

  // 生成重置令牌
  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  // 创建重置URL
  const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;

  try {
    // 这里应该发送邮件，暂时返回令牌用于测试
    res.status(200).json({
      success: true,
      message: '密码重置链接已发送到您的邮箱',
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
  } catch (error) {
    console.error('发送邮件失败:', error);
    
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(500).json({
      success: false,
      message: '邮件发送失败，请稍后重试'
    });
  }
});

/**
 * 重置密码
 * @route   PUT /api/auth/reset-password/:resettoken
 * @access  Public
 */
const resetPassword = asyncHandler(async (req, res) => {
  // 获取哈希令牌
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: '无效或过期的重置令牌'
    });
  }

  // 设置新密码
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  // 生成JWT令牌
  const token = user.getSignedJwtToken();

  res.status(200).json({
    success: true,
    message: '密码重置成功',
    data: { token }
  });
});

/**
 * 邮箱验证
 * @route   GET /api/auth/verify-email/:token
 * @access  Public
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: '无效或过期的验证链接'
    });
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: '邮箱验证成功'
  });
});

/**
 * 退出登录
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  // JWT是无状态的，这里主要用于记录日志
  console.log(`用户 ${req.user.username} 退出登录`);

  res.status(200).json({
    success: true,
    message: '退出登录成功'
  });
});

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail
};