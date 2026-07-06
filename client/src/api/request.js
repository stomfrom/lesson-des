/**
 * ====================================================
 * Axios HTTP 客户端
 * ====================================================
 * 功能：
 * - 请求拦截器自动注入 JWT
 * - 响应拦截器解包 response.data
 * - 401 自动清除凭证并跳转登录页
 * ====================================================
 */
import axios from 'axios'
import { useUserStore } from '@/store/modules/user'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
})

/**
 * 响应拦截器（先注册，确保后执行）
 * 1. 成功时解包 response.data
 * 2. 401 时同步清理 Pinia store 和 localStorage
 */
request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      useUserStore().logout()                       // 同步清理 Pinia + localStorage
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'             // 跳转登录
      }
    }
    return Promise.reject(error)
  }
)

/**
 * 请求拦截器
 * 从 localStorage 读取 token，注入 Authorization header
 */
request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, (error) => Promise.reject(error))

export default request
