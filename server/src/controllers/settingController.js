/**
 * ====================================================
 * 系统配置控制器
 * ====================================================
 * 管理设备生命周期流转规则配置。
 * 仅管理员可访问。
 * ====================================================
 */
import Setting from '../models/Setting.js'
import Device from '../models/Device.js'

/** GET /api/settings — 获取所有配置 */
export async function getSettings(req, res, next) {
  try {
    const settings = await Setting.getAll()
    res.json({ code: 200, data: settings })
  } catch (err) {
    next(err)
  }
}

/** PUT /api/settings — 更新配置 + 执行流转规则 */
export async function updateSettings(req, res, next) {
  try {
    const { maintenance_months, scrap_months } = req.body

    // 校验
    const mm = parseInt(maintenance_months, 10)
    const sm = parseInt(scrap_months, 10)
    if (isNaN(mm) || mm < 1 || mm > 120) {
      return res.status(400).json({ code: 400, message: '维保触发月份需在 1-120 之间' })
    }
    if (isNaN(sm) || sm < 1 || sm > 120) {
      return res.status(400).json({ code: 400, message: '报废触发月份需在 1-120 之间' })
    }

    // 保存配置
    await Setting.updateAll({ maintenance_months: mm, scrap_months: sm })

    // 执行状态自动流转
    const result = await Device.applyLifecycleRules(mm, sm)

    res.json({
      code: 200,
      data: { settings: { maintenance_months: mm, scrap_months: sm }, ...result },
      message: `配置已保存，已自动更新 ${result.updated} 台设备状态`
    })
  } catch (err) {
    next(err)
  }
}
