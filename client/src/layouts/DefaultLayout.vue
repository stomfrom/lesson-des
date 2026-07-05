<template>
  <div class="layout-default">
    <header class="layout-header">
      <div class="header-left">
        <h1 class="logo">星维设备管理</h1>
        <nav class="nav-menu">
          <router-link to="/">数据概览</router-link>
          <router-link to="/devices">设备管理</router-link>
          <router-link v-if="isAdmin" to="/users">用户管理</router-link>
        </nav>
      </div>
      <div class="header-right">
        <span class="user-info">{{ userDisplay }}</span>
        <el-button type="danger" size="small" plain @click="handleLogout">退出登录</el-button>
      </div>
    </header>
    <main class="layout-main">
      <router-view />
    </main>
    <footer class="layout-footer">
      <p>&copy; 2026 星维设备管理系统</p>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/modules/user'

const router = useRouter()
const userStore = useUserStore()

const isAdmin = computed(() => userStore.userInfo?.role === 'admin')
const userDisplay = computed(() => {
  const info = userStore.userInfo
  return info?.nickname || info?.username || '用户'
})

function handleLogout() {
  userStore.logout()
  router.push({ name: 'Login' })
}
</script>

<style scoped>
.layout-default {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.layout-header {
  background: #1a1a2e;
  color: #fff;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 56px;
}
.header-left, .header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}
.logo {
  font-size: 18px;
  margin: 0;
  color: #fff;
}
.nav-menu a {
  color: rgba(255,255,255,0.75);
  text-decoration: none;
  padding: 8px 14px;
  border-radius: 4px;
  transition: all 0.2s;
}
.nav-menu a:hover,
.nav-menu a.router-link-active {
  color: #fff;
  background: rgba(255,255,255,0.1);
}
.user-info {
  font-size: 14px;
  color: rgba(255,255,255,0.8);
}
.layout-main {
  flex: 1;
}
.layout-footer {
  background: #f5f5f5;
  padding: 12px 24px;
  text-align: center;
  font-size: 14px;
  color: #666;
}
</style>
