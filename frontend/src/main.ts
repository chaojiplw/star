import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import ElementPlus from 'element-plus'
// import dataV from "@jiaminghi/data-view"
import 'maplibre-gl/dist/maplibre-gl.css';
import '@/assets/icons/iconfont.js'

const app = createApp(App)
app.use(router)
app.use(ElementPlus)
// app.use(dataV)
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
app.mount('#app')

