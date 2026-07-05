import bcrypt from 'bcryptjs'
import pool from './config/db.js'

async function seed() {
  // 创建 admin
  const adminHash = await bcrypt.hash('admin123', 10)
  await pool.execute(
    'INSERT IGNORE INTO users (username, password, nickname, role) VALUES (?, ?, ?, ?)',
    ['admin', adminHash, '系统管理员', 'admin']
  )
  console.log('[Seed] Admin user: admin / admin123')

  // 创建 operator
  const opHash = await bcrypt.hash('123456', 10)
  const [opResult] = await pool.execute(
    'INSERT IGNORE INTO users (username, password, nickname, role) VALUES (?, ?, ?, ?)',
    ['operator1', opHash, '操作员小王', 'operator']
  )

  if (opResult.affectedRows > 0) {
    console.log('[Seed] Operator user created: operator1 / 123456')
    // 给 operator 默认授权（仅查看+新增）
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
