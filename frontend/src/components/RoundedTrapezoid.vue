<template>
  <div class="fixed-trapezoid">
    <svg
      :width="WIDTH"
      :height="HEIGHT"
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
      shape-rendering="geometricPrecision"
    >
      <path
        :d="pathData"
        fill="#000000"
      />
    </svg>
    <!-- 内容插槽 -->
    <div class="content-slot">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

// 固定参数
const WIDTH = 300;
const HEIGHT = 60;
const SKEW_WIDTH = 30; // 倾斜的横向距离
const RADIUS_TOP = 18; // 顶部圆角
const RADIUS_BOTTOM = 10; // 右下角过渡圆角的半径

const pathData = computed(() => {
  const w = WIDTH;
  const h = HEIGHT;
  const rt = RADIUS_TOP;
  const rb = RADIUS_BOTTOM;
  const sw = SKEW_WIDTH; 
  
  const topRightX = w - sw; // 顶部斜切开始前的X坐标

  // 1. 左上角 (标准圆角)
  let d = `M 0,${rt} Q 0,0 ${rt},0 `;

  // 2. 上边缘 (直线)
  d += `L ${topRightX - rt},0 `;

  // 3. 右上角 (外凸圆角)
  // 计算斜率相关点，为了让曲线切向于斜边
  const slantLen = Math.sqrt(sw * sw + h * h);
  const tx = (rt / slantLen) * sw;
  const ty = (rt / slantLen) * h;
  d += `Q ${topRightX},0 ${topRightX + tx},${ty} `;

  // 4. 右侧斜边 (连接到下方的过渡处)
  // 我们在到达底部之前停止直线，留出空间给反向圆角
  const bx = (rb / slantLen) * sw;
  const by = (rb / slantLen) * h;
  d += `L ${w - bx},${h - by} `;

  // 5. 右下角过渡 (内凹/反向圆角) 关键点！
  // 这里的控制点设为 (w, h)，终点设为水平向右延伸或直接结束
  // 为了模拟图中连接长方形的效果，我们向右方画一段
  d += `Q ${w},${h} ${w + rb},${h} `;

  // 6. 底部和左侧闭合
  // 注意：如果下方有长方形，这里应该是连接到长方形的边界
  d += `L 0,${h} Z`;

  return d;
});
</script>

<style scoped>
.fixed-trapezoid {
  position: relative;
  display: inline-block;
  /* 宽度增加一点以容纳右侧排出的过渡部分 */
  width: 350px; 
  height: 60px;
  margin-bottom: -4px;
}
.content-slot {
  position: absolute;
  top: 0;
  left: 0;
  width: 300px; /* 保持原主体宽度 */
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  pointer-events: none;
  font-size: 14px;
}
</style>