<template>
  <div class="intro-page">
    <!-- Header -->
    <div class="page-header">
      <!-- 黑色圆角直角梯形 -->
      <RoundedTrapezoid 
        :width="400" 
        :height="60" 
        color="#110C08" 
        :radius="12"
        :skewRatio="0.15"
      >
        <div class="trapezoid-content">
          <img src="@/assets/logo/logo2.png" alt="Logo" class="logo-image" />
          <span class="system-name">水土保持智能监管平台</span>
        </div>
      </RoundedTrapezoid>
      
      <!-- 右侧链接 -->
      <div class="header-right">
        <a class="enter-link" @click="goToHome">进入平台</a>
      </div>
    </div>

    <!-- 文件夹内容区域 -->
    <div class="folder-content">
      <!-- 背景图片轮换 -->
      <div class="background-slideshow">
        <div 
          v-for="(img, index) in backgrounds" 
          :key="index"
          class="slide"
          :class="{ active: currentSlide === index }"
        >
          <img :src="img" alt="背景图" />
        </div>
      </div>

      <!-- 内容文字 -->
      <div class="content-overlay" :class="{ 'animate': showContent }">
        <!-- <h1 class="main-title">莞星智水</h1> -->
        <div class="main-title">
          <img :src="titlePicture" alt="标题图片" height="200rem">
        </div>
        <p class="sub-title">守护绿水青山,建设美丽中国</p>
      </div>
    </div>

    <!-- 幻灯片区域 -->
    <div class="text-animation-section">
      <div class="text-container">
        <div class="animated-text" :class="{ 'animate': showText1 }">
          <h2 class="text-line-1">123</h2>
        </div>
        <div class="animated-text" :class="{ 'animate': showText2 }">
          <h2 class="text-line-2">456</h2>
        </div>
      </div>

      <div class="carousel">
        <button class="carousel-btn prev" @click="prevCarouselSlide">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="carousel-track" ref="carouselTrack">
          <div 
            v-for="(item, index) in carouselItems" 
            :key="index"
            class="carousel-item"
          >
            <img :src="item.image" :alt="item.title" />
            <div class="carousel-item-content">
              <h3>{{ item.title }}</h3>
              <p>{{ item.description }}</p>
            </div>
          </div>
        </div>
        <button class="carousel-btn next" @click="nextCarouselSlide">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 滚动文字区域 -->
    <div class="marquee-container">
      <div class="marquee-content" ref="marqueeContent">
        <div class="marquee-items">
          <span v-for="(text, index) in marqueeTexts" :key="index" class="marquee-text">
            {{ text }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import RoundedTrapezoid from '@/components/RoundedTrapezoid.vue'
import { useRouter } from 'vue-router'
import { ref, onMounted, onUnmounted } from 'vue'

const router = useRouter()

const showContent = ref(false)
const showText1 = ref(false)
const showText2 = ref(false)
const currentSlide = ref(0)
let slideTimer: number | null = null
const carouselTrack = ref<HTMLElement | null>(null)
const carouselIndex = ref(0)
const marqueeContent = ref<HTMLElement | null>(null)
const marqueeTexts = [
  '欢迎访问',
  '守护绿水青山',
  '建设美丽中国'
]
const carouselItems = [
  {
    image: new URL('@/assets/pictures/p1.png', import.meta.url).href,
    title: '项目一',
    description: '项目描述内容'
  },
  {
    image: new URL('@/assets/pictures/p2.png', import.meta.url).href,
    title: '项目二',
    description: '项目描述内容'
  },
  {
    image: new URL('@/assets/pictures/p3.jpg', import.meta.url).href,
    title: '项目三',
    description: '项目描述内容'
  },
  {
    image: new URL('@/assets/pictures/p1.png', import.meta.url).href,
    title: '项目四',
    description: '项目描述内容'
  },
  {
    image: new URL('@/assets/pictures/p2.png', import.meta.url).href,
    title: '项目五',
    description: '项目描述内容'
  },
  {
    image: new URL('@/assets/pictures/p3.jpg', import.meta.url).href,
    title: '项目六',
    description: '项目描述内容'
  }
]

const backgrounds = [
  new URL('@/assets/pictures/p1.png', import.meta.url).href,
  new URL('@/assets/pictures/p2.png', import.meta.url).href,
  new URL('@/assets/pictures/p3.jpg', import.meta.url).href
]

const titlePicture = new URL('@/assets/pictures/title.png', import.meta.url).href 

const nextSlide = () => {
  currentSlide.value = (currentSlide.value + 1) % backgrounds.length
}

const startSlideshow = () => {
  if (slideTimer) return
  slideTimer = window.setInterval(() => {
    nextSlide()
  }, 4000)
}

const stopSlideshow = () => {
  if (slideTimer) {
    clearInterval(slideTimer)
    slideTimer = null
  }
}

onMounted(() => {
  setTimeout(() => {
    showContent.value = true
  }, 300)

  setTimeout(() => {
    showText1.value = true
  }, 1200)

  setTimeout(() => {
    showText2.value = true
  }, 1500)

  startSlideshow()

  setTimeout(() => {
    initMarquee()
  }, 100)
})

onUnmounted(() => {
  stopSlideshow()
})

const goToHome = () => {
  router.push('/home')
}

const prevCarouselSlide = () => {
  if (carouselIndex.value > 0) {
    carouselIndex.value--
    updateCarouselPosition()
  }
}

const nextCarouselSlide = () => {
  if (carouselIndex.value < carouselItems.length - 1) {
    carouselIndex.value++
    updateCarouselPosition()
  }
}

const updateCarouselPosition = () => {
  if (carouselTrack.value) {
    const itemWidth = carouselTrack.value.offsetWidth / 3.2
    carouselTrack.value.style.transform = `translateX(-${carouselIndex.value * itemWidth}px)`
  }
}

const addKeyFrames = (x: string) => {
  const style = document.createElement('style')
  style.type = 'text/css'
  const keyFrames = `
    @-webkit-keyframes rowup {
      0% {
        -webkit-transform: translate3d(0, 0, 0);
        transform: translate3d(0, 0, 0);
      }
      100% {
        -webkit-transform: translate3d(${x}, 0, 0);
        transform: translate3d(${x}, 0, 0);
      }
    }
    @keyframes rowup {
      0% {
        -webkit-transform: translate3d(0, 0, 0);
        transform: translate3d(0, 0, 0);
      }
      100% {
        -webkit-transform: translate3d(${x}, 0, 0);
        transform: translate3d(${x}, 0, 0);
      }
    }
  `
  style.innerHTML = keyFrames
  document.getElementsByTagName('head')[0]?.appendChild(style)
}

const initMarquee = () => {
  if (marqueeContent.value) {
    const marqueeItems = marqueeContent.value.querySelector('.marquee-items') as HTMLElement
    if (marqueeItems) {
      const width = marqueeItems.offsetWidth
      marqueeContent.value.innerHTML += marqueeItems.outerHTML
      addKeyFrames(`-${width}px`)
      marqueeContent.value.classList.add('rowup')
    }
  }
}
</script>

<style scoped lang="scss">
.intro-page {
  min-height: 100vh;
  background: rgb(226, 225, 227);
  padding: 1rem;
  font-family: 'Epilogue', 'Inter', Arial, sans-serif;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0;
}

.trapezoid-content {
  display: flex;
  align-items: center;
  gap: 15px;
  padding-left: 0px;
  
  .logo-image {
    height: 40px;
    width: auto;
    object-fit: contain;
  }
  
  .system-name {
    font-size: 18px;
    color: white;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
}

.header-right {
  .enter-link {
    font-size: 16px;
    color: #211C1B;
    text-decoration: none;
    cursor: pointer;
    transition: opacity 0.3s;
    
    &:hover {
      opacity: 0.7;
    }
  }
}

.folder-content {
  background: white;
  flex: 1;
  min-height: 90vh;
  border-radius: 0 12px 12px 12px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 8rem;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 1), transparent);
    pointer-events: none;
    z-index: 5;
  }
}

.background-slideshow {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.slide {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 1.5s ease-in-out;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  &.active {
    opacity: 1;
  }
}

.content-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 10;
  opacity: 0;
  transition: all 0.8s cubic-bezier(0.03, 0.26, 0.19, 1);
  
  &.animate {
    opacity: 1;
  }
  
  .main-title {
    font-size: 100px;
    font-weight: 600;
    color: white;
    margin: 0 0 20px;
    text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    letter-spacing: -0.02em;
  }
  
  .sub-title {
    font-size: 20px;
    color: rgba(255, 255, 255, 0.95);
    margin: 0;
    font-weight: 400;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  }
}

.text-animation-section {
  padding: 40px 0;
  display: flex;
  align-items: center;
}

.text-container {
  padding-left: 1.5rem;
  display: inline-block;
  text-align: left;
  flex-shrink: 0;
} 

.animated-text {
  opacity: 0;
  transform: translateX(-100px);
  transition: all 1s cubic-bezier(0.03, 0.26, 0.19, 1);

  &.animate {
    opacity: 1;
    transform: translateX(0);
  }

  h2 {
    font-size: 48px;
    font-weight: 600;
    color: #211C1B;
    margin: 20px 0;
    letter-spacing: -0.02em;
  }
}

.marquee-container {
  margin-top: 12rem;
  width: 100%;
  overflow: hidden;
  padding: 20px 0;
  background: transparent;

  .marquee-content {
    display: flex;
    white-space: nowrap;

    .marquee-items {
      display: flex;
      white-space: nowrap;
    }

    .marquee-text {
      font-size: 8rem;
      font-weight: 500;
      color: rgb(246, 139, 33, 1);
      padding-right: 100px;
    }

    &.rowup {
      animation: 20s rowup linear infinite normal;
      position: relative;
    }
  }
}

.carousel {
  position: relative;
  width: 60%;
  margin-left: auto;
  margin-right: 0;
  overflow: hidden;

  .carousel-track {
    display: flex;
    transition: transform 0.5s ease-in-out;
  }

  .carousel-item {
    flex: 0 0 calc(100% / 3.2);
    margin-right: 20px;
    border-radius: 16px;
    overflow: hidden;
    position: relative;

    img {
      width: 100%;
      height: 24rem;
      object-fit: cover;
      display: block;
    }

    .carousel-item-content {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      padding: 16px 24px;
      max-width: 100%;
      // background: rgba(17, 12, 8, 0.85);
      // border-radius: 12px;
      // backdrop-filter: blur(4px);

      h3 {
        font-size: 2rem;
        font-weight: 600;
        color: white;
        margin: 0 0 8px;
      }

      p {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.9);
        margin: 0;
      }
    }
  }

  .carousel-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgb(217, 217, 217,1);
    border: none;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #211C1B;
    transition: all 0.3s;
    z-index: 10;

    &:hover {
      background: #211C1B;
      color: white;
    }

    &.prev {
      left: 1rem;
    }

    &.next {
      right: 1rem;
    }
  }
}

@media (max-width: 1024px) {
  .trapezoid-content {
    padding-left: 15px;
    gap: 12px;
    
    .logo-image {
      height: 36px;
    }
    
    .system-name {
      font-size: 16px;
    }
  }
  
  .header-right .enter-link {
    font-size: 15px;
  }
  
  .content-overlay {
    .main-title {
      font-size: 42px;
    }
    
    .sub-title {
      font-size: 18px;
    }
  }
  
  .animated-text h2 {
    font-size: 36px;
  }
}

@media (max-width: 768px) {
  .trapezoid-content {
    padding-left: 12px;
    gap: 10px;
    
    .logo-image {
      height: 32px;
    }
    
    .system-name {
      font-size: 14px;
    }
  }
  
  .header-right .enter-link {
    font-size: 14px;
  }
  
  .folder-content {
    min-height: 400px;
  }
  
  .content-overlay {
    .main-title {
      font-size: 32px;
      margin-bottom: 15px;
    }
    
    .sub-title {
      font-size: 16px;
    }
  }
  
  .animated-text h2 {
    font-size: 28px;
  }
}

@media (max-width: 480px) {
  .trapezoid-content {
    padding-left: 10px;
    gap: 8px;
    
    .logo-image {
      height: 28px;
    }
    
    .system-name {
      font-size: 13px;
    }
  }
  
  .header-right .enter-link {
    font-size: 13px;
  }
  
  .folder-content {
    min-height: 350px;
    border-radius: 0 8px 8px 8px;
  }
  
  .content-overlay {
    .main-title {
      font-size: 24px;
      margin-bottom: 12px;
    }
    
    .sub-title {
      font-size: 14px;
    }
  }
  
  .animated-text h2 {
    font-size: 22px;
  }
}
</style>
