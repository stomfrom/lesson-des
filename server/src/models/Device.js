/**
 * ====================================================
 * 设备模型 (Device)
 * ====================================================
 * 数据表: devices
 * 职责: 设备的 CRUD + 统计分析
 * 所有 SQL 使用参数化查询（? 占位符）防止注入
 * ====================================================
 */
import pool from '../config/db.js'

/** 查询返回的完整字段列表 */
const COLUMNS = 'id, name, model, location, status, last_maintenance_date, created_at, updated_at'

class Device {

  /** ── 分页查询设备列表，支持 name/status 筛选 ── */
  static async findAll({ name, status, page = 1, pageSize = 20 } = {}) {
    // 构建基础查询（WHERE 1=1 方便动态拼接条件）
    let sql = `SELECT ${COLUMNS} FROM devices WHERE 1=1`
    const params = []

    // 按设备名模糊搜索（转义 LIKE 通配符 % 和 _）
    if (name) {
      sql += ' AND name LIKE ?'
      params.push(`%${name.replace(/[%_]/g, '\\$&')}%`)
    }
    // 按状态精确筛选
    if (status) {
      sql += ' AND status = ?'
      params.push(status)
    }

    // 总数查询（用于分页组件）
    const countSql = sql.replace(`SELECT ${COLUMNS}`, 'SELECT COUNT(*) AS total')
    const [countRows] = await pool.execute(countSql, [...params])
    const total = countRows[0].total

    // 分页限定（最大 100 条/页，防止滥用）
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    const limit = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100)
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit
    params.push(String(limit), String(offset))

    const [rows] = await pool.execute(sql, params)
    return { list: rows, total, page: Number(page), pageSize: limit }
  }

  /** ── 根据 ID 查询单台设备 ── */
  static async findById(id) {
    const [rows] = await pool.execute(
      `SELECT ${COLUMNS} FROM devices WHERE id = ?`, [id]
    )
    return rows[0] || null
  }

  /** ── 新增设备 ── */
  static async create({ name, model, location, status, last_maintenance_date }) {
    const [result] = await pool.execute(
      'INSERT INTO devices (name, model, location, status, last_maintenance_date) VALUES (?, ?, ?, ?, ?)',
      [name, model, location, status || 'normal', last_maintenance_date || null]
    )
    return this.findById(result.insertId)   // 返回完整的插入记录
  }

  /** ── 更新设备（支持部分字段更新） ── */
  static async update(id, fields) {
    // 只更新实际传入的字段
    const allowed = ['name', 'model', 'location', 'status', 'last_maintenance_date']
    const updates = []
    const params = []

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = ?`)
        params.push(fields[key])
      }
    }

    if (updates.length === 0) return { noChange: true }

    // 执行更新并检查影响行数（避免 TOCTOU 竞态）
    params.push(id)
    const [result] = await pool.execute(
      `UPDATE devices SET ${updates.join(', ')} WHERE id = ?`, params
    )
    if (result.affectedRows === 0) return { notFound: true }
    return this.findById(id)
  }

  /** ── 删除设备（硬删除） ── */
  static async delete(id) {
    const [result] = await pool.execute('DELETE FROM devices WHERE id = ?', [id])
    return result.affectedRows > 0
  }

  /** ── Dashboard 统计数据 ── */
  static async getStats(maintenanceMonths, scrapMonths) {
    // 先执行生命周期流转规则
    if (maintenanceMonths && scrapMonths) {
      await this.applyLifecycleRules(maintenanceMonths, scrapMonths)
    }

    // Q1: 各状态计数 (GROUP BY)
    const [statusRows] = await pool.execute(
      `SELECT status, COUNT(*) AS count FROM devices GROUP BY status`
    )
    const total = statusRows.reduce((sum, r) => sum + r.count, 0)
    const statusMap = {}
    for (const r of statusRows) statusMap[r.status] = r.count

    // Q2: 即将维保计数 (TIMESTAMPDIFF 按月计算，排除已报废)
    const [dueRows] = await pool.execute(
      `SELECT COUNT(*) AS count FROM devices
       WHERE status != 'scrapped'
         AND last_maintenance_date IS NOT NULL
         AND TIMESTAMPDIFF(MONTH, last_maintenance_date, CURDATE()) >= 11`
    )

    // Q3: 最近 5 台新增设备
    const [recentRows] = await pool.execute(
      `SELECT ${COLUMNS} FROM devices ORDER BY created_at DESC LIMIT 5`
    )

    return {
      total,
      byStatus: {
        normal: statusMap.normal || 0,
        maintenance: statusMap.maintenance || 0,
        scrapped: statusMap.scrapped || 0
      },
      maintenanceDue: dueRows[0].count,
      recent: recentRows
    }
  }

  /**
   * 根据生命周期规则自动流转设备状态
   * @param {number} maintenanceMonths 未维保 N 月 → 维保中
   * @param {number} scrapMonths       维保中 N 月 → 已报废
   * @returns {{ updated: number }} 更新的设备数
   */
  static async applyLifecycleRules(maintenanceMonths, scrapMonths) {
    let updated = 0

    // 规则 1: 正常 → 维保中（超过 maintenanceMonths 个月未维保）
    const [r1] = await pool.execute(
      `UPDATE devices SET status = 'maintenance'
       WHERE status = 'normal'
         AND last_maintenance_date IS NOT NULL
         AND TIMESTAMPDIFF(MONTH, last_maintenance_date, CURDATE()) >= ?`,
      [maintenanceMonths]
    )
    updated += r1.affectedRows

    // 规则 2: 维保中 → 已报废（状态停留在 maintenance 超过 scrapMonths 个月）
    // 使用 updated_at 近似判断进入维保状态的时长
    const [r2] = await pool.execute(
      `UPDATE devices SET status = 'scrapped'
       WHERE status = 'maintenance'
         AND TIMESTAMPDIFF(MONTH, updated_at, CURDATE()) >= ?`,
      [scrapMonths]
    )
    updated += r2.affectedRows

    return { updated }
  }
}

export default Device
