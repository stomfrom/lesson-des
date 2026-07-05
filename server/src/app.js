import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import config from './config/index.js'
import pool from './config/db.js'
import routes from './routes/index.js'
import errorHandler from './middleware/errorHandler.js'

const app = express()

// ─── 安全中间件 ───
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}))

// ─── 请求限流 ───
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { code: 429, message: '请求过于频繁，请稍后再试' }
}))

// ─── 日志（开发/生产区分格式） ───
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'))

// ─── Body 解析 ───
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))

// ─── 路由总控 ───
app.use('/api', routes)

// ─── 全局错误处理 ───
app.use(errorHandler)

// ─── 启动服务 ───
const server = app.listen(config.port, () => {
  console.log(`[Shixun Server] Running at http://localhost:${config.port}`)
})

// ─── 优雅关闭 ───
async function gracefulShutdown(signal) {
  console.log(`\n[Shixun Server] Received ${signal}, shutting down gracefully...`)
  server.close(async () => {
    try {
      await pool.end()
      console.log('[Shixun Server] Database connections closed.')
    } catch (err) {
      console.error('[Shixun Server] Error closing database:', err.message)
    }
    process.exit(0)
  })
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
