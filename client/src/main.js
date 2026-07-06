/**
 * ====================================================
 * 应用入口
 * 注册 Pinia 状态管理 + Vue Router 路由
 * ====================================================
 */
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './store'
import '@/styles/global.css'

const app = createApp(App)

// 全局错误处理：捕获组件渲染、watch、生命周期中的未处理错误
app.config.errorHandler = (err, instance, info) => {
  console.error('[Global Error]', err, info)
}

app.use(pinia)
app.use(router)

app.mount('#app')
