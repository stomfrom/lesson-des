/**
 * ====================================================
 * Express 应用入口
 * ====================================================
 *
 * 【答辩核心思路】
 * 中间件的注册顺序决定了请求的处理链路。从上到下依次是：
 *   安全层 → 限流层 → 日志层 → 解析层 → 路由层 → 错误处理
 * 这个顺序是固定的：安全必须在最前面，错误处理必须在最后面。
 *
 * 进程生命周期管理：
 *   SIGTERM/SIGINT 触发优雅关闭（先关 HTTP 服务，再释放 DB 连接池）
 *   unhandledRejection / uncaughtException 作为最后一道防线
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

// ════════════════════════════════════════════════════════════
// 第一层：安全中间件
// ════════════════════════════════════════════════════════════
app.use(helmet())                                // 设置 11 个 HTTP 安全头（防XSS/点击劫持/MIME嗅探等）
app.use(cors({                                   // 跨域请求限制，只允许前端地址访问
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}))

// ════════════════════════════════════════════════════════════
// 第二层：全局限流（15分钟内最多100次请求，防暴力/DoS）
// ════════════════════════════════════════════════════════════
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { code: 429, message: '请求过于频繁，请稍后再试' }
}))

// ════════════════════════════════════════════════════════════
// 第三层：日志记录（开发环境用dev格式，生产环境用combined格式）
// ════════════════════════════════════════════════════════════
app.use(morgan(config.env === 'production' ? 'combined' : 'dev'))

// ════════════════════════════════════════════════════════════
// 第四层：请求体解析（限制10KB防止大payload攻击）
// ════════════════════════════════════════════════════════════
app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: true, limit: '10kb' }))

// ════════════════════════════════════════════════════════════
// 第五层：路由层（/api 下的所有路由，具体实现在 routes/ 目录）
// ════════════════════════════════════════════════════════════
app.use('/api', routes)

// ════════════════════════════════════════════════════════════
// 第六层：全局错误处理器（必须放在所有路由之后，否则不会生效）
// ════════════════════════════════════════════════════════════
app.use(errorHandler)

// ════════════════════════════════════════════════════════════
// 启动 HTTP 服务
// ════════════════════════════════════════════════════════════
const server = app.listen(config.port, () => {
  console.log(`[Shixun Server] Running at http://localhost:${config.port}`)
})

// ════════════════════════════════════════════════════════════
// 优雅关闭逻辑
// 先关 HTTP 服务（停止接收新请求），再释放 DB 连接池
// 10 秒超时强制退出，防止进程永远挂起
// ════════════════════════════════════════════════════════════
async function gracefulShutdown(signal) {
  console.log(`\n[Shixun Server] Received ${signal}, shutting down gracefully...`)

  const forceExit = setTimeout(() => {            // 10 秒后强制退出
    console.error('[Shixun Server] Forced shutdown after timeout')
    process.exit(1)
  }, 10000)

  server.close(async () => {                      // 先关 HTTP
    try {
      await pool.end()                            // 再关 DB
      console.log('[Shixun Server] Database connections closed.')
    } catch (err) {
      console.error('[Shixun Server] Error closing database:', err.message)
    }
    clearTimeout(forceExit)
    process.exit(0)
  })
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))      // Docker/k8s 停止信号
process.on('SIGINT', () => gracefulShutdown('SIGINT'))         // Ctrl+C 信号

// ════════════════════════════════════════════════════════════
// 全局异常兜底（防止未捕获的 Promise 拒绝导致进程崩溃）
// ════════════════════════════════════════════════════════════
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Rejection:', reason instanceof Error ? reason.message : reason)
})
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err.message)
  process.exit(1)                                 // 未捕获异常直接退出，避免未知状态
})
