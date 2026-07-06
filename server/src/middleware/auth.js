import jwt from 'jsonwebtoken'
import config from '../config/index.js'
import Permission from '../models/Permission.js'
import User from '../models/User.js'

export default async function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未登录，请先登录' })
  }

  const token = header.slice(7)
  try {
    const decoded = jwt.verify(token, config.jwt.secret)

    // 校验用户是否仍存在
    const user = await User.findById(decoded.id)
    if (!user) {
      return res.status(401).json({ code: 401, message: '用户已被删除' })
    }

    req.user = decoded

    // admin 拥有所有权限，不用查表
    if (decoded.role === 'admin') {
      return next()
    }

    // operator 加载权限列表
    const perms = await Permission.findByUserId(decoded.id)
    req.permissions = perms.reduce((acc, p) => {
      if (!acc[p.resource]) acc[p.resource] = []
      acc[p.resource].push(p.action)
      return acc
    }, {})
    next()
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      const message = err.name === 'TokenExpiredError' ? '登录已过期，请重新登录' : '无效的登录凭证'
      return res.status(401).json({ code: 401, message })
    }
    next(err)
  }
}
