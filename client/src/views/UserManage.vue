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
import { getUsers, setUserPermissions, createUser } from '@/api/permission.js'

const ACTIONS = [
  { label: '查看', value: 'read' },
  { label: '新增', value: 'create' },
  { label: '编辑', value: 'update' },
  { label: '删除', value: 'delete' }
]

const loading = ref(false)
const saving = ref(false)
const users = ref([])
const permsMap = ref({})
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

function getPerms(userId) {
  return permsMap.value[userId] || []
}

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

async function onPermChange(userId, actions) {
  try {
    await setUserPermissions(userId, { resource: 'device', actions })
    permsMap.value[userId] = actions
    ElMessage.success('权限已更新')
  } catch (e) {
    ElMessage.error('权限更新失败')
  }
}

async function handleCreate() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  try {
    const res = await createUser(form)
    // 新用户默认不授予任何权限，后台已注册成功
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

onMounted(() => fetchUsers())
</script>

<style scoped>
.user-manage {
  padding: 24px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
</style>
