/**
 * ====================================================
 * 种子脚本
 * ====================================================
 * 初始化默认用户（admin + operator）。
 * 通过环境变量 ADMIN_PASSWORD / OP_PASSWORD
 * 可覆盖默认密码，避免硬编码弱密码。
 *
 * 使用方式：node src/seed.js
 * ====================================================
 */
import bcrypt from 'bcryptjs'
import pool from './config/db.js'

async function seed() {
  // 支持通过环境变量自定义初始密码
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  const opPassword = process.env.OP_PASSWORD || '123456'

  // ── 创建管理员 ──
  const adminHash = await bcrypt.hash(adminPassword, 10)
  await pool.execute(
    'INSERT IGNORE INTO users (username, password, nickname, role) VALUES (?, ?, ?, ?)',
    ['admin', adminHash, '系统管理员', 'admin']
  )
  if (adminPassword === 'admin123') {
    console.log('[Seed] Admin user created (default password, CHANGE IMMEDIATELY)')
  } else {
    console.log('[Seed] Admin user created')
  }

  // ── 创建普通用户（operator） ──
  const opHash = await bcrypt.hash(opPassword, 10)
  const [opResult] = await pool.execute(
    'INSERT IGNORE INTO users (username, password, nickname, role) VALUES (?, ?, ?, ?)',
    ['operator1', opHash, '操作员小王', 'operator']
  )

  if (opResult.affectedRows > 0) {
    if (opPassword === '123456') {
      console.log('[Seed] Operator user created (default password, CHANGE IMMEDIATELY)')
    } else {
      console.log('[Seed] Operator user created')
    }
    // 默认授予查看 + 新增权限
    const [rows] = await pool.execute('SELECT id FROM users WHERE username = ?', ['operator1'])
    const opId = rows[0].id
    await pool.execute(
      'INSERT INTO permissions (user_id, resource, action) VALUES (?, ?, ?), (?, ?, ?)',
      [opId, 'device', 'read', opId, 'device', 'create']
    )
    console.log('[Seed] Granted read+create permissions to operator1')
  } else {
    console.log('[Seed] Operator user already exists')
  }

  await pool.end()
  console.log('[Seed] Done')
}

seed().catch(err => {
  console.error('[Seed] Error:', err.message)
  process.exit(1)
})
