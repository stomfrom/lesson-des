import { Router } from 'express'
import authMiddleware from '../middleware/auth.js'
import { listUsers, getUserPermissions, setUserPermissions, deleteUser } from '../controllers/permissionController.js'

const router = Router()

// admin 专属保护
router.use((req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ code: 403, message: '仅管理员可访问' })
  }
  next()
})

router.get('/users', listUsers)
router.get('/users/:userId/permissions', getUserPermissions)
router.put('/users/:userId/permissions', setUserPermissions)
router.delete('/users/:userId', deleteUser)

export default router
