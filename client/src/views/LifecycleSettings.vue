/**
 * ====================================================
 * 生命周期配置页（管理员专属）
 * ====================================================
 * 配置设备状态的自动流转规则：
 *   维保触发月数 — 设备超过 N 个月未维保 → 自动变为「维保中」
 *   报废触发月数 — 设备处于「维保中」超过 N 个月 → 自动变为「已报废」
 *
 * 保存配置后立即执行一次全量流转扫描。
 * ====================================================
 */
<template>
  <div class="settings-page">
    <h2>设备生命周期配置</h2>
    <p class="desc">设置设备状态自动流转的触发阈值，保存后立即对所有设备执行一次状态检查。</p>

    <el-form ref="formRef" :model="form" :rules="rules" label-width="200px" style="max-width: 520px" v-loading="loading">
      <el-form-item label="维保触发月数" prop="maintenance_months">
        <el-input-number v-model="form.maintenance_months" :min="1" :max="120" />
        <span class="form-hint">设备超过此月数未维保，自动变为「维保中」</span>
      </el-form-item>
      <el-form-item label="报废触发月数" prop="scrap_months">
        <el-input-number v-model="form.scrap_months" :min="1" :max="120" />
        <span class="form-hint">设备处于「维保中」超过此月数，自动变为「已报废」</span>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleSave" :loading="saving">保存并执行</el-button>
      </el-form-item>
    </el-form>

    <el-alert
      v-if="result !== null"
      :title="`配置已生效，已自动更新 ${result} 台设备状态`"
      type="success"
      show-icon
      closable
      style="max-width: 520px; margin-top: 16px"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/api/request.js'

const formRef = ref(null)
const loading = ref(false)
const saving = ref(false)
const result = ref(null)

const form = reactive({
  maintenance_months: 11,
  scrap_months: 12
})

const rules = {
  maintenance_months: [{ required: true, message: '请输入维保触发月数', trigger: 'blur' }],
  scrap_months: [{ required: true, message: '请输入报废触发月数', trigger: 'blur' }]
}

async function fetchSettings() {
  loading.value = true
  try {
    const res = await request.get('/settings')
    form.maintenance_months = parseInt(res.data.maintenance_months, 10) || 11
    form.scrap_months = parseInt(res.data.scrap_months, 10) || 12
  } catch (e) {
    ElMessage.error('获取配置失败')
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saving.value = true
  result.value = null
  try {
    const res = await request.put('/settings', { ...form })
    result.value = res.updated
    ElMessage.success(res.message || '配置已保存')
  } catch (e) {
    const msg = e.response?.data?.message || '保存失败'
    ElMessage.error(msg)
  } finally {
    saving.value = false
  }
}

onMounted(() => fetchSettings())
</script>

<style scoped>
.settings-page { padding: 24px; }
.desc { color: #909399; font-size: 14px; margin: 8px 0 24px 0; }
.form-hint { display: block; color: #909399; font-size: 12px; margin-top: 4px; }
</style>
