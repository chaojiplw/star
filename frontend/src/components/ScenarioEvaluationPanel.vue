<template>
    <div class="scenario-eval-panel">
        <div class="panel-header">
            <div class="title">情景评价图表</div>
            <button class="close-btn" type="button" @click="$emit('close')">×</button>
        </div>
        <div class="content">
            <div class="chart-wrap">
                <div class="chart-block">
                    <div class="chart-title">柱状图（名次）</div>
                    <div ref="chartEl" class="chart"></div>
                </div>
                <div class="chart-block">
                    <div class="chart-title">雷达图（模型对比）</div>
                    <div ref="radarEl" class="radar-chart"></div>
                </div>
            </div>
            <div class="ranking-section">
                <div class="section-header">
                    <h3>序号总和排序</h3>
                </div>
                <div v-if="internalShowResults" class="ranking-table-container">
                    <table class="ranking-table">
                        <thead>
                            <tr>
                                <th>排名</th>
                                <th>情景名称</th>
                                <th v-for="model in allEvaluationModels" :key="model">{{ model }}排序</th>
                                <th>总分</th>
                                <th>综合排名</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(item, index) in sortedRankings" :key="index" :class="{ 'best-scenario': index === 0 }">
                                <td class="rank-number">{{ index + 1 }}</td>
                                <td class="scenario-name">{{ item.scenarioName }}</td>
                                <td v-for="model in allEvaluationModels" :key="model" class="rank-score">
                                    {{ item.rankings[model] ?? '-' }}
                                </td>
                                <td class="total-score">{{ item.totalRank }}</td>
                                <td class="final-rank">
                                    <span v-if="index === 0" class="best-badge">最优</span>
                                    <span v-else>{{ index + 1 }}</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div v-else class="ranking-placeholder">
                    <div class="placeholder-content">
                        <p>暂无排序数据</p>
                        <span>运行情景分析后将显示排序结果</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watchEffect, computed } from 'vue'
import * as echarts from 'echarts'

interface Props {
    categories?: string[]
    seriesNames?: string[]
    dataset?: number[][]
    showResults?: boolean
    scores?: Record<string, Record<string, number>>
    totals?: Record<string, number>
}

const props = defineProps<Props>()

const chartEl = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
const radarEl = ref<HTMLDivElement | null>(null)
let radarChart: echarts.ECharts | null = null

const palette = ['#5B8FF9', '#5AD8A6', '#5D7092', '#F6BD16', '#E8684A', '#6DC8EC', '#9270CA', '#FF9D4D', '#269A99', '#FF99C3']

const defaultCategories = ['投影寻踪', '模糊优选', '非负矩阵优先', '总体综合']
const defaultSeriesNames = ['情景一', '情景二', '情景三']
const defaultDataset: number[][] = [
    [1, 1, 2, 1],
    [3, 2, 1, 2],
    [2, 3, 3, 3]
]

// 排序与表格派生
const effectiveCategories = computed<string[]>(() => {
    return (props.categories && props.categories.length > 0) ? props.categories : defaultCategories
})
const allEvaluationModels = computed<string[]>(() => {
    // 排除“总体综合”列，仅保留模型列
    return effectiveCategories.value.filter(c => c !== '总体综合')
})
type RankingItem = {
    scenarioName: string
    rankings: Record<string, number | undefined>
    totalRank: number
}
const internalShowResults = computed<boolean>(() => {
    if (props.showResults != null) return !!props.showResults
    const ds = (props.dataset && props.dataset.length > 0) ? props.dataset : defaultDataset
    return ds.length > 0
})
const sortedRankings = computed<RankingItem[]>(() => {
    const names = (props.seriesNames && props.seriesNames.length > 0) ? props.seriesNames : defaultSeriesNames
    const ds = (props.dataset && props.dataset.length > 0) ? props.dataset : defaultDataset
    const models = allEvaluationModels.value
    const items: RankingItem[] = names.map(n => ({ scenarioName: n, rankings: {}, totalRank: 0 }))
    for (let i = 0; i < names.length; i++) {
        const row = ds[i] || []
        for (let j = 0; j < models.length; j++) {
            const modelName = models[j]
            const rankVal = row[j]
            if (typeof rankVal === 'number' && Number.isFinite(rankVal)) {
                items[i].rankings[modelName] = rankVal
                items[i].totalRank += rankVal
            }
        }
    }
    items.sort((a, b) => {
        if (a.totalRank !== b.totalRank) return a.totalRank - b.totalRank
        return a.scenarioName.localeCompare(b.scenarioName, 'zh-CN')
    })
    return items
})
// 场景的综合排名映射（1开始）
const finalRankByScenario = computed<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    sortedRankings.value.forEach((it, idx) => { map[it.scenarioName] = idx + 1 })
    return map
})

const renderBar = () => {
    if (!chartEl.value) return
    if (!chart) chart = echarts.init(chartEl.value)

    const categories = effectiveCategories.value
    const seriesNames = props.seriesNames && props.seriesNames.length > 0 ? props.seriesNames : defaultSeriesNames
    const dataset = (props.dataset && props.dataset.length > 0) ? props.dataset : defaultDataset
    const flatVals = dataset.flat().filter((v) => Number.isFinite(v)) as number[]
    const maxRank = flatVals.length > 0 ? Math.max(...flatVals) : 3
    const scoresMap = (props.scores || {}) as Record<string, Record<string, number>>
    const totalsMap = (props.totals || {}) as Record<string, number>

    const numSeries = seriesNames.length
    const computedBarWidth = numSeries >= 6 ? 10 : (numSeries >= 4 ? 16 : 20)
    const computedBarCategoryGap = numSeries >= 6 ? '45%' : (numSeries >= 4 ? '32%' : '28%')
    const computedBarGap = numSeries >= 6 ? '15%' : '20%'

    const option: echarts.EChartsOption = {
        color: palette,
        title: {
            text: '', // 面板抬头已展示“情景评选柱状图”
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params: any) => {
                if (!Array.isArray(params)) return ''
                // params: one per series (scenario)
                const cat = params[0]?.axisValue as string
                const lines: string[] = []
                if (cat === '总体综合') {
                    lines.push('总体综合')
                    for (const p of params) {
                        const scenario = p.seriesName as string
                        const finalRank = Number.isFinite(p.value) ? (p.value as number) : NaN
                        const totalScore = totalsMap[scenario]
                        lines.push(`${scenario}：总分 ${Number.isFinite(totalScore) ? totalScore : '-'}，综合排名 ${Number.isFinite(finalRank) ? finalRank : '-'}`)
                    }
                    return lines.join('<br/>')
                } else {
                    lines.push(`模型：${cat}`)
                    for (const p of params) {
                        const scenario = p.seriesName as string
                        const val = p.value as number
                        const score = (scoresMap[scenario] && scoresMap[scenario][cat]) != null
                            ? (scoresMap[scenario][cat]).toFixed(1)
                            : '-'
                        lines.push(`${scenario}：分数 ${score}，排名 ${Number.isFinite(val) ? val : '-'}`)
                    }
                    return lines.join('<br/>')
                }
            }
        },
        legend: {
            left: 12,
            top: 8,
            orient: 'horizontal',
            data: seriesNames,
            itemWidth: 12,
            itemHeight: 8,
            itemGap: 14,
            textStyle: { color: '#333' }
        },
        grid: { top: 60, left: 62, right: 18, bottom: 48 },
        xAxis: {
            type: 'category',
            data: categories,
            name: '情景评选',
            nameLocation: 'middle',
            nameGap: 32,
            axisTick: { alignWithLabel: true },
            axisLabel: { color: '#666', margin: 12 }
        },
        yAxis: {
            type: 'value',
            name: '评选结果排名',
            nameTextStyle: { color: '#666' },
            min: 0,
            max: maxRank,
            interval: 1,
            axisLabel: { color: '#666' },
            splitLine: { lineStyle: { color: '#eee' } }
        },
        series: seriesNames.map((name, i) => ({
            name,
            type: 'bar',
            barWidth: computedBarWidth,
            barGap: computedBarGap,
            barCategoryGap: computedBarCategoryGap,
            data: dataset[i] || [],
            label: { show: false }
        }))
    }

    chart.setOption(option)
    chart.resize()
}

const renderRadar = () => {
    if (!radarEl.value) return
    if (!radarChart) radarChart = echarts.init(radarEl.value)

    const categories = effectiveCategories.value
    const models = allEvaluationModels.value
    const seriesNames = props.seriesNames && props.seriesNames.length > 0 ? props.seriesNames : defaultSeriesNames
    const dataset = (props.dataset && props.dataset.length > 0) ? props.dataset : defaultDataset
    const scoresMap = (props.scores || {}) as Record<string, Record<string, number>>

    // 构造列索引映射：类别名 -> dataset 列下标
    const colIndexByCategory: Record<string, number> = {}
    categories.forEach((c, idx) => { colIndexByCategory[c] = idx })

    // 从 dataset 推断最大名次，用于“换算得分”
    const flatRankVals = dataset.flat().filter((v) => Number.isFinite(v)) as number[]
    const maxRank = flatRankVals.length > 0 ? Math.max(...flatRankVals) : 3

    // 若没有可用维度，给一个空态
    if (models.length === 0) {
        const emptyOption: echarts.EChartsOption = {
            color: palette,
            title: { text: '' },
            tooltip: { show: false },
            graphic: [{
                type: 'text',
                left: 'center',
                top: 'middle',
                style: { text: '暂无模型维度', fill: '#9ca3af', fontSize: 12 }
            }]
        }
        radarChart.setOption(emptyOption, true)
        radarChart.resize()
        return
    }

    // 雷达图值：优先使用 scores；若没有 scores 则用 (maxRank + 1 - rank) 换算得分
    const radarValuesByScenario: Record<string, number[]> = {}
    const radarAllVals: number[] = []
    for (let i = 0; i < seriesNames.length; i++) {
        const scenario = seriesNames[i]
        const row = dataset[i] || []
        const values = models.map((model) => {
            const scoreVal = scoresMap[scenario]?.[model]
            if (typeof scoreVal === 'number' && Number.isFinite(scoreVal)) {
                radarAllVals.push(scoreVal)
                return scoreVal
            }
            const colIdx = colIndexByCategory[model]
            const rankVal = row[colIdx]
            if (typeof rankVal === 'number' && Number.isFinite(rankVal)) {
                const derived = (maxRank + 1 - rankVal)
                radarAllVals.push(derived)
                return derived
            }
            return 0
        })
        radarValuesByScenario[scenario] = values
    }

    const rawMax = radarAllVals.length > 0 ? Math.max(...radarAllVals) : 100
    let indicatorMax = rawMax
    if (!Number.isFinite(indicatorMax) || indicatorMax <= 0) indicatorMax = 100
    else if (indicatorMax <= 5) indicatorMax = Math.max(3, Math.ceil(indicatorMax))
    else if (indicatorMax <= 20) indicatorMax = Math.ceil(indicatorMax)
    else indicatorMax = Math.ceil(indicatorMax / 10) * 10

    const option: echarts.EChartsOption = {
        color: palette,
        tooltip: {
            trigger: 'item',
            formatter: (p: any) => {
                const scenario = (p?.name || p?.seriesName || '') as string
                const idx = seriesNames.indexOf(scenario)
                const row = idx >= 0 ? (dataset[idx] || []) : []
                const lines: string[] = []
                lines.push(scenario || '情景')
                for (const model of models) {
                    const colIdx = colIndexByCategory[model]
                    const rankVal = row[colIdx]
                    const scoreVal = scoresMap[scenario]?.[model]
                    const rankText = Number.isFinite(rankVal) ? String(rankVal) : '-'
                    if (typeof scoreVal === 'number' && Number.isFinite(scoreVal)) {
                        lines.push(`${model}：分数 ${(scoreVal as number).toFixed(1)}，排名 ${rankText}`)
                    } else if (typeof rankVal === 'number' && Number.isFinite(rankVal)) {
                        const derived = (maxRank + 1 - (rankVal as number))
                        lines.push(`${model}：换算得分 ${derived.toFixed(1)}，排名 ${rankText}`)
                    } else {
                        lines.push(`${model}：-`)
                    }
                }
                return lines.join('<br/>')
            }
        },
        legend: {
            left: 12,
            top: 8,
            orient: 'horizontal',
            data: seriesNames,
            itemWidth: 12,
            itemHeight: 8,
            itemGap: 14,
            textStyle: { color: '#333' }
        },
        radar: {
            center: ['50%', '56%'],
            radius: '68%',
            indicator: models.map((m) => ({ name: m, min: 0, max: indicatorMax })),
            splitNumber: 4,
            axisName: { color: '#666', fontSize: 12 },
            axisLine: { lineStyle: { color: '#ddd' } },
            splitLine: { lineStyle: { color: '#eee' } },
            splitArea: { areaStyle: { color: ['rgba(0,0,0,0)'] } }
        },
        series: [
            {
                type: 'radar',
                symbol: 'circle',
                symbolSize: 4,
                lineStyle: { width: 2 },
                areaStyle: { opacity: 0.12 },
                data: seriesNames.map((name) => ({
                    name,
                    value: radarValuesByScenario[name] || []
                }))
            }
        ]
    }

    radarChart.setOption(option)
    radarChart.resize()
}

const render = () => {
    renderBar()
    renderRadar()
}

const handleResize = () => {
    if (chart) chart.resize()
    if (radarChart) radarChart.resize()
}

onMounted(() => {
    render()
    window.addEventListener('resize', handleResize)
})
onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    if (chart) { chart.dispose(); chart = null }
    if (radarChart) { radarChart.dispose(); radarChart = null }
})

watchEffect(() => {
    // 依赖变更时重绘
    if (chart) {
        chart.clear()
    }
    if (radarChart) {
        radarChart.clear()
    }
    render()
})
</script>

<style scoped lang="scss">
.scenario-eval-panel {
    width: 1080px;
    max-width: 95vw;
    background: #ffffff;
    border-radius: 10px;
    border: 1px solid #e9eef5;
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
.content {
    display: grid;
    grid-template-columns: 2fr 1.4fr;
    gap: 12px;
    align-items: start;
    padding: 8px 12px 12px 12px;
}
.chart-wrap {
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.chart-block {
    border: 1px solid #eef2f7;
    border-radius: 10px;
    background: #fff;
    padding: 10px;
}
.chart-title {
    font-size: 13px;
    font-weight: 700;
    color: #374151;
    margin-bottom: 6px;
}
.chart { width: 100%; height: 260px; }
.radar-chart { width: 100%; height: 260px; }

/* 右侧排名样式 */
.ranking-section {
    background: #fff;
    border: 1px solid #eef2f7;
    border-radius: 10px;
    padding: 10px;
}
.ranking-section .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
}
.ranking-section .section-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: #374151;
}
.ranking-table-container { overflow: auto; }
.ranking-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
}
.ranking-table th, .ranking-table td {
    padding: 8px 10px;
    border-bottom: 1px solid #f1f5f9;
    text-align: left;
    white-space: nowrap;
}
.ranking-table thead th {
    background: #f8fafc;
    color: #374151;
    font-weight: 700;
}
.ranking-table tbody tr:nth-child(odd) { background: #fcfdff; }
.best-scenario { background: #fffdf2; }
.rank-number { font-weight: 700; color: #1f2937; }
.scenario-name { color: #111827; font-weight: 600; }
.rank-score { color: #1d4ed8; font-weight: 600; }
.total-score { color: #111827; font-weight: 700; }
.final-rank .best-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    background: #10b981;
    color: #fff;
    font-weight: 700;
}
.ranking-placeholder {
    display: grid;
    place-items: center;
    padding: 24px 12px;
    color: #9ca3af;
}
.ranking-placeholder .placeholder-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
}
</style>


