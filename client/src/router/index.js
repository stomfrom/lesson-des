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

router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - 星维设备管理` : '星维设备管理'

  if (to.meta.requiresAuth) {
    const userStore = useUserStore()
    if (!userStore.isLoggedIn) {
      return next({ name: 'Login', query: { redirect: to.fullPath } })
    }

    // admin-only 页面
    if (to.meta.requireAdmin && userStore.userInfo?.role !== 'admin') {
      return next({ name: 'DeviceList' })
    }
  }

  next()
})

export default router
