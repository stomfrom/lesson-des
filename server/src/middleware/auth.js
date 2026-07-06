/**
 * ====================================================
 * JWT 认证中间件
 * ====================================================
 * 职责：
 * 1. 从 Authorization header 提取 Bearer token
 * 2. 验证 JWT 签名和有效期
 * 3. 校验用户是否仍存在于数据库（防止已删除用户继续访问）
 * 4. 为 admin 跳过权限查表，为 operator 加载权限列表
 * 5. 将用户身份和权限注入 req.user / req.permissions
 *
 * 注意：auth 函数不是工厂——它直接作为中间件使用。
 * ====================================================
 */
import jwt from 'jsonwebtoken'
import config from '../config/index.js'
import Permission from '../models/Permission.js'
import User from '../models/User.js'

export default async function authMiddleware(req, res, next) {
  // 步骤 1: 取 Authorization header
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未登录，请先登录' })
  }

  // 步骤 2: 解析并验证 JWT
  const token = header.slice(7)                           // 去掉 "Bearer " 前缀
  try {
    const decoded = jwt.verify(token, config.jwt.secret)

    // 步骤 3: 校验用户是否仍存在（防止 "删号不停权"）
    const user = await User.findById(decoded.id)
    if (!user) {
      return res.status(401).json({ code: 401, message: '用户已被删除' })
    }

    // 步骤 4: 将解码后的用户信息挂到请求对象上
    req.user = decoded

    // 步骤 5: admin 拥有所有权限，直接放行
    if (decoded.role === 'admin') {
      return next()
    }

    // 步骤 6: operator 从 permissions 表加载权限列表
    const perms = await Permission.findByUserId(decoded.id)
    req.permissions = perms.reduce((acc, p) => {
      if (!acc[p.resource]) acc[p.resource] = []
      acc[p.resource].push(p.action)
      return acc
    }, {})
    next()
  } catch (err) {
    // 区分 JWT 错误和系统错误
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      const message = err.name === 'TokenExpiredError'
        ? '登录已过期，请重新登录'
        : '无效的登录凭证'
      return res.status(401).json({ code: 401, message })
    }
    // 数据库异常等非 JWT 错误委托给全局错误处理器
    next(err)
  }
}
