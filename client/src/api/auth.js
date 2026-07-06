/**
 * ====================================================
 * 认证 API 模块
 * 登录、注册、用户信息
 * ====================================================
 */
import request from './request.js'

/** 登录 */
export function login(data) {
  return request.post('/auth/login', data)
}

/** 注册 */
export function register(data) {
  return request.post('/auth/register', data)
}

/** 获取当前登录用户信息 */
export function getProfile() {
  return request.get('/auth/profile')
}
