/**
 * ====================================================
 * CSV 导出工具
 * ====================================================
 * 将表格数据导出为 UTF-8 BOM CSV 文件。
 *
 * 安全措施：
 * - 公式注入防护：单元格以 = + - @ \t \r 开头时加单引号转义
 * - Windows 文件名兼容：替换非法字符
 * - DOM 兼容：<a> 元素追加到 body 后再 click
 * ====================================================
 */
import { toLocalDate, toLocalDatetime } from './date.js'

/**
 * 导出 CSV 文件
 * @param {Object[]} data - 要导出的数据数组
 * @param {string} filename - 文件名（不含扩展名）
 */
export function exportCSV(data, filename = '设备列表') {
  if (!data || !data.length) return

  const headers = ['ID', '设备名', '型号', '位置', '状态', '上次维保日期', '创建时间']
  const statusMap = { normal: '正常', maintenance: '维保中', scrapped: '已报废' }

  const rows = data.map(row => [
    row.id,
    String(row.name || '').replace(/^[=+\-@\t\r]/, "'$&"),      // 公式注入防护
    String(row.model || '').replace(/^[=+\-@\t\r]/, "'$&"),
    String(row.location || '').replace(/^[=+\-@\t\r]/, "'$&"),
    statusMap[row.status] || row.status,
    toLocalDate(row.last_maintenance_date),
    toLocalDatetime(row.created_at)
  ])

  // BOM 确保 Excel 正确识别 UTF-8
  const bom = '\uFEFF'
  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n')

  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename.replace(/[/\\?%*:|"<>]/g, '-')}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
