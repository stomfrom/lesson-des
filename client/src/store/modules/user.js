import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => {
    let info = null
    try { info = JSON.parse(localStorage.getItem('userInfo') || 'null') } catch {}
    return {
      token: localStorage.getItem('token') || '',
      userInfo: info
    }
  },
  getters: {
    isLoggedIn: (state) => !!state.token
  },
  actions: {
    setToken(token) {
      this.token = token
      localStorage.setItem('token', token)
    },
    setUserInfo(info) {
      this.userInfo = info
      localStorage.setItem('userInfo', JSON.stringify(info))
    },
    logout() {
      this.token = ''
      this.userInfo = null
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
    }
  }
})
