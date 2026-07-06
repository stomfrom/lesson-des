/**
 * ====================================================
 * 用户管理页（管理员专属）
 * ====================================================
 * 功能：
 * - 用户列表（含角色/权限）
 * - 新增用户（弹窗表单）
 * - 实时分配/回收权限（checkbox 勾选即生效）
 * - 删除用户（二次确认，禁止删除自己和管理员）
 * ====================================================
 */
<template>
  <div class="user-manage">
    <div class="page-header">
      <h2>用户管理</h2>
      <el-button type="primary" @click="dialogVisible = true">新增用户</el-button>
    </div>

    <el-table :data="users" stripe v-loading="loading">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="username" label="用户名" min-width="120" />
      <el-table-column prop="nickname" label="昵称" min-width="120">
        <template #default="{ row }">{{ row.nickname || '—' }}</template>
      </el-table-column>
      <el-table-column label="角色" width="120">
        <template #default="{ row }">
          <el-tag :type="row.role === 'admin' ? 'danger' : 'info'">
            {{ row.role === 'admin' ? '管理员' : '普通用户' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="设备权限" min-width="300">
        <template #default="{ row }">
          <template v-if="row.role === 'admin'">
            <el-tag type="success">全部权限</el-tag>
          </template>
          <template v-else>
            <el-checkbox-group
              :model-value="getPerms(row.id)"
              @change="(val) => onPermChange(row.id, val)"
            >
              <el-checkbox v-for="act in ACTIONS" :key="act.value" :label="act.value" :value="act.value">
                {{ act.label }}
              </el-checkbox>
            </el-checkbox-group>
          </template>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="90" fixed="right">
        <template #default="{ row }">
          <el-popconfirm
            v-if="row.role !== 'admin'"
            :title="`确定要删除用户「${row.username}」吗？`"
            confirm-button-text="确定"
            cancel-button-text="取消"
            @confirm="handleDeleteUser(row.id, row.username)"
          >
            <template #reference>
              <el-button size="small" type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增用户对话框 -->
    <el-dialog v-model="dialogVisible" title="新增用户" width="420px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="3-50个字符" maxlength="50" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="至少6个字符" show-password />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="form.nickname" placeholder="选填" maxlength="50" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleCreate">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getUsers, setUserPermissions, createUser, deleteUser } from '@/api/permission.js'

/** 设备权限操作选项 */
const ACTIONS = [
  { label: '查看', value: 'read' },
  { label: '新增', value: 'create' },
  { label: '编辑', value: 'update' },
  { label: '删除', value: 'delete' }
]

const loading = ref(false)
const saving = ref(false)
const users = ref([])
const permsMap = ref({})          // { userId: ['read', 'create', ...] }
const dialogVisible = ref(false)
const formRef = ref(null)

const form = reactive({ username: '', password: '', nickname: '' })
const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '长度 3-50 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '至少 6 个字符', trigger: 'blur' }
  ]
}

/** 获取指定用户的权限数组 */
function getPerms(userId) {
  return permsMap.value[userId] || []
}

/** 加载用户列表 */
async function fetchUsers() {
  loading.value = true
  try {
    const res = await getUsers()
    users.value = res.data
    const map = {}
    for (const u of res.data) {
      map[u.id] = u.permissions.map(p => p.action)
    }
    permsMap.value = map
  } catch (e) {
    ElMessage.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

/** 权限变更 → 实时保存 */
async function onPermChange(userId, actions) {
  try {
    await setUserPermissions(userId, { resource: 'device', actions })
    permsMap.value[userId] = actions
    ElMessage.success('权限已更新')
  } catch (e) {
    ElMessage.error('权限更新失败')
  }
}

/** 新增用户 */
async function handleCreate() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    await createUser(form)
    ElMessage.success(`用户 ${form.username} 创建成功`)
    dialogVisible.value = false
    form.username = ''
    form.password = ''
    form.nickname = ''
    fetchUsers()
  } catch (e) {
    const msg = e.response?.data?.message || '创建失败'
    ElMessage.error(msg)
  } finally {
    saving.value = false
  }
}

/** 删除用户 */
async function handleDeleteUser(id, username) {
  try {
    await deleteUser(id)
    ElMessage.success(`用户「${username}」已删除`)
    fetchUsers()
  } catch (e) {
    const msg = e.response?.data?.message || '删除失败'
    ElMessage.error(msg)
  }
}

onMounted(() => fetchUsers())
</script>

<style scoped>
.user-manage { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
</style>
