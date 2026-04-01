<template>
    <div class="run-monitor-panel">
        <div class="panel-header">
            <div class="title">中间展示</div>
            <button class="close-btn" type="button" @click="$emit('close')">×</button>
        </div>
        <div class="content-grid">
            <div class="left-col">
                <div class="card">
                    <div class="card-title">进度监控</div>
                    <div class="progress-rows">
                        <div class="row"><span class="k">迭代次数</span><span class="v">{{ currentIteration }} / {{ totalIterations }}</span></div>
                        <div class="row"><span class="k">已用时间</span><span class="v">{{ elapsedDisplay }}</span></div>
                        <div class="row"><span class="k">预计时间</span><span class="v">{{ etaDisplay }}</span></div>
                    </div>
                    <div class="bar-wrap">
                        <div class="bar" :style="{ width: progressPercent + '%' }"></div>
                    </div>
                    <div class="slider-row" v-if="showIterationSlider && totalIterations > 1">
                        <span class="k">种群</span>
                        <input class="year-slider" type="range" min="1" :max="totalIterations" v-model.number="selectedIterationDisplay" />
                        <span class="v">{{ selectedIterationDisplay }} / {{ totalIterations }}</span>
                    </div>
                </div>

                <div class="card">
                    <div class="card-title">计算机资源监控</div>
                    <div class="res-grid">
                        <div class="item"><span class="label">CPU占用</span><span class="value">{{ cpuUsage.toFixed(0) }}%</span></div>
                        <div class="item"><span class="label">物理内存</span><span class="value">{{ deviceMemoryDisplay }}</span></div>
                        <div class="item"><span class="label">JS 堆内存</span><span class="value">{{ heapUsedDisplay }} / {{ heapTotalDisplay }}</span></div>
                        <div class="item"><span class="label">并发核心</span><span class="value">{{ cores }}</span></div>
                        <div class="item"><span class="label">磁盘</span><span class="value">{{ diskDisplay }}</span></div>
                    </div>
                </div>
            </div>

            <div class="right-col">
                <div class="right-grid">
                    <div class="card chart-card">
                        <div class="card-title">实时群体分布（目标空间）</div>
                        <div ref="chartEl" class="chart"></div>
                    </div>
                    <div class="card chart-card">
                        <div class="card-title">库容水位（年-期） <span class="sub" v-if="loadedIteration > 0">第{{ loadedIteration }}种群</span></div>
                        <div class="slider-row" v-if="yearCount > 0">
                            <span class="k">年份</span>
                            <input class="year-slider" type="range" min="1" :max="yearCount" v-model.number="selectedYearDisplay" />
                            <span class="v">{{ selectedYearDisplay }} / {{ yearCount }}</span>
                        </div>
                        <div ref="waterChartEl" class="chart"></div>
                    </div>
                    <div class="card chart-card">
                        <div class="card-title">下泄流量（年-期） <span class="sub" v-if="loadedIteration > 0">第{{ loadedIteration }}种群</span></div>
                        <div class="slider-row" v-if="yearCount > 0">
                            <span class="k">年份</span>
                            <input class="year-slider" type="range" min="1" :max="yearCount" v-model.number="selectedYearDisplay" />
                            <span class="v">{{ selectedYearDisplay }} / {{ yearCount }}</span>
                        </div>
                        <div ref="flowChartEl" class="chart"></div>
                    </div>
                    <div class="card chart-card">
                        <div class="card-title">16库出力（年-期） <span class="sub" v-if="loadedIteration > 0">第{{ loadedIteration }}种群</span></div>
                        <div class="slider-row" v-if="yearCount > 0">
                            <span class="k">年份</span>
                            <input class="year-slider" type="range" min="1" :max="yearCount" v-model.number="selectedYearDisplay" />
                            <span class="v">{{ selectedYearDisplay }} / {{ yearCount }}</span>
                        </div>
                        <div ref="outputChartEl" class="chart"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <!-- 约束满足情况弹窗（运行结束后显示，使用静态示例数据） -->
    <div v-if="showConstraintModal" class="constraint-modal-mask" role="dialog" aria-modal="true" @click.self="closeConstraintModal()">
        <div class="constraint-modal">
            <div class="modal-header">
                <div class="title">约束满足情况<span class="sub" v-if="loadedIteration > 0">（第{{ loadedIteration }}代）</span></div>
                <button class="close-btn" type="button" @click="closeConstraintModal()">×</button>
            </div>
            <div class="modal-content">
                <div class="summary-pass">所有约束均已满足</div>
                <div class="constraint-list">
                    <div class="c-item pass"><span class="name">水量平衡</span><span class="status">已满足</span></div>
                    <div class="c-item pass"><span class="name">库容上下限</span><span class="status">已满足</span></div>
                    <div class="c-item pass"><span class="name">最小生态下泄流量</span><span class="status">已满足</span></div>
                    <div class="c-item pass"><span class="name">电站出力/机组出力约束</span><span class="status">已满足</span></div>
                    <div class="c-item pass"><span class="name">梯级协同/调度约束</span><span class="status">已满足</span></div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="primary-btn" type="button" @click="closeConstraintModal()">知道了</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import * as echarts from 'echarts'
// 引入 echarts-gl 以启用 3D 图形
import 'echarts-gl'

interface ProgressRecord {
    iteration: number
    timestamp: string
    objective_values: number[][]
    ranks: number[]
    progress_percent?: number
}

interface Props {
    objectives?: number // 2 或 3；默认 2
    goalNames?: string[] // 由外部传入的目标名称
    schedulingTime?: { start: number; end: number } // 调度时间范围
}

const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'finished'): void }>()

const chartEl = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
const waterChartEl = ref<HTMLDivElement | null>(null)
let waterChart: echarts.ECharts | null = null
const flowChartEl = ref<HTMLDivElement | null>(null)
let flowChart: echarts.ECharts | null = null
const outputChartEl = ref<HTMLDivElement | null>(null)
let outputChart: echarts.ECharts | null = null

// 进度/资源状态
const currentIteration = ref<number>(0)
const totalIterations = ref<number>(20)
const progressPercent = ref<number>(0)
const startTime = ref<number | null>(null)
const nowTime = ref<number>(Date.now())

// 资源估计
const cores = navigator.hardwareConcurrency || 4
const deviceMemoryDisplay = (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : '未知'
const getHeap = () => (performance as any).memory as { usedJSHeapSize: number; totalJSHeapSize: number } | undefined
// 资源模拟：堆内存与磁盘显示
const simulatedHeapOverrideMb = ref<number | null>(null)
const simulatedTotalHeapMb = ref<number | null>(null)
const diskDisplay = ref<string>('空闲')
const heapUsedDisplay = computed(() => {
    const m = getHeap()
    const usedMb = simulatedHeapOverrideMb.value != null
        ? simulatedHeapOverrideMb.value
        : (m ? (m.usedJSHeapSize / 1024 / 1024) : null)
    return usedMb != null ? `${usedMb.toFixed(0)} MB` : '未知'
})
const heapTotalDisplay = computed(() => {
    const m = getHeap()
    const totalMb = simulatedTotalHeapMb.value != null
        ? simulatedTotalHeapMb.value
        : (m ? (m.totalJSHeapSize / 1024 / 1024) : null)
    return totalMb != null ? `${totalMb.toFixed(0)} MB` : '未知'
})

// 简易 CPU 使用估计（事件循环拥塞）
let cpuTimer: number | null = null
const cpuUsage = ref<number>(5)
function startCpuSampler() {
    const intervalMs = 500
    let last = performance.now()
    cpuTimer = window.setInterval(() => {
        const now = performance.now()
        const drift = Math.max(0, now - last - intervalMs)
        last = now
        // 粗略估计：拥塞 0..200ms -> 5..95%
        const pct = Math.max(5, Math.min(95, (drift / 200) * 90 + 5))
        cpuUsage.value = pct
        nowTime.value = Date.now()
        updateResourceSimulation()
    }, intervalMs)
}

// 数据加载与动画
let playTimer: number | null = null
let records: ProgressRecord[] = []
let playIndex = 0
let globalMin: number[] = [] // 各维度全局最小值（含边距）
let globalMax: number[] = [] // 各维度全局最大值（含边距）
let globalCenter: number[] = [] // 各维度全局中心点（用于 3D 视角对准）
const showIterationSlider = ref<boolean>(false)
const selectedIterationDisplay = ref<number>(1)
const showConstraintModal = ref<boolean>(false)
function closeConstraintModal() { showConstraintModal.value = false }
const resourceTailUntil = ref<number>(0)

// 根据播放进度模拟资源变化（CPU、堆内存、磁盘）
function updateResourceSimulation() {
    const playing = !!playTimer
    const now = Date.now()
    const active = playing || now < resourceTailUntil.value
    if (!active) {
        simulatedHeapOverrideMb.value = null
        simulatedTotalHeapMb.value = null
        diskDisplay.value = '空闲'
        return
    }
    const len = Math.max(1, (records.length - 1))
    const p = playing ? (playIndex / len) : Math.min(1, 1 - Math.max(0, resourceTailUntil.value - now) / 8000)
    const pulseCenters = [0.12, 0.45, 0.78]
    const pulse = pulseCenters.reduce((acc, c) => acc + Math.max(0, 1 - Math.abs(p - c) / 0.06), 0)
    const jitter = (Math.random() - 0.5) * 8
    const cpuSim = Math.min(96, Math.max(18, 35 + 38 * p + 20 * pulse + jitter))
    cpuUsage.value = Math.max(cpuUsage.value, cpuSim)

    const m = getHeap()
    const totalMb = (m ? (m.totalJSHeapSize / 1024 / 1024) : 400)
    simulatedTotalHeapMb.value = totalMb
    const usedSim = Math.min(totalMb * 0.95, Math.max(totalMb * 0.25, totalMb * (0.3 + 0.5 * p + 0.12 * pulse) + Math.random() * totalMb * 0.02))
    simulatedHeapOverrideMb.value = usedSim

    const read = (p > 0.05) ? (60 + 140 * pulse + 30 * Math.random()) : (5 + 10 * Math.random())
    const write = (p > 0.05) ? (40 + 90 * pulse + 20 * Math.random()) : (3 + 8 * Math.random())
    diskDisplay.value = `读 ${read.toFixed(0)} / 写 ${write.toFixed(0)} MB/s`
}

// 库容水位数据（固定54年×20期）及年份选择
const longVSeries = ref<number[][]>([])
const liuVSeries = ref<number[][]>([])
const longQSeries = ref<number[][]>([])
const liuQSeries = ref<number[][]>([])
const outputSeriesList = ref<{ id: string; label: string; data: number[][] }[]>([])
const selectedYearDisplay = ref<number>(1) // 1..yearCount
const FIXED_YEAR_COUNT = 54
const yearCount = computed<number>(() => {
    if (props.schedulingTime) {
        // 根据用户要求：间隔为3年 -> 滑动3个 (即 end - start)
        // 例如 2020-2023 -> 3
        const diff = props.schedulingTime.end - props.schedulingTime.start
        return Math.max(1, diff)
    }
    return FIXED_YEAR_COUNT
})
// 期次边界标签（21个：期初 + 20个期末）
const PERIOD_BOUNDARY_LABELS: string[] = ['7上初','7上末','7中末','7下末','8上末','8中末','8下末','9末','10末','11末','12末','1末','2末','3末','4末','5上末','5中末','5下末','6上末','6中末','6下末']
// 流量期次标签（与库容边界一致，但去掉期初，仅保留20个期末）
const FLOW_PERIOD_LABELS: string[] = PERIOD_BOUNDARY_LABELS.slice(1)
// 结果文件的最大迭代号（根据约定为20代）
const MAX_RESULT_ITERATION = 20
let lastLoadedResultIteration = -1
let loadingResultIteration: number | null = null
// 简单内存缓存，避免重复加载大 JSON
const reservoirCache = new Map<number, { long: number[][]; liu: number[][]; longQ?: number[][]; liuQ?: number[][]; ntii?: Record<string, number[][]> }>()
const loadedIteration = ref<number>(0)
// 预编译：分别收录 2目标(result2) 与 3目标(result3) 目录的 20 个结果文件
const RESULT_URLS_2: string[] = [
    new URL('../assets/result2/json_results_iteration_1.json', import.meta.url).href,
    new URL('../assets/result2/json_results_iteration_2.json', import.meta.url).href,
    new URL('../assets/result2/json_results_iteration_3.json', import.meta.url).href,
    new URL('../assets/result2/json_results_iteration_4.json', import.meta.url).href,
    new URL('../assets/result2/json_results_iteration_5.json', import.meta.url).href,
    new URL('../assets/result2/json_results_iteration_6.json', import.meta.url).href,
    new URL('../assets/result2/json_results_iteration_7.json', import.meta.url).href,
    new URL('../assets/result2/json_results_iteration_8.json', import.meta.url).href,
    new URL('../assets/result2/json_results_iteration_9.json', import.meta.url).href,
    new URL('../assets/result2/json_results_iteration_10.json', import.meta.url).href,
    new URL('../assets/result2/json_results_iteration_11.json', import.meta.url).href,
    new URL('../assets/result2/json_results_iteration_12.json', import.meta.url).href,
    new URL('../assets/result2/json_results_iteration_13.json', import.meta.url).href,
    new URL('../assets/result2/json_results_iteration_14.json', import.meta.url).href,
    new URL('../assets/result2/json_results_iteration_15.json', import.meta.url).href,
    new URL('../assets/result2/json_results_iteration_16.json', import.meta.url).href,
    new URL('../assets/result2/json_results_iteration_17.json', import.meta.url).href,
    new URL('../assets/result2/json_results_iteration_18.json', import.meta.url).href,
    new URL('../assets/result2/json_results_iteration_19.json', import.meta.url).href,
    new URL('../assets/result2/json_results_iteration_20.json', import.meta.url).href,
]
const RESULT_URLS_3: string[] = [
    new URL('../assets/result3/json_results_iteration_1.json', import.meta.url).href,
    new URL('../assets/result3/json_results_iteration_2.json', import.meta.url).href,
    new URL('../assets/result3/json_results_iteration_3.json', import.meta.url).href,
    new URL('../assets/result3/json_results_iteration_4.json', import.meta.url).href,
    new URL('../assets/result3/json_results_iteration_5.json', import.meta.url).href,
    new URL('../assets/result3/json_results_iteration_6.json', import.meta.url).href,
    new URL('../assets/result3/json_results_iteration_7.json', import.meta.url).href,
    new URL('../assets/result3/json_results_iteration_8.json', import.meta.url).href,
    new URL('../assets/result3/json_results_iteration_9.json', import.meta.url).href,
    new URL('../assets/result3/json_results_iteration_10.json', import.meta.url).href,
    new URL('../assets/result3/json_results_iteration_11.json', import.meta.url).href,
    new URL('../assets/result3/json_results_iteration_12.json', import.meta.url).href,
    new URL('../assets/result3/json_results_iteration_13.json', import.meta.url).href,
    new URL('../assets/result3/json_results_iteration_14.json', import.meta.url).href,
    new URL('../assets/result3/json_results_iteration_15.json', import.meta.url).href,
    new URL('../assets/result3/json_results_iteration_16.json', import.meta.url).href,
    new URL('../assets/result3/json_results_iteration_17.json', import.meta.url).href,
    new URL('../assets/result3/json_results_iteration_18.json', import.meta.url).href,
    new URL('../assets/result3/json_results_iteration_19.json', import.meta.url).href,
    new URL('../assets/result3/json_results_iteration_20.json', import.meta.url).href,
]

// 简单调试输出函数
const dbg = (...args: any[]) => console.log('[RunMonitorPanel]', ...args)

// 数值格式化（最多三位小数，去除多余的 0）
function formatNumber(val: number, digits: number = 3): string {
    if (!isFinite(val as any)) return ''
    const s = Number(val).toFixed(digits)
    return s
        .replace(/\.0+$/, '')
        .replace(/(\.\d*[1-9])0+$/, '$1')
}
const axisLabelFormatter = (value: number) => formatNumber(value, 3)

// 出力电站名称映射与优先排序
const OUTPUT_LABELS: Record<string, string> = {
    long: '龙羊峡',
    liu: '刘家峡',
    laxiwa: '拉西瓦',
    nina: '尼那',
    lijiaxia: '李家峡',
    zhiganglaka: '直岗拉卡',
    kangyang: '康扬',
    gongboxia: '公伯峡',
    suzhi: '苏只',
    yanguoxia: '盐锅峡',
    bapanxia: '八盘峡',
    xiaoxia: '小峡',
    daxia: '大峡',
    qingtongxia: '青铜峡',
    jishixia: '积石峡'
}
const OUTPUT_ORDER: string[] = ['long','liu','laxiwa','nina','lijiaxia','zhiganglaka','kangyang','gongboxia','suzhi','yanguoxia','bapanxia','xiaoxia','daxia','qingtongxia','jishixia']

async function loadProgress() {
    const objCount = props.objectives && (props.objectives === 3) ? 3 : 2
    const path = objCount === 3
        ? new URL('../assets/result3/PAEM_progress_3.json', import.meta.url).toString()
        : new URL('../assets/result2/PAEM_progress_2.json', import.meta.url).toString()

    dbg('loadProgress: path =', path)
    const text = await fetch(path).then(r => r.text())
    const lines = text.split(/\r?\n/).filter(Boolean)
    dbg('loadProgress: lines =', lines.length)
    records = lines.map((ln) => JSON.parse(ln) as ProgressRecord)
    totalIterations.value = records[records.length - 1]?.iteration ?? 20
    // 起始时间改为从播放开始计时（在 startPlayback 中设置）
    // 计算全局坐标范围（各维度）并加少量边距，确保各帧/各迭代坐标一致
    const firstNonEmpty = records.find(r => r.objective_values && r.objective_values.length > 0)
    const dims = firstNonEmpty?.objective_values?.[0]?.length || 2
    dbg('loadProgress: dims =', dims)
    globalMin = new Array(dims).fill(Infinity)
    globalMax = new Array(dims).fill(-Infinity)
    for (const r of records) {
        for (const v of r.objective_values || []) {
            for (let d = 0; d < dims; d++) {
                const val = v[d]
                if (val < globalMin[d]) globalMin[d] = val
                if (val > globalMax[d]) globalMax[d] = val
            }
        }
    }
    for (let d = 0; d < dims; d++) {
        const range = globalMax[d] - globalMin[d]
        if (!isFinite(range) || range === 0) {
            globalMin[d] = (isFinite(globalMin[d]) ? globalMin[d] : 0) - 1
            globalMax[d] = (isFinite(globalMax[d]) ? globalMax[d] : 0) + 1
        } else {
            const pad = range * 0.05
            globalMin[d] -= pad
            globalMax[d] += pad
        }
    }
    globalCenter = new Array(dims).fill(0).map((_, d) => (globalMin[d] + globalMax[d]) / 2)
}

function startPlayback() {
    if (!records.length) return
    playIndex = 0

    // 从 00:00:00 开始计时
    startTime.value = Date.now()
    nowTime.value = Date.now()
    showIterationSlider.value = false
    selectedIterationDisplay.value = 1
    showConstraintModal.value = false
    resourceTailUntil.value = 0

    const frameMs = 800
    if (playTimer) { clearInterval(playTimer); playTimer = null }

    // 先渲染第一迭代的全部点
    dbg('startPlayback: records =', records.length)
    updateByRecord(records[0])

    playTimer = window.setInterval(() => {
        if (!records.length) return
        playIndex = Math.min(records.length - 1, playIndex + 1)
        updateByRecord(records[playIndex])
        if (playIndex >= records.length - 1) {
            if (playTimer) { clearInterval(playTimer); playTimer = null }
            // 播放完成后开启迭代滑块
            showIterationSlider.value = true
            selectedIterationDisplay.value = currentIteration.value
            showConstraintModal.value = true
            resourceTailUntil.value = Date.now() + 8000
            // 通知父组件运行已结束
            emit('finished')
        }
    }, frameMs)
}

function updateByRecord(rec: ProgressRecord) {
    dbg('updateByRecord: iteration =', rec.iteration)
    currentIteration.value = rec.iteration
    progressPercent.value = rec.progress_percent ?? Math.round((rec.iteration / (totalIterations.value || 1)) * 100)
    renderChart(rec)
    // 联动加载对应代的库容水位
    loadReservoirVForIteration(currentIteration.value)
}

function jumpToIteration(iteration: number) {
    if (!records.length) return
    let idx = records.findIndex(r => r.iteration === iteration)
    if (idx < 0) {
        // 若未找到精确匹配，寻找最接近的
        const iters = records.map(r => r.iteration)
        let best = 0
        let bestDiff = Infinity
        for (let i = 0; i < iters.length; i++) {
            const d = Math.abs(iters[i] - iteration)
            if (d < bestDiff) { bestDiff = d; best = i }
        }
        idx = best
    }
    playIndex = idx
    updateByRecord(records[idx])
}

function renderChart(rec: ProgressRecord) {
    if (!chartEl.value) return
    if (!chart) chart = echarts.init(chartEl.value)

    const values = rec.objective_values
    const ranks = (rec.ranks || [])
    const dims = values[0]?.length || 2
    const maxRank = Math.max(1, ...ranks)

    if (dims >= 3 && (props.objectives === 3 || (props.goalNames && props.goalNames.length >= 3))) {
        const allData3 = values.map((p, i) => [p[0], p[1], p[2], ranks[i] ?? 0])
        const front3 = allData3.filter(d => d[3] === 1)
        const axisNames3 = (props.goalNames && props.goalNames.length >= 3)
            ? props.goalNames
            : ['兰州断面总缺水量最小','梯级水电站群年均发电量最大','梯级调度系统总协同度最大']
        const option3: echarts.EChartsOption = {
            tooltip: {
                trigger: 'item',
                formatter: (p: any) => `(${axisLabelFormatter(p.value[0])}, ${axisLabelFormatter(p.value[1])}, ${axisLabelFormatter(p.value[2])})`
            },
            legend: { data: ['所有个体', '第一非支配前沿'], left: 8, top: 8, itemWidth: 10, itemHeight: 10, textStyle: { color: '#333' } },
            grid3D: {
                left: 48, right: 48, top: 0, bottom:0,
                boxWidth: 90, boxDepth: 90, boxHeight: 90,
                axisLine: { lineStyle: { color: '#999' } },
                axisLabel: { textStyle: { color: '#666', fontSize: 10 } },
                viewControl: { projection: 'perspective', alpha: 20, beta: 30, distance: 200, autoRotate: false, targetCoord: [globalCenter[0], globalCenter[1], globalCenter[2]] }
            },
            xAxis3D: { name: axisNames3[0], type: 'value', scale: true, min: globalMin[0], max: globalMax[0], nameGap: 5, nameTextStyle: { color: '#555', fontSize: 11, backgroundColor: 'rgba(255,255,255,0.7)', padding: [2,4] }, axisLabel: { formatter: (v: number) => axisLabelFormatter(v), textStyle: { color: '#666', fontSize: 10 } } },
            yAxis3D: { name: axisNames3[1], type: 'value', scale: true, min: globalMin[1], max: globalMax[1], nameGap: 16, nameTextStyle: { color: '#555', fontSize: 11, backgroundColor: 'rgba(255,255,255,0.7)', padding: [2,4] }, axisLabel: { formatter: (v: number) => axisLabelFormatter(v), textStyle: { color: '#666', fontSize: 10 } } },
            zAxis3D: { name: axisNames3[2], type: 'value', scale: true, min: globalMin[2], max: globalMax[2], nameGap: 16, nameTextStyle: { color: '#555', fontSize: 11, backgroundColor: 'rgba(255,255,255,0.7)', padding: [2,4] }, axisLabel: { formatter: (v: number) => axisLabelFormatter(v), textStyle: { color: '#666', fontSize: 10 } } },
            visualMap: {
                min: 0,
                max: maxRank,
                dimension: 3,
                calculable: false,
                orient: 'vertical', right: 8,
                top: 'middle',
                inRange: { color: ['#4e79a7', '#f28e2b', '#e15759'] },
                text: ['rank', '']
            },
            series: [
                { name: '所有个体', type: 'scatter3D', data: allData3, symbolSize: 6, encode: { x: 0, y: 1, z: 2 }, itemStyle: { opacity: 0.9 } },
                { name: '第一非支配前沿', type: 'scatter3D', data: front3, symbolSize: 8, itemStyle: { color: '#e74c3c' }, encode: { x: 0, y: 1, z: 2 }, zlevel: 3 }
            ]
        }
        chart.setOption(option3)
        return
    }

    // 默认二维
    const allData = values.map((p, i) => [p[0], p[1], ranks[i] ?? 0])
    const front1 = allData.filter(d => d[2] === 1)
    const axisNames = (props.goalNames && props.goalNames.length >= 2)
        ? props.goalNames
        : ['兰州断面总缺水量最小','梯级水电站群年均发电量最大']
    const option2d: echarts.EChartsOption = {
        tooltip: {
            trigger: 'item',
            formatter: (p: any) => `(${axisLabelFormatter(p.value[0])}, ${axisLabelFormatter(p.value[1])})`
        },
        legend: { data: ['所有个体', '第一非支配前沿'], left: 8, top: 8, itemWidth: 10, itemHeight: 10, textStyle: { color: '#333' } },
        grid: { top: 56, right: 32, bottom: 42, left: 60 },
        xAxis: { name: axisNames[0], nameLocation: 'middle', nameGap: 28, type: 'value', scale: true, min: globalMin[0], max: globalMax[0], axisLine: { lineStyle: { color: '#999' } }, axisLabel: { color: '#666', fontSize: 10, formatter: (v: number) => axisLabelFormatter(v) }, nameTextStyle: { color: '#555', fontSize: 11 } },
        yAxis: { name: axisNames[1], nameLocation: 'middle', nameGap: 40, type: 'value', scale: true, min: globalMin[1], max: globalMax[1], axisLine: { lineStyle: { color: '#999' } }, axisLabel: { color: '#666', fontSize: 10, formatter: (v: number) => axisLabelFormatter(v) }, nameTextStyle: { color: '#555', fontSize: 11 } },
        visualMap: {
            min: 0,
            max: maxRank,
            calculable: false,
            orient: 'vertical',
            right: 0,
            top: 'middle',
            inRange: { color: ['#4e79a7', '#f28e2b', '#e15759'] },
            text: ['rank', '']
        },
        series: [
            { name: '所有个体', type: 'scatter', data: allData, symbolSize: 8, encode: { x: 0, y: 1 }, itemStyle: { opacity: 0.9 } },
            { name: '第一非支配前沿', type: 'scatter', data: front1, symbolSize: 10, itemStyle: { color: '#e74c3c' }, encode: { x: 0, y: 1 }, z: 3 }
        ]
    }
    chart.setOption(option2d)
}

// -------------------- 库容水位图表 --------------------
async function loadReservoirVForIteration(iteration: number = 1) {
    try {
        const it = Math.max(1, Math.min(MAX_RESULT_ITERATION, Math.round(iteration)))
        dbg('loadReservoirVForIteration: requested =', iteration, 'normalized =', it)
        if (loadingResultIteration === it) {
            dbg('loadReservoirVForIteration: skip (already loading iteration', it, ')')
            return
        }
        if (it === lastLoadedResultIteration) {
            dbg('loadReservoirVForIteration: skip (same iteration)')
            renderWaterChart()
            return
        }
        loadingResultIteration = it
        // 命中缓存直接渲染
        if (reservoirCache.has(it)) {
            dbg('loadReservoirVForIteration: hit cache for iteration', it)
            const cached = reservoirCache.get(it)!
            longVSeries.value = cached.long
            liuVSeries.value = cached.liu
            longQSeries.value = cached.longQ || []
            liuQSeries.value = cached.liuQ || []
            if (cached.ntii) {
                const orderedIds = [...OUTPUT_ORDER, ...Object.keys(cached.ntii).filter(id => !OUTPUT_ORDER.includes(id))]
                outputSeriesList.value = orderedIds
                    .filter(id => cached.ntii![id])
                    .map(id => ({ id, label: OUTPUT_LABELS[id] || id, data: cached.ntii![id] }))
            } else {
                outputSeriesList.value = []
            }
            selectedYearDisplay.value = 1
            renderWaterChart()
            renderFlowChart()
            renderOutputChart()
            lastLoadedResultIteration = it
        loadedIteration.value = it
            loadingResultIteration = null
            return
        }
        // 优先使用预编译URL；若不存在则尝试从 public 目录读取
        const objCount = props.objectives && (props.objectives === 3) ? 3 : 2
        const arr = objCount === 3 ? RESULT_URLS_3 : RESULT_URLS_2
        const prebuilt = arr[it - 1]
        const subdir = objCount === 3 ? 'result3' : 'result2'
        const fallback = `${import.meta.env.BASE_URL}${subdir}/json_results_iteration_${it}.json`
        const urlToFetch = prebuilt || fallback
        dbg('loadReservoirVForIteration: url =', urlToFetch, 'prebuilt?', !!prebuilt)
        const resp = await fetch(urlToFetch)
        dbg('loadReservoirVForIteration: resp.ok =', resp.ok, 'status =', resp.status)
        if (!resp.ok) throw new Error(`加载失败: ${resp.status}`)
        const txt = await resp.text()
        console.log('loadReservoirVForIteration: txt =', txt)
        console.log('loadReservoirVForIteration: txt =', txt[2])
        let data: any = null
        try {
            data = JSON.parse(txt)
        } catch (je) {
            const i = txt.indexOf('{')
            const j = txt.lastIndexOf('}')
            if (i >= 0 && j > i) {
                const sliced = txt.slice(i, j + 1)
                try {
                    data = JSON.parse(sliced)
                    dbg('loadReservoirVForIteration: parsed by slicing first/last brace')
                } catch (je2) {
                    dbg('loadReservoirVForIteration: parse failed after slicing:', je2)
                    throw je2
                }
            } else {
                dbg('loadReservoirVForIteration: parse failed, first 200 chars =', txt.slice(0, 200))
                throw je
            }
        }

        // 选择“第一个子代”的数据
        let payload: any = data
        let pickedIndex = -1
        if (Array.isArray(data)) {
            for (let i = 0; i < data.length; i++) {
                const item = data[i]
                if (item && (item.Long || item.long || item.Liu || item.liu)) { payload = item; pickedIndex = i; break }
            }
            if (pickedIndex < 0 && data.length > 0) { payload = data[0]; pickedIndex = 0 }
        }
        dbg('loadReservoirVForIteration: picked subgen index =', pickedIndex)

        const long = (payload && (payload.Long || payload.long)) || {}
        const liu = (payload && (payload.Liu || payload.liu)) || {}
        let vLong: any = long?.V ?? long?.v ?? payload?.Vlong ?? payload?.vlong
        let vLiu: any = liu?.V ?? liu?.v ?? payload?.Vliu ?? payload?.vliu
        // 下泄流量字段（兼容多种命名）
        let qLong: any = long?.Qout ?? long?.QOut ?? long?.qout ?? payload?.Qlongout ?? payload?.QlongOut ?? payload?.QLongOut ?? payload?.qlongout
        let qLiu: any = liu?.Qout ?? liu?.QOut ?? liu?.qout ?? payload?.Qliuout ?? payload?.QliuOut ?? payload?.QLiuOut ?? payload?.qliuout
        // 出力对象（可能在 payload.N / payload.n 或直接以 Ntii_* 存在）
        const Nobj: any = (payload && (payload.N || payload.n)) || payload

        // 若 V 为三维（[subgen][years][periods]），取第一个子代
        const firstSubgen = (raw: any) => {
            if (Array.isArray(raw) && Array.isArray(raw[0]) && Array.isArray(raw[0][0])) return raw[0]
            return raw
        }
        vLong = firstSubgen(vLong)
        vLiu = firstSubgen(vLiu)
        qLong = firstSubgen(qLong)
        qLiu = firstSubgen(qLiu)

        // 归一化函数：将任意形态转为 2D [years][periods]
        const normalizeV = (raw: any): number[][] => {
            try {
                // 字符串 -> JSON
                if (typeof raw === 'string') {
                    const s = raw.trim()
                    if (s.startsWith('[')) raw = JSON.parse(s)
                }
                // 对象包装 { data: [...] }
                if (raw && typeof raw === 'object' && !Array.isArray(raw) && Array.isArray(raw.data)) {
                    raw = raw.data
                }
                // 已经是二维
                if (Array.isArray(raw) && Array.isArray(raw[0])) {
                    const rows = raw as any[]
                    const r0 = rows[0] as any[]
                    // 如果是 21x54 则转置
                    if (r0 && r0.length === 54 && rows.length === 21) {
                        const trans: number[][] = []
                        for (let i = 0; i < 54; i++) {
                            const row: number[] = []
                            for (let j = 0; j < 21; j++) row.push(rows[j][i])
                            trans.push(row)
                        }
                        return trans
                    }
                    return rows as number[][]
                }
                // 一维：尝试整形
                if (Array.isArray(raw) && (raw.length > 0) && typeof raw[0] === 'number') {
                    const flat = raw as number[]
                    // 优先按 54x21 切分
                    if (flat.length % 21 === 0) {
                        const years = flat.length / 21
                        const out: number[][] = []
                        for (let y = 0; y < years; y++) out.push(flat.slice(y * 21, (y + 1) * 21))
                        return out
                    }
                    if (flat.length % 54 === 0) {
                        const cols = flat.length / 54
                        const out: number[][] = []
                        for (let y = 0; y < 54; y++) out.push(flat.slice(y * cols, (y + 1) * cols))
                        // 若得到 54x54 等异常矩阵，交由后续对齐逻辑处理
                        return out
                    }
                }
            } catch (err) {
                dbg('normalizeV failed:', err)
            }
            return []
        }

        const longArr = normalizeV(vLong)
        const liuArr = normalizeV(vLiu)
        const longQArr = normalizeV(qLong)
        const liuQArr = normalizeV(qLiu)
        // 扫描出力 Ntii_* 并归一化
        const outputs: Record<string, number[][]> = {}
        const scanOutputs = (src: any) => {
            if (!src || typeof src !== 'object') return
            for (const k of Object.keys(src)) {
                const m = /^(Ntii_?)(.+)$/i.exec(k)
                if (m && src[k] != null) {
                    const id = m[2].toLowerCase()
                    const arr = normalizeV(firstSubgen(src[k]))
                    if (arr && arr.length) outputs[id] = arr
                }
            }
        }
        scanOutputs(Nobj)
        const orderedIds = [...OUTPUT_ORDER, ...Object.keys(outputs).filter(id => !OUTPUT_ORDER.includes(id))]
        const outputList = orderedIds.filter(id => outputs[id]).map(id => ({ id, label: OUTPUT_LABELS[id] || id, data: outputs[id] }))
        dbg('loadReservoirVForIteration: keys =', Object.keys(data || {}))
        dbg('loadReservoirVForIteration: Long.V shape =', longArr.length, 'x', longArr[0]?.length)
        dbg('loadReservoirVForIteration: Liu.V shape =', liuArr.length, 'x', liuArr[0]?.length)
        longVSeries.value = longArr
        liuVSeries.value = liuArr
        longQSeries.value = longQArr
        liuQSeries.value = liuQArr
        outputSeriesList.value = outputList

        selectedYearDisplay.value = 1
        renderWaterChart()
        renderFlowChart()
        renderOutputChart()
        lastLoadedResultIteration = it
        reservoirCache.set(it, { long: longArr, liu: liuArr, longQ: longQArr, liuQ: liuQArr, ntii: outputs })
        loadedIteration.value = it
    } catch (e) {
        // 读取失败时清空
        longVSeries.value = []
        liuVSeries.value = []
        longQSeries.value = []
        liuQSeries.value = []
        outputSeriesList.value = []
        selectedYearDisplay.value = 1
        renderWaterChart()
        renderFlowChart()
        renderOutputChart()
        loadedIteration.value = 0
        console.error('[水位图] 结果文件加载失败：', e)
    } finally {
        loadingResultIteration = null
    }
}

function renderWaterChart() {
    if (!waterChartEl.value) return
    if (!waterChart) waterChart = echarts.init(waterChartEl.value)

    const yIdx = Math.max(0, Math.min((selectedYearDisplay.value || 1) - 1, Math.max(0, yearCount.value - 1)))
    const longRow = (longVSeries.value && longVSeries.value[yIdx]) ? longVSeries.value[yIdx] : []
    const liuRow = (liuVSeries.value && liuVSeries.value[yIdx]) ? liuVSeries.value[yIdx] : []
    dbg('renderWaterChart: yearIdx =', yIdx, 'longRowLen =', longRow?.length || 0, 'liuRowLen =', liuRow?.length || 0)
    const align = (row: any[], len: number): (number | null)[] => {
        if (!Array.isArray(row)) return Array(len).fill(null)
        if (row.length === len) return row.slice()
        if (row.length > len) return row.slice(0, len)
        return [...row, ...Array(len - row.length).fill(null)]
    }
    const labels = PERIOD_BOUNDARY_LABELS
    const longData = align(longRow, labels.length)
    const liuData = align(liuRow, labels.length)
    dbg('renderWaterChart: labels =', labels.length, 'longDataLen =', longData.length, 'liuDataLen =', liuData.length)

    const option: echarts.EChartsOption = {
        tooltip: { trigger: 'axis' },
        legend: { data: ['龙羊峡 V', '刘家峡 V'], left: 8, top: 8, itemWidth: 10, itemHeight: 10, textStyle: { color: '#333' } },
        grid: { top: 56, right: 24, bottom: 42, left: 60 },
        xAxis: { type: 'category', name: '期初/期末', nameLocation: 'end', data: labels, axisLine: { lineStyle: { color: '#999' } }, axisLabel: { color: '#666', fontSize: 10 } },
        yAxis: { type: 'value', name: '库容/水位', nameLocation: 'middle', nameGap: 40, axisLine: { lineStyle: { color: '#999' } }, axisLabel: { color: '#666', fontSize: 10 } },
        series: [
            { name: '龙羊峡 V', type: 'line', smooth: true, symbolSize: 6, data: longData, lineStyle: { width: 2 } },
            { name: '刘家峡 V', type: 'line', smooth: true, symbolSize: 6, data: liuData, lineStyle: { width: 2 } }
        ]
    }
    waterChart.setOption(option)
}

function renderFlowChart() {
    if (!flowChartEl.value) return
    if (!flowChart) flowChart = echarts.init(flowChartEl.value)

    const yIdx = Math.max(0, Math.min((selectedYearDisplay.value || 1) - 1, Math.max(0, yearCount.value - 1)))
    const longRow = (longQSeries.value && longQSeries.value[yIdx]) ? longQSeries.value[yIdx] : []
    const liuRow = (liuQSeries.value && liuQSeries.value[yIdx]) ? liuQSeries.value[yIdx] : []
    dbg('renderFlowChart: yearIdx =', yIdx, 'longRowLen =', longRow?.length || 0, 'liuRowLen =', liuRow?.length || 0)

    const align = (row: any[], len: number): (number | null)[] => {
        if (!Array.isArray(row)) return Array(len).fill(null)
        if (row.length === len) return row.slice()
        if (row.length > len) return row.slice(0, len)
        return [...row, ...Array(len - row.length).fill(null)]
    }

    const labels = FLOW_PERIOD_LABELS
    const longData = align(longRow, labels.length)
    const liuData = align(liuRow, labels.length)
    dbg('renderFlowChart: labels =', labels.length, 'longDataLen =', longData.length, 'liuDataLen =', liuData.length)

    const option: echarts.EChartsOption = {
        tooltip: { trigger: 'axis' },
        legend: { data: ['龙羊峡 Qout', '刘家峡 Qout'], left: 8, top: 8, itemWidth: 10, itemHeight: 10, textStyle: { color: '#333' } },
        grid: { top: 56, right: 24, bottom: 42, left: 60 },
        xAxis: { type: 'category', name: '期末', nameLocation: 'end', data: labels, axisLine: { lineStyle: { color: '#999' } }, axisLabel: { color: '#666', fontSize: 10 } },
        yAxis: { type: 'value', name: '下泄流量', nameLocation: 'middle', nameGap: 40, axisLine: { lineStyle: { color: '#999' } }, axisLabel: { color: '#666', fontSize: 10 } },
        series: [
            { name: '龙羊峡 Qout', type: 'line', smooth: true, symbolSize: 6, data: longData, lineStyle: { width: 2 } },
            { name: '刘家峡 Qout', type: 'line', smooth: true, symbolSize: 6, data: liuData, lineStyle: { width: 2 } }
        ]
    }
    flowChart.setOption(option)
}

function renderOutputChart() {
    if (!outputChartEl.value) return
    if (!outputChart) outputChart = echarts.init(outputChartEl.value)

    const yIdx = Math.max(0, Math.min((selectedYearDisplay.value || 1) - 1, Math.max(0, yearCount.value - 1)))
    const labels = FLOW_PERIOD_LABELS

    const align = (row: any[], len: number): (number | null)[] => {
        if (!Array.isArray(row)) return Array(len).fill(null)
        if (row.length === len) return row.slice()
        if (row.length > len) return row.slice(0, len)
        return [...row, ...Array(len - row.length).fill(null)]
    }

    const series = outputSeriesList.value.map(s => {
        const row = (s.data && s.data[yIdx]) ? s.data[yIdx] : []
        return { name: s.label, type: 'line', smooth: true, symbolSize: 4, data: align(row, labels.length), lineStyle: { width: 1.5 } }
    })

    const option: echarts.EChartsOption = {
        tooltip: { trigger: 'axis' },
        legend: { type: 'scroll', left: 8, top: 8, itemWidth: 10, itemHeight: 10, textStyle: { color: '#333' } },
        grid: { top: 64, right: 24, bottom: 42, left: 60 },
        xAxis: { type: 'category', name: '期末', nameLocation: 'end', data: labels, axisLine: { lineStyle: { color: '#999' } }, axisLabel: { color: '#666', fontSize: 10 } },
        yAxis: { type: 'value', name: '出力', nameLocation: 'middle', nameGap: 40, axisLine: { lineStyle: { color: '#999' } }, axisLabel: { color: '#666', fontSize: 10 } },
        series
    }
    outputChart.setOption(option)
}

const elapsedDisplay = computed(() => {
    if (!startTime.value) return '--'
    const s = Math.max(0, Math.round((nowTime.value - startTime.value) / 1000))
    return formatDuration(s)
})
const etaDisplay = computed(() => {
    if (!startTime.value) return '--'
    const elapsedMs = nowTime.value - startTime.value
    const pct = Math.max(1, progressPercent.value)
    const totalMs = (elapsedMs / pct) * 100
    const remain = Math.max(0, Math.round((totalMs - elapsedMs) / 1000))
    return formatDuration(remain)
})

function formatDuration(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    const seg = (n: number) => n.toString().padStart(2, '0')
    // 始终显示为 00:00:00 格式
    return `${seg(h)}:${seg(m)}:${seg(s)}`
}

onMounted(async () => {
    dbg('onMounted: start')
    await loadProgress()
    startPlayback()
    // 不再手动加载第1代，避免与播放首帧/迭代监听的重复加载
    startCpuSampler()
    window.addEventListener('resize', () => { if (chart) chart.resize(); if (waterChart) waterChart.resize(); if (flowChart) flowChart.resize(); if (outputChart) outputChart.resize() })
    dbg('onMounted: done')
})
onUnmounted(() => {
    if (playTimer) { clearInterval(playTimer); playTimer = null }
    if (cpuTimer) { clearInterval(cpuTimer); cpuTimer = null }
    if (chart) { chart.dispose(); chart = null }
    if (waterChart) { waterChart.dispose(); waterChart = null }
    if (flowChart) { flowChart.dispose(); flowChart = null }
    if (outputChart) { outputChart.dispose(); outputChart = null }
})

// 目标维度变化时，重新载入并重播
watch(() => props.objectives, async () => {
    if (playTimer) { clearInterval(playTimer); playTimer = null }
    await loadProgress()
    startPlayback()
})
// 目标名称变化时，立即刷新坐标轴标签
watch(() => props.goalNames, () => {
    if (records.length) {
        const idx = Math.min(playIndex, records.length - 1)
        renderChart(records[idx])
    }
})
// 年份选择变化 -> 刷新库容水位图
watch(selectedYearDisplay, () => {
    renderWaterChart()
    renderFlowChart()
    renderOutputChart()
})
// 监听年份总数变化，重置选择
watch(yearCount, (newCount) => {
    if (selectedYearDisplay.value > newCount) {
        selectedYearDisplay.value = 1
    }
})
// 播放进度的迭代变化 -> 自动加载对应代的结果文件
watch(currentIteration, (it) => {
    dbg('watch currentIteration ->', it)
    loadReservoirVForIteration(it)
})
// 迭代滑块变化 -> 跳转到对应代（播放完成后）
watch(selectedIterationDisplay, (it) => {
    if (!showIterationSlider.value) return
    jumpToIteration(it)
})
</script>

<style scoped lang="scss">
.run-monitor-panel {
    width: 185vh;
    max-width: 96vw;
    background: #ffffff;
    border: 1px solid #e9eef5;
    border-radius: 12px;
    box-shadow: 0 14px 40px rgba(6, 27, 71, 0.18);
}
.panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid #eef2f7;
}
.title { font-weight: 700; color: #374151; }
.close-btn { width: 28px; height: 28px; border: 1px solid #e5e7eb; background: #fff; border-radius: 8px; cursor: pointer; }
.close-btn:hover { background: #f9fafb; }

.content-grid {
    display: grid;
    grid-template-columns: 360px 1fr;
    gap: 12px;
    padding: 10px 12px 12px 12px;
}
.left-col { display: grid; grid-template-rows: auto auto; gap: 12px; }
.right-col { min-width: 420px; }
.right-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: start; }

.card { border: 1px solid #edf2f7; border-radius: 10px; padding: 10px; background: #fff; }
.card-title { font-size: 12px; font-weight: 700; color: #374151; margin-bottom: 8px; }

.progress-rows { display: grid; gap: 6px; }
.row { display: flex; justify-content: space-between; font-size: 12px; }
.k { color: #6b7280; }
.v { color: #111827; font-weight: 700; }
.bar-wrap { position: relative; height: 8px; background: #f3f4f6; border-radius: 999px; margin-top: 8px; overflow: hidden; }
.bar { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(90deg, #60a5fa, #0ea5e9); }

.res-grid { display: grid; grid-template-columns: 1fr; gap: 6px; }
.item { display: flex; justify-content: space-between; font-size: 12px; padding: 6px 8px; background: #fafafa; border: 1px solid #f0f3f8; border-radius: 8px; }
.label { color: #6b7280; }
.value { color: #111827; font-weight: 700; }

.chart-card { position: relative; }
.chart { width: 100%; height: 240px; }
.slider-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.year-slider { flex: 1; }
/* 取消跨两列，按两列布局 */

/* 约束弹窗 */
.constraint-modal-mask {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    pointer-events: auto;
}
.constraint-modal {
    width: 640px;
    max-width: 90vw;
    background: #ffffff;
    border: 1px solid #e9eef5;
    border-radius: 12px;
    box-shadow: 0 14px 40px rgba(6, 27, 71, 0.18);
}
.constraint-modal .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid #eef2f7;
}
.constraint-modal .modal-content { padding: 12px; }
.constraint-modal .modal-footer {
    display: flex;
    justify-content: flex-end;
    padding: 10px 12px;
    border-top: 1px solid #eef2f7;
}
.primary-btn {
    padding: 6px 12px;
    background: #0ea5e9;
    border: 1px solid #0ea5e9;
    color: #fff;
    border-radius: 8px;
    cursor: pointer;
}
.primary-btn:hover { background: #0284c7; border-color: #0284c7; }

.summary-pass { font-size: 12px; color: #059669; font-weight: 700; margin-bottom: 8px; }
.constraint-list { display: grid; gap: 8px; }
.constraint-list .c-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    padding: 8px 10px;
    background: #ecfdf5;
    border: 1px solid #d1fae5;
    border-radius: 8px;
}
.constraint-list .c-item .name { color: #065f46; }
.constraint-list .c-item .status { color: #059669; font-weight: 700; }
</style>


