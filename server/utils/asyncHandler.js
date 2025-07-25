/**
 * 异步函数错误处理包装器
 * 避免在每个异步路由处理函数中重复写 try-catch
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;