<template>
  <div class="device-form">
    <div class="page-header">
      <h2>{{ isEdit ? '编辑设备' : '新增设备' }}</h2>
    </div>

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
      style="max-width: 600px"
      v-loading="pageLoading"
    >
      <el-form-item label="设备名" prop="name">
        <el-input v-model="form.name" placeholder="请输入设备名" maxlength="100" show-word-limit />
      </el-form-item>
      <el-form-item label="型号" prop="model">
        <el-input v-model="form.model" placeholder="请输入型号" maxlength="100" show-word-limit />
      </el-form-item>
      <el-form-item label="位置" prop="location">
        <el-input v-model="form.location" placeholder="请输入位置" maxlength="200" show-word-limit />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="form.status" placeholder="请选择状态">
          <el-option v-for="item in STATUS_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="上次维保日期" prop="last_maintenance_date">
        <el-date-picker
          v-model="form.last_maintenance_date"
          type="date"
          placeholder="选择日期"
          value-format="YYYY-MM-DD"
          :disabled-date="disableFutureDate"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ isEdit ? '保存修改' : '新增设备' }}
        </el-button>
        <el-button @click="goBack">取消</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getDevice, createDevice, updateDevice } from '@/api/device.js'

const STATUS_OPTIONS = [
  { label: '正常', value: 'normal' },
  { label: '维保中', value: 'maintenance' },
  { label: '已报废', value: 'scrapped' }
]

const router = useRouter()
const route = useRoute()
const formRef = ref(null)
const pageLoading = ref(false)
const submitting = ref(false)
const isDirty = ref(false)
let suppressDirtyWatch = false

const isEdit = computed(() => !!route.params.id)

const form = reactive({
  name: '',
  model: '',
  location: '',
  status: 'normal',
  last_maintenance_date: ''
})

const rules = {
  name: [
    { required: true, message: '请输入设备名', trigger: 'blur' },
    { max: 100, message: '设备名不超过100个字符', trigger: 'blur' }
  ],
  model: [
    { required: true, message: '请输入型号', trigger: 'blur' },
    { max: 100, message: '型号不超过100个字符', trigger: 'blur' }
  ],
  location: [
    { required: true, message: '请输入位置', trigger: 'blur' },
    { max: 200, message: '位置不超过200个字符', trigger: 'blur' }
  ]
}

function disableFutureDate(date) {
  return date.getTime() > Date.now()
}

async function loadDevice() {
  if (!route.params.id) return
  pageLoading.value = true
  suppressDirtyWatch = true
  try {
    const res = await getDevice(route.params.id)
    const d = res.data
    form.name = d.name
    form.model = d.model
    form.location = d.location
    form.status = d.status
    form.last_maintenance_date = d.last_maintenance_date
    isDirty.value = false
  } catch (e) {
    ElMessage.error('获取设备信息失败')
    router.push({ name: 'DeviceList' })
  } finally {
    pageLoading.value = false
    suppressDirtyWatch = false
  }
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (isEdit.value) {
      await updateDevice(route.params.id, { ...form })
      ElMessage.success('设备更新成功')
    } else {
      await createDevice({ ...form })
      ElMessage.success('设备创建成功')
    }
    isDirty.value = false
    router.push({ name: 'DeviceList' })
  } catch (e) {
    ElMessage.error(isEdit.value ? '更新失败' : '创建失败')
  } finally {
    submitting.value = false
  }
}

async function goBack() {
  if (isDirty.value) {
    try {
      await ElMessageBox.confirm('有未保存的修改，确定要离开吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
    } catch {
      return
    }
  }
  router.push({ name: 'DeviceList' })
}

// 监听任意字段变化，标记表单为脏（加载数据时抑制）
watch(form, () => {
  if (!suppressDirtyWatch) isDirty.value = true
}, { deep: true })

onMounted(() => loadDevice())
</script>

<style scoped>
.device-form {
  padding: 24px;
}
.page-header {
  margin-bottom: 24px;
}
</style>
