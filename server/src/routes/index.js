/**
 * ====================================================
 * 路由总控
 * ====================================================
 * 挂载所有子路由模块，配置中间件层级。
 *
 * 中间件链：security → body → routes → errorHandler
 * 路由顺序：public → auth → protected
 * ====================================================
 */
import { Router } from 'express'
import pool from '../config/db.js'
import authMiddleware from '../middleware/auth.js'
import authRouter from './auth.js'
import devicesRouter from './devices.js'
import permissionsRouter from './permissions.js'
import settingsRouter from './settings.js'

const router = Router()

/** 健康检查（无需认证，仅返回连通性） */
router.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ code: 200, message: 'OK', timestamp: Date.now() })
  } catch (err) {
    res.status(503).json({ code: 503, message: '服务不可用' })
  }
})

/** 认证相关路由（登录/注册，无需 token） */
router.use(authRouter)

/** 受保护路由（需 JWT 认证） */
router.use('/devices', authMiddleware, devicesRouter)          // 设备 CRUD
router.use(authMiddleware, permissionsRouter)                  // 用户/权限管理（admin only）
router.use(authMiddleware, settingsRouter)                     // 系统配置

export default router
