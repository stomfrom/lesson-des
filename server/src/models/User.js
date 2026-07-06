/**
 * ====================================================
 * 用户模型 (User)
 * ====================================================
 * 数据表: users
 * 职责: 用户信息的增、删、查、密码验证
 * 注意: 密码使用 bcryptjs 加盐哈希存储，绝不存明文
 * ====================================================
 */
import pool from '../config/db.js'
import bcrypt from 'bcryptjs'

/** 公开返回的字段列表（排除 password） */
const COLUMNS = 'id, username, nickname, role, created_at, updated_at'

class User {

  /** 根据 ID 查询用户（不含密码） */
  static async findById(id) {
    const [rows] = await pool.execute(
      `SELECT ${COLUMNS} FROM users WHERE id = ?`, [id]
    )
    return rows[0] || null
  }

  /** 根据用户名查询（含密码，仅登录时使用） */
  static async findByUsername(username) {
    const [rows] = await pool.execute(
      'SELECT id, username, password, nickname, role FROM users WHERE username = ?',
      [username]
    )
    return rows[0] || null
  }

  /** 创建新用户（密码自动哈希） */
  static async create({ username, password, nickname, role }) {
    const hashed = await bcrypt.hash(password, 10)              // bcrypt 加盐 10 轮
    const [result] = await pool.execute(
      'INSERT INTO users (username, password, nickname, role) VALUES (?, ?, ?, ?)',
      [username, hashed, nickname || '', role || 'operator']
    )
    return this.findById(result.insertId)                       // 返回完整用户信息
  }

  /** 验证明文密码与哈希是否匹配 */
  static async verifyPassword(plainText, hashed) {
    return bcrypt.compare(plainText, hashed)
  }

  /** 删除用户（permissions 由数据库外键 CASCADE 自动清理） */
  static async delete(id) {
    const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [id])
    return result.affectedRows > 0
  }
}

export default User
