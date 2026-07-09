/**
 * ====================================================
 * 悬浮提示工具
 * ====================================================
 * 在触发操作的位置附近显示浮层提示，替代全局 ElMessage。
 *
 * 用法：
 *   import { toast } from '@/utils/toast.js'
 *   toast(event.target, '删除成功', 'success')
 *   toast(buttonRef.value, '获取失败', 'error')
 *
 * 原理：在目标元素旁边创建一个绝对定位的小浮层，
 * 2.5 秒后自动淡出消失。
 * ====================================================
 */

const activeToasts = new Set()

/** 移除所有活跃浮层 */
function clearAll() {
  for (const el of activeToasts) {
    el.remove()
    activeToasts.delete(el)
  }
}

/**
 * 在目标元素附近显示悬浮提示
 * @param {Element} target  触发操作的 DOM 元素（如按钮）
 * @param {string}  message 显示文本
 * @param {'success'|'error'|'warning'|'info'} type 类型
 * @param {number}  duration 显示时长（ms）
 */
export function toast(target, message, type = 'info', duration = 2800) {
  if (!target || !message) return

  // 创建浮层元素
  const el = document.createElement('div')
  el.className = `floating-toast floating-toast--${type}`
  el.textContent = message

  // 获取目标元素的位置
  const rect = target.getBoundingClientRect()
  const isMobile = window.innerWidth < 600

  if (isMobile) {
    // 移动端：固定在顶部居中
    el.style.position = 'fixed'
    el.style.top = '16px'
    el.style.left = '50%'
    el.style.transform = 'translateX(-50%)'
  } else {
    // 桌面端：放在目标元素右侧或上方
    el.style.position = 'fixed'
    // 优先显示在元素右侧，空间不足则显示在上方
    const spaceRight = window.innerWidth - rect.right
    if (spaceRight > 220) {
      el.style.left = `${rect.right + 10}px`
      el.style.top = `${rect.top + rect.height / 2 - 18}px`
    } else {
      el.style.left = `${rect.left + rect.width / 2}px`
      el.style.top = `${rect.top - 46}px`
      el.style.transform = 'translateX(-50%)'
    }
  }

  document.body.appendChild(el)
  activeToasts.add(el)

  // 入场动画
  requestAnimationFrame(() => { el.classList.add('floating-toast--show') })

  // 定时移除
  const timer = setTimeout(() => {
    el.classList.remove('floating-toast--show')
    el.classList.add('floating-toast--hide')
    setTimeout(() => { el.remove(); activeToasts.delete(el) }, 300)
  }, duration)

  return () => { clearTimeout(timer); el.remove(); activeToasts.delete(el) }
}

/** 在指定 ref 元素上显示成功提示 */
export function toastSuccess(target, msg) { return toast(target, msg, 'success') }

/** 在指定 ref 元素上显示错误提示 */
export function toastError(target, msg) { return toast(target, msg, 'error') }

/** 在指定 ref 元素上显示警告提示 */
export function toastWarning(target, msg) { return toast(target, msg, 'warning') }

// 注入全局样式
const style = document.createElement('style')
style.textContent = `
.floating-toast {
  position: fixed;
  z-index: 99999;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.5;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 0.25s ease, transform 0.25s ease;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.floating-toast--show {
  opacity: 1;
  transform: translateY(0);
}
.floating-toast--hide {
  opacity: 0;
  transform: translateY(-6px);
}
.floating-toast--success {
  background: #f0f9eb;
  color: #67c23a;
  border: 1px solid #e1f3d8;
}
.floating-toast--error {
  background: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fde2e2;
}
.floating-toast--warning {
  background: #fdf6ec;
  color: #e6a23c;
  border: 1px solid #faecd8;
}
.floating-toast--info {
  background: #f4f4f5;
  color: #909399;
  border: 1px solid #e9e9eb;
}
`
document.head.appendChild(style)

export default toast
