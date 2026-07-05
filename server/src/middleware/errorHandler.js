export default (err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`)
  if (err.stack) console.error(err.stack)

  const status = err.status || 500

  // 生产环境不暴露内部错误详情
  const message = status >= 500 && process.env.NODE_ENV === 'production'
    ? '服务器内部错误'
    : err.message || '服务器内部错误'

  res.status(status).json({ code: status, message })
}
