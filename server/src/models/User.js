import pool from '../config/db.js'
import bcrypt from 'bcryptjs'

const COLUMNS = 'id, username, nickname, role, created_at, updated_at'

class User {
  static async findById(id) {
    const [rows] = await pool.execute(
      `SELECT ${COLUMNS} FROM users WHERE id = ?`, [id]
    )
    return rows[0] || null
  }

  static async findByUsername(username) {
    const [rows] = await pool.execute(
      'SELECT id, username, password, nickname, role FROM users WHERE username = ?',
      [username]
    )
    return rows[0] || null
  }

  static async create({ username, password, nickname, role }) {
    const hashed = await bcrypt.hash(password, 10)
    const [result] = await pool.execute(
      'INSERT INTO users (username, password, nickname, role) VALUES (?, ?, ?, ?)',
      [username, hashed, nickname || '', role || 'operator']
    )
    return this.findById(result.insertId)
  }

  static async verifyPassword(plainText, hashed) {
    return bcrypt.compare(plainText, hashed)
  }
}

export default User
