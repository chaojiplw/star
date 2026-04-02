<template>
    <div class="header">
        <HeaderPanel @nav="onNavFromHeader"/>
    </div>
    <div class="container">
        <div class="map" ref="map"></div>
        <!-- 模型管理面板 -->
        <div class="model-mgmt-panel" v-show="showModelMgmt">
            <div class="panel-title">模型管理</div>
            <div class="model-card">
                <div class="card-title">NSGA-II 模型</div>
                <div class="section">
                    <div class="section-title">模型介绍 / 使用场景</div>
                    <ul>
                        <li>非支配排序 + 拥挤距离，兼顾收敛与多样性</li>
                        <li>适用：多目标权衡（发电/灌溉/防洪/航运）、西线调水情景评估、复杂系统优化</li>
                    </ul>
                </div>
                <div class="section">
                    <div class="section-title">使用参数（建议值）</div>
                    <ul>
                        <li>pop：100（50–200）</li>
                        <li>gen：100（50–300）</li>
                        <li>M：2/3（2=发电+缺水；3=含协同度）</li>
                        <li>Q_sediment：2000 m³/s</li>
                        <li>flag_xixian：全无/全有/有上无下/有下无上</li>
                        <!-- <li>path_load：/public/data/data.xlsx</li> -->
                    </ul>
                </div>
            </div>
            <div class="model-card">
                <div class="card-title">PAEM模型</div>
                <div class="section">
                    <div class="section-title">模型介绍 / 使用场景</div>
                    <ul>
                        <li>近似评价 + 精确校正，显著提速，适合大规模/长序列</li>
                        <li>适用：高维梯级调度、需兼顾效率与精度的优化、长期调度</li>
                    </ul>
                </div>
                <div class="section">
                    <div class="section-title">使用参数（建议值）</div>
                    <ul>
                        <li>pop：100</li>
                        <li>iterate：100（50–300）</li>
                        <li>K_mut：5（3–10）</li>
                        <li>M：2/3</li>
                        <li>Q_sediment：2000 m³/s</li>
                        <li>accuracy：1e-4（可放宽至 1e-3 提速）</li>
                    </ul>
                </div>
            </div>
            <div class="model-card">
                <div class="card-title">PSO 算法模型</div>
                <div class="section">
                    <div class="section-title">模型介绍 / 使用场景</div>
                    <ul>
                        <li>粒子群全局搜索，参数少，适合快速寻优/初始解生成</li>
                        <li>适用：中小规模调度、连续变量、约束较简的方案比选</li>
                    </ul>
                </div>
                <div class="section">
                    <div class="section-title">使用参数（建议值）</div>
                    <ul>
                        <li>swarmSize：50（30–100）</li>
                        <li>iter：200（100–500）</li>
                        <li>w/c1/c2：0.7 / 1.5 / 1.5（常用 0.4–0.9 / 1.2–2.0）</li>
                        <li>vMax：0.2–0.5×变量范围</li>
                        <li>M：2/3（可配拥挤距离或外部档案）</li>
                        <li>Q_sediment：同上</li>
                    </ul>
                </div>
            </div>
        </div>
        <!-- 参数面板（左上角图标入口） -->
        <div class="overlay" v-if="showParamPanel">
            <div class="panel-wrap">
                <ParamConfigPanel @close="showParamPanel = false" @change="onParamChange" />
            </div>
        </div>
        <!-- 模型运行面板（左上角图标入口） 与参数面板位置风格一致 -->
        <div class="overlay" v-if="showRunPanel">
            <div class="panel-wrap">
                <ModelRunConfigPanel :config="modelConfig" @close="showRunPanel = false" @run-model="onRunModel" @run-scenarios="onRunScenarios" />
            </div>
        </div>
        <!-- 情景评选左下角弹层 -->
        <div class="left-bottom-eval-overlay" v-if="showScenarioEval">
            <ScenarioEvaluationPanel
                :categories="scenarioEvalCategories"
                :series-names="scenarioEvalSeriesNames"
                :dataset="scenarioEvalDataset"
                :scores="scenarioEvalScores"
                :totals="scenarioEvalTotals"
                :show-results="scenarioEvalShowResults"
                @close="showScenarioEval = false"
            />
        </div>
        <!-- 运行监控左下角弹层 -->
        <div class="left-bottom-run-overlay" v-if="showRunMonitor">
            <RunMonitorPanel 
                :objectives="objectivesCount" 
                :goal-names="goalNames" 
                :scheduling-time="modelConfig?.schedulingTime"
                @close="showRunMonitor = false" 
                @finished="onRunFinished" 
            />
        </div>
        <!-- 结果分析左下角弹层 -->
        <div class="left-bottom-run-overlay" v-if="showResultAnalysis">
            <ResultAnalysisPanel 
                :objectives="objectivesCount" 
                :goal-names="goalNames" 
                :scheduling-time="modelConfig?.schedulingTime"
                :scheduling-scale="modelConfig?.schedulingscale"
                @close="showResultAnalysis = false" 
            />
        </div>
        <div class="corner-icons">
            <div class="icon-btn" title="模型参数" @click="toggleParamPanel">
                <svg class="icon" aria-hidden="true"><use xlink:href="#icon-moxingcanshu-hover"></use></svg>
                <span class="label">模型参数</span>
            </div>
            <div class="icon-btn" title="模型运行" @click="toggleRunPanel">
                <svg class="icon" aria-hidden="true"><use xlink:href="#icon-moxingyunhangzhuangtaitongji"></use></svg>
                <span class="label">模型运行</span>
            </div>
        </div>
    </div>

</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import HeaderPanel from '@/components/header.vue'
import ParamConfigPanel from '@/components/ParamConfigPanel.vue'
import ModelRunConfigPanel from '@/components/ModelRunConfigPanel.vue'
import ScenarioEvaluationPanel from '@/components/ScenarioEvaluationPanel.vue'
import RunMonitorPanel from '@/components/RunMonitorPanel.vue'
import ResultAnalysisPanel from '@/components/ResultAnalysisPanel.vue'
import maplibregl from 'maplibre-gl';
import type { StyleSpecification } from 'maplibre-gl';
import shp from 'shpjs'
// 侧边菜单和面板已移除，改为左上角两个图标

const map = ref<maplibregl.Map | null>(null)
const router = useRouter()
type LngLatTuple = [number, number];
const defaultCenter: LngLatTuple = [104.0, 37.0];
// 发电站 DOM 标记
const powerStationMarkers: maplibregl.Marker[] = [];
const powerStationsLoaded = ref<boolean>(false)
const allPowerStations: Array<{ id: number; lng: number; lat: number; name: string }> = []
// 顶部 Header 导航联动
const showModelMgmt = ref<boolean>(false)
const showParamPanel = ref<boolean>(false)
const showRunPanel = ref<boolean>(false)
const showScenarioEval = ref<boolean>(false)
const showRunMonitor = ref<boolean>(false)
const showResultAnalysis = ref<boolean>(false)
const hasRunFinished = ref<boolean>(false)
const modelConfig = ref<any>(null)
const modelRunning = ref<boolean>(false)
// 情景评选数据（由运行情景生成）
const scenarioEvalCategories = ref<string[]>([])
const scenarioEvalSeriesNames = ref<string[]>([])
const scenarioEvalDataset = ref<number[][]>([])
const scenarioEvalShowResults = ref<boolean>(false)
const scenarioEvalScores = ref<Record<string, Record<string, number>>>({})
const scenarioEvalTotals = ref<Record<string, number>>({})
const objectivesCount = computed<number>(() => {
    const g = (modelConfig.value && (modelConfig.value as any).goals) || {}
    const keys = ['minimizeLanzhouShortage','maximizeHydropower','maximizeCoordination']
    const cnt = keys.reduce((acc, k) => acc + (g[k] ? 1 : 0), 0)
    return cnt >= 3 ? 3 : 2
})
const goalNames = computed<string[]>(() => {
    const order = [
        { key: 'minimizeLanzhouShortage', name: '兰州断面总缺水量最小' },
        { key: 'maximizeHydropower', name: '梯级水电站群年均发电量最大' },
        { key: 'maximizeCoordination', name: '梯级调度系统总协同度最大' }
    ] as const
    const g = (modelConfig.value && (modelConfig.value as any).goals) || {}
    const selected = order.filter(o => g[o.key as keyof typeof g]).map(o => o.name)
    // 返回已选择的顺序名称（2或3）；若不足2项则回退到默认前两项
    return selected.length >= 2 ? selected : order.slice(0, 2).map(o => o.name)
})
// moved up
const onNavFromHeader = (key: string) => {
    // if (key === '模型介绍') {
    //     showModelMgmt.value = !showModelMgmt.value
    //     if (showModelMgmt.value) {
    //         showRunPanel.value = false
    //         showScenarioEval.value = false
    //     }
    //     return
    // }
    if (key === '首页') {
        router.push('/')
        return
    }
    // if (key === '情景评价') {
    //     if (!scenarioEvalShowResults.value) {
    //         // 尚未运行情景，不显示
    //         return
    //     }
    //     showScenarioEval.value = !showScenarioEval.value
    //     if (showScenarioEval.value) {
    //         showModelMgmt.value = false
    //         showRunPanel.value = false
    //         showRunMonitor.value = false
    //     }
    //     return
    // }
    // if (key === '中间展示') {
    //     if (modelRunning.value || hasRunFinished.value) {
    //         showRunMonitor.value = !showRunMonitor.value
    //     }
    //     if (showRunMonitor.value) {
    //         showModelMgmt.value = false
    //         showRunPanel.value = false
    //         showScenarioEval.value = false
    //         showResultAnalysis.value = false
    //     }
    //     return
    // }
    // if (key === '结果分析') {
    //     if (!hasRunFinished.value) return
    //     showResultAnalysis.value = !showResultAnalysis.value
    //     if (showResultAnalysis.value) {
    //         showModelMgmt.value = false
    //         showRunPanel.value = false
    //         showScenarioEval.value = false
    //         showRunMonitor.value = false
    //     }
    //     return
    // }
    // 其他项默认关闭面板
    showModelMgmt.value = false
    showRunPanel.value = false
    showScenarioEval.value = false
    showRunMonitor.value = false
    showResultAnalysis.value = false
}
// 左上角图标：模型参数
const toggleParamPanel = () => {
    showParamPanel.value = !showParamPanel.value
    if (showParamPanel.value) {
        showModelMgmt.value = false
        showRunPanel.value = false
        showScenarioEval.value = false
    }
}
// 左上角图标：模型运行
const toggleRunPanel = () => {
    showRunPanel.value = !showRunPanel.value
    if (showRunPanel.value) {
        showModelMgmt.value = false
        showParamPanel.value = false
        showScenarioEval.value = false
    }
}
// 接收参数面板变更
const onParamChange = (cfg: any) => {
    modelConfig.value = cfg
}
// 运行按钮触发：标记运行中并打开运行监控
const onRunModel = () => {
    modelRunning.value = true
    hasRunFinished.value = false
    showRunMonitor.value = true
    showRunPanel.value = false
}
// 运行监控结束回调：关闭监控，开启结果分析
const onRunFinished = () => {
    modelRunning.value = false
    hasRunFinished.value = true
    // 保持运行监控面板打开，弹出约束结果；不自动跳转到结果分析
    showRunMonitor.value = true
}
// 运行情景：生成各评价模型的分数与排名，并显示评选面板
const onRunScenarios = (scenarios: Array<{ name: string; evaluationModels?: string[] }>) => {
    try {
        const defaultModels = ['投影寻踪','模糊优选','非负矩阵优先']
        const allModelsSet = new Set<string>()
        for (const s of scenarios || []) {
            for (const m of (s.evaluationModels || [])) allModelsSet.add(m)
        }
        const allModels = Array.from(allModelsSet)
        if (allModels.length === 0) allModels.push(...defaultModels)
        const categories = [...allModels, '总体综合']
        const seriesNames = (scenarios || []).map(s => s.name || '情景')
        // 为每个模型生成分数并计算名次（分数高者名次小）
        const scoresMap: Record<string, Record<string, number>> = {}
        for (const s of scenarios || []) {
            scoresMap[s.name] = {}
        }
        const ranksByModel: Record<string, Record<string, number>> = {}
        for (const model of allModels) {
            const scored: Array<{ name: string; score: number }> = []
            for (const s of scenarios || []) {
                if ((s.evaluationModels || []).includes(model)) {
                    const score = 60 + Math.random() * 35 // 60~95
                    scoresMap[s.name][model] = score
                    scored.push({ name: s.name, score })
                }
            }
            scored.sort((a, b) => b.score - a.score)
            const rankMap: Record<string, number> = {}
            for (let i = 0; i < scored.length; i++) rankMap[scored[i].name] = i + 1
            ranksByModel[model] = rankMap
        }
        // 先计算每个情景的总分（名次和），再得到综合排名（1 最优）
        const totals: Record<string, number> = {}
        for (const sName of seriesNames) {
            let sum = 0
            for (const model of allModels) {
                const r = ranksByModel[model]?.[sName]
                if (typeof r === 'number') sum += r
            }
            totals[sName] = sum
        }
        // 综合排名映射
        const sortedByTotal = [...seriesNames].sort((a, b) => totals[a] - totals[b])
        const finalRankMap: Record<string, number> = {}
        sortedByTotal.forEach((name, idx) => { finalRankMap[name] = idx + 1 })
        // 组装 dataset：行=情景，列=各模型名次 + 综合排名（最后一列）
        const dataset: number[][] = []
        for (const sName of seriesNames) {
            const row: Array<number | undefined> = []
            for (const model of allModels) {
                const r = ranksByModel[model]?.[sName]
                row.push(typeof r === 'number' ? r : undefined)
            }
            row.push(finalRankMap[sName]) // 最后一列为综合排名
            dataset.push(row as number[])
        }
        scenarioEvalCategories.value = categories
        scenarioEvalSeriesNames.value = seriesNames
        scenarioEvalDataset.value = dataset
        scenarioEvalScores.value = scoresMap
        scenarioEvalTotals.value = totals
        scenarioEvalShowResults.value = true
        // 打开情景评选面板
        showScenarioEval.value = true
        showRunPanel.value = false
        showModelMgmt.value = false
    } catch (e) {
        console.error('生成情景评选数据失败：', e)
    }
}
// 河网加载标记，避免重复加载
const riverLoaded = ref<boolean>(false)
// 星图token
const STARTMAP_TOKEN = '35159087040581762512dfa72683c4c4880ce39b351cd20fd460286e584bc44f';
// 星图地球服务配置
const startMapConfig = {
    // 星图地球影像服务
    satellite: {
        style: {
            version: 8,
            glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
            sources: {
                'startmap-satellite': {
                    type: 'raster' as const,
                    tiles: [
                        `https://tiles1.geovisearth.com/base/v1/img/{z}/{x}/{y}?format=webp&tmsIds=w&token=${STARTMAP_TOKEN}`
                    ],
                    tileSize: 256
                }
            },
            layers: [
                {
                    id: 'startmap-satellite-layer',
                    type: 'raster' as const,
                    source: 'startmap-satellite',
                    minzoom: 0,
                    maxzoom: 18
                }
            ]
        } satisfies StyleSpecification,
        center: defaultCenter, // 中国中心
        zoom: 4
    },
    // 星图地球注记服务
    annotation: {
        style: {
            version: 8,
            glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
            sources: {
                'startmap-annotation': {
                    type: 'raster' as const,
                    tiles: [
                        `https://tiles1.geovisearth.com/base/v1/img/{z}/{x}/{y}?format=webp&tmsIds=w&token=${STARTMAP_TOKEN}`
                    ],
                    tileSize: 256
                }
            },
            layers: [
                {
                    id: 'startmap-annotation-layer',
                    type: 'raster' as const,
                    source: 'startmap-annotation',
                    minzoom: 0,
                    maxzoom: 18
                }
            ]
        } satisfies StyleSpecification
    }
}
// 峡谷位置数据
const geojson = {
    'type': 'FeatureCollection',
    'features': []
};
// 保留：无额外自定义位图图标，峡谷图层仅用于显示文本，图标由 DOM Marker 承担

// 加载峡谷标记
const loadCanyonMarkers = async (mapInstance: maplibregl.Map): Promise<void> => {
    try {
        // 添加峡谷数据源
        mapInstance.addSource('canyons', {
            type: 'geojson',
            data: geojson as any
        });

        // 仅文本——不添加位图图标，避免冗余资源

        // 添加峡谷标记图层（图标 + 名称）
        mapInstance.addLayer({
            id: 'canyons-layer',
            type: 'symbol',
            source: 'canyons',
            layout: {
                'text-field': ['get', 'message'],
                'text-font': ['Open Sans Regular'],
                'text-size': 12,
                'text-offset': [0, 0.3],
                'text-anchor': 'top',
                'text-optional': true
            },
            paint: {
                'text-color': '#ffffff',
                'text-halo-color': '#000000',
                'text-halo-width': 2,
                // 放大显示数据卡片时，隐藏文字，避免与卡片重复
                'text-opacity': 0
            }
        });

        // 图标由 DOM 标记负责，画布层只显示文本


console.log('峡谷标记加载成功');

    } catch (error) {
        console.error('加载峡谷标记失败:', error);
    }
};

// 加载发电站点位（使用聚合功能）
// 加载发电站点位（使用聚合功能）
const loadPowerStationMarkers = async (mapInstance: maplibregl.Map): Promise<void> => {
    try {
        const iconUrl = new URL('@/assets/siltArrester.svg', import.meta.url).href

        // 1. 你的图片预处理逻辑（保持不变）
        const loadPngIcon = (url: string, size: number): Promise<HTMLImageElement> => {
            return new Promise((resolve, reject) => {
                const img = new Image()
                img.crossOrigin = 'anonymous'
                img.onload = () => {
                    const canvas = document.createElement('canvas')
                    canvas.width = size
                    canvas.height = size
                    const ctx = canvas.getContext('2d')
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, size, size)
                        const resizedImg = new Image()
                        resizedImg.onload = () => resolve(resizedImg)
                        resizedImg.onerror = reject
                        resizedImg.src = canvas.toDataURL('image/png')
                    } else {
                        reject(new Error('无法获取 canvas 上下文'))
                    }
                }
                img.onerror = reject
                img.src = url
            })
        }


        // const iconUrl = new URL('@/assets/siltArrester.png', import.meta.url).href
        console.log('图片原始路径:', iconUrl);
        const [smallIcon, largeIcon] = await Promise.all([
            loadPngIcon(iconUrl, 40),
            loadPngIcon(iconUrl, 60)
        ])
        // 【修改开始】直接添加 HTMLImageElement，不需要再调用 loadImage
        try {
            // smallIcon 和 largeIcon 已经是加载好的图片对象，直接传给 addImage
            mapInstance.addImage('small-cluster-icon', smallIcon);
            mapInstance.addImage('large-cluster-icon', largeIcon);
            
            console.log('图标添加成功'); // 这行会立即执行
        } catch (err) {
            console.error('图标添加失败:', err);
            return;
        }

// 4. 数据加载逻辑（保持不变）
        const url = new URL(`${import.meta.env.BASE_URL}powerstation/Export_Output_32.shp`, window.location.href).toString()
        const data: any = await shp(url)
        const featureCollection = normalizeToFeatureCollection(data)

        // 查看属性字段
        if (featureCollection.features.length > 0) {
            console.log('========== Shapefile 属性信息 ==========')
            console.log('总要素数量:', featureCollection.features.length)
            console.log('属性字段:', Object.keys(featureCollection.features[0].properties || {}))
            console.log('\n第一个要素的属性:')
            console.log(featureCollection.features[0].properties)
            console.log('\n前5个要素的属性:')
            featureCollection.features.slice(0, 5).forEach((f, i) => {
                console.log(`要素 ${i + 1}:`, f.properties)
            })
            console.log('==========================================')
        }

        // 清理旧数据（保持不变）
        // ... (清理代码略，同原代码) ...
        for (const m of powerStationMarkers) m.remove()
        powerStationMarkers.length = 0
        allPowerStations.length = 0

        // ... (解析点坐标代码略，同原代码) ...
        const forEachPoint = (geom: GeoJSON.Geometry | null, fn: (lng: number, lat: number) => void) => {
            if (!geom) return
            const t = geom.type
            const c: any = (geom as any).coordinates
            if (t === 'Point') fn(c[0], c[1])
            else if (t === 'MultiPoint') for (const p of c) fn(p[0], p[1])
        }
        const getName = (props: Record<string, any>): string => {
            const candidates = ['NAME', 'Name', 'name', 'STATION', 'Station', 'station', '备注', '站名', 'RES_NAME']
            for (const k of candidates) {
                if (props && props[k] != null && String(props[k]).trim() !== '') return String(props[k])
            }
            return '淤地坝'
        }

const points: GeoJSON.Feature[] = []
        let pid = 0
        for (const f of featureCollection.features) {
            const props = (f.properties || {}) as Record<string, any>
            const stationName = getName(props)
            forEachPoint(f.geometry, (lng, lat) => {
                allPowerStations.push({ id: pid++, lng, lat, name: stationName })
                points.push({
                    type: 'Feature',
                    properties: { ...props, name: stationName },
                    geometry: { type: 'Point', coordinates: [lng, lat] }
                })
            })
        }

        // 5. 添加 Source
        if (mapInstance.getSource('powerstations')) {
            mapInstance.removeSource('powerstations')
        }
        mapInstance.addSource('powerstations', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: points },
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50
        })

        // 6. 【关键修改】添加图层（移到这里，确保图片已存在）
        // 移除旧图层
        if (mapInstance.getLayer('powerstations-unclustered')) mapInstance.removeLayer('powerstations-unclustered')
        if (mapInstance.getLayer('powerstations-cluster')) mapInstance.removeLayer('powerstations-cluster')

        mapInstance.addLayer({
            id: 'powerstations-cluster',
            type: 'symbol',
            source: 'powerstations',
            filter: ['has', 'point_count'],
layout: {
                'icon-image': [
                    'case',
                    ['<', ['get', 'point_count'], 10],
                    'small-cluster-icon',
                    'large-cluster-icon'
                ],
                'icon-size': 1,
                'text-field': ['get', 'point_count'],
                'text-size': 14,
                'text-offset': [0, 0.2],
                'text-anchor': 'top'
            },
            paint: {
                'text-color': '#000',
                'text-halo-color': '#fff',
                'text-halo-width': 2
            }
        })

        mapInstance.addLayer({
            id: 'powerstations-unclustered',
            type: 'symbol',
            source: 'powerstations',
            filter: ['!', ['has', 'point_count']],
            layout: {
                'icon-image': 'small-cluster-icon',
                'icon-size': 1,
                'icon-allow-overlap': true
            }
        })

// 交互事件（保持不变）
        mapInstance.on('click', 'powerstations-unclustered', (e) => {
            const coordinates = e.features[0].geometry.coordinates as [number, number]
            const props = e.features[0].properties || {}
            
            const keyTranslation: Record<string, string> = {
                'OBJECTID': '对象ID',
                'DamY': '坝坐标Y',
                'DamX': '坐标X',
                'Dam_Elv': '坝体高程',
                'Dam_Len': '坝长',
                'Dam_Area': '坝面积',
                'Dam_Cont': '坝流域',
                'Dam_LenS': '坝长S',
                'Dam_VolR': '坝体积R',
                'Dam_VolS': '坝体积S',
                'Dam_VolT': '坝总体积',
                'BASINCODE': '流域代码',
                'CHANNELID': '河道ID',
                'CNL_SLOPE': '河道坡度',
                'DOWNID': '下游ID',
                'HIERARCODE': '层级代码',
                'LEVEL': '级别',
                'PYMDUPID': 'PYMDUPID',
                'STRAHLER': '斯特拉勒河流分级',
                'SUBBASINCD': '子流域代码',
                'UPSUBAREA': '上游子流域面积',
                'name': '名称'
            }
            
            let propsHtml = ''
            for (const [key, value] of Object.entries(props)) {
                if (value !== null && value !== undefined && value !== '') {
                    const translatedKey = keyTranslation[key] || key
                    propsHtml += `<div class="ps-prop"><span class="ps-key">${translatedKey}:</span> <span class="ps-value">${value}</span></div>`
                }
            }
            
            new maplibregl.Popup({ offset: 12 })
                .setLngLat(coordinates)
                .setHTML(`<div class="ps-popup">${propsHtml}</div>`)
                .addTo(mapInstance)
        })

        mapInstance.on('mouseenter', 'powerstations-unclustered', () => mapInstance.getCanvas().style.cursor = 'pointer')
        mapInstance.on('mouseleave', 'powerstations-unclustered', () => mapInstance.getCanvas().style.cursor = '')

        mapInstance.on('click', 'powerstations-cluster', (e) => {
            const features = mapInstance.queryRenderedFeatures(e.point, { layers: ['powerstations-cluster'] })
            const clusterId = features[0].properties?.cluster_id
            mapInstance.getSource('powerstations').getClusterExpansionZoom(clusterId, (err, zoom) => {
                if (err) return
                mapInstance.easeTo({
                    center: features[0].geometry.coordinates as [number, number],
                    zoom: zoom
                })
            })
        })
        
        mapInstance.on('mouseenter', 'powerstations-cluster', () => mapInstance.getCanvas().style.cursor = 'pointer')
        mapInstance.on('mouseleave', 'powerstations-cluster', () => mapInstance.getCanvas().style.cursor = '')

        console.log(`发电站点位加载完成：${allPowerStations.length} 个`)
    } catch (error) {
        console.error('加载发电站点位失败:', error)
    }
}
// 加载四级河网图层（shp -> GeoJSON）
const loadRiverLayer = async (mapInstance: maplibregl.Map): Promise<void> => {
    try {
        // 使用绝对 URL，避免 shpjs 内部 new URL 相对基路径时报错
        // const url = new URL(`G:/YRB_RIVER_NETWORK/river/Huanghe_river2.shp`, window.location.href).toString()
        const url = new URL(`${import.meta.env.BASE_URL}river/Huanghe_river7.shp`, window.location.href).toString()
        const data: any = await shp(url)

        // 规范化为 FeatureCollection
        const featureCollection = normalizeToFeatureCollection(data)

        // 如果已存在则移除旧图层/数据源
        if (mapInstance.getLayer('river4-line')) {
            mapInstance.removeLayer('river4-line')
        }
        if (mapInstance.getSource('river4')) {
            mapInstance.removeSource('river4')
        }

        mapInstance.addSource('river4', {
            type: 'geojson',
            data: featureCollection as any,
            // 通过容差、缓冲与最大缩放减少瓦片复杂度（提升渲染性能）
            maxzoom: 12,
            tolerance: 1,
            buffer: 32
        } as any)

        // 线样式图层
        mapInstance.addLayer({
            id: 'river4-line',
            type: 'line',
            source: 'river4',
            minzoom: 0,
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#1890ff',
                'line-opacity': 0.95,
                'line-width': [
                    'interpolate', ['linear'], ['zoom'],
                    6, 2.8,
                    8, 4.2,
                    10, 6.0,
                    12, 8.0
                ]
            }
        })

        // 保证峡谷图层在河网上方
        if (mapInstance.getLayer('canyons-layer')) {
            mapInstance.moveLayer('canyons-layer')
        }

        // 尝试缩放至河网范围
        const bbox = computeGeoJsonBbox(featureCollection)
        if (bbox) {
            const [[minLng, minLat], [maxLng, maxLat]] = bbox
            const bounds = new maplibregl.LngLatBounds([minLng, minLat], [maxLng, maxLat])
            mapInstance.fitBounds(bounds, { padding: 40, duration: 800 })
        }

        console.log('四级河网加载完成')
    } catch (error) {
        console.error('加载四级河网失败:', error)
    }
}

function normalizeToFeatureCollection(data: any): GeoJSON.FeatureCollection {
    if (!data) {
        return { type: 'FeatureCollection', features: [] }
    }
    if (data.type === 'FeatureCollection') {
        return data as GeoJSON.FeatureCollection
    }
    if (data.type === 'Feature') {
        return { type: 'FeatureCollection', features: [data as GeoJSON.Feature] }
    }
    if (Array.isArray(data)) {
        const features: GeoJSON.Feature[] = []
        for (const part of data) {
            const fc = normalizeToFeatureCollection(part)
            features.push(...fc.features)
        }
        return { type: 'FeatureCollection', features }
    }
    // 可能是 Geometry
    if (data.type && typeof data.type === 'string') {
        return { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: data, properties: {} }] as any }
    }
    return { type: 'FeatureCollection', features: [] }
}

type BBox = [[number, number], [number, number]]
function computeGeoJsonBbox(fc: GeoJSON.FeatureCollection): BBox | null {
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity

    const update = (lng: number, lat: number) => {
        if (Number.isFinite(lng) && Number.isFinite(lat)) {
            if (lng < minLng) minLng = lng
            if (lat < minLat) minLat = lat
            if (lng > maxLng) maxLng = lng
            if (lat > maxLat) maxLat = lat
        }
    }

    const walkCoords = (geom: GeoJSON.Geometry | null) => {
        if (!geom) return
        const t = geom.type
        const c: any = (geom as any).coordinates
        if (t === 'Point') update(c[0], c[1])
        else if (t === 'MultiPoint' || t === 'LineString') for (const p of c) update(p[0], p[1])
        else if (t === 'MultiLineString' || t === 'Polygon') for (const ring of c) for (const p of ring) update(p[0], p[1])
        else if (t === 'MultiPolygon') for (const poly of c) for (const ring of poly) for (const p of ring) update(p[0], p[1])
        else if (t === 'GeometryCollection') for (const g of (geom as GeoJSON.GeometryCollection).geometries) walkCoords(g)
    }

    for (const f of fc.features) walkCoords(f.geometry)

    if (!Number.isFinite(minLng) || !Number.isFinite(minLat) || !Number.isFinite(maxLng) || !Number.isFinite(maxLat)) {
        return null
    }
    return [[minLng, minLat], [maxLng, maxLat]]
}
// 自定义控件
// 自定义导航控件类
class CustomNavigationControl {
    private _map: maplibregl.Map | null = null;
    private _container: HTMLElement | null = null;
    private _zoomInButton: HTMLButtonElement | null = null;
    private _zoomOutButton: HTMLButtonElement | null = null;
    private _compassButton: HTMLButtonElement | null = null;
    private _overviewButton: HTMLButtonElement | null = null;
    private _onOverviewClick?: () => void;

    constructor(onOverviewClick?: () => void) {
        this._onOverviewClick = onOverviewClick;
    }

    onAdd(map: maplibregl.Map) {
        this._map = map;
        this._container = document.createElement('div');
        this._container.className = 'custom-navigation-control maplibregl-ctrl';
                


        // 创建指南针按钮 - 使用三角形SVG
        this._compassButton = this._createCompassButton();
        
        // 创建放大按钮
        this._zoomInButton = this._createButton('+', '放大', () => {
            map.zoomIn();
        });
        
        // 创建缩小按钮
        this._zoomOutButton = this._createButton('-', '缩小', () => {
            map.zoomOut();
        });

        // 创建概化图按钮（置于最上方）
        this._overviewButton = this._createButton('概化图', '跳转到概化图', () => {
            if (this._onOverviewClick) this._onOverviewClick();
        });
        this._overviewButton.classList.add('overview-btn');
        
        this._container.appendChild(this._overviewButton);
        this._container.appendChild(this._zoomInButton);
        this._container.appendChild(this._zoomOutButton);
        this._container.appendChild(this._compassButton);
        
        // 监听地图旋转事件来更新指南针
        map.on('rotate', this._updateCompassRotation);
        this._updateCompassRotation();
        
        return this._container;
    }
    
    onRemove() {
        if (this._container && this._container.parentNode) {
            this._container.parentNode.removeChild(this._container);
        }
        if (this._map) {
            this._map.off('rotate', this._updateCompassRotation);
        }
        this._map = null;
        this._container = null;
        this._zoomInButton = null;
        this._zoomOutButton = null;
        this._compassButton = null;
        this._overviewButton = null;
    }
    
    private _createButton(innerHTML: string, title: string, onClick: () => void): HTMLButtonElement {
        const button = document.createElement('button');
        button.innerHTML = innerHTML;
        button.title = title;
        button.type = 'button';
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            onClick();
        });
        return button;
    }

    private _createCompassButton(): HTMLButtonElement {
        const button = document.createElement('button');
        button.title = '重置指北';
        button.type = 'button';
        button.className = 'custom-compass-btn';
        
        // 创建三角形SVG
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '20');
        svg.setAttribute('height', '20');
        svg.setAttribute('viewBox', '0 0 20 20');
        svg.setAttribute('fill', 'currentColor');
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M10 3L16 17H4L10 3Z');
        path.setAttribute('fill', 'currentColor');
        
        svg.appendChild(path);
        button.appendChild(svg);
        
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this._map) {
                this._map.resetNorthPitch();
            }
        });
        
        return button;
    }
    
    private _updateCompassRotation = () => {
        if (!this._map || !this._compassButton) return;
        
        const bearing = this._map.getBearing();
        this._compassButton.style.transform = `rotate(${-bearing}deg)`;
    }
}
// 自定义比例尺控件类
class CustomScaleControl {
    private _map: maplibregl.Map | null = null;
    private _container: HTMLElement | null = null;

    onAdd(map: maplibregl.Map) {
        this._map = map;
        this._container = document.createElement('div');
        this._container.className = 'custom-scale-control maplibregl-ctrl';
        
        this._updateScale();
        
        map.on('move', this._updateScale);
        
        return this._container;
    }
    
    onRemove() {
        if (this._container && this._container.parentNode) {
            this._container.parentNode.removeChild(this._container);
        }
        if (this._map) {
            this._map.off('move', this._updateScale);
        }
        this._map = null;
        this._container = null;
    }
    
    private _updateScale = () => {
        if (!this._map || !this._container) return;
        
        const scale = this._getScale();
        this._container.innerHTML = scale;
    }
    
    private _getScale(): string {
        if (!this._map) return '';
        
        const bounds = this._map.getBounds();
        const centerLng = (bounds.getEast() + bounds.getWest()) / 2;
        const centerLat = (bounds.getNorth() + bounds.getSouth()) / 2;
        
        // 计算1公里对应的经度差
        const earthCircumference = 40075000; // 地球周长(米)
        const latRadians = centerLat * Math.PI / 180;
        const metersPerDegree = earthCircumference * Math.cos(latRadians) / 360;
        const degreesPerKm = 1000 / metersPerDegree;
        
        // 计算比例尺长度（像素）
        const centerPoint = this._map.project([centerLng, centerLat]);
        const targetPoint = this._map.project([centerLng + degreesPerKm, centerLat]);
        const scalePixels = targetPoint.x - centerPoint.x;
        
        // 找到最合适的比例
        const scales = [
            { value: 1, unit: '米' },
            { value: 10, unit: '米' },
            { value: 100, unit: '米' },
            { value: 1, unit: '公里' },
            { value: 10, unit: '公里' },
            { value: 100, unit: '公里' }
        ];
        
        let bestScale = scales[0];
        let bestDiff = Math.abs(scalePixels - 100); // 目标长度为100像素
        
        for (const scale of scales) {
            const scaleValue = scale.value * (scale.unit === '公里' ? 1000 : 1);
            const scaleDegrees = scaleValue / metersPerDegree;
            const scalePoint = this._map.project([centerLng + scaleDegrees, centerLat]);
            const scaleLength = scalePoint.x - centerPoint.x;
            const diff = Math.abs(scaleLength - 100);
            
            if (diff < bestDiff) {
                bestDiff = diff;
                bestScale = scale;
            }
        }
        
        return `${bestScale.value} ${bestScale.unit}`;
    }
}
// 初始化地图
function initMap() {
    if (!map.value) {
        throw new Error('地图容器不存在')
    }
    const mapInstance = new maplibregl.Map({
        container: map.value,
        style: startMapConfig.satellite.style,
        center: startMapConfig.satellite.center,
        zoom: startMapConfig.satellite.zoom,
        pitch: 0, // 俯仰角
        bearing: 0, // 方位角
        attributionControl: false
    })
    // 地图加载完成后添加注记层和峡谷标记
    mapInstance.on('load', () => {
        // 添加注记层
        mapInstance.addSource('startmap-annotation', startMapConfig.annotation.style.sources['startmap-annotation']);
        mapInstance.addLayer(startMapConfig.annotation.style.layers[0]);

        // 加载峡谷标记
        loadCanyonMarkers(mapInstance);

        // 直接加载四级河网（进入页面即加载）
        if (!riverLoaded.value) {
            riverLoaded.value = true
            loadRiverLayer(mapInstance)
        }

        // 加载发电站点位（仅一次）
        if (!powerStationsLoaded.value) {
            powerStationsLoaded.value = true
            loadPowerStationMarkers(mapInstance)
        }

        // 添加点击峡谷标记的交互
        mapInstance.on('click', 'canyons-layer', (e) => {
            if (e.features && e.features.length > 0) {
                const feature = e.features[0];
                const properties = feature.properties;
                
                new maplibregl.Popup()
                    .setLngLat(e.lngLat)
                    .setHTML(`
                        <div class="canyon-popup">
                            <h3 style="color: ${properties.color}; margin: 0;">${properties.message}</h3>
                        </div>
                    `)
                    .addTo(mapInstance);
            }
        });

        // 添加鼠标悬停效果
        mapInstance.on('mouseenter', 'canyons-layer', () => {
            mapInstance.getCanvas().style.cursor = 'pointer';
        });

        mapInstance.on('mouseleave', 'canyons-layer', () => {
            mapInstance.getCanvas().style.cursor = '';
        });
    });
    // 添加导航控件
    mapInstance.addControl(new CustomNavigationControl(() => router.push('/overview')), 'bottom-right')
    
    // 添加比例尺
    mapInstance.addControl(new CustomScaleControl(), 'bottom-left')

    return mapInstance
}

onMounted(() => {
    map.value = initMap()
})
onUnmounted(() => {
    if (map.value){
        // 清理发电站标记
        for (const m of powerStationMarkers) m.remove()
        powerStationMarkers.length = 0
        map.value.remove()
        map.value = null
    }
})
</script>

<style scoped lang="scss">
.header { position: relative; z-index: 5000; }
.container {
    position: relative;
    width: 100%;
    height: calc(100vh - 60px);
    
    .map {
        width: 100%;
        height: 100%;
        overflow: hidden;
        
        // 自定义导航控件样式
        :deep(.custom-navigation-control) {
            position: relative;
            z-index: 10001; // 保证在标记之上
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 8px;
            background: transparent;
            border: none;
            box-shadow: none;
            
            button {
                width: 40px;
                height: 40px;
                background: rgba(255, 255, 255, 0.95);
                border: none;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
                transition: all 0.3s ease;
                font-size: 18px;
                font-weight: bold;
                color: #333;
                
                &:hover {
                    color: rgb(255, 176, 93);
                    background: #f0f0f0;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
                }
                
                &:active {
                    transform: translateY(0);
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                }
            }

            // 概化图按钮样式（置于顶端，文字按钮）
            .overview-btn {
                width: 72px;
                height: 32px;
                font-size: 12px;
                font-weight: 600;
            }
            
            // 指南针按钮特殊样式
            .custom-compass-btn {
                transition: all 0.3s ease;
                color: #666; // 默认颜色
                
                &:hover {
                    background: #f0f0f0;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
                    // color: #1890ff; // 悬停时变为蓝色
                    // background: rgba(24, 144, 255, 0.1);
                    transform: translateY(-2px) rotate(0deg) !important; // 悬停时保持不旋转
                }
                
                svg {
                    transition: transform 0.3s ease;
                }
            }
        }
        
        // 自定义比例尺样式
        :deep(.custom-scale-control) {
            position: relative;
            z-index: 10001; // 保证在标记之上
            text-align: center;
            width: 5vw;
            background: rgba(255, 255, 255, 0.9);
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            color: #333;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            border: 1px solid rgba(0, 0, 0, 0.1);
            font-weight: 500;
        }
        
        // 隐藏默认的版权信息
        :deep(.maplibregl-ctrl-attrib) {
            display: none !important;
        }
        // 提升所有控件容器（四角）的层级，确保不被标记遮挡
        :deep(.maplibregl-ctrl-top-left),
        :deep(.maplibregl-ctrl-top-right),
        :deep(.maplibregl-ctrl-bottom-left),
        :deep(.maplibregl-ctrl-bottom-right) {
            position: absolute;
            z-index: 10000 !important;
            pointer-events: auto;
        }
        
        // 使用深度选择器修改子组件样式
        :deep(.maplibregl-popup-content) {
            border-radius: 8px;
            padding: 12px;
            box-shadow: 0 4px 12px rgba(246, 92, 92, 0.15);
}

        // 发电站 DOM 标记样式
        :deep(.powerstation-marker) {
            display: grid;
            place-items: center;
            background: transparent; // 由图标自身呈现红/白
            border: none;
            box-shadow: none;
            width: auto;
            height: auto;
        }
        :deep(.powerstation-icon) {
            width: 28px;
            height: 28px;
        }
:deep(.ps-popup .ps-title) {
            font-weight: 600;
            color: #fa0000;
        }
        :deep(.ps-popup .ps-prop) {
            display: flex;
            margin: 4px 0;
            font-size: 12px;
        }
        :deep(.ps-popup .ps-key) {
            font-weight: 600;
            color: #333;
            min-width: 80px;
            margin-right: 8px;
        }
        :deep(.ps-popup .ps-value) {
            color: #666;
            flex: 1;
            word-break: break-all;
        }
    }

    // 模型管理左侧面板------------------
    .model-mgmt-panel {
        position: absolute;
        left: 59px;
        top: 24px;
        width: 560px;
        max-height: calc(100% - 140px);
        overflow: auto;
        background: rgba(255,255,255,0.96);
        border-radius: 8px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.15);
        padding: 16px 16px 8px 16px;
        z-index: 11;
    }
    .model-mgmt-panel .panel-title {
        font-size: 16px;
        font-weight: 700;
        color: #333;
        margin: 0 0 8px 4px;
    }
    .model-card {
        background: #fff;
        border-radius: 8px;
        border: 1px solid rgba(0,0,0,0.06);
        padding: 14px 16px;
        margin-bottom: 12px;
    }
    .model-card .card-title {
        font-size: 14px;
        font-weight: 600;
        color: #1f5099;
        margin-bottom: 8px;
    }
    .model-card .section { margin-top: 6px; }
    .model-card .section-title {
        font-size: 12px;
        color: #555;
        margin-bottom: 4px;
    }
    .model-card ul { margin: 0 0 2px 16px; padding: 0; color: #333; font-size: 12px; }
    .model-card li { line-height: 20px; }

    // 左上角图标（模型参数、模型运行）
    .corner-icons {
        position: absolute;
        left: 12px;
        top: 24px; // 避开头部
        display: flex;
        flex-direction: column;
        gap: 12px;
        z-index: 12;
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

    .overlay {
        position: absolute;
        left: 59px;
        top: 24px; // 避开头部
        display: flex;
        gap: 12px;
        z-index: 10;

        .menu-wrap { flex: 0 0 auto; }
        .panel-wrap { flex: 0 0 auto; }
    }

    // 左下角情景评选面板
    .left-bottom-eval-overlay {
        position: absolute;
        left: 6vh;
        bottom: 6vh;
        z-index: 12;
        pointer-events: none; // 仅面板可交互

        :deep(.scenario-eval-panel) { pointer-events: auto; }
    }

    // 左下角运行监控面板
    .left-bottom-run-overlay {
        position: absolute;
        left: 6vh;
        bottom: 6vh;
        z-index: 12;
        pointer-events: none; // 仅面板可交互

        :deep(.run-monitor-panel),
        :deep(.result-analysis-panel) { pointer-events: auto; }
    }

    // .bottom-overlay {
    //     position: absolute;
    //     left: 50%;
    //     bottom: 16px;
    //     transform: translateX(-50%);
    //     z-index: 12;
    //     display: flex;
    //     justify-content: center;
    //     width: auto;
    //     pointer-events: none; // 让周围空白不拦截

    //     // 仅让面板可点击
    //     :deep(.model-run-panel) { pointer-events: auto; }
    // }
}
</style>
