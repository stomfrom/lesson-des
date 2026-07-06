import 'dotenv/config'

/**
 * ====================================================
 * 全局配置模块
 * ====================================================
 * 集中管理应用配置，启动时校验必需的环境变量。
 * 所有配置项优先从 .env 文件读取，缺失时使用兜底值。
 * 生产模式下关键变量缺失直接退出进程，避免带病运行。
 * ====================================================
 */

// 必需的环境变量清单 —— 启动时逐个检查，缺失则退出
const requiredEnvVars = ['DB_USER', 'DB_NAME', 'DB_PASSWORD']

// JWT 密钥特殊处理：生产强制要求设置，开发环境给警告兜底
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[FATAL] JWT_SECRET is required in production')
    process.exit(1)
  }
  console.warn('[WARN] JWT_SECRET not set — using dev-only fallback. NEVER use this in production.')
  process.env.JWT_SECRET = 'dev-only-insecure-fallback-key-change-me'
}

for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    console.error(`[FATAL] Missing required environment variable: ${key}`)
    process.exit(1)
  }
}

export default {
  /** 服务监听端口 */
  port: parseInt(process.env.PORT, 10) || 3000,

  /** 运行环境: development / production */
  env: process.env.NODE_ENV || 'development',

  /** JWT 认证配置 */
  jwt: {
    secret: process.env.JWT_SECRET,                            // 签名密钥
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'              // Token 有效期
  },

  /** MySQL 连接池配置 */
  db: {
    host: process.env.DB_HOST || 'localhost',                  // 数据库主机
    port: parseInt(process.env.DB_PORT, 10) || 3306,           // 数据库端口
    user: process.env.DB_USER,                                 // 数据库用户
    password: process.env.DB_PASSWORD,                         // 数据库密码
    database: process.env.DB_NAME,                             // 数据库名称
    waitForConnections: true,                                  // 连接耗尽时是否等待
    connectionLimit: 10,                                       // 最大连接数
    queueLimit: 50,                                            // 等待队列上限
    connectTimeout: 10000,                                     // 连接超时(ms)
    enableKeepAlive: true,                                     // 保持心跳
    keepAliveInitialDelay: 0                                   // 心跳初始延迟(ms)
  }
}
