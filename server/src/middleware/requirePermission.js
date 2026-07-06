/**
 * ====================================================
 * 权限校验中间件工厂
 * ====================================================
 * 使用方式：requirePermission('device', 'read')
 *
 * 职责：
 * - admin 角色无条件放行
 * - operator 角色检查 req.permissions 中是否包含
 *   指定资源的指定操作
 * - 不满足时返回 403
 *
 * 此中间件必须在 authMiddleware 之后使用。
 * ====================================================
 */

/**
 * 生成一个校验特定资源+操作的中间件
 * @param {string} resource  资源标识，如 'device'
 * @param {string} action    操作标识，如 'create' / 'read' / 'update' / 'delete'
 * @returns {Function} Express 中间件
 */
export default function requirePermission(resource, action) {
  return (req, res, next) => {
    // admin 跳过检查
    if (req.user.role === 'admin') return next()

    // operator：检查权限列表
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
