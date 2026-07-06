import Device from '../models/Device.js'

const VALID_STATUS = ['normal', 'maintenance', 'scrapped']

function parseId(id) {
  const num = parseInt(id, 10)
  if (isNaN(num) || num <= 0) return null
  return num
}

export async function getDevices(req, res, next) {
  try {
    const { name, status, page, pageSize } = req.query
    const result = await Device.findAll({ name, status, page, pageSize })
    res.json({ code: 200, ...result })
  } catch (err) {
    next(err)
  }
}

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

export async function createDevice(req, res, next) {
  try {
    const { name, model, location, status, last_maintenance_date } = req.body
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

    const device = await Device.create({ name, model, location, status, last_maintenance_date })
    res.status(201).json({ code: 201, data: device, message: '设备创建成功' })
  } catch (err) {
    next(err)
  }
}

export async function updateDevice(req, res, next) {
  try {
    const id = parseId(req.params.id)
    if (!id) return res.status(400).json({ code: 400, message: '无效的设备 ID' })

    const { name, model, location, status, last_maintenance_date } = req.body
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

    const result = await Device.update(id, { name, model, location, status, last_maintenance_date })
    if (result.notFound) return res.status(404).json({ code: 404, message: '设备不存在' })
    if (result.noChange) return res.json({ code: 200, message: '数据未变更', data: result })
    res.json({ code: 200, data: result, message: '设备更新成功' })
  } catch (err) {
    next(err)
  }
}

export async function getDeviceStats(req, res, next) {
  try {
    const stats = await Device.getStats()
    res.json({ code: 200, data: stats })
  } catch (err) {
    next(err)
  }
}

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
