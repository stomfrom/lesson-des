/**
 * 权限校验中间件工厂
 * @param {string} resource 资源名，如 'device'
 * @param {string} action 操作名，如 'create'
 */
export default function requirePermission(resource, action) {
  return (req, res, next) => {
    // admin 跳过检查
    if (req.user.role === 'admin') return next()

    const allowed = req.permissions?.[resource] || []
    if (!allowed.includes(action)) {
      return res.status(403).json({
        code: 403,
        message: `无权限执行该操作（需要 ${resource}:${action}）`
      })
    }
    next()
  }
}
