import pool from '../config/db.js'

class Permission {
  static async findByUserId(userId) {
    const [rows] = await pool.execute(
      'SELECT resource, action FROM permissions WHERE user_id = ?',
      [userId]
    )
    return rows
  }

  static async hasPermission(userId, resource, action) {
    const [rows] = await pool.execute(
      'SELECT 1 FROM permissions WHERE user_id = ? AND resource = ? AND action = ?',
      [userId, resource, action]
    )
    return rows.length > 0
  }

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

  static async bulkSetPermissions(userId, resource, actions) {
    // 先清除该用户该资源的所有权限
    await pool.execute(
      'DELETE FROM permissions WHERE user_id = ? AND resource = ?',
      [userId, resource]
    )
    // 再批量插入
    if (actions.length > 0) {
      const placeholders = actions.map(() => '(?, ?, ?)').join(', ')
      const values = actions.flatMap(action => [userId, resource, action])
      await pool.execute(
        `INSERT INTO permissions (user_id, resource, action) VALUES ${placeholders}`,
        values
      )
    }
  }

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
