/**
 * ====================================================
 * 系统配置路由（管理员专属）
 * ====================================================
 */
import { Router } from 'express'
import authMiddleware from '../middleware/auth.js'
import { getSettings, updateSettings } from '../controllers/settingController.js'

const router = Router()

// adminOnly
router.use((req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ code: 403, message: '仅管理员可访问' })
  }
  next()
})

router.get('/settings', getSettings)
router.put('/settings', updateSettings)

export default router
