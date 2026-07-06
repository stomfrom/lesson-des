/**
 * ====================================================
 * 数据概览页（Dashboard）
 * ====================================================
 * 登录后默认展示的设备统计看板。
 *
 * 数据区：
 * - 统计卡片：总数 / 正常运行 / 维保中 / 已报废 / 即将维保
 * - 最近添加的 5 台设备
 * - 快捷操作按钮
 * ====================================================
 */
<template>
  <div class="dashboard">
    <h2>数据概览</h2>

    <!-- 统计卡片 -->
    <div class="stat-row" v-loading="!loaded">
      <el-card class="stat-card total" shadow="hover">
        <div class="stat-value">{{ stats.total }}</div>
        <div class="stat-label">设备总数</div>
      </el-card>
      <el-card class="stat-card normal" shadow="hover">
        <div class="stat-value">{{ stats.byStatus.normal }}</div>
        <div class="stat-label">正常运行</div>
      </el-card>
      <el-card class="stat-card maintenance" shadow="hover">
        <div class="stat-value">{{ stats.byStatus.maintenance }}</div>
        <div class="stat-label">维保中</div>
      </el-card>
      <el-card class="stat-card scrapped" shadow="hover">
        <div class="stat-value">{{ stats.byStatus.scrapped }}</div>
        <div class="stat-label">已报废</div>
      </el-card>
      <el-card class="stat-card warning" shadow="hover">
        <div class="stat-value">{{ stats.maintenanceDue }}</div>
        <div class="stat-label">即将维保</div>
      </el-card>
    </div>

    <div class="content-row">
      <!-- 最近设备 -->
      <el-card class="recent-card" shadow="hover">
        <template #header>
          <div class="card-header"><span>最近添加的设备</span></div>
        </template>
        <el-table :data="stats.recent" stripe size="small" v-if="stats.recent && stats.recent.length > 0">
          <el-table-column prop="name" label="设备名" min-width="120" />
          <el-table-column prop="model" label="型号" min-width="100" />
          <el-table-column prop="location" label="位置" min-width="100" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="暂无设备数据" :image-size="80" />
      </el-card>

      <!-- 快捷操作 -->
      <el-card class="action-card" shadow="hover">
        <template #header>
          <div class="card-header"><span>快捷操作</span></div>
        </template>
        <div class="action-list">
          <el-button type="primary" @click="$router.push({ name: 'DeviceAdd' })" class="action-btn">新增设备</el-button>
          <el-button @click="$router.push({ name: 'DeviceList' })" class="action-btn">查看设备列表</el-button>
          <el-button v-if="isAdmin" @click="$router.push({ name: 'UserManage' })" class="action-btn">用户管理</el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/store/modules/user'
import { getDeviceStats } from '@/api/device.js'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const isAdmin = computed(() => userStore.userInfo?.role === 'admin')

const STATUS_MAP = { normal: 'success', maintenance: 'warning', scrapped: 'info' }
const LABEL_MAP = { normal: '正常', maintenance: '维保中', scrapped: '已报废' }
function statusType(s) { return STATUS_MAP[s] || 'info' }
function statusLabel(s) { return LABEL_MAP[s] || s }

const stats = ref({
  total: 0,
  byStatus: { normal: 0, maintenance: 0, scrapped: 0 },
  maintenanceDue: 0,
  recent: []
})
const loaded = ref(false)

/** 获取统计数据和最近设备 */
async function fetchStats() {
  try {
    const res = await getDeviceStats()
    stats.value = res.data
    loaded.value = true
  } catch (e) {
    if (e.response?.status !== 403) {
      ElMessage.error('获取统计数据失败')
    }
  }
}

onMounted(() => fetchStats())
</script>

<style scoped>
.dashboard { padding: 24px; }
.stat-row {
  display: flex;
  gap: 16px;
  margin: 20px 0;
  flex-wrap: wrap;
}
.stat-card {
  flex: 1;
  min-width: 150px;
  text-align: center;
}
.stat-value {
  font-size: 36px;
  font-weight: 700;
  line-height: 1.2;
}
.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 6px;
}
.total .stat-value { color: #409eff; }
.normal .stat-value { color: #67c23a; }
.maintenance .stat-value { color: #e6a23c; }
.scrapped .stat-value { color: #909399; }
.warning .stat-value { color: #f56c6c; }
.content-row { display: flex; gap: 16px; margin-top: 16px; }
.recent-card { flex: 2; }
.action-card { flex: 1; }
.card-header { font-weight: 600; }
.action-list { display: flex; flex-direction: column; gap: 12px; }
.action-btn { width: 100%; }
</style>
