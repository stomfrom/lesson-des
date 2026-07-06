<template>
  <div class="device-list">
    <div class="page-header">
      <h2>设备管理</h2>
      <div class="header-actions">
        <el-button @click="handleExport" :disabled="devices.length === 0">导出 CSV</el-button>
        <el-button v-if="canCreate" type="primary" @click="goAdd">新增设备</el-button>
      </div>
    </div>

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
        clearable
        style="width: 180px; margin-left: 12px"
        @change="onFilterChange"
      >
        <el-option v-for="item in STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-button style="margin-left: 12px" @click="onFilterChange">搜索</el-button>
      <span class="result-count" v-if="total > 0">共 {{ total }} 条结果</span>
    </div>

    <el-table
      :data="devices"
      stripe
      style="width: 100%"
      v-loading="loading"
      @row-click="handleRowClick"
      row-class-name="clickable-row"
    >
      <el-table-column prop="id" label="ID" width="70" sortable="custom" />
      <el-table-column prop="name" label="设备名" min-width="150" sortable="custom" />
      <el-table-column prop="model" label="型号" min-width="120" sortable="custom" />
      <el-table-column prop="location" label="位置" min-width="150" sortable="custom" />
      <el-table-column prop="status" label="状态" width="150" sortable="custom">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          <el-tag v-if="isMaintenanceSoon(row)" type="warning" size="small" class="maintenance-tag">
            即将维保
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="last_maintenance_date" label="上次维保日期" width="140" sortable="custom">
        <template #default="{ row }">
          {{ toLocalDate(row.last_maintenance_date) || '—' }}
        </template>
      </el-table-column>
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

    <el-empty v-if="!loading && devices.length === 0" description="暂无设备数据" />

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

    <!-- 设备详情对话框 -->
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

const STATUS_OPTIONS = [
  { label: '正常', value: 'normal' },
  { label: '维保中', value: 'maintenance' },
  { label: '已报废', value: 'scrapped' }
]

const STATUS_MAP = { normal: 'success', maintenance: 'warning', scrapped: 'info' }
const LABEL_MAP = { normal: '正常', maintenance: '维保中', scrapped: '已报废' }

const router = useRouter()
const userStore = useUserStore()

function hasPerm(action) {
  const info = userStore.userInfo
  if (info?.role === 'admin') return true
  const perms = info?.permissions || []
  return perms.some(p => p.resource === 'device' && p.action === action)
}
const canCreate = computed(() => hasPerm('create'))
const canUpdate = computed(() => hasPerm('update'))
const canDelete = computed(() => hasPerm('delete'))

const devices = ref([])
const loading = ref(false)
const filterName = ref('')
const filterStatus = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
let abortController = null

// 详情对话框
const detailVisible = ref(false)
const detailData = ref(null)

function statusType(s) { return STATUS_MAP[s] || 'info' }
function statusLabel(s) { return LABEL_MAP[s] || s }

function isMaintenanceSoon(row) {
  if (row.status === 'scrapped') return false
  if (!row.last_maintenance_date) return false
  const last = new Date(row.last_maintenance_date)
  const now = new Date()
  const diffMs = now.getTime() - last.getTime()
  const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44)
  return diffMonths >= 11
}

function onFilterChange() {
  currentPage.value = 1
  fetchDevices()
}

async function fetchDevices() {
  if (abortController) abortController.abort()
  abortController = new AbortController()

  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value
    }
    if (filterName.value) params.name = filterName.value
    if (filterStatus.value) params.status = filterStatus.value
    const res = await getDevices(params, { signal: abortController.signal })
    devices.value = res.list || []
    total.value = res.total || 0
  } catch (e) {
    if (e.code !== 'ERR_CANCELED') {
      ElMessage.error('获取设备列表失败')
    }
  } finally {
    loading.value = false
  }
}

async function handleRowClick(row) {
  try {
    const res = await getDevice(row.id)
    detailData.value = res.data
    detailVisible.value = true
  } catch (e) {
    ElMessage.error('获取设备详情失败')
  }
}

async function handleDelete(id) {
  try {
    await deleteDevice(id)
    ElMessage.success('删除成功')
    fetchDevices()
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

function goAdd() {
  router.push({ name: 'DeviceAdd' })
}

function goEdit(id) {
  router.push({ name: 'DeviceEdit', params: { id } })
}

function handleExport() {
  exportCSV(devices.value, `设备列表_${new Date().toLocaleDateString('zh-CN')}`)
}

onMounted(() => fetchDevices())

onBeforeUnmount(() => {
  if (abortController) abortController.abort()
})
</script>

<style scoped>
.device-list {
  padding: 24px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.header-actions {
  display: flex;
  gap: 8px;
}
.filter-bar {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}
.result-count {
  margin-left: 12px;
  font-size: 13px;
  color: #909399;
}
.maintenance-tag {
  margin-left: 6px;
}
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>

<style>
.clickable-row {
  cursor: pointer;
}
</style>
