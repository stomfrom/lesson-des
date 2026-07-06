/**
 * ====================================================
 * 权限管理 API 模块
 * 管理员操作用户列表和权限分配
 * ====================================================
 */
import request from './request.js'

/** 获取用户列表（含权限） */
export function getUsers() {
  return request.get('/users')
}

/** 查询指定用户的权限 */
export function getUserPermissions(userId) {
  return request.get(`/users/${userId}/permissions`)
}

/** 设置用户权限 */
export function setUserPermissions(userId, data) {
  return request.put(`/users/${userId}/permissions`, data)
}

/** 新增用户（调用注册接口） */
export function createUser(data) {
  return request.post('/auth/register', data)
}

/** 删除用户 */
export function deleteUser(userId) {
  return request.delete(`/users/${userId}`)
}
