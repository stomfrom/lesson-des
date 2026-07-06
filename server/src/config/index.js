import 'dotenv/config'

const requiredEnvVars = ['DB_USER', 'DB_NAME', 'DB_PASSWORD']

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
  port: parseInt(process.env.PORT, 10) || 3000,
  env: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 50,
    connectTimeout: 10000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  }
}
