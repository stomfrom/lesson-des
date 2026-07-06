/**
 * ====================================================
 * 权限管理路由（管理员专属）
 * ====================================================
 * 所有路由先经过 JWT 认证，再通过 adminOnly 中间件
 * 拦截非管理员请求。
 * ====================================================
 */
import { Router } from 'express'
import authMiddleware from '../middleware/auth.js'
import { listUsers, getUserPermissions, setUserPermissions, deleteUser } from '../controllers/permissionController.js'

const router = Router()

/** adminOnly 中间件：非管理员直接 403 */
router.use((req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ code: 403, message: '仅管理员可访问' })
  }
  next()
})

router.get('/users', listUsers)                                     // 用户列表
router.get('/users/:userId/permissions', getUserPermissions)        // 查询用户权限
router.put('/users/:userId/permissions', setUserPermissions)        // 设置用户权限
router.delete('/users/:userId', deleteUser)                         // 删除用户

export default router
