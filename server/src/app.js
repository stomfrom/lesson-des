/**
 * ====================================================
 * Express 应用入口
 * ====================================================
 * 中间件注册顺序（严格按照职责分层）：
 *    Security   → helmet / cors / rate-limit
 *    Logging    → morgan
 *    Parsing    → express.json / urlencoded
 *    Routing    → /api/*
 *    Error      → errorHandler（必须最后注册）
 *
 * 进程生命周期：
 *    - SIGTERM / SIGINT 触发优雅关闭
 *    - unhandledRejection / uncaughtException 兜底
 * ====================================================
 */
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

// ═══════════════════════════════════════════
// 安全中间件层
// ═══════════════════════════════════════════
app.use(helmet())                                // HTTP 安全头（XSS/点击劫持等）
app.use(cors({                                   // 跨域访问控制
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}))

// ═══════════════════════════════════════════
// 请求限流层（全局限流 100 次 / 15 分钟）
// ═══════════════════════════════════════════
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { code: 429, message: '请求过于频繁，请稍后再试' }
}))

// ═══════════════════════════════════════════
// 日志层
// ═══════════════════════════════════════════
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'))

// ═══════════════════════════════════════════
// Body 解析层（限制 10KB 防止大请求攻击）
// ═══════════════════════════════════════════
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))

// ═══════════════════════════════════════════
// 路由层
// ═══════════════════════════════════════════
app.use('/api', routes)

// ═══════════════════════════════════════════
// 全局错误处理器（必须注册在路由之后）
// ═══════════════════════════════════════════
app.use(errorHandler)

// ═══════════════════════════════════════════
// 服务启动
// ═══════════════════════════════════════════
const server = app.listen(config.port, () => {
  console.log(`[Shixun Server] Running at http://localhost:${config.port}`)
})

// ═══════════════════════════════════════════
// 优雅关闭 —— 释放连接池后退出，10s 超时强制
// ═══════════════════════════════════════════
async function gracefulShutdown(signal) {
  console.log(`\n[Shixun Server] Received ${signal}, shutting down gracefully...`)

  const forceExit = setTimeout(() => {
    console.error('[Shixun Server] Forced shutdown after timeout')
    process.exit(1)
  }, 10000)

  server.close(async () => {
    try {
      await pool.end()
      console.log('[Shixun Server] Database connections closed.')
    } catch (err) {
      console.error('[Shixun Server] Error closing database:', err.message)
    }
    clearTimeout(forceExit)
    process.exit(0)
  })
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// ═══════════════════════════════════════════
// 全局异常兜底
// ═══════════════════════════════════════════
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Rejection:', reason instanceof Error ? reason.message : reason)
})
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err.message)
  process.exit(1)
})
