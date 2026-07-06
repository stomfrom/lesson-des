/**
 * ====================================================
 * 设备控制器 (DeviceController)
 * ====================================================
 * 处理设备 CRUD + Dashboard 统计的请求。
 *
 * 验证边界：
 * - parseId 拒绝 NaN / ≤0
 * - 枚举值白名单校验
 * - 字段长度前端+后端双重校验
 * - 日期格式 Regex 校验
 * ====================================================
 */
import Device from '../models/Device.js'

/** 允许的设备状态枚举 */
const VALID_STATUS = ['normal', 'maintenance', 'scrapped']

/**
 * 安全解析路由参数中的数字 ID
 * @returns {number|null} 合法 ID 返回数字，否则返回 null
 */
function parseId(id) {
  const num = parseInt(id, 10)
  if (isNaN(num) || num <= 0) return null
  return num
}

/** GET /api/devices — 分页查询设备列表 */
export async function getDevices(req, res, next) {
  try {
    const { name, status, page, pageSize } = req.query
    const result = await Device.findAll({ name, status, page, pageSize })
    res.json({ code: 200, ...result })
  } catch (err) {
    next(err)
  }
}

/** GET /api/devices/:id — 查询单台设备详情 */
export async function getDevice(req, res, next) {
  try {
    const id = parseId(req.params.id)
    if (!id) return res.status(400).json({ code: 400, message: '无效的设备 ID' })

    const device = await Device.findById(id)
    if (!device) return res.status(404).json({ code: 404, message: '设备不存在' })
    res.json({ code: 200, data: device })
  } catch (err) {
    next(err)
  }
}

/** POST /api/devices — 新增设备 */
export async function createDevice(req, res, next) {
  try {
    const { name, model, location, status, last_maintenance_date, maintenance_interval, scrap_interval } = req.body

    // ── 必填校验 ──
    if (!name || !model || !location) {
      return res.status(400).json({ code: 400, message: '设备名、型号、位置为必填字段' })
    }
    // ── 状态枚举校验 ──
    if (status && !VALID_STATUS.includes(status)) {
      return res.status(400).json({ code: 400, message: `状态值无效，允许: ${VALID_STATUS.join(', ')}` })
    }
    if (status === '') {
      return res.status(400).json({ code: 400, message: '状态值不能为空' })
    }
    // ── 字段长度校验 ──
    if (name.length > 100 || model.length > 100 || location.length > 200) {
      return res.status(400).json({ code: 400, message: '输入字段超出长度限制' })
    }
    // ── 日期格式校验（DATE 类型，仅 YYYY-MM-DD） ──
    if (last_maintenance_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(last_maintenance_date) || isNaN(Date.parse(last_maintenance_date))) {
        return res.status(400).json({ code: 400, message: '维保日期格式无效，应为 YYYY-MM-DD' })
      }
    }

    const device = await Device.create({ name, model, location, status, last_maintenance_date, maintenance_interval, scrap_interval })
    res.status(201).json({ code: 201, data: device, message: '设备创建成功' })
  } catch (err) {
    next(err)
  }
}

/** PUT /api/devices/:id — 更新设备 */
export async function updateDevice(req, res, next) {
  try {
    const id = parseId(req.params.id)
    if (!id) return res.status(400).json({ code: 400, message: '无效的设备 ID' })

    const { name, model, location, status, last_maintenance_date, maintenance_interval, scrap_interval } = req.body
    // ── 必填 + 枚举 + 长度 + 日期校验，逻辑同 create ──
    if (!name || !model || !location) {
      return res.status(400).json({ code: 400, message: '设备名、型号、位置为必填字段' })
    }
    if (status && !VALID_STATUS.includes(status)) {
      return res.status(400).json({ code: 400, message: `状态值无效，允许: ${VALID_STATUS.join(', ')}` })
    }
    if (status === '') {
      return res.status(400).json({ code: 400, message: '状态值不能为空' })
    }
    if (name.length > 100 || model.length > 100 || location.length > 200) {
      return res.status(400).json({ code: 400, message: '输入字段超出长度限制' })
    }
    if (last_maintenance_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(last_maintenance_date) || isNaN(Date.parse(last_maintenance_date))) {
        return res.status(400).json({ code: 400, message: '维保日期格式无效，应为 YYYY-MM-DD' })
      }
    }

    const result = await Device.update(id, { name, model, location, status, last_maintenance_date, maintenance_interval, scrap_interval })
    if (result.notFound) return res.status(404).json({ code: 404, message: '设备不存在' })
    if (result.noChange) return res.json({ code: 200, message: '数据未变更', data: result })
    res.json({ code: 200, data: result, message: '设备更新成功' })
  } catch (err) {
    next(err)
  }
}

/** GET /api/devices/stats — Dashboard 统计数据（含生命周期自动流转） */
export async function getDeviceStats(req, res, next) {
  try {
    const stats = await Device.getStats()
    res.json({ code: 200, data: stats })
  } catch (err) {
    next(err)
  }
}

/** DELETE /api/devices/:id — 删除设备 */
export async function deleteDevice(req, res, next) {
  try {
    const id = parseId(req.params.id)
    if (!id) return res.status(400).json({ code: 400, message: '无效的设备 ID' })

    const success = await Device.delete(id)
    if (!success) return res.status(404).json({ code: 404, message: '设备不存在' })
    res.json({ code: 200, message: '设备删除成功' })
  } catch (err) {
    next(err)
  }
}
