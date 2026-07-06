/**
 * ====================================================
 * 默认布局组件
 * ====================================================
 * 包含顶部导航栏 + 主内容区 + 页脚。
 * 登录页隐藏导航栏和页脚。
 *
 * 导航菜单根据角色动态显示：
 *   全部用户 → 数据概览 / 设备管理
 *   admin   → 额外显示「用户管理」
 * ====================================================
 */
<template>
  <div class="layout-default">
    <!-- 导航栏（登录页隐藏） -->
    <header v-if="!isLoginPage" class="layout-header">
      <div class="header-left">
        <h1 class="logo">星维设备管理</h1>
        <nav class="nav-menu">
          <router-link to="/">数据概览</router-link>
          <router-link to="/devices">设备管理</router-link>
          <router-link v-if="isAdmin" to="/users">用户管理</router-link>
          <router-link v-if="isAdmin" to="/settings">生命周期</router-link>
        </nav>
      </div>
      <div class="header-right">
        <span class="user-info">{{ userDisplay }}</span>
        <el-button type="danger" size="small" plain @click="handleLogout">退出登录</el-button>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="layout-main">
      <router-view />
    </main>

    <!-- 页脚（登录页隐藏） -->
    <footer v-if="!isLoginPage" class="layout-footer">
      <p>&copy; 2026 星维设备管理系统</p>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/store/modules/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

/** 当前是否为登录页（控制导航栏/页脚显隐） */
const isLoginPage = computed(() => route.name === 'Login')
/** 当前用户是否为管理员 */
const isAdmin = computed(() => userStore.userInfo?.role === 'admin')
/** 用户显示名称（昵称 > 用户名 > 默认） */
const userDisplay = computed(() => {
  const info = userStore.userInfo
  return info?.nickname || info?.username || '用户'
})

/** 退出登录 */
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
