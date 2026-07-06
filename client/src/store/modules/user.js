/**
 * ====================================================
 * 用户状态 store
 * ====================================================
 * 管理 JWT token 和用户信息，与 localStorage 双向同步。
 *
 * 初始化时从 localStorage 恢复（含 try/catch 防止
 * 损坏数据导致应用崩溃）。logout() 同时清理 store
 * 和 localStorage，保持两者一致。
 * ====================================================
 */
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => {
    // 从 localStorage 恢复持久化的用户数据
    let info = null
    try { info = JSON.parse(localStorage.getItem('userInfo') || 'null') } catch {}
    return {
      token: localStorage.getItem('token') || '',
      userInfo: info
    }
  },
  getters: {
    /** 是否已登录（token 非空即为已登录） */
    isLoggedIn: (state) => !!state.token
  },
  actions: {
    /** 设置 token（同步到 localStorage） */
    setToken(token) {
      this.token = token
      localStorage.setItem('token', token)
    },
    /** 设置用户信息（同步到 localStorage） */
    setUserInfo(info) {
      this.userInfo = info
      localStorage.setItem('userInfo', JSON.stringify(info))
    },
    /** 退出登录：清理 store + localStorage */
    logout() {
      this.token = ''
      this.userInfo = null
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
    }
  }
})
