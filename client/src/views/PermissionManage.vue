<template>
  <div class="perm-manage">
    <div class="page-header">
      <h2>用户权限管理</h2>
    </div>

    <el-table :data="users" stripe v-loading="loading">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="username" label="用户名" min-width="120" />
      <el-table-column prop="nickname" label="昵称" min-width="120">
        <template #default="{ row }">{{ row.nickname || '—' }}</template>
      </el-table-column>
      <el-table-column prop="role" label="角色" width="120">
        <template #default="{ row }">
          <el-tag :type="row.role === 'admin' ? 'danger' : 'info'">
            {{ row.role === 'admin' ? '管理员' : '普通用户' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="设备权限" min-width="360">
        <template #default="{ row }">
          <template v-if="row.role === 'admin'">
            <el-tag type="success">全部权限</el-tag>
          </template>
          <template v-else>
            <el-checkbox-group
              :model-value="row._checkedActions"
              @change="(val) => onPermChange(row, val)"
            >
              <el-checkbox v-for="act in ACTIONS" :key="act.value" :label="act.value" :value="act.value">
                {{ act.label }}
              </el-checkbox>
            </el-checkbox-group>
          </template>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getUsers, setUserPermissions } from '@/api/permission.js'

const ACTIONS = [
  { label: '查看', value: 'read' },
  { label: '新增', value: 'create' },
  { label: '编辑', value: 'update' },
  { label: '删除', value: 'delete' }
]

const loading = ref(false)
const users = ref([])
let saving = false

async function fetchUsers() {
  loading.value = true
  try {
    const res = await getUsers()
    users.value = res.data.map(u => ({
      ...u,
      _checkedActions: u.permissions.map(p => p.action)
    }))
  } catch (e) {
    ElMessage.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

async function onPermChange(row, actions) {
  if (row.role === 'admin' || saving) return
  saving = true
  try {
    await setUserPermissions(row.id, { resource: 'device', actions })
    ElMessage.success('权限更新成功')
    // 更新本地权限列表
    row.permissions = actions.map(a => ({ resource: 'device', action: a }))
  } catch (e) {
    ElMessage.error('权限更新失败')
  } finally {
    saving = false
  }
}

onMounted(() => fetchUsers())
</script>

<style scoped>
.perm-manage {
  padding: 24px;
}
.page-header {
  margin-bottom: 20px;
}
</style>
