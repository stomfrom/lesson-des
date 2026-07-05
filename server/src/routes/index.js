import { Router } from 'express'
import pool from '../config/db.js'
import authMiddleware from '../middleware/auth.js'
import authRouter from './auth.js'
import devicesRouter from './devices.js'
import permissionsRouter from './permissions.js'

const router = Router()

// 健康检查（无需认证）
router.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ code: 200, message: 'OK', db: 'connected', timestamp: Date.now() })
  } catch (err) {
    res.status(503).json({ code: 503, message: '数据库连接异常', db: 'disconnected' })
  }
})

// 认证路由（无需认证）
router.use(authRouter)

// 需要认证的路由
router.use('/devices', authMiddleware, devicesRouter)
router.use(authMiddleware, permissionsRouter)

export default router
