<template>
    <div class="header">
      <div class="logo">
        <img src="@/assets/logo/logo2.png" alt="Logo" class="logo-image" />
        <span>水土保持智能监管平台</span>
      </div>
      <nav class="nav">
        <ul>
          <li
            v-for="item in navItems"
            :key="item"
            class="nav-item"
            @click="onClickNav(item)"
          >
            {{ item }}
          </li>
        </ul>
      </nav>
      <div class="status-info">
        <div class="info-item">
          <span class="label">当前时间:</span>
          <span class="value">{{ currentTime }}</span>
        </div>
      </div>
    </div>
    
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const currentTime = ref('')
const navItems: string[] = ['模型介绍', '中间展示', '结果分析', '情景评价']

const emit = defineEmits<{ (e: 'nav', key: string): void }>()
const onClickNav = (item: string) => {
  emit('nav', item)
}

const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

let timer: NodeJS.Timeout | null = null

onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<style scoped lang="scss">
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: #000E38;
//    background: linear-gradient(135deg, rgba(30, 60, 114, 0.8) 0%, rgba(42, 82, 152, 0.8) 100%);
  // background: rgb(51, 131, 214);
//   background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid rgba(0,255,255,0.2);
  z-index: 1000; /* 确保header在最上层 */
  backdrop-filter: blur(5px); /* 毛玻璃效果，可选 */
//   border-radius: 8px;
//   margin-bottom: 5px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-image {
  height: 50px;
  width: auto;
  object-fit: contain;
  border-radius: 4px;
}

.logo span {
  font-size: 24px;
  font-weight: bold;
  color: #d8f7f7;
  text-shadow: 0 0 10px rgba(247, 253, 253, 0.5);
}

.nav {
  flex: 1;
  display: flex;
  justify-content: center;
}

.nav ul {
  display: flex;
  gap: 48px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-item {
  color: rgba(255,255,255,0.85);
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 6px;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.nav-item:hover {
  background: rgba(255,255,255,0.15);
  color: #ffffff;
}

.status-info {
  display: flex;
  gap: 30px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.label {
  color: rgba(255,255,255,0.8);
}

.value {
  color: #00ffff;
  font-family: 'Monaco', monospace;
}
</style>
