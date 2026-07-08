/**
 * ====================================================
 * 权限/用户管理控制器 (PermissionController)
 * ====================================================
 * 管理员专属接口（路由层有 adminOnly 保护）：
 * - 查看用户列表（含权限）
 * - 查看单个用户权限
 * - 修改用户权限（事务保护）
 * - 删除用户（禁止自删和删管理员）
 * ====================================================
 */
import pool from '../config/db.js'
import Permission from '../models/Permission.js'
import User from '../models/User.js'

/** 允许的资源类型和操作 */
const RESOURCES = ['device']
const ACTIONS = ['create', 'read', 'update', 'delete']

/** GET /api/users — 获取全部用户列表（含权限） */
export async function listUsers(req, res, next) {
  try {
    // 查全部用户
    const [rows] = await pool.execute(
      'SELECT id, username, nickname, role, created_at FROM users ORDER BY created_at DESC'
    )
    // 批量查权限（一次 IN 查询避免 N+1）
    const userIds = rows.map(u => u.id)
    const permsRows = await Permission.getPermissionsByUsers(userIds)
    const permsMap = {}
    for (const p of permsRows) {
      if (!permsMap[p.user_id]) permsMap[p.user_id] = []
      permsMap[p.user_id].push({ resource: p.resource, action: p.action })
    }
    // 合并角色和权限数据
    const data = rows.map(u => ({
      ...u,
      permissions: permsMap[u.id] || []
    }))
    res.json({ code: 200, data })
  } catch (err) {
    next(err)
  }
}

/** GET /api/users/:userId/permissions — 查询单个用户权限 */
export async function getUserPermissions(req, res, next) {
  try {
    const userId = parseInt(req.params.userId, 10)
    if (isNaN(userId) || userId <= 0) return res.status(400).json({ code: 400, message: '无效的用户 ID' })

    const [users] = await pool.execute(
      'SELECT id, username, nickname, role FROM users WHERE id = ?', [userId]
    )
    if (users.length === 0) return res.status(404).json({ code: 404, message: '用户不存在' })

    const perms = await Permission.findByUserId(userId)
    res.json({ code: 200, data: { user: users[0], permissions: perms } })
  } catch (err) {
    next(err)
  }
}

/** PUT /api/users/:userId/permissions — 设置用户权限 */
export async function setUserPermissions(req, res, next) {
  try {
    const userId = parseInt(req.params.userId, 10)
    if (isNaN(userId) || userId <= 0) return res.status(400).json({ code: 400, message: '无效的用户 ID' })

    const [users] = await pool.execute(
      'SELECT id, role FROM users WHERE id = ?', [userId]
    )
    if (users.length === 0) return res.status(404).json({ code: 404, message: '用户不存在' })
    if (users[0].role === 'admin') {
      return res.status(400).json({ code: 400, message: '管理员拥有所有权限，无需设置' })
    }

    // 校验请求参数
    const { resource, actions } = req.body
    if (!resource || !Array.isArray(actions)) {
      return res.status(400).json({ code: 400, message: '请提供 resource 和 actions 数组' })
    }
    if (!RESOURCES.includes(resource)) {
      return res.status(400).json({ code: 400, message: `无效的资源，允许: ${RESOURCES.join(', ')}` })
    }
    const invalid = actions.filter(a => !ACTIONS.includes(a))
    if (invalid.length > 0) {
      return res.status(400).json({ code: 400, message: `无效的操作，允许: ${ACTIONS.join(', ')}` })
    }

    // 事务写入权限
    await Permission.bulkSetPermissions(userId, resource, actions)
    const updated = await Permission.findByUserId(userId)
    res.json({ code: 200, data: { user_id: userId, permissions: updated }, message: '权限设置成功' })
  } catch (err) {
    next(err)
  }
}

/** DELETE /api/users/:userId — 删除用户 */
export async function deleteUser(req, res, next) {
  try {
    const userId = parseInt(req.params.userId, 10)
    if (isNaN(userId) || userId <= 0) return res.status(400).json({ code: 400, message: '无效的用户 ID' })

    // 安全规则
    if (userId === req.user.id) {
      return res.status(400).json({ code: 400, message: '不能删除自己的账号' })
    }

    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ code: 404, message: '用户不存在' })
    if (user.role === 'admin') {
      return res.status(400).json({ code: 400, message: '不能删除管理员账号' })
    }

    await User.delete(userId)
    res.json({ code: 200, message: `用户「${user.username}」已删除` })
  } catch (err) {
    next(err)
  }
}
