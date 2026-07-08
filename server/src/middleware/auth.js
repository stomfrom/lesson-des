/**
 * ====================================================
 * JWT 认证中间件
 * ====================================================
 *
 * 【答辩核心思路】
 * 这个中间件是系统的"守门员"，每个受保护的请求都会经过它。
 * 它的工作链路是：
 *   提取 Token → 验证签名 → 检查用户是否存在 → 加载权限 → 放行
 *
 * 注意两个安全细节：
 * 1. 即使 JWT 没过期，也要检查用户是否已被管理员删除（防"删号不停权"）
 * 2. JWT 报错（过期/无效）和系统报错（DB 异常）分开处理，前者返回 401，后者交给全局错误
 * ====================================================
 */
import jwt from 'jsonwebtoken'
import config from '../config/index.js'
import Permission from '../models/Permission.js'
import User from '../models/User.js'

export default async function authMiddleware(req, res, next) {
  // ── 第一步：从请求头取 token ──
  // 客户端发来的 Authorization header 格式必须是 "Bearer <token>"
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未登录，请先登录' })
  }

  // ── 第二步：验证 JWT 签名 ──
  const token = header.slice(7)                    // 去掉 "Bearer " 前缀，只取 token 字符串
  try {
    const decoded = jwt.verify(token, config.jwt.secret)    // 如果签名不对或过期，这里会抛异常

    // ── 第三步：查数据库校验用户是否仍存在（关键安全措施） ──
    const user = await User.findById(decoded.id)
    if (!user) {
      // 用户已被管理员删除，但 token 还在有效期内
      return res.status(401).json({ code: 401, message: '用户已被删除' })
    }

    // ── 第四步：把用户身份信息挂到 req 上，供后续中间件使用 ──
    req.user = decoded

    // ── 第五步：admin 放行（权限路由不查表） ──
    if (decoded.role === 'admin') {
      return next()
    }

    // ── 第六步：operator 从 permissions 表加载权限列表 ──
    const perms = await Permission.findByUserId(decoded.id)
    // 转换成 { resource: [action, action], ... } 的格式，方便权限中间件快速判断
    req.permissions = perms.reduce((acc, p) => {
      if (!acc[p.resource]) acc[p.resource] = []
      acc[p.resource].push(p.action)
      return acc
    }, {})
    next()
  } catch (err) {
    // ── 区分 JWT 错误和系统错误 ──
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      const message = err.name === 'TokenExpiredError'
        ? '登录已过期，请重新登录'
        : '无效的登录凭证'
      return res.status(401).json({ code: 401, message })
    }
    // 数据库异常等非 JWT 错误，交给全局错误处理器
    next(err)
  }
}
