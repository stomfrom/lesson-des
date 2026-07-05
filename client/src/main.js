import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './store'
import '@/styles/global.css'

const app = createApp(App)

// 全局错误处理
app.config.errorHandler = (err, instance, info) => {
  console.error('[Global Error]', err, info)
}

app.use(pinia)
app.use(router)

app.mount('#app')
