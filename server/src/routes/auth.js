/**
 * ====================================================
 * 认证路由
 * ====================================================
 * 登录、注册、个人信息。
 * 登录端点使用独立限流防止暴力破解。
 * ====================================================
 */
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import authMiddleware from '../middleware/auth.js'
import { login, register, getProfile } from '../controllers/authController.js'

/** 登录限流：15 分钟内最多 10 次尝试 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { code: 429, message: '登录尝试过多，请15分钟后再试' }
})

const router = Router()

router.post('/auth/login', loginLimiter, login)          // 登录（限流）
router.post('/auth/register', login)                     // 注册
router.get('/auth/profile', authMiddleware, getProfile)  // 个人信息

export default router
