<template>
    <div class="overview">
        <div class="header">
            <HeaderPanel/>
        </div>
        <div class="corner-icons">
            <div class="icon-btn" title="模型参数">
                <svg class="icon" aria-hidden="true"><use xlink:href="#icon-moxingcanshu-hover"></use></svg>
                <span class="label">模型参数</span> 
            </div>
            <div class="icon-btn" title="模型运行">
                <svg class="icon" aria-hidden="true"><use xlink:href="#icon-moxingyunhangzhuangtaitongji"></use></svg>
                <span class="label">模型运行</span>
            </div>
        </div>
        <div class="card">
            <div class="diagram">
                <svg :viewBox="`0 0 ${svgWidth} ${svgHeight}`" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        <!-- 更顺滑的箭头样式 -->
                        <marker id="arrowHead" markerWidth="14" markerHeight="14" refX="12" refY="7" orient="auto" markerUnits="strokeWidth">
                            <path d="M0,0 L12,7 L0,14 C3,10 3,4 0,0 Z" fill="#00a2ff"/>
                        </marker>
                        <!-- 三角形高亮发光，仅用于关键水库 -->
                        <filter id="glowBlue" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="2.2" result="blur"/>
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                        <!-- 卡片阴影 -->
                        <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="160%">
                            <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.18" />
                        </filter>
                    </defs>

                    <!-- 河道主线 -->
                    <line :x1="startX" :y1="riverY" :x2="endX" :y2="riverY"
                          stroke="#1890ff" stroke-width="4" stroke-linecap="round" />

                    <!-- 流向箭头（第1与第2水库之间，轻微弧线，指向下游） -->
                    <path :d="`M ${arrowStartX} ${arrowY} Q ${arrowCtrlX} ${arrowCtrlY} ${arrowEndX} ${arrowY}`"
                          fill="none" stroke="#00a2ff" stroke-width="3" marker-end="url(#arrowHead)" />

                    <!-- 水库三角形与标签：尖指向上游（左），底边垂直河道；关键水库更大更醒目 -->
                    <g v-for="(x, i) in positions" :key="i">
                        <polygon :points="getTrianglePoints(x, riverY, getSizeForReservoir(reservoirs[i]))"
                                 fill="#ffffff" stroke="#2c3e50" stroke-width="1.4"
                                 :filter="isKey(reservoirs[i]) ? 'url(#glowBlue)' : undefined" />
                        <text :x="x" :y="riverY + 34" text-anchor="middle" :font-size="getFontSizeForReservoir(reservoirs[i])" fill="#2c3e50">{{ reservoirs[i] }}</text>
                    </g>
                    

                    <!-- 固定展示三座关键水库的数据卡片 -->
                    <g v-for="name in highlightReservoirs" :key="name"
                       :transform="`translate(${getXForReservoir(name) - cardWidth/2}, ${riverY - getSizeForReservoir(name) - 28 - cardHeight})`">
                        <rect :width="cardWidth" :height="cardHeight" rx="10" fill="#ffffff" filter="url(#cardShadow)" />
                        <polygon :points="`${cardWidth/2 - 8},${cardHeight} ${cardWidth/2 + 8},${cardHeight} ${cardWidth/2},${cardHeight + 10}`" fill="#ffffff" />
                        <text x="14" y="26" font-size="14" fill="#333" font-weight="600">{{ name }}</text>
                        <text x="14" y="54" font-size="12" fill="#555">保证出力：{{ reservoirData[name]?.guaranteedPower ?? '-' }}</text>
                        <text x="14" y="78" font-size="12" fill="#555">装机容量：{{ reservoirData[name]?.installedCapacity ?? '-' }}</text>
                        <text x="14" y="102" font-size="12" fill="#555">出力系数：{{ reservoirData[name]?.powerCoefficient ?? '-' }}</text>
                        <text x="14" y="126" font-size="12" fill="#555">设计水头：{{ reservoirData[name]?.designHead ?? '-' }}</text>
                        <text x="14" y="150" font-size="12" fill="#555">起调水位：{{ reservoirData[name]?.startLevel ?? '-' }}</text>
                    </g>
                </svg>
            </div>
        </div>
        <div class="overview-ctrl">
            <button class="overview-back-btn" type="button" @click="goHome">卫星图</button>
        </div>
    </div>
  
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import HeaderPanel from '@/components/header.vue'

const router = useRouter()
const goHome = () => router.push('/')

// 水库从上游到下游
const reservoirs = ['龙羊峡','拉瓦西','李家峡','公伯峡','积石峡','刘家峡','小峡','大峡','乌金峡','黑山峡','青铜峡']

// 关键水库集合：卡片仅对这些显示
const keyReservoirSet = new Set(['龙羊峡','刘家峡','黑山峡'])

// 示例数据（可替换为真实数据源）
const reservoirData: Record<string, {
    guaranteedPower: string | number;     // 保证出力
    installedCapacity: string | number;   // 装机容量
    powerCoefficient: string | number;    // 出力系数
    designHead: string | number;          // 设计水头
    startLevel: string | number;          // 起调水位
}> = {
    '龙羊峡': { guaranteedPower: '587', installedCapacity: '1280', powerCoefficient: '8.3', designHead: '122', startLevel: '0' },
    '刘家峡': { guaranteedPower: '400', installedCapacity: '1225', powerCoefficient: '8.3', designHead: '100', startLevel: '0' },
    '黑山峡': { guaranteedPower: '-', installedCapacity: '-', powerCoefficient: '-', designHead: '-', startLevel: '-' },
}

function isKey(name: string): boolean { return keyReservoirSet.has(name) }

const cardWidth = 240
const cardHeight = 172

// SVG 布局参数
const svgWidth = 1600
const svgHeight = 700
const marginX = 120
const riverY = Math.round(svgHeight / 2)
const startX = marginX
const endX = svgWidth - marginX
const step = (endX - startX) / (reservoirs.length - 1)
const positions = reservoirs.map((_, i) => startX + i * step)
const triSizeBase = 20
const triSizeKey = 34

// 流向箭头位置（第1与第2水库之间）
const arrowStartX = positions[0] + (positions[1] - positions[0]) * 0.3
const arrowEndX = positions[0] + (positions[1] - positions[0]) * 0.7
const arrowY = riverY - 70
const arrowCtrlX = (arrowStartX + arrowEndX) / 2
const arrowCtrlY = arrowY - 26

// 生成左指向三角形顶点：尖在 (x,y)，底边与河道垂直
function getTrianglePoints(x: number, y: number, size: number): string {
    const tipX = x
    const tipY = y
    const baseX = x + size
    const baseTopY = y - size / 2
    const baseBottomY = y + size / 2
    return `${tipX},${tipY} ${baseX},${baseTopY} ${baseX},${baseBottomY}`
}

// 关键水库：龙羊峡、刘家峡、黑山峡 -> 放大
function getSizeForReservoir(name: string): number {
    return name === '龙羊峡' || name === '刘家峡' || name === '黑山峡' ? triSizeKey : triSizeBase
}
function getFontSizeForReservoir(name: string): number {
    return name === '龙羊峡' || name === '刘家峡' || name === '黑山峡' ? 16 : 13
}

// 固定卡片：三座关键水库
const highlightReservoirs = ['龙羊峡','刘家峡','黑山峡'] as const
function getXForReservoir(name: string): number {
    const idx = reservoirs.indexOf(name)
    return idx >= 0 ? positions[idx] : startX
}
</script>

<style scoped lang="scss">
.overview {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding-top: 60px; /* 避开固定头部高度 */
  overflow: hidden; /* 防止溢出产生滚动条 */
  background: #f6f8fb;
}
.corner-icons {
  position: absolute;
  left: 12px;
  top: 76px; /* 避开头部logo栏 */
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 5;
}
.icon-btn {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #fff;
  display: grid;
  place-items: center;
  box-shadow: 0 2px 10px rgba(0,0,0,0.15);
}
.icon-btn .icon { width: 24px; height: 24px; }
.icon-btn .label {
  position: absolute;
  left: 48px;
  padding: 10px 15px;
  background: rgba(255,255,255,0.95);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  font-size: 12px;
  color: #333;
  opacity: 0;
  white-space: nowrap;
  transition: opacity .2s ease;
}
.icon-btn:hover .label { opacity: 1; }
.card {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: transparent;
  padding: 8px 12px 12px 12px;
  border-radius: 0;
  box-shadow: none;
}
.diagram { flex: 1; width: 100%; height: 100%; }

.overview-ctrl {
  position: absolute;
  right: 16px;
  bottom: 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.overview-back-btn {
  width: 72px;
  height: 32px;
  background: rgba(255, 255, 255, 0.95);
  border: none;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.15);
  font-size: 12px;
  font-weight: 600;
  color: #333;
  cursor: pointer;
  transition: all 0.3s ease;
}

.overview-back-btn:hover {
  // background: #f0f0f0;
  color: rgb(255, 176, 93);
  transform: translateY(-2px);
  // box-shadow: 0 4px 12px rgba(0,0,0,0.5);
}

.overview-back-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}
</style>


