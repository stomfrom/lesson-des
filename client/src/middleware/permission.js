import { useUserStore } from '@/store/modules/user'

/**
 * 权限校验中间件
 * @param {string} requiredRole - 所需角色
 * @returns {boolean} 是否有权限
 */
export function checkPermission(requiredRole) {
  const userStore = useUserStore()
  if (!userStore.userInfo) return false
  if (!requiredRole) return true
  return userStore.userInfo.role === requiredRole
}

export default { checkPermission }
