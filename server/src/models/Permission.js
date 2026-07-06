/**
 * ====================================================
 * 权限模型 (Permission)
 * ====================================================
 * 数据表: permissions
 * 职责: 用户的细粒度操作权限管理
 *
 * 关键设计：
 * - bulkSetPermissions 使用数据库事务确保原子性
 *   （先清后插，崩溃时自动回滚）
 * - getPermissionsByUsers 批量查询避免 N+1 问题
 * ====================================================
 */
import pool from '../config/db.js'

class Permission {

  /** 查询某用户的所有权限 */
  static async findByUserId(userId) {
    const [rows] = await pool.execute(
      'SELECT resource, action FROM permissions WHERE user_id = ?',
      [userId]
    )
    return rows
  }

  /** 判断某用户是否有某资源的某操作权限 */
  static async hasPermission(userId, resource, action) {
    const [rows] = await pool.execute(
      'SELECT 1 FROM permissions WHERE user_id = ? AND resource = ? AND action = ?',
      [userId, resource, action]
    )
    return rows.length > 0
  }

  /** 设置或取消单条权限 */
  static async setPermission(userId, resource, action, granted) {
    if (granted) {
      await pool.execute(
        'INSERT IGNORE INTO permissions (user_id, resource, action) VALUES (?, ?, ?)',
        [userId, resource, action]
      )
    } else {
      await pool.execute(
        'DELETE FROM permissions WHERE user_id = ? AND resource = ? AND action = ?',
        [userId, resource, action]
      )
    }
  }

  /**
   * 批量设置某用户对某资源的所有操作权限（原子操作）
   * 先清空后批量插入，用事务保护防止中间态数据丢失
   */
  static async bulkSetPermissions(userId, resource, actions) {
    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      // 清空旧权限
      await conn.execute(
        'DELETE FROM permissions WHERE user_id = ? AND resource = ?',
        [userId, resource]
      )
      // 插入新权限
      if (actions.length > 0) {
        const placeholders = actions.map(() => '(?, ?, ?)').join(', ')
        const values = actions.flatMap(action => [userId, resource, action])
        await conn.execute(
          `INSERT INTO permissions (user_id, resource, action) VALUES ${placeholders}`,
          values
        )
      }
      await conn.commit()
    } catch (err) {
      await conn.rollback()       // 异常时回滚到删除前的状态
      throw err
    } finally {
      conn.release()              // 释放连接回连接池
    }
  }

  /**
   * 批量查询多个用户的所有权限（避免 N+1）
   * 传入空数组时直接返回空结果
   */
  static async getPermissionsByUsers(userIds) {
    if (userIds.length === 0) return []
    const placeholders = userIds.map(() => '?').join(',')
    const [rows] = await pool.execute(
      `SELECT user_id, resource, action FROM permissions WHERE user_id IN (${placeholders}) ORDER BY user_id`,
      userIds
    )
    return rows
  }
}

export default Permission
