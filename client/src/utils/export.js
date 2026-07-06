import { toLocalDate, toLocalDatetime } from './date.js'
/**
 * 将表格数据导出为 CSV 文件
 * @param {Object[]} data - 数据数组
 * @param {string} filename - 文件名（不含扩展名）
 */
export function exportCSV(data, filename = '设备列表') {
  if (!data.length) return

  const headers = ['ID', '设备名', '型号', '位置', '状态', '上次维保日期', '创建时间']
  const statusMap = { normal: '正常', maintenance: '维保中', scrapped: '已报废' }

  const rows = data.map(row => [
    row.id,
    String(row.name || '').replace(/^[=+\-@\t\r]/, "'$&"),  // CSV 公式注入防护
    String(row.model || '').replace(/^[=+\-@\t\r]/, "'$&"),
    String(row.location || '').replace(/^[=+\-@\t\r]/, "'$&"),
    statusMap[row.status] || row.status,
    toLocalDate(row.last_maintenance_date),
    toLocalDatetime(row.created_at)
  ])

  // BOM + CSV 内容
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
