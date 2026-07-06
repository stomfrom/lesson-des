/**
 * ====================================================
 * 设备 API 模块
 * 封装设备相关的所有后端请求
 * ====================================================
 */
import request from './request.js'

/** 获取设备列表（支持分页+筛选） */
export function getDevices(params = {}, extra = {}) {
  return request.get('/devices', { params, ...extra })
}

/** 获取单台设备详情 */
export function getDevice(id) {
  return request.get(`/devices/${id}`)
}

/** 新增设备 */
export function createDevice(data) {
  return request.post('/devices', data)
}

/** 更新设备 */
export function updateDevice(id, data) {
  return request.put(`/devices/${id}`, data)
}

/** 删除设备 */
export function deleteDevice(id) {
  return request.delete(`/devices/${id}`)
}

/** 获取 Dashboard 统计数据 */
export function getDeviceStats() {
  return request.get('/devices/stats')
}
