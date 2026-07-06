/**
 * ====================================================
 * 全局错误处理中间件
 * ====================================================
 * 必须注册在所有路由之后，作为 Express 错误链的最后一环。
 *
 * 行为：
 * - 记录错误到服务器控制台
 * - 生产环境（NODE_ENV=production）不暴露内部错误细节
 * - 非生产环境返回原始错误信息方便调试
 * ====================================================
 */
export default (err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`)
  if (err.stack) console.error(err.stack)

  // 根据状态码决定是否显示详细错误
  const status = err.status || 500

  // 生产环境的 500 级错误只给通用消息
  const message = status >= 500 && process.env.NODE_ENV === 'production'
    ? '服务器内部错误'
    : err.message || '服务器内部错误'

  res.status(status).json({ code: status, message })
}
