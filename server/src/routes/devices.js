import { Router } from 'express'
import authMiddleware from '../middleware/auth.js'
import requirePermission from '../middleware/requirePermission.js'
import { getDevices, getDevice, getDeviceStats, createDevice, updateDevice, deleteDevice } from '../controllers/deviceController.js'

const router = Router()

router.get('/', requirePermission('device', 'read'), getDevices)
router.get('/stats', requirePermission('device', 'read'), getDeviceStats)
router.get('/:id', requirePermission('device', 'read'), getDevice)
router.post('/', requirePermission('device', 'create'), createDevice)
router.put('/:id', requirePermission('device', 'update'), updateDevice)
router.delete('/:id', requirePermission('device', 'delete'), deleteDevice)

export default router
