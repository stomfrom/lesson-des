/**
 * ====================================================
 * Vue Router 路由配置 + 导航守卫
 * ====================================================
 * 路由规则：
 *   /login       → 登录页（无需认证）
 *   /            → 数据概览（需认证）
 *   /devices     → 设备列表（需认证）
 *   /devices/add → 新增设备（需认证）
 *   /devices/edit/:id → 编辑设备（需认证）
 *   /users       → 用户管理（需认证 + admin）
 *   /:pathMatch(.*)* → 404
 *
 * 导航守卫链：
 *   ① 设置页面标题
 *   ② 检查认证 → 未认证跳 /login（保留 redirect）
 *   ③ 检查 admin-only → 非 admin 跳设备列表
 * ====================================================
 */
import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/store/modules/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { title: '数据概览', requiresAuth: true }
  },
  {
    path: '/devices',
    name: 'DeviceList',
    component: () => import('@/views/DeviceList.vue'),
    meta: { title: '设备管理', requiresAuth: true }
  },
  {
    path: '/devices/add',
    name: 'DeviceAdd',
    component: () => import('@/views/DeviceForm.vue'),
    meta: { title: '新增设备', requiresAuth: true }
  },
  {
    path: '/devices/edit/:id',
    name: 'DeviceEdit',
    component: () => import('@/views/DeviceForm.vue'),
    meta: { title: '编辑设备', requiresAuth: true }
  },
  {
    path: '/users',
    name: 'UserManage',
    component: () => import('@/views/UserManage.vue'),
    meta: { title: '用户管理', requiresAuth: true, requireAdmin: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: { title: '页面不存在' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

/** 导航守卫 */
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - 星维设备管理` : '星维设备管理'

  if (to.meta.requiresAuth) {
    const userStore = useUserStore()
    // 未认证 → 跳登录页，保留目标路径用于登录后跳回
    if (!userStore.isLoggedIn) {
      return next({ name: 'Login', query: { redirect: to.fullPath } })
    }

    // admin-only 页面 → 非 admin 跳设备列表
    if (to.meta.requireAdmin && userStore.userInfo?.role !== 'admin') {
      return next({ name: 'DeviceList' })
    }
  }

  next()
})

export default router
