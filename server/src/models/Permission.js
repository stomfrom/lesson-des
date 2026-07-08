/**
 * ====================================================
 * 权限模型 (Permission)
 * ====================================================
 *
 * 【答辩核心思路】
 * 这个模块管理用户的细粒度操作权限（谁可以对什么资源做什么操作）。
 *
 * 最关键的方法是 bulkSetPermissions：
 *   它是先删除旧权限，再插入新权限的组合操作。
 *   如果中间崩溃（比如服务器断电），权限数据会永久丢失。
 *   所以必须用数据库事务来保护——要么全部成功，要么全部回滚。
 *
 * getPermissionsByUsers 使用一次 IN 查询替代 N 次单条查询，
 * 避免 N+1 性能问题。
 * ====================================================
 */
import pool from '../config/db.js'

class Permission {

  /** 查询某个用户拥有的全部权限 */
  static async findByUserId(userId) {
    const [rows] = await pool.execute(
      'SELECT resource, action FROM permissions WHERE user_id = ?',
      [userId]
    )
    return rows
  }

  /** 判断某个用户是否有某个特定权限 */
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
   * ── 批量设置用户权限（事务保护） ──
   *
   * 这是权限系统的核心方法。执行流程：
   *   ① 从连接池取一条连接
   *   ② BEGIN TRANSACTION
   *   ③ DELETE 该用户该资源的所有旧权限
   *   ④ INSERT 新权限列表
   *   ⑤ COMMIT（全部成功）或 ROLLBACK（出错时回滚）
   *   ⑥ 释放连接回连接池
   *
   * 如果不加事务，在第③步和第④步之间如果进程崩溃，
   * 用户的所有权限将永久丢失。
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

      // 插入新权限（如果有的话）
      if (actions.length > 0) {
        const placeholders = actions.map(() => '(?, ?, ?)').join(', ')
        const values = actions.flatMap(action => [userId, resource, action])
        await conn.execute(
          `INSERT INTO permissions (user_id, resource, action) VALUES ${placeholders}`,
          values
        )
      }

      await conn.commit()         // 全部成功，提交
    } catch (err) {
      await conn.rollback()       // 出错了，回滚到删除前的状态
      throw err
    } finally {
      conn.release()              // 释放连接回连接池
    }
  }

  /**
   * ── 批量查询多个用户的所有权限 ──
   *
   * 用 IN 查询一次性查出所有用户的权限，避免遍历用户时逐条查询
   * （每查一次就是一次网络往返）。这就是 N+1 问题的标准解法。
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
