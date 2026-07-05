import { Router } from 'express'
import authMiddleware from '../middleware/auth.js'
import { login, register, getProfile } from '../controllers/authController.js'

const router = Router()

router.post('/auth/login', login)
router.post('/auth/register', register)
router.get('/auth/profile', authMiddleware, getProfile)

export default router
