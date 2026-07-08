/**
 * ====================================================
 * 设备新增/编辑表单页
 * ====================================================
 *
 * 【答辩核心思路】
 * 新增和编辑共享同一个组件，通过路由参数中是否包含 :id 来区分。
 * 这个设计避免了代码重复：表单布局、验证规则、提交逻辑完全一致，
 * 只是编辑模式需要回填数据。
 *
 * 关键设计点：
 * 1. 脏表单保护：通过 watch 监听表单数据变化，未保存时离开弹窗确认
 * 2. 编辑加载数据时暂时屏蔽 watcher（用 suppressDirtyWatch 控制）
 * 3. 生命周期配置字段放在表单底部，以 el-divider 分隔，结构清晰
 * ====================================================
 */
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
      <!-- 基础信息 -->
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

      <!-- 生命周期自动流转配置（每台设备独立设置） -->
      <el-divider content-position="left">生命周期自动流转配置</el-divider>

      <el-form-item label="维保触发月数" prop="maintenance_interval">
        <el-input-number v-model="form.maintenance_interval" :min="1" :max="120" />
        <span class="form-hint">超过此月数未维保，设备自动变为 维保中</span>
      </el-form-item>
      <el-form-item label="报废触发月数" prop="scrap_interval">
        <el-input-number v-model="form.scrap_interval" :min="1" :max="120" />
        <span class="form-hint">处于 维保中 超过此月数，设备自动变为 已报废</span>
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

/** 设备状态选项 */
const STATUS_OPTIONS = [
  { label: '正常', value: 'normal' },
  { label: '维保中', value: 'maintenance' },
  { label: '已报废', value: 'scrapped' }
]

const router = useRouter()
const route = useRoute()
const formRef = ref(null)
const pageLoading = ref(false)     // 编辑模式加载数据时的 loading
const submitting = ref(false)      // 提交按钮的 loading

/**
 * 脏表单标记
 * 当表单数据被修改过且未保存时，离开页面需要弹窗确认
 * suppressDirtyWatch 用于编辑模式下加载数据时暂时屏蔽 watcher
 */
const isDirty = ref(false)
let suppressDirtyWatch = false

/** 当前是否为编辑模式（路由中携带 :id 参数） */
const isEdit = computed(() => !!route.params.id)

/** 表单数据模型（响应式对象） */
const form = reactive({
  name: '',
  model: '',
  location: '',
  status: 'normal',
  last_maintenance_date: '',
  maintenance_interval: 11,       // 默认 11 个月
  scrap_interval: 12              // 默认 12 个月
})

/** 表单验证规则 */
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

/** 禁止选择未来日期（维保日期不能是未来的） */
function disableFutureDate(date) {
  return date.getTime() > Date.now()
}

/**
 * 编辑模式：从后端加载已有设备数据回填表单
 * 加载期间设置 suppressDirtyWatch = true，避免 watcher 误触发脏标记
 */
async function loadDevice() {
  if (!route.params.id) return    // 新增模式不执行
  pageLoading.value = true
  suppressDirtyWatch = true        // 屏蔽 watcher
  try {
    const res = await getDevice(route.params.id)
    const d = res.data
    form.name = d.name
    form.model = d.model
    form.location = d.location
    form.status = d.status
    form.last_maintenance_date = d.last_maintenance_date ? d.last_maintenance_date.slice(0, 10) : ''
    form.maintenance_interval = d.maintenance_interval ?? 11
    form.scrap_interval = d.scrap_interval ?? 12
    isDirty.value = false          // 刚加载完数据，不算脏
  } catch (e) {
    ElMessage.error('获取设备信息失败')
    router.push({ name: 'DeviceList' })
  } finally {
    pageLoading.value = false
    suppressDirtyWatch = false     // 恢复 watcher
  }
}

/** 提交表单（新增/编辑共用） */
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

/**
 * 返回/取消
 * 如果有未保存的修改，弹窗二次确认后再离开
 */
async function goBack() {
  if (isDirty.value) {
    try {
      await ElMessageBox.confirm('有未保存的修改，确定要离开吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
    } catch {
      return    // 用户点了取消，不离开
    }
  }
  router.push({ name: 'DeviceList' })
}

/**
 * 监听表单数据变化 → 自动标记脏表单
 * deep: true 监听嵌套对象的所有属性变化
 */
watch(form, () => {
  if (!suppressDirtyWatch) isDirty.value = true
}, { deep: true })

onMounted(() => loadDevice())
</script>

<style scoped>
.device-form { padding: 24px; }
.page-header { margin-bottom: 24px; }
.form-hint { display: block; color: #909399; font-size: 12px; margin-top: 4px; }
</style>
