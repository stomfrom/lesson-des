/**
 * ====================================================
 * 设备模型 (Device)
 * ====================================================
 *
 * 【答辩核心思路】
 * 这是数据量最大的模块，包含了设备的 CRUD、分页查询、统计和生命周期流转。
 *
 * 关键设计点：
 * 1. findAll 的分页使用 SQL 的 LIMIT/OFFSET，并限制最大 100 条/页
 * 2. LIKE 查询中的 % 和 _ 做了转义，避免被当作通配符
 * 3. update 方法先执行 UPDATE，再通过 affectedRows 判断是否成功
 *    （避免先 SELECT 再 UPDATE 的 TOCTOU 竞态问题）
 * 4. getStats 先执行自动流转，再做统计查询
 * 5. applyLifecycleRules 使用每台设备自己的阈值配置
 * ====================================================
 */
import pool from '../config/db.js'

/** 查询时返回的字段列表（明确写出每个字段，不用 SELECT *） */
const COLUMNS = 'id, name, model, location, status, last_maintenance_date, maintenance_interval, scrap_interval, created_at, updated_at'

class Device {

  /** ── 分页查询设备列表 ── */
  static async findAll({ name, status, page = 1, pageSize = 20 } = {}) {
    // WHERE 1=1 是一个技巧，方便后面动态拼接 AND 条件
    let sql = `SELECT ${COLUMNS} FROM devices WHERE 1=1`
    const params = []

    // 按设备名模糊搜索（转义 LIKE 通配符 % 和 _，防止用户输入"100%"时匹配到所有记录）
    if (name) {
      sql += ' AND name LIKE ?'
      params.push(`%${name.replace(/[%_]/g, '\\$&')}%`)
    }
    // 按状态筛选（支持多选，逗号分隔，如 "normal,maintenance"）
    if (status) {
      const statusList = String(status).split(',').filter(Boolean)
      if (statusList.length > 0) {
        const placeholders = statusList.map(() => '?').join(',')
        sql += ` AND status IN (${placeholders})`
        params.push(...statusList)
      }
    }

    // 总数查询（用于前端分页组件显示总条数）
    const countSql = sql.replace(`SELECT ${COLUMNS}`, 'SELECT COUNT(*) AS total')
    const [countRows] = await pool.execute(countSql, [...params])
    const total = countRows[0].total

    // 分页限定（最多 100 条/页，防止有人传 pageSize=999999 导致数据库压力过大）
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
  static async create({ name, model, location, status, last_maintenance_date, maintenance_interval, scrap_interval }) {
    // 使用参数化查询（? 占位符），防止 SQL 注入
    const [result] = await pool.execute(
      'INSERT INTO devices (name, model, location, status, last_maintenance_date, maintenance_interval, scrap_interval) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, model, location, status || 'normal', last_maintenance_date || null, maintenance_interval || 11, scrap_interval || 12]
    )
    // 返回完整记录，方便前端拿到时间戳等自动生成字段
    return this.findById(result.insertId)
  }

  /** ── 更新设备（支持部分字段更新） ── */
  static async update(id, fields) {
    const allowed = ['name', 'model', 'location', 'status', 'last_maintenance_date', 'maintenance_interval', 'scrap_interval']
    const updates = []
    const params = []

    // 只更新实际传入了的字段，没传的保持原样
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = ?`)
        params.push(fields[key])
      }
    }

    if (updates.length === 0) return { noChange: true }

    // 直接执行 UPDATE，然后检查 affectedRows
    // 这种方法比"先 SELECT 检查存在性 → 再 UPDATE"更安全，
    // 避免了 TOCTOU（Time-of-Check-Time-of-Use）竞态问题
    params.push(id)
    const [result] = await pool.execute(
      `UPDATE devices SET ${updates.join(', ')} WHERE id = ?`, params
    )
    if (result.affectedRows === 0) return { notFound: true }
    return this.findById(id)
  }

  /** ── 删除设备 ── */
  static async delete(id) {
    const [result] = await pool.execute('DELETE FROM devices WHERE id = ?', [id])
    return result.affectedRows > 0
  }

  /** ── Dashboard 统计数据 + 生命周期自动流转 ── */
  static async getStats() {
    // ★ 先执行生命周期自动流转（每台设备用各自配置的阈值）
    await this.applyLifecycleRules()

    // Q1: 各状态的数量（GROUP BY 一次查完）
    const [statusRows] = await pool.execute(
      `SELECT status, COUNT(*) AS count FROM devices GROUP BY status`
    )
    const total = statusRows.reduce((sum, r) => sum + r.count, 0)
    const statusMap = {}
    for (const r of statusRows) statusMap[r.status] = r.count

    // Q2: 即将维保的设备数量（TIMESTAMPDIFF 按月计算，排除已报废）
    const [dueRows] = await pool.execute(
      `SELECT COUNT(*) AS count FROM devices
       WHERE status != 'scrapped'
         AND last_maintenance_date IS NOT NULL
         AND TIMESTAMPDIFF(MONTH, last_maintenance_date, CURDATE()) >= 11`
    )

    // Q3: 最近添加的 5 台设备
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
   * ── 设备生命周期自动流转 ──
   *
   * 【答辩亮点】
   * 这是系统的自动化核心。每台设备在创建时可以配置两个阈值：
   *   maintenance_interval: 超过 N 个月未维保 → 自动变为"维保中"
   *   scrap_interval:       处于"维保中"超过 M 个月 → 自动变为"已报废"
   *
   * 这两个值存在设备的表里，所以每台设备可以有不同的配置。
   * 每次访问 Dashboard 时自动执行一次全量检查。
   *
   * 注意：SQL 中直接引用了字段名（maintenance_interval / scrap_interval），
   * 而不是用占位符传参，因为每台设备的值不同，要用自己的字段值来判断。
   */
  static async applyLifecycleRules() {
    let updated = 0

    // 规则1: 正常 → 维保中（超过设备自身配置的 maintenance_interval 个月未维保）
    const [r1] = await pool.execute(
      `UPDATE devices SET status = 'maintenance'
       WHERE status = 'normal'
         AND last_maintenance_date IS NOT NULL
         AND TIMESTAMPDIFF(MONTH, last_maintenance_date, CURDATE()) >= maintenance_interval`
    )
    updated += r1.affectedRows

    // 规则2: 维保中 → 已报废（处于维保中超过 scrap_interval 个月）
    const [r2] = await pool.execute(
      `UPDATE devices SET status = 'scrapped'
       WHERE status = 'maintenance'
         AND TIMESTAMPDIFF(MONTH, updated_at, CURDATE()) >= scrap_interval`
    )
    updated += r2.affectedRows

    return { updated }
  }
}

export default Device
