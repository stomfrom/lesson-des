import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import authMiddleware from '../middleware/auth.js'
import { login, register, getProfile } from '../controllers/authController.js'

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { code: 429, message: '登录尝试过多，请15分钟后再试' }
})

const router = Router()

router.post('/auth/login', loginLimiter, login)
router.post('/auth/register', login)
router.get('/auth/profile', authMiddleware, getProfile)

export default router
