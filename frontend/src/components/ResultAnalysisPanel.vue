<template>
    <div class="result-analysis-panel">
        <div class="panel-header">
            <div class="title">结果分析</div>
            <button class="close-btn" type="button" @click="$emit('close')">×</button>
        </div>
        <div class="content-grid">
            <div class="left-col">
                <div class="card">
                    <div class="card-title">选择</div>
                    <div class="slider-row" v-if="pointCount > 0">
                        <span class="k">结果</span>
                        <input class="year-slider" type="range" :min="1" :max="pointCount" v-model.number="selectedIndexDisplay" />
                        <span class="v">{{ selectedIndexDisplay }} / {{ pointCount }}</span>
                    </div>
                    <div class="slider-row" v-if="yearCount > 0">
                        <span class="k">年份</span>
                        <input class="year-slider" type="range" min="1" :max="yearCount" v-model.number="selectedYearDisplay" />
                        <span class="v">{{ currentYearText }}年 ({{ selectedYearDisplay }}/{{ yearCount }})</span>
                    </div>
                </div>
                <div class="card">
                    <div class="card-title">子系统协同度（选中结果）</div>
                    <div ref="synergyChartEl" class="chart synergy-chart"></div>
                    <div class="synergy-f2" v-if="synergyF2Display">
                        总协同度 f2：<span class="f2-val">{{ synergyF2Display }}</span>
                    </div>
                </div>
                <div class="card chart-card goal-card">
                    <div class="card-title">目标空间（所有结果）</div>
                    <div ref="chartEl" class="chart"></div>
                </div>
            </div>

            <div class="right-col">
                <div class="right-grid">
                    <div class="card eval-card">
                        <div class="card-title">evaluating 指标（选中结果）</div>
                        <div class="eval-table-wrap">
                            <table class="eval-table">
                                <tbody>
                                    <tr v-for="row in evaluatingRows" :key="row.key">
                                        <td class="k">{{ row.label }}</td>
                                        <td class="v">{{ row.value }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="card chart-card long-card">
                        <div class="card-title">龙羊峡（{{ currentYearText }}年，选中结果）</div>
                        <div class="data-table-wrap">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>时期</th>
                                        <th>出力</th>
                                        <th>水位</th>
                                        <th>下泄流量</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="row in longMetricTableRows" :key="row.period">
                                        <td class="period">{{ row.period }}</td>
                                        <td class="num">{{ row.output }}</td>
                                        <td class="num">{{ row.water }}</td>
                                        <td class="num">{{ row.flow }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="card chart-card liu-card">
                        <div class="card-title">刘家峡（{{ currentYearText }}年，选中结果）</div>
                        <div class="data-table-wrap">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>时期</th>
                                        <th>出力</th>
                                        <th>水位</th>
                                        <th>下泄流量</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="row in liuMetricTableRows" :key="row.period">
                                        <td class="period">{{ row.period }}</td>
                                        <td class="num">{{ row.output }}</td>
                                        <td class="num">{{ row.water }}</td>
                                        <td class="num">{{ row.flow }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="card economic-card">
                        <el-table :data="economicData" style="width: 100%" height="250" size="small" border stripe>
                            <el-table-column label="水库运行主要经济指标" align="center">
                                <el-table-column prop="month" label="月份" width="60" align="center" />
                                <el-table-column label="入库水量" align="center">
                                    <el-table-column prop="inflowCurrent" label="本月" align="center" />
                                    <el-table-column prop="inflowYear" label="年累计" align="center" />
                                </el-table-column>
                                <el-table-column label="发电量" align="center">
                                    <el-table-column prop="powerCurrent" label="本月" align="center" />
                                    <el-table-column prop="powerYear" label="年累计" align="center" />
                                </el-table-column>
                                <el-table-column label="出库水量" align="center">
                                    <el-table-column prop="outflowCurrent" label="本月" align="center" />
                                    <el-table-column prop="outflowYear" label="年累计" align="center" />
                                </el-table-column>
                                <el-table-column prop="waterLevel" label="月末考核水位" align="center" />
                            </el-table-column>
                        </el-table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import * as echarts from 'echarts'
import 'echarts-gl'

type SchedulingScale = 'anti-paddle' | 'watersupply' | 'floodcontrol' | 'multi-energy'

interface Props {
    objectives?: number // 2 或 3；默认 2
    goalNames?: string[] // 目标名称
    schedulingTime?: { start: number; end: number }
    schedulingScale?: SchedulingScale
}

const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'close'): void }>()

const schedulingScale = computed<SchedulingScale>(() => props.schedulingScale ?? 'multi-energy')

const chartEl = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
const synergyChartEl = ref<HTMLDivElement | null>(null)
let synergyChart: echarts.ECharts | null = null

const points = ref<number[][]>([])
const selectedIndexDisplay = ref<number>(1) // 1..N
const pointCount = computed<number>(() => points.value.length)

// 解析后的条目（仅保留需要的字段）
type ParsedItem = {
    objectives: number[]
    sonsystem?: { H_water?: number; H_ele?: number; H_sed?: number; H_eco?: number; f2?: number }
    three?: { Qshortage_eco?: number[][]; Qshortage_agr?: number[][]; Qshortage1?: number[][] }
    outputs?: Record<string, number[][]>
    longV?: number[][]
    liuV?: number[][]
    longQout?: number[][]
    liuQout?: number[][]
    evaluating?: Record<string, number>
}
const items = ref<ParsedItem[]>([])
const selectedItem = computed<ParsedItem | null>(() => {
    const idx = Math.max(0, Math.min(pointCount.value - 1, (selectedIndexDisplay.value || 1) - 1))
    return items.value[idx] || null
})

const synergyF2Display = computed<string>(() => {
    const f2 = selectedItem.value?.sonsystem?.f2
    if (typeof f2 === 'number' && Number.isFinite(f2)) return axisLabel(f2)
    return ''
})

// Data constants
const DATA_START_YEAR = 1970
const DATA_END_YEAR = 2023

// Compute effective time range based on props and data limits
const timeRange = computed(() => {
    const s = props.schedulingTime?.start ?? 2020
    const e = props.schedulingTime?.end ?? 2030

    const maxEndYear = (schedulingScale.value === 'anti-paddle')
        ? (DATA_END_YEAR - 1) // 需要拼接 nextYear，所以不能选到最后一年
        : DATA_END_YEAR

    const start = Math.max(DATA_START_YEAR, Math.min(maxEndYear, s))
    const end = Math.min(maxEndYear, Math.max(DATA_START_YEAR, e))
    // Ensure start <= end
    return { start: Math.min(start, end), end: Math.max(start, end) }
})

// 年份选择（范围随调度时间变化）
const selectedYearDisplay = ref<number>(1)
const yearCount = computed<number>(() => {
    return timeRange.value.end - timeRange.value.start + 1
})

// 当前展示的实际年份（基准年：防凌期代表 11-12 所属年份）
const currentYearDisplay = computed(() => {
    return timeRange.value.start + (selectedYearDisplay.value - 1)
})

const currentYearText = computed(() => {
    const y = currentYearDisplay.value
    if (schedulingScale.value === 'anti-paddle') return `${y}-${y + 1}`
    return `${y}`
})

// Calculate actual 0-based index into the full 54-year data arrays
const currentDataIndex = computed(() => {
    return currentYearDisplay.value - DATA_START_YEAR
})

// Reset selection when range changes
watch(timeRange, () => {
    if (selectedYearDisplay.value > yearCount.value) {
        selectedYearDisplay.value = 1
    }
})

// 标签
const FLOW_PERIOD_LABELS: string[] = ['7上','7中','7下','8上','8中','8下','9','10','11','12','1','2','3','4','5上','5中','5下','6上','6中','6下']
const dbg = (...args: any[]) => console.log('[ResultAnalysisPanel]', ...args)

interface EconomicMetric {
    month: number
    inflowCurrent: number
    inflowYear: number
    powerCurrent: number
    powerYear: number
    outflowCurrent: number
    outflowYear: number
    waterLevel: string
}

const economicData = ref<EconomicMetric[]>([])
// 生成模拟数据
for (let i = 1; i <= 12; i++) {
    economicData.value.push({
        month: i,
        inflowCurrent: Math.floor(Math.random() * 500 + 100),
        inflowYear: Math.floor(Math.random() * 5000 + 1000),
        powerCurrent: Math.floor(Math.random() * 300 + 50),
        powerYear: Math.floor(Math.random() * 3000 + 500),
        outflowCurrent: Math.floor(Math.random() * 400 + 100),
        outflowYear: Math.floor(Math.random() * 4000 + 1000),
        waterLevel: (2450 + Math.random() * 10).toFixed(2)
    })
}

type PeriodSelector = { label: string; index: number; yearOffset: 0 | 1 }

const periodSelectors = computed<PeriodSelector[]>(() => {
    const mk = (labels: string[], yearOffset: 0 | 1 = 0): PeriodSelector[] => {
        return labels
            .map(label => ({ label, index: FLOW_PERIOD_LABELS.indexOf(label), yearOffset }))
            .filter(p => p.index >= 0)
    }

    switch (schedulingScale.value) {
        case 'floodcontrol':
            return mk(['7上','7中','7下','8上','8中','8下','9','10'])
        case 'watersupply':
            return mk(['4','5上','5中','5下','6上','6中','6下'])
        case 'anti-paddle': {
            const thisYear = mk(['11','12'], 0)
            const nextYear = mk(['1','2','3'], 1)
            return [...thisYear, ...nextYear]
        }
        case 'multi-energy':
        default:
            return FLOW_PERIOD_LABELS.map((label, index) => ({ label, index, yearOffset: 0 }))
    }
})

const activePeriodLabels = computed<string[]>(() => periodSelectors.value.map(p => p.label))

function toNumberOrNull(v: any): number | null {
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string') {
        const s = v.trim()
        if (!s) return null
        const n = parseFloat(s)
        return Number.isFinite(n) ? n : null
    }
    return null
}

function buildPeriodSeries(rowThisYear: any[] | undefined, rowNextYear: any[] | undefined): Array<number | null> {
    const sels = periodSelectors.value
    return sels.map(sel => {
        const src = (sel.yearOffset === 1) ? rowNextYear : rowThisYear
        const raw = Array.isArray(src) ? (src as any[])[sel.index] : undefined
        return toNumberOrNull(raw)
    })
}

function axisLabel(val: number): string {
    if (!Number.isFinite(val)) return ''
    const s = Number(val).toFixed(3)
    return s.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
}

type PeriodTableRow = { period: string; long: string; liu: string }
type ReservoirMetricTableRow = { period: string; output: string; water: string; flow: string }

function formatTableCell(v: number | null): string {
    if (typeof v === 'number' && Number.isFinite(v)) return axisLabel(v)
    return '-'
}

const outputTableRows = computed<PeriodTableRow[]>(() => {
    const yIdx = Math.max(0, Math.min(currentDataIndex.value, 53))
    const labels = activePeriodLabels.value
    const outs = selectedItem.value?.outputs

    const longSeries = buildPeriodSeries(outs?.long?.[yIdx], outs?.long?.[yIdx + 1])
    const liuSeries = buildPeriodSeries(outs?.liu?.[yIdx], outs?.liu?.[yIdx + 1])

    return labels.map((period, i) => ({
        period,
        long: formatTableCell(longSeries[i] ?? null),
        liu: formatTableCell(liuSeries[i] ?? null)
    }))
})

const waterTableRows = computed<PeriodTableRow[]>(() => {
    const yIdx = Math.max(0, Math.min(currentDataIndex.value, 53))
    const labels = activePeriodLabels.value
    const longSeries = buildPeriodSeries(selectedItem.value?.longV?.[yIdx], selectedItem.value?.longV?.[yIdx + 1])
    const liuSeries = buildPeriodSeries(selectedItem.value?.liuV?.[yIdx], selectedItem.value?.liuV?.[yIdx + 1])

    return labels.map((period, i) => ({
        period,
        long: formatTableCell(longSeries[i] ?? null),
        liu: formatTableCell(liuSeries[i] ?? null)
    }))
})

const flowTableRows = computed<PeriodTableRow[]>(() => {
    const yIdx = Math.max(0, Math.min(currentDataIndex.value, 53))
    const labels = activePeriodLabels.value
    const longSeries = buildPeriodSeries(selectedItem.value?.longQout?.[yIdx], selectedItem.value?.longQout?.[yIdx + 1])
    const liuSeries = buildPeriodSeries(selectedItem.value?.liuQout?.[yIdx], selectedItem.value?.liuQout?.[yIdx + 1])

    return labels.map((period, i) => ({
        period,
        long: formatTableCell(longSeries[i] ?? null),
        liu: formatTableCell(liuSeries[i] ?? null)
    }))
})

// 合并：每个水库一张表（出力 / 水位 / 下泄流量）
const longMetricTableRows = computed<ReservoirMetricTableRow[]>(() => {
    const labels = activePeriodLabels.value
    const outs = outputTableRows.value
    const waters = waterTableRows.value
    const flows = flowTableRows.value

    return labels.map((period, i) => ({
        period,
        output: outs[i]?.long ?? '-',
        water: waters[i]?.long ?? '-',
        flow: flows[i]?.long ?? '-'
    }))
})

const liuMetricTableRows = computed<ReservoirMetricTableRow[]>(() => {
    const labels = activePeriodLabels.value
    const outs = outputTableRows.value
    const waters = waterTableRows.value
    const flows = flowTableRows.value

    return labels.map((period, i) => ({
        period,
        output: outs[i]?.liu ?? '-',
        water: waters[i]?.liu ?? '-',
        flow: flows[i]?.liu ?? '-'
    }))
})

// evaluating 指标顺序与标签
const EVAL_ORDER: { key: string; label: string }[] = [
    { key: 'Zrr2_long', label: '龙羊峡水库最大水位变幅' },
    { key: 'Zrr2_liu', label: '刘家峡水库最大水位变幅' },
    { key: 'm_long_Vrate', label: '龙羊峡库空率' },
    { key: 'm_liu_Vrate', label: '刘家峡库空率' },
    { key: 'n_long_Vrate', label: '龙羊峡库满率' },
    { key: 'n_liu_Vrate', label: '刘家峡库满率' },
    { key: 'Q_sed_bizhi', label: '冲沙平均流量比' },
    { key: 'AVW_sed4', label: '年均输沙水量' },
    { key: 'dn_elerate_long', label: '龙羊峡多年发电保证率' },
    { key: 'dn_elerate_liu', label: '刘家峡多年发电保证率' },
    { key: 'Qqs_long_rata', label: '龙羊峡多年平均弃水率' },
    { key: 'Qqs_liu_rata', label: '刘家峡多年平均弃水率' },
    { key: 'min_Ntiji', label: '梯级水库群平均最小出力' },
    { key: 'MAXQ_LONG', label: '防洪期龙羊峡最大下泄流量' },
    { key: 'MAXQ_LIU', label: '防洪期刘家峡最大下泄流量' },
    { key: 'Q_ice1', label: '刘家峡安全防凌流量偏离度' },
    { key: 'dn_water_rate1', label: '工业生活用水保证率' },
    { key: 'max_Qshortage1', label: '工业生活最大缺水率' },
    { key: 'dn_water_rate2', label: '农业用水保证率' },
    { key: 'max_Qshortage2', label: '农业最大缺水率' },
    { key: 'dn_eco_rate', label: '生态用水保证率' },
    { key: 'max_Qshortage3', label: '生态最大缺水率' }
]

const evaluatingRows = computed(() => {
    const ev = selectedItem.value?.evaluating || {}
    return EVAL_ORDER.map(({ key, label }) => {
        const val = (ev as any)[key]
        const show = (typeof val === 'number' && Number.isFinite(val)) ? axisLabel(val) : ''
        return { key, label, value: show }
    })
})

function detectDims(): number {
    return points.value[0]?.length || (props.objectives === 3 ? 3 : 2)
}

async function loadResults() {
    const objCount = props.objectives === 3 ? 3 : 2
    const url = objCount === 3
        ? new URL('../assets/result3/json_results.json', import.meta.url).href
        : new URL('../assets/result2/json_results.json', import.meta.url).href
    dbg('loadResults url =', url)

    const txt = await fetch(url).then(r => r.text())
    let data: any
    try {
        data = JSON.parse(txt)
    } catch (e) {
        // 容错：截取首尾大括号
        const i = txt.indexOf('[')
        const j = txt.lastIndexOf(']')
        if (i >= 0 && j > i) {
            data = JSON.parse(txt.slice(i, j + 1))
        } else {
            throw e
        }
    }
    if (!Array.isArray(data)) {
        dbg('Unexpected result json, wrap to array')
        data = [data]
    }
    const parsed: ParsedItem[] = []
    for (const it of data) {
        const v = pickObjectives(it)
        if (Array.isArray(v) && (v.length === 2 || v.length === 3) && v.every(n => typeof n === 'number' && Number.isFinite(n))) {
            parsed.push({
                objectives: v,
                sonsystem: pickSonSystem(it),
                three: pickThree(it),
                outputs: pickOutputs(it),
                ...pickReservoirSeries(it)
                , evaluating: pickEvaluating(it)
            })
        }
    }
    // 只取前 15 条
    items.value = parsed.slice(0, 15)
    const pts: number[][] = items.value.map(p => p.objectives)
    points.value = pts
    selectedIndexDisplay.value = Math.min(1, points.value.length) || 1
    dbg('loaded points =', points.value.length)
    renderChart()
    renderSynergyChart()
}

function pickObjectives(item: any): number[] | null {
    if (!item || typeof item !== 'object') return null
    const keys = ['objectives', 'objective_values', 'objs', 'F', 'f', 'obj']
    for (const k of keys) {
        const v = item[k]
        if (Array.isArray(v) && v.length >= 2 && v.length <= 3 && v.every((n: any) => typeof n === 'number')) {
            return v as number[]
        }
    }
    // 在一层级中寻找第一个 2/3 维数值数组
    for (const k of Object.keys(item)) {
        const v = (item as any)[k]
        if (Array.isArray(v) && (v.length === 2 || v.length === 3) && v.every((n: any) => typeof n === 'number')) {
            return v as number[]
        }
    }
    return null
}

function pickSonSystem(item: any): ParsedItem['sonsystem'] | undefined {
    if (!item || typeof item !== 'object') return undefined
    const ss = item.sonsystem || item.SonSystem || item.sonSystem || item.SON || item.SON_SYSTEM
    const f2 = item.f2 ?? item.F2 ?? (ss && (ss.f2 ?? ss.F2))
    const H_water = ss?.H_water ?? ss?.HWater ?? ss?.water ?? item.H_water
    const H_ele = ss?.H_ele ?? ss?.HEle ?? ss?.ele ?? item.H_ele
    const H_sed = ss?.H_sed ?? ss?.HSed ?? ss?.sed ?? item.H_sed
    const H_eco = ss?.H_eco ?? ss?.HEco ?? ss?.eco ?? item.H_eco
    if ([H_water, H_ele, H_sed, H_eco, f2].some(v => v != null)) {
        return { H_water, H_ele, H_sed, H_eco, f2 }
    }
    return undefined
}

function firstSubgen(raw: any) {
    if (Array.isArray(raw) && Array.isArray(raw[0]) && Array.isArray(raw[0][0])) return raw[0]
    return raw
}

function normalize2D(raw: any, targetPeriods?: number): number[][] {
    try {
        if (typeof raw === 'string') {
            const s = raw.trim()
            if (s.startsWith('[')) raw = JSON.parse(s)
        }
        if (raw && typeof raw === 'object' && !Array.isArray(raw) && Array.isArray(raw.data)) {
            raw = raw.data
        }
        if (Array.isArray(raw) && Array.isArray(raw[0])) {
            const rows = raw as any[]
            const r0 = rows[0] as any[]
            if (r0 && r0.length === 54 && rows.length !== 54) {
                // 转置为 54 行
                const trans: number[][] = []
                for (let i = 0; i < 54; i++) {
                    const row: number[] = []
                    for (let j = 0; j < rows.length; j++) row.push(rows[j][i])
                    trans.push(row)
                }
                return trans
            }
            return rows as number[][]
        }
        if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'number') {
            const flat = raw as number[]
            if (flat.length % 54 === 0) {
                const cols = flat.length / 54
                const out: number[][] = []
                for (let y = 0; y < 54; y++) out.push(flat.slice(y * cols, (y + 1) * cols))
                return out
            }
            if (targetPeriods && flat.length % targetPeriods === 0) {
                const years = flat.length / targetPeriods
                const out: number[][] = []
                for (let y = 0; y < years; y++) out.push(flat.slice(y * targetPeriods, (y + 1) * targetPeriods))
                return out
            }
        }
    } catch (e) {
        dbg('normalize2D failed:', e)
    }
    return []
}

function pickThree(item: any): ParsedItem['three'] | undefined {
    const src = item?.Three || item?.three || item
    if (!src) return undefined
    const eco = firstSubgen(src?.Qshortage_eco ?? src?.qshortage_eco ?? src?.QEco ?? src?.eco)
    const agr = firstSubgen(src?.Qshortage_agr ?? src?.qshortage_agr ?? src?.QAgr ?? src?.agr)
    const ind = firstSubgen(src?.Qshortage1 ?? src?.qshortage1 ?? src?.QInd ?? src?.ind)
    const eco2 = normalize2D(eco, 20)
    const agr2 = normalize2D(agr, 6)
    const ind2 = normalize2D(ind, 20)
    if ((eco2 && eco2.length) || (agr2 && agr2.length) || (ind2 && ind2.length)) {
        return { Qshortage_eco: eco2, Qshortage_agr: agr2, Qshortage1: ind2 }
    }
    return undefined
}

function pickOutputs(item: any): ParsedItem['outputs'] | undefined {
    const outputs: Record<string, number[][]> = {}
    const scan = (src: any) => {
        if (!src || typeof src !== 'object') return
        for (const k of Object.keys(src)) {
            const m = /^(Ntii_?)(.+)$/i.exec(k)
            if (m && src[k] != null) {
                const id = m[2].toLowerCase()
                const arr = normalize2D(firstSubgen(src[k]), 20)
                if (arr && arr.length) outputs[id] = arr
            }
        }
    }
    scan(item?.N)
    scan(item)
    return Object.keys(outputs).length ? outputs : undefined
}

function pickReservoirSeries(item: any): Pick<ParsedItem, 'longV' | 'liuV' | 'longQout' | 'liuQout'> {
    const out: Pick<ParsedItem, 'longV' | 'liuV' | 'longQout' | 'liuQout'> = {}
    try {
        const long = (item && (item.Long || item.long)) || {}
        const liu = (item && (item.Liu || item.liu)) || {}
        let vLong: any = long?.V ?? long?.v ?? item?.Vlong ?? item?.vlong
        let vLiu: any = liu?.V ?? liu?.v ?? item?.Vliu ?? item?.vliu
        let qLong: any = long?.Qout ?? long?.QOut ?? long?.qout ?? item?.Qlongout ?? item?.QlongOut ?? item?.QLongOut ?? item?.qlongout
        let qLiu: any = liu?.Qout ?? liu?.QOut ?? liu?.qout ?? item?.Qliuout ?? item?.QliuOut ?? item?.QLiuOut ?? item?.qliuout
        vLong = firstSubgen(vLong)
        vLiu = firstSubgen(vLiu)
        qLong = firstSubgen(qLong)
        qLiu = firstSubgen(qLiu)
        const vLongArr = normalize2D(vLong, 20)
        const vLiuArr = normalize2D(vLiu, 20)
        const qLongArr = normalize2D(qLong, 20)
        const qLiuArr = normalize2D(qLiu, 20)
        if (vLongArr && vLongArr.length) out.longV = vLongArr
        if (vLiuArr && vLiuArr.length) out.liuV = vLiuArr
        if (qLongArr && qLongArr.length) out.longQout = qLongArr
        if (qLiuArr && qLiuArr.length) out.liuQout = qLiuArr
    } catch (e) {
        dbg('pickReservoirSeries failed:', e)
    }
    return out
}

function pickEvaluating(item: any): Record<string, number> | undefined {
    try {
        const srcs: any[] = []
        if (item && typeof item === 'object') {
            if (item.Evaluating && typeof item.Evaluating === 'object') srcs.push(item.Evaluating)
            if (item.evaluating && typeof item.evaluating === 'object') srcs.push(item.evaluating)
            if (item.eval && typeof item.eval === 'object') srcs.push(item.eval)
            srcs.push(item)
        }
        const out: Record<string, number> = {}
        const wantKeys = EVAL_ORDER.map(e => e.key)
        const getNum = (v: any): number | null => {
            if (typeof v === 'number' && Number.isFinite(v)) return v
            if (typeof v === 'string') {
                const n = parseFloat(v)
                return Number.isFinite(n) ? n : null
            }
            return null
        }
        // 1) 数组形式：按固定顺序映射
        const arrVal = (item && (Array.isArray((item as any).Evaluating) ? (item as any).Evaluating
            : Array.isArray((item as any).evaluating) ? (item as any).evaluating : null)) as any[] | null
        if (arrVal && Array.isArray(arrVal)) {
            for (let i = 0; i < EVAL_ORDER.length; i++) {
                const key = EVAL_ORDER[i].key
                const v = getNum(arrVal[i])
                if (v != null) out[key] = v
            }
            if (Object.keys(out).length) return out
        }

        const findVal = (key: string): number | undefined => {
            for (const s of srcs) {
                if (!s || typeof s !== 'object') continue
                if (key in s) {
                    const n = getNum((s as any)[key])
                    if (n != null) return n
                }
                const lowerKey = key.toLowerCase()
                // 遍历键进行不区分大小写匹配
                for (const k of Object.keys(s)) {
                    if (k.toLowerCase() === lowerKey) {
                        const n = getNum((s as any)[k])
                        if (n != null) return n
                    }
                }
            }
            return undefined
        }
        for (const k of wantKeys) {
            const v = findVal(k)
            if (v !== undefined) out[k] = v
        }
        return Object.keys(out).length ? out : undefined
    } catch (e) {
        dbg('pickEvaluating failed:', e)
        return undefined
    }
}

function computeExtent(): { min: number[]; max: number[] } {
    const dims = detectDims()
    const min = new Array(dims).fill(Infinity)
    const max = new Array(dims).fill(-Infinity)
    for (const p of points.value) {
        for (let d = 0; d < dims; d++) {
            const v = p[d]
            if (v < min[d]) min[d] = v
            if (v > max[d]) max[d] = v
        }
    }
    for (let d = 0; d < dims; d++) {
        const r = max[d] - min[d]
        if (!Number.isFinite(r) || r === 0) { min[d] = (Number.isFinite(min[d]) ? min[d] : 0) - 1; max[d] = (Number.isFinite(max[d]) ? max[d] : 0) + 1 }
        else { const pad = r * 0.05; min[d] -= pad; max[d] += pad }
    }
    return { min, max }
}

function renderChart() {
    if (!chartEl.value) return
    if (!chart) chart = echarts.init(chartEl.value)
    const dims = detectDims()
    const selIdx = Math.max(0, Math.min(pointCount.value - 1, (selectedIndexDisplay.value || 1) - 1))
    const { min, max } = computeExtent()
    const axisNames = (props.goalNames && ((props.goalNames.length >= dims) ? props.goalNames : undefined))
        || (dims === 3
            ? ['兰州断面总缺水量最小','梯级水电站群年均发电量最大','梯级调度系统总协同度最大']
            : ['兰州断面总缺水量最小','梯级水电站群年均发电量最大'])

    if (dims >= 3 && (props.objectives === 3)) {
        const data3 = points.value.map(p => [p[0], p[1], p[2]])
        const selected = points.value[selIdx] ? [[points.value[selIdx][0], points.value[selIdx][1], points.value[selIdx][2]]] : []
        const option3: echarts.EChartsOption = {
            tooltip: { trigger: 'item', formatter: (p: any) => `(${axisLabel(p.value[0])}, ${axisLabel(p.value[1])}, ${axisLabel(p.value[2])})` },
            legend: { data: ['所有个体','当前选中'], left: 8, top: 8, itemWidth: 10, itemHeight: 10, textStyle: { color: '#333' } },
            grid3D: {
                left: 48, right: 48, top: 0, bottom: 0,
                boxWidth: 90, boxDepth: 90, boxHeight: 90,
                axisLine: { lineStyle: { color: '#999' } },
                axisLabel: { textStyle: { color: '#666', fontSize: 10 } },
                viewControl: { projection: 'perspective', alpha: 20, beta: 30, distance: 200, autoRotate: false }
            },
            xAxis3D: { name: axisNames[0], type: 'value', scale: true, min: min[0], max: max[0], nameGap: 5, nameTextStyle: { color: '#555', fontSize: 11, backgroundColor: 'rgba(255,255,255,0.7)', padding: [2,4] }, axisLabel: { formatter: (v: number) => axisLabel(v), textStyle: { color: '#666', fontSize: 10 } } },
            yAxis3D: { name: axisNames[1], type: 'value', scale: true, min: min[1], max: max[1], nameGap: 16, nameTextStyle: { color: '#555', fontSize: 11, backgroundColor: 'rgba(255,255,255,0.7)', padding: [2,4] }, axisLabel: { formatter: (v: number) => axisLabel(v), textStyle: { color: '#666', fontSize: 10 } } },
            zAxis3D: { name: axisNames[2], type: 'value', scale: true, min: min[2], max: max[2], nameGap: 16, nameTextStyle: { color: '#555', fontSize: 11, backgroundColor: 'rgba(255,255,255,0.7)', padding: [2,4] }, axisLabel: { formatter: (v: number) => axisLabel(v), textStyle: { color: '#666', fontSize: 10 } } },
            series: [
                { name: '所有个体', type: 'scatter3D', data: data3, symbolSize: 6, itemStyle: { opacity: 0.9 } },
                { name: '当前选中', type: 'scatter3D', data: selected, symbolSize: 10, itemStyle: { color: '#e74c3c' } }
            ]
        }
        chart.setOption(option3)
        return
    }

    const data2 = points.value.map(p => [p[0], p[1]])
    const selected = points.value[selIdx] ? [[points.value[selIdx][0], points.value[selIdx][1]]] : []
    const option2: echarts.EChartsOption = {
        tooltip: { trigger: 'item', formatter: (p: any) => `(${axisLabel(p.value[0])}, ${axisLabel(p.value[1])})` },
        legend: { data: ['所有个体','当前选中'], left: 8, top: 8, itemWidth: 10, itemHeight: 10, textStyle: { color: '#333' } },
        grid: { top: 56, right: 32, bottom: 42, left: 60 },
        xAxis: { name: axisNames[0], nameLocation: 'middle', nameGap: 28, type: 'value', scale: true, min: min[0], max: max[0], axisLine: { lineStyle: { color: '#999' } }, axisLabel: { color: '#666', fontSize: 10, formatter: (v: number) => axisLabel(v) }, nameTextStyle: { color: '#555', fontSize: 11 } },
        yAxis: { name: axisNames[1], nameLocation: 'middle', nameGap: 40, type: 'value', scale: true, min: min[1], max: max[1], axisLine: { lineStyle: { color: '#999' } }, axisLabel: { color: '#666', fontSize: 10, formatter: (v: number) => axisLabel(v) }, nameTextStyle: { color: '#555', fontSize: 11 } },
        series: [
            { name: '所有个体', type: 'scatter', data: data2, symbolSize: 8, itemStyle: { opacity: 0.9 } },
            { name: '当前选中', type: 'scatter', data: selected, symbolSize: 12, itemStyle: { color: '#e74c3c' }, z: 3 }
        ]
    }
    chart.setOption(option2)
}

function renderSynergyChart() {
    if (!synergyChartEl.value) return
    if (!synergyChart) synergyChart = echarts.init(synergyChartEl.value)
    const s = selectedItem.value?.sonsystem
    const cats = ['供水H_water','发电H_ele','输沙H_sed','生态H_eco']
    const rawVals = [s?.H_water, s?.H_ele, s?.H_sed, s?.H_eco]
    const vals = rawVals.map(v => (typeof v === 'number' && Number.isFinite(v)) ? v : 0)
    const max = Math.max(1, ...vals)
    const option: echarts.EChartsOption = {
        radar: {
            indicator: cats.map(name => ({ name, max })),
            center: ['50%','52%'],
            radius: '60%',
            axisName: { color: '#374151', fontSize: 9 },
            splitLine: { lineStyle: { color: 'rgba(100,100,100,0.2)' } },
            splitArea: { areaStyle: { color: ['rgba(96,165,250,0.05)'] } },
            axisLine: { lineStyle: { color: 'rgba(100,100,100,0.25)' } }
        },
        series: [
            {
                type: 'radar',
                data: [{ value: vals, name: '选中结果' }],
                areaStyle: { opacity: 0.15 },
                lineStyle: { width: 1.5, color: '#60a5fa' },
                itemStyle: { color: '#3b82f6' },
                symbolSize: 2
            }
        ]
    }
    synergyChart.setOption(option)
}

onMounted(async () => {
    await loadResults()
    window.addEventListener('resize', onResize)
})
onUnmounted(() => {
    window.removeEventListener('resize', onResize)
    if (chart) { chart.dispose(); chart = null }
    if (synergyChart) { synergyChart.dispose(); synergyChart = null }
})

function onResize() {
    if (chart) chart.resize()
    if (synergyChart) synergyChart.resize()
}

watch(() => props.objectives, async () => {
    await loadResults()
})
watch(() => props.goalNames, () => {
    if (points.value.length) renderChart()
})
watch(selectedIndexDisplay, () => {
    if (points.value.length) {
        renderChart()
        renderSynergyChart()
    }
})
</script>

<style scoped lang="scss">
.result-analysis-panel {
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
    /* 左侧现在放“目标空间”图，需要更宽显示空间 */
    grid-template-columns: 380px 1fr;
    gap: 12px;
    padding: 10px 12px 12px 12px;
}
.left-col { display: grid; grid-template-rows: auto auto minmax(0, 1fr); gap: 12px; }
.right-col { min-width: 420px; }
.right-grid {
    display: grid;
    grid-template-columns: 1fr 2fr;
    grid-template-rows: auto auto auto;
    gap: 12px;
    align-items: stretch;
}

/* 右侧布局：左侧目标空间占两行；右侧两张表上下各占一半 */
.eval-card { grid-column: 1; grid-row: 1 / span 2; display: flex; flex-direction: column; min-height: 0; }
.eval-card .eval-table-wrap { flex: 1; min-height: 0; }
.long-card { grid-column: 2; grid-row: 1; align-self: stretch; display: flex; flex-direction: column; min-height: 0; }
.liu-card { grid-column: 2; grid-row: 2; align-self: stretch; display: flex; flex-direction: column; min-height: 0; }
.economic-card { grid-column: 1 / span 2; grid-row: 3; display: flex; flex-direction: column; min-height: 0; }

/* 表格区域占满卡片剩余空间，内容超出用滚动条 */
.long-card .data-table-wrap,
.liu-card .data-table-wrap {
    height: 180px;
    overflow: auto;
}
.content { padding: 10px 12px 12px 12px; }
.controls { margin-bottom: 8px; }
.row { display: flex; align-items: center; gap: 8px; }
.k { color: #6b7280; font-size: 12px; }
.v { color: #111827; font-weight: 700; font-size: 12px; }
.idx-slider { flex: 1; }
.slider-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.year-slider { flex: 1; }

.card { border: 1px solid #edf2f7; border-radius: 10px; padding: 10px; background: #fff; }
.card-title { font-size: 12px; font-weight: 700; color: #374151; margin-bottom: 8px; }
.chart-card { position: relative; }
.chart { width: 100%; height: 360px; }
.chart { height: 240px; }
.synergy-f2 { margin-top: 6px; font-size: 12px; color: #374151; }
.synergy-f2 .f2-val { font-weight: 700; color: #111827; }
.synergy-chart { height: 150px; }
.synergy-f2 { margin-top: 4px; font-size: 11px; }
.eval-table-wrap { overflow: auto; border: 1px solid #f0f3f8; border-radius: 8px; background: #fafafa; }
.eval-table { width: 100%; border-collapse: collapse; }
.eval-table .k { width: 70%; padding: 3px 2px; font-size: 11px; }
.eval-table .v { width: 30%; padding: 3px 2px; text-align: right; font-size: 11px; }

.data-table-wrap {
    border: 1px solid #f0f3f8;
    border-radius: 8px;
    background: #fafafa;
}
.data-table {
    width: 100%;
    border-collapse: collapse;
}
.data-table th,
.data-table td {
    padding: 4px 6px;
    font-size: 11px;
    border-bottom: 1px solid #eef2f7;
}
.data-table thead th {
    position: sticky;
    top: 0;
    background: #f9fafb;
    color: #374151;
    font-weight: 700;
    z-index: 1;
}
.data-table td.period { color: #374151; font-weight: 600; }
.data-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
</style>


