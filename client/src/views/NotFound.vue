/**
 * ====================================================
 * 404 页面
 * 未知路径兜底显示
 * ====================================================
 */
<template>
  <div class="not-found">
    <h1>404</h1>
    <p>页面不存在</p>
    <el-button type="primary" @click="$router.push('/')">返回首页</el-button>
  </div>
</template>

<style scoped>
.not-found {
  text-align: center;
  padding-top: 120px;
}
.not-found h1 {
  font-size: 72px;
  color: #e0e0e0;
  margin-bottom: 12px;
}
.not-found p {
  font-size: 18px;
  color: #999;
  margin-bottom: 24px;
}
</style>
