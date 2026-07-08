/**
 * ====================================================
 * 设备列表页
 * ====================================================
 *
 * 【答辩核心思路】
 * 这是整个系统中功能最丰富的页面，集中体现了我们前端的架构设计：
 *
 * 1. 请求管理：使用 AbortController 取消上一次未完成的请求，
 *    防止快速翻页时请求乱序覆盖（关键竞态防护）
 *
 * 2. 排序逻辑：使用 sortable="custom" + @sort-change 事件 +
 *    sortedDevices 计算属性，实现客户端排序
 *
 * 3. 权限控制：根据 userInfo 中的 permissions 列表，
 *    v-if 控制编辑/删除按钮显隐，后端同样有中间件校验
 *
 * 4. 筛选联动：筛选条件变化时自动重置分页到第 1 页，
 *    避免用户看到"当前是第5页但数据只够1页"的尴尬
 *
 * 5. CSV 导出：纯前端实现，含 BOM 头（UTF-8 中文兼容）
 *    和公式注入防护
 *
 * 6. 行点击详情：点击任意行弹出对话框，无需跳转新页面
 *
 * 7. 删除二次确认：el-popconfirm 自带弹窗，确认文本中包含设备名
 * ====================================================
 */
<template>
  <div class="device-list">
    <!-- 页面头部：标题 + 操作按钮 -->
    <div class="page-header">
      <h2>设备管理</h2>
      <div class="header-actions">
        <el-button @click="handleExport" :disabled="devices.length === 0">导出 CSV</el-button>
        <el-button v-if="canCreate" type="primary" @click="goAdd">新增设备</el-button>
      </div>
    </div>

    <!-- 筛选栏：设备名搜索 + 状态多选，变化时自动触发查询 -->
    <div class="filter-bar">
      <el-input
        v-model="filterName"
        placeholder="按设备名筛选"
        clearable
        style="width: 220px"
        @clear="onFilterChange"
        @keyup.enter="onFilterChange"
      />
      <el-select
        v-model="filterStatus"
        placeholder="按状态筛选"
        multiple
        collapse-tags
        clearable
        style="width: 260px; margin-left: 12px"
        @change="onFilterChange"
      >
        <el-option v-for="item in STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-button style="margin-left: 12px" @click="onFilterChange">搜索</el-button>
      <span class="result-count" v-if="total > 0">共 {{ total }} 条结果</span>
    </div>

    <!-- 设备表格：点击行可查看详情，每列可排序 -->
    <el-table
      :data="sortedDevices"
      stripe
      style="width: 100%"
      v-loading="loading"
      @row-click="handleRowClick"
      row-class-name="clickable-row"
      row-key="id"
      @sort-change="handleSortChange"
    >
      <el-table-column prop="id" label="ID" width="70" sortable="custom" />
      <el-table-column prop="name" label="设备名" min-width="150" sortable="custom" />
      <el-table-column prop="model" label="型号" min-width="120" sortable="custom" />
      <el-table-column prop="location" label="位置" min-width="150" sortable="custom" />
      <!-- 状态列：自定义渲染为标签，含维保提醒标识 -->
      <el-table-column prop="status" label="状态" width="150" sortable="custom">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          <el-tag v-if="isMaintenanceSoon(row)" type="warning" size="small" class="maintenance-tag">
            即将维保
          </el-tag>
        </template>
      </el-table-column>
      <!-- 维保日期：UTC 转本地时间显示 -->
      <el-table-column prop="last_maintenance_date" label="上次维保日期" width="140" sortable="custom">
        <template #default="{ row }">
          {{ toLocalDate(row.last_maintenance_date) || '—' }}
        </template>
      </el-table-column>
      <!-- 操作列：编辑/删除按钮，根据权限 v-if 控制显隐 -->
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button v-if="canUpdate" size="small" @click.stop="goEdit(row.id)">编辑</el-button>
          <el-popconfirm
            v-if="canDelete"
            :title="`确定要删除设备「${row.name}」吗？`"
            confirm-button-text="确定"
            cancel-button-text="取消"
            @confirm="handleDelete(row.id)"
          >
            <template #reference>
              <el-button size="small" type="danger" @click.stop>删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <!-- 空状态提示：无数据时的友好显示 -->
    <el-empty v-if="!loading && devices.length === 0" description="暂无设备数据" />

    <!-- 分页组件 -->
    <div class="pagination-wrapper" v-if="total > 0">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next"
        @size-change="fetchDevices"
        @current-change="fetchDevices"
      />
    </div>

    <!-- 设备详情对话框（行点击触发） -->
    <el-dialog v-model="detailVisible" title="设备详情" width="560px">
      <el-descriptions :column="2" border v-if="detailData">
        <el-descriptions-item label="ID" width="120">{{ detailData.id }}</el-descriptions-item>
        <el-descriptions-item label="设备名">{{ detailData.name }}</el-descriptions-item>
        <el-descriptions-item label="型号">{{ detailData.model }}</el-descriptions-item>
        <el-descriptions-item label="位置">{{ detailData.location }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusType(detailData.status)">{{ statusLabel(detailData.status) }}</el-tag>
          <el-tag v-if="isMaintenanceSoon(detailData)" type="warning" size="small" style="margin-left:6px">
            即将维保
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="上次维保日期">
          {{ toLocalDate(detailData.last_maintenance_date) || '未维保' }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ toLocalDatetime(detailData.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ toLocalDatetime(detailData.updated_at) }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/modules/user'
import { getDevices, deleteDevice, getDevice } from '@/api/device.js'
import { exportCSV } from '@/utils/export.js'
import { toLocalDate, toLocalDatetime } from '@/utils/date.js'

/** 设备状态的枚举选项（用于 el-select 和状态标签） */
const STATUS_OPTIONS = [
  { label: '正常', value: 'normal' },
  { label: '维保中', value: 'maintenance' },
  { label: '已报废', value: 'scrapped' }
]

/** 状态 → Element Plus Tag 颜色映射 */
const STATUS_MAP = { normal: 'success', maintenance: 'warning', scrapped: 'info' }
/** 状态 → 中文显示名映射 */
const LABEL_MAP = { normal: '正常', maintenance: '维保中', scrapped: '已报废' }

const router = useRouter()
const userStore = useUserStore()

/**
 * 权限判断函数
 * admin 拥有全部权限，直接返回 true
 * operator 根据 permissions 数组判断
 */
function hasPerm(action) {
  const info = userStore.userInfo
  if (info?.role === 'admin') return true
  const perms = info?.permissions || []
  return perms.some(p => p.resource === 'device' && p.action === action)
}
// 三种操作的权限状态（计算属性，响应式）
const canCreate = computed(() => hasPerm('create'))
const canUpdate = computed(() => hasPerm('update'))
const canDelete = computed(() => hasPerm('delete'))

// ── 列表状态 ──
const devices = ref([])             // 服务器返回的当前页设备列表
const loading = ref(false)          // 加载中状态
const filterName = ref('')          // 设备名搜索关键词
const filterStatus = ref([])        // 状态筛选（数组，支持多选）
const currentPage = ref(1)          // 当前页码
const pageSize = ref(20)            // 每页条数
const total = ref(0)                // 总记录数
let abortController = null           // 请求取消控制器（不是 ref，因为不需要响应式）

// ── 详情对话框状态 ──
const detailVisible = ref(false)
const detailData = ref(null)

// ── 排序状态 ──
const sortProp = ref('')             // 当前排序字段，如 'name'
const sortOrder = ref('')            // 排序方向: 'ascending' | 'descending' | ''

/**
 * 排序后的设备列表（计算属性）
 * 当 sortProp 和 sortOrder 变化时自动重算。
 * 使用 [...devices.value] 创建副本排序，不修改原始数据。
 */
const sortedDevices = computed(() => {
  if (!sortProp.value || !sortOrder.value) return devices.value    // 无排序，返回原始顺序
  const arr = [...devices.value]
  const order = sortOrder.value === 'ascending' ? 1 : -1
  arr.sort((a, b) => {
    const va = a[sortProp.value]
    const vb = b[sortProp.value]
    if (va == null) return 1      // null 排到最后
    if (vb == null) return -1
    return va > vb ? order : va < vb ? -order : 0
  })
  return arr
})

/** @sort-change 事件处理：更新排序字段和方向 */
function handleSortChange({ prop, order }) {
  sortProp.value = prop || ''
  sortOrder.value = order || ''
}

function statusType(s) { return STATUS_MAP[s] || 'info' }
function statusLabel(s) { return LABEL_MAP[s] || s }

/**
 * 判断设备是否临近维保
 * 规则：非报废 + 有维保日期 + 距今超过 11 个月
 */
function isMaintenanceSoon(row) {
  if (row.status === 'scrapped') return false
  if (!row.last_maintenance_date) return false
  const last = new Date(row.last_maintenance_date)
  const now = new Date()
  const diffMs = now.getTime() - last.getTime()
  const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44)  // 平均每月 30.44 天
  return diffMonths >= 11
}

/**
 * 筛选条件变化 → 重置到第 1 页后重新查询
 * 用户体验优化：避免用户看到"当前第5页但只有1条数据"
 */
function onFilterChange() {
  currentPage.value = 1
  fetchDevices()
}

/**
 * 获取设备列表
 * 关键竞态防护：每次发起新请求前，取消上一次未完成的请求。
 * AbortController 的 signal 通过 axios 的请求配置传入，
 * 被取消的请求会抛 ERR_CANCELED 错误，在 catch 中忽略。
 */
async function fetchDevices() {
  if (abortController) abortController.abort()       // 取消上一次请求
  abortController = new AbortController()

  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value
    }
    if (filterName.value) params.name = filterName.value
    if (filterStatus.value && filterStatus.value.length > 0) params.status = filterStatus.value.join(',')
    const res = await getDevices(params, { signal: abortController.signal })
    devices.value = res.list || []
    total.value = res.total || 0
  } catch (e) {
    // ERR_CANCELED 是被我们主动取消的请求，不报错
    if (e.code !== 'ERR_CANCELED') {
      ElMessage.error('获取设备列表失败')
    }
  } finally {
    loading.value = false
  }
}

/** 行点击 → 获取完整设备详情 → 弹出对话框 */
async function handleRowClick(row) {
  try {
    const res = await getDevice(row.id)
    detailData.value = res.data
    detailVisible.value = true
  } catch (e) {
    ElMessage.error('获取设备详情失败')
  }
}

/** 删除设备（二次确认已在模板中由 popconfirm 完成） */
async function handleDelete(id) {
  try {
    await deleteDevice(id)
    ElMessage.success('删除成功')
    fetchDevices()
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

function goAdd() { router.push({ name: 'DeviceAdd' }) }
function goEdit(id) { router.push({ name: 'DeviceEdit', params: { id } }) }

/** 导出当前页数据为 CSV 文件 */
function handleExport() {
  exportCSV(devices.value, `设备列表_${new Date().toLocaleDateString('zh-CN')}`)
}

onMounted(() => fetchDevices())

/** 组件卸载时取消未完成的请求，防止内存泄漏 */
onBeforeUnmount(() => {
  if (abortController) abortController.abort()
})
</script>

<style scoped>
.device-list { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.header-actions { display: flex; gap: 8px; }
.filter-bar { display: flex; align-items: center; margin-bottom: 16px; }
.result-count { margin-left: 12px; font-size: 13px; color: #909399; }
.maintenance-tag { margin-left: 6px; }
.pagination-wrapper { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>

<style>
.clickable-row { cursor: pointer; }
</style>
