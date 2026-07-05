import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import Permission from '../models/Permission.js'
import config from '../config/index.js'

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  )
}

async function enrichUserInfo(user) {
  const { password: _, ...userInfo } = user
  if (user.role === 'operator') {
    const perms = await Permission.findByUserId(user.id)
    userInfo.permissions = perms
  }
  // admin 无需返回 permissions（有全部权限）
  return userInfo
}

export async function login(req, res, next) {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ code: 400, message: '用户名和密码不能为空' })
    }

    const user = await User.findByUsername(username)
    if (!user) {
      return res.status(401).json({ code: 401, message: '用户名或密码错误' })
    }

    const valid = await User.verifyPassword(password, user.password)
    if (!valid) {
      return res.status(401).json({ code: 401, message: '用户名或密码错误' })
    }

    const token = generateToken(user)
    const userInfo = await enrichUserInfo(user)
    res.json({ code: 200, data: { token, userInfo }, message: '登录成功' })
  } catch (err) {
    next(err)
  }
}

export async function register(req, res, next) {
  try {
    const { username, password, nickname } = req.body
    if (!username || !password) {
      return res.status(400).json({ code: 400, message: '用户名和密码不能为空' })
    }
    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ code: 400, message: '用户名长度 3-50 个字符' })
    }
    if (password.length < 6) {
      return res.status(400).json({ code: 400, message: '密码至少 6 个字符' })
    }

    const existing = await User.findByUsername(username)
    if (existing) {
      return res.status(409).json({ code: 409, message: '用户名已存在' })
    }

    const user = await User.create({ username, password, nickname })
    const token = generateToken(user)
    const userInfo = await enrichUserInfo(user)
    res.status(201).json({ code: 201, data: { token, userInfo }, message: '注册成功' })
  } catch (err) {
    next(err)
  }
}

export async function getProfile(req, res, next) {
  try {
    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ code: 404, message: '用户不存在' })
    const userInfo = await enrichUserInfo(user)
    res.json({ code: 200, data: userInfo })
  } catch (err) {
    next(err)
  }
}
