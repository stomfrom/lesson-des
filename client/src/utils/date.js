/**
 * 格式化日期工具
 * 解决后端返回 UTC ISO 时间字符串在前端显示与实际不符的问题
 */

/** 将 UTC 日期字符串转为本地日期字符串 YYYY-MM-DD */
export function toLocalDate(utcStr) {
  if (!utcStr) return ''
  const d = new Date(utcStr)
  if (isNaN(d.getTime())) return utcStr
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 将 UTC 日期字符串转为本地日期时间字符串 YYYY-MM-DD HH:mm:ss */
export function toLocalDatetime(utcStr) {
  if (!utcStr) return ''
  const d = new Date(utcStr)
  if (isNaN(d.getTime())) return utcStr
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}:${s}`
}

/** CSV 导出专用：跳过时区转换，保持 date 字段原样 */
export function rawDate(utcStr) {
  if (!utcStr) return ''
  return utcStr.slice(0, 10)
}
