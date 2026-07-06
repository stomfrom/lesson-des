/**
 * ====================================================
 * 系统配置模型 (Setting)
 * ====================================================
 * 表: settings
 * 存储键值对形式的系统配置项。
 * 当前配置项：
 *   maintenance_months — 未维保多少个月后自动切换为「维保中」
 *   scrap_months       — 维保中多少个月后自动切换为「已报废」
 * ====================================================
 */
import pool from '../config/db.js'

class Setting {
  /** 获取所有配置（返回 key-value 对象） */
  static async getAll() {
    const [rows] = await pool.execute(
      'SELECT setting_key, setting_value FROM settings'
    )
    const map = {}
    for (const r of rows) map[r.setting_key] = r.setting_value
    return map
  }

  /** 批量更新配置 */
  static async updateAll(settings) {
    const allowed = ['maintenance_months', 'scrap_months']
    for (const [key, value] of Object.entries(settings)) {
      if (!allowed.includes(key)) continue
      await pool.execute(
        'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [key, String(value), String(value)]
      )
    }
  }
}

export default Setting
