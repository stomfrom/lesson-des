/**
 * ====================================================
 * 日期格式化工具
 * ====================================================
 * 解决 MySQL2 返回 UTC ISO 字符串在前端显示时
 * 时区转换问题，将 UTC 时间转为本地时间显示。
 *
 * 例如：
 *   "2026-07-05T16:00:00.000Z" → "2026-07-06"（本地日期）
 *   "2026-07-06T01:06:46.000Z" → "2026-07-06 09:06:46"（本地时间）
 * ====================================================
 */

/** 转为本地日期字符串 YYYY-MM-DD（适用于 DATE 类型字段） */
export function toLocalDate(utcStr) {
  if (!utcStr) return ''
  const d = new Date(utcStr)
  if (isNaN(d.getTime())) return utcStr                // 非合法日期原样返回
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 转为本地日期时间字符串 YYYY-MM-DD HH:mm:ss（适用于 DATETIME 类型字段） */
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

/** CSV 导出专用：截取前 10 字符 YYYY-MM-DD */
export function rawDate(utcStr) {
  if (!utcStr) return ''
  return utcStr.slice(0, 10)
}
