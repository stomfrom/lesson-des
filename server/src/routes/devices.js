/**
 * ====================================================
 * 设备路由
 * ====================================================
 * 每条路由先校验 JWT → 再校验具体权限。
 * /stats 必须放在 /:id 之前，避免被作为 id 捕获。
 * ====================================================
 */
import { Router } from 'express'
import authMiddleware from '../middleware/auth.js'
import requirePermission from '../middleware/requirePermission.js'
import { getDevices, getDevice, getDeviceStats, createDevice, updateDevice, deleteDevice } from '../controllers/deviceController.js'

const router = Router()

// 注意：/stats 必须在 /:id 之前注册
router.get('/', requirePermission('device', 'read'), getDevices)           // 设备列表
router.get('/stats', requirePermission('device', 'read'), getDeviceStats)  // Dashboard 统计
router.get('/:id', requirePermission('device', 'read'), getDevice)         // 设备详情
router.post('/', requirePermission('device', 'create'), createDevice)      // 新增
router.put('/:id', requirePermission('device', 'update'), updateDevice)    // 编辑
router.delete('/:id', requirePermission('device', 'delete'), deleteDevice) // 删除

export default router
