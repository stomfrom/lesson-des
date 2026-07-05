import pool from '../config/db.js'

const COLUMNS = 'id, name, model, location, status, last_maintenance_date, created_at, updated_at'

class Device {
  static async findAll({ name, status, page = 1, pageSize = 20 } = {}) {
    let sql = `SELECT ${COLUMNS} FROM devices WHERE 1=1`
    const params = []

    if (name) {
      sql += ' AND name LIKE ?'
      params.push(`%${name}%`)
    }
    if (status) {
      sql += ' AND status = ?'
      params.push(status)
    }

    // 总数查询
    const countSql = sql.replace(`SELECT ${COLUMNS}`, 'SELECT COUNT(*) AS total')
    const [countRows] = await pool.execute(countSql, [...params])
    const total = countRows[0].total

    // 分页查询
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    const limit = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100)
    const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit
    params.push(String(limit), String(offset))

    const [rows] = await pool.execute(sql, params)
    return { list: rows, total, page: Number(page), pageSize: limit }
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      `SELECT ${COLUMNS} FROM devices WHERE id = ?`, [id]
    )
    return rows[0] || null
  }

  static async create({ name, model, location, status, last_maintenance_date }) {
    const [result] = await pool.execute(
      'INSERT INTO devices (name, model, location, status, last_maintenance_date) VALUES (?, ?, ?, ?, ?)',
      [name, model, location, status || 'normal', last_maintenance_date || null]
    )
    return this.findById(result.insertId)
  }

  static async update(id, fields) {
    const existing = await this.findById(id)
    if (!existing) return { notFound: true }

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

    params.push(id)
    await pool.execute(
      `UPDATE devices SET ${updates.join(', ')} WHERE id = ?`, params
    )
    return this.findById(id)
  }

  static async delete(id) {
    const [result] = await pool.execute('DELETE FROM devices WHERE id = ?', [id])
    return result.affectedRows > 0
  }

  static async getStats() {
    // 各状态数量
    const [statusRows] = await pool.execute(
      `SELECT status, COUNT(*) AS count FROM devices GROUP BY status`
    )
    const total = statusRows.reduce((sum, r) => sum + r.count, 0)
    const statusMap = {}
    for (const r of statusRows) statusMap[r.status] = r.count

    // 即将维保设备（已报废除外，距上次维保 >= 11 个月）
    const [dueRows] = await pool.execute(
      `SELECT COUNT(*) AS count FROM devices
       WHERE status != 'scrapped'
         AND last_maintenance_date IS NOT NULL
         AND TIMESTAMPDIFF(MONTH, last_maintenance_date, CURDATE()) >= 11`
    )

    // 最近新增的 5 台设备
    const [recentRows] = await pool.execute(
      `SELECT ${COLUMNS} FROM devices ORDER BY created_at DESC LIMIT 5`
    )

    return {
      total,
      byStatus: { normal: statusMap.normal || 0, maintenance: statusMap.maintenance || 0, scrapped: statusMap.scrapped || 0 },
      maintenanceDue: dueRows[0].count,
      recent: recentRows
    }
  }
}

export default Device
