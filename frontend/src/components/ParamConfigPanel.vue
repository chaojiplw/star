<template>
  <div class="param-config-panel">
    <div class="panel-header">
      <div class="title">模型参数</div>
      <button class="close-btn" type="button" @click="$emit('close')">×</button>
    </div>
    <!-- 1) 模型和算法 -->
    <div class="section">
      <div class="section-title">模型和算法</div>
      <div class="row align-top">
        <label class="field-label">模型</label>
        <div class="radio-grid">
          <label
            v-for="opt in modelOptions"
            :key="opt.value"
            class="choice-item"
            :class="{ active: model === opt.value }"
          >
            <input type="radio" name="model" :value="opt.value" v-model="model" />
            <span>{{ opt.label }}</span>
          </label>
        </div>
      </div>
      <div class="row">
        <label class="field-label">算法</label>
        <div class="radio-group">
          <label
            v-for="opt in algorithmOptions"
            :key="opt.value"
            class="choice-item small"
            :class="{ active: algorithm === opt.value }"
          >
            <input type="radio" name="algorithm" :value="opt.value" v-model="algorithm" />
            <span>{{ opt.label }}</span>
          </label>
        </div>
      </div>
    </div>

    <!-- 数据文件上传 -->
    <div class="section">
      <div class="section-title">数据文件上传</div>
      <div 
        class="upload-area"
        :class="{ dragging: isDragging }"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
        @click="triggerFileInput"
      >
        <input 
          type="file" 
          ref="fileInput" 
          class="hidden-input" 
          accept=".xlsx, .xls" 
          @change="handleFileChange" 
        />
        <div class="upload-content">
          <span v-if="uploadedFileName" class="file-name">📄 {{ uploadedFileName }}</span>
          <span v-else class="placeholder">点击或拖拽上传 Excel 文件</span>
        </div>
      </div>
      <div class="upload-hint">支持 .xlsx, .xls 格式，请确保数据包含必要的时间序列列</div>
    </div>

    <!-- 1) 调度设置 -->
    <div class="section">
      <div class="section-title">调度时间和尺度</div>
      <div class="row">
        <label class="field-label">调度年份</label>
        <div class="time-range">
          <input class="year-input" type="number" placeholder="开始年份" v-model.number="schedulingTime.start" min="1970" max="2023" />
          <span class="separator">至</span>
          <input class="year-input" type="number" placeholder="结束年份" v-model.number="schedulingTime.end" min="1970" max="2023" />
          <span class="unit">年</span>
        </div>
      </div>
      <div class="row">
        <label class="field-label">调度时期</label>
        <div class="radio-group">
          <label
            v-for="opt in schedulingScaleOptions"
            :key="opt.value"
            class="choice-item small"
            :class="{ active: schedulingscale === opt.value }"
          >
            <input type="radio" name="schedulingscale" :value="opt.value" v-model="schedulingscale" />
            <div class="radio-text-col">
              <span>{{ opt.label }}</span>
              <span class="sub-model-hint">{{ opt.subModel }}</span>
            </div>
          </label>
        </div>
      </div>
    </div>

    <!-- 2) 算法参数：同一行两个输入框 -->
    <div class="section">
      <div class="section-title">算法参数</div>
      <div class="row two-cols">
        <div class="inline-field">
          <label>种群大小</label>
          <input class="number" type="number" v-model.number="algoParams.population" min="1" step="1" />
        </div>
        <div class="inline-field">
          <label>迭代次数</label>
          <input class="number" type="number" v-model.number="algoParams.iterations" min="1" step="1" />
        </div>
      </div>
    </div>

    <!-- 3) 约束条件 -->
    <div class="section">
      <div class="section-title constraint-title">
        <span>约束条件</span>
        <button class="toggle-btn" type="button" @click="showConstraints = !showConstraints">
          {{ showConstraints ? '隐藏' : '显示' }}
        </button>
      </div>

      <div v-show="showConstraints">
        <div class="row">
          <label class="field-label">水库</label>
          <select class="select" v-model="selectedReservoir">
            <option v-for="r in reservoirNames" :key="r" :value="r">{{ r }}</option>
          </select>
        </div>

        <div class="constraints">
          <!-- 库容范围：min < 库容 < max -->
          <div class="constraint-line">
            <div class="range-row">
              <input class="range-input" type="number" v-model.number="ranges.storage.min" />
              <span class="op">&lt;</span>
              <span class="center-label">库容</span>
              <span class="op">&lt;</span>
              <input class="range-input" type="number" v-model.number="ranges.storage.max" />
              <span class="unit">亿m³</span>
            </div>
          </div>

          <!-- 出力范围：min < 出力 < max -->
          <div class="constraint-line">
            <div class="range-row">
              <input class="range-input" type="number" v-model.number="ranges.power.min" />
              <span class="op">&lt;</span>
              <span class="center-label">出力</span>
              <span class="op">&lt;</span>
              <input class="range-input" type="number" v-model.number="ranges.power.max" />
              <span class="unit">万kW</span>
            </div>
          </div>

          <!-- 下泄流量：min < 下泄流量 < max -->
          <div class="constraint-line">
            <div class="range-row">
              <input class="range-input" type="number" v-model.number="ranges.outflow.min" />
              <span class="op">&lt;</span>
              <span class="center-label">下泄流量</span>
              <span class="op">&lt;</span>
              <input class="range-input" type="number" v-model.number="ranges.outflow.max" />
              <span class="unit">m³/s</span>
            </div>
          </div>

          <!-- 防凌流量：min < 防凌流量 < max -->
          <div class="constraint-line" v-if="ranges.iceControl">
            <div class="range-row">
              <input class="range-input" type="number" v-model.number="ranges.iceControl.min" />
              <span class="op">&lt;</span>
              <span class="center-label">防凌流量</span>
              <span class="op">&lt;</span>
              <input class="range-input" type="number" v-model.number="ranges.iceControl.max" />
              <span class="unit">m³/s</span>
            </div>
          </div>

          <!-- 生态流量：min < 生态流量 < max -->
          <div class="constraint-line" v-if="ranges.ecological">
            <div class="range-row">
              <input class="range-input" type="number" v-model.number="ranges.ecological.min" />
              <span class="op">&lt;</span>
              <span class="center-label">生态流量</span>
              <span class="op">&lt;</span>
              <input class="range-input" type="number" v-model.number="ranges.ecological.max" />
              <span class="unit">m³/s</span>
            </div>
          </div>

          <!-- 调沙：≥ value -->
          <div class="constraint-line" v-if="ranges.sediment">
            <div class="range-row">
              <span class="center-label">调沙</span>
              <span class="op">≥</span>
              <input class="range-input" type="number" v-model.number="ranges.sediment.single" />
              <span class="unit">m³/s</span>
            </div>
          </div>
        </div>

        <div class="units-tip">单位：库容 亿m³，出力 万kW，流量 m³/s</div>
      </div>
    </div>

    <!-- 4) 目标 -->
    <div class="section">
      <div class="section-title">目标</div>
      <label class="checkbox">
        <input type="checkbox" v-model="goals.minimizeLanzhouShortage" />
        <span>兰州断面总缺水最小</span>
      </label>
      <label class="checkbox">
        <input type="checkbox" v-model="goals.maximizeHydropower" />
        <span>梯级水电站群年均发电量最大</span>
      </label>
      <label class="checkbox">
        <input type="checkbox" v-model="goals.maximizeCoordination" />
        <span>梯级调度系统总协同度最大</span>
      </label>
    </div>

  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'

type Algorithm = 'pso' | 'paem' | 'nsga2'
type SchedulingScale = 'anti-paddle' | 'watersupply' | 'floodcontrol' | 'multi-energy'
type ModelKey =
  | 'midlong-multiobjective'
  | 'ice-control'
  | 'water-supply'
  | 'flood-sediment'
  | 'multi-energy'
  | 'water-potential'

const modelOptions: Array<{ value: ModelKey; label: string }> = [
  { value: 'midlong-multiobjective', label: '中长期多目标调度模型' },
  { value: 'water-potential', label: '水资源挖潜模型' }
]

const algorithmOptions: Array<{ value: Algorithm; label: string }> = [
  { value: 'pso', label: '粒子群算法 PSO' },
  { value: 'paem', label: 'PAEM' },
  { value: 'nsga2', label: 'NSGA-II' }
]

const schedulingScaleOptions: Array<{ value: SchedulingScale; label: string; subModel: string }> = [
  { value: 'anti-paddle', label: '防凌期 (11月-3月)', subModel: '使用子模型--防凌调度模型' },
  { value: 'watersupply', label: '供水期 (4月-6月)', subModel: '使用子模型--供水模型' },
  { value: 'floodcontrol', label: '防洪期 (7月-10月)', subModel: '使用子模型--防洪输沙模型' },
  { value: 'multi-energy', label: '多能互补期 (全年)', subModel: '使用子模型--多能互补调度模型' }
]

const model = ref<ModelKey>('midlong-multiobjective')
const algorithm = ref<Algorithm>('pso')
const schedulingscale = ref<SchedulingScale>('anti-paddle')
const showConstraints = ref(false)

const schedulingTime = reactive({
  start: 2020,
  end: 2023
})

const algoParams = reactive({
  population: 15,
  iterations: 20
})

watch(algorithm, (alg) => {
  // 调整推荐默认参数
  if (alg === 'pso') { algoParams.population = 15; algoParams.iterations = 20 }
  else if (alg === 'paem') { algoParams.population = 15; algoParams.iterations = 20 }
  else { algoParams.population = 100; algoParams.iterations = 100 }
})

type ReservoirName = '龙羊峡' | '刘家峡'
type ReservoirConstraints = {
  storageMin: number
  storageMax: number
  powerMax: number
  powerMinWet: number
  powerMinDry: number
  outflowMin: number
  outflowMax: number
  flows: {
    iceControl?: [number, number]
    ecological?: [number, number]
    sediment?: number
  }
}

const constraintsMap: Record<ReservoirName, ReservoirConstraints> = {
  '龙羊峡': {
    storageMin: 42.63,
    storageMax: 242.9,
    powerMax: 128,
    powerMinWet: 58.7,
    powerMinDry: 46.96,
    outflowMin: 350,
    outflowMax: 1050,
    flows: {
      iceControl: [500, 700],
      ecological: [350, 550],
      sediment: 1650
    }
  },
  '刘家峡': {
    storageMin: 6.223,
    storageMax: 39.93,
    powerMax: 128,
    powerMinWet: 58.7,
    powerMinDry: 46.96,
    outflowMin: 350,
    outflowMax: 1200,
    flows: {
      iceControl: [500, 700],
      ecological: [400, 600]
    }
  }
}

const reservoirNames = Object.keys(constraintsMap) as ReservoirName[]
const selectedReservoir = ref<ReservoirName>('龙羊峡')
const currentConstraints = computed(() => constraintsMap[selectedReservoir.value])

// 可编辑范围（用于界面输入）
const ranges = reactive<{ 
  storage: { min: number; max: number },
  power: { min: number; max: number },
  outflow: { min: number; max: number },
  iceControl: { min: number; max: number } | null,
  ecological: { min: number; max: number } | null,
  sediment: { single: number } | null,
}>({
  storage: { min: 0, max: 0 },
  power: { min: 0, max: 0 },
  outflow: { min: 0, max: 0 },
  iceControl: null,
  ecological: null,
  sediment: null,
})

function resetRangesFromDefaults(name: ReservoirName) {
  const def = constraintsMap[name]
  ranges.storage.min = def.storageMin
  ranges.storage.max = def.storageMax
  // 出力下限取枯水期下限（更严格）
  ranges.power.min = Math.min(def.powerMinDry, def.powerMinWet)
  ranges.power.max = def.powerMax
  ranges.outflow.min = def.outflowMin
  ranges.outflow.max = def.outflowMax
  ranges.iceControl = def.flows.iceControl ? { min: def.flows.iceControl[0], max: def.flows.iceControl[1] } : null
  ranges.ecological = def.flows.ecological ? { min: def.flows.ecological[0], max: def.flows.ecological[1] } : null
  ranges.sediment = typeof def.flows.sediment === 'number' ? { single: def.flows.sediment } : null
}

watch(selectedReservoir, (n) => resetRangesFromDefaults(n), { immediate: true })

const goals = reactive({
  minimizeLanzhouShortage: true,
  maximizeHydropower: true,
  maximizeCoordination: true
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'change', payload: any): void
  (e: 'upload', file: File): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const uploadedFileName = ref('')

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    processFile(target.files[0])
  }
}

const handleDrop = (event: DragEvent) => {
  isDragging.value = false
  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    processFile(event.dataTransfer.files[0])
  }
}

const processFile = (file: File) => {
  if (!/\.(xlsx|xls)$/i.test(file.name)) {
    alert('请上传 Excel 文件 (.xlsx, .xls)')
    return
  }
  uploadedFileName.value = file.name
  emit('upload', file)
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const getConfig = () => ({
  model: model.value,
  algorithm: algorithm.value,
  algorithmParams: { ...algoParams },
  schedulingscale: schedulingscale.value,
  schedulingTime: { ...schedulingTime },
  constraints: { ...constraintsMap },
  userRanges: JSON.parse(JSON.stringify(ranges)),
  selectedReservoir: selectedReservoir.value,
  goals: { ...goals }
})

// 可选：如需把变化即刻上抛，可监听关键对象
watch([model, algorithm, schedulingscale, selectedReservoir], () => emit('change', getConfig()))
watch(algoParams, () => emit('change', getConfig()), { deep: true })
watch(schedulingTime, () => emit('change', getConfig()), { deep: true })
watch(goals, () => emit('change', getConfig()), { deep: true })
watch(() => ranges, () => emit('change', getConfig()), { deep: true })

defineExpose({ getConfig })
</script>

<style scoped lang="scss">
.param-config-panel {
  width: 560px;
  max-width: 96vw;
  overflow: auto;
  max-height: 80vh;
  background: rgba(255,255,255,0.96);
  border-radius: 10px;
  padding: 12px 14px 14px 14px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.15);
}
.panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.title { font-size: 16px; font-weight: 700; color: #333; }
.close-btn { width: 28px; height: 28px; border: none; background: #fff; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer; }

.section { background: #fff; border: 1px solid rgba(0,0,0,0.06); border-radius: 8px; padding: 10px; margin-top: 8px; }
.section-title { font-size: 13px; font-weight: 600; color: #555; margin-bottom: 8px; }
.row { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
.two-cols { gap: 8px; }
.inline-field { display: flex; align-items: center; gap: 8px; flex: 1 1 0; min-width: 0; }
.inline-field > label { width: 70px; color: #333; font-size: 13px; }
.field-label { width: 64px; color: #333; font-size: 13px; }
.select { flex: 1; padding: 6px 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
.number { width: 100%; padding: 6px 8px; border: 1px solid #ddd; border-radius: 6px; text-align: center; }

.align-top { align-items: flex-start; }
.radio-grid { flex: 1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.radio-group { flex: 1; display: flex; flex-wrap: wrap; gap: 8px; }
.choice-item { display: flex; align-items: center; gap: 6px; padding: 8px 10px; border: 1px solid #ddd; border-radius: 8px; background: #fff; cursor: pointer; font-size: 13px; color: #333; user-select: none; }
.choice-item.small { padding: 6px 12px; border-radius: 8px; }
.radio-text-col { display: flex; flex-direction: column; }
.sub-model-hint { font-size: 11px; font-style: italic; color: #888; margin-top: 2px; }
.choice-item input[type="radio"] { width: 14px; height: 14px; accent-color: #1677ff; margin: 0; }
.choice-item.active { border-color: #1677ff; background: rgba(22,119,255,0.08); }
.choice-item span { line-height: 1.2; }

.constraint-title { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.toggle-btn { border: 1px solid #ddd; background: #fff; border-radius: 6px; padding: 4px 10px; cursor: pointer; font-size: 12px; color: #333; }
.toggle-btn:hover { border-color: #1677ff; color: #1677ff; background: rgba(22,119,255,0.06); }

.constraints { display: grid; grid-template-columns: 1fr; gap: 8px; }
.constraint-line { border: 1px solid #f0f0f0; border-radius: 8px; padding: 8px; background: #fafafa; }
.range-row { display: flex; align-items: center; gap: 6px; flex-wrap: nowrap; }
.range-input { width: 110px; padding: 6px 8px; border: 1px solid #ddd; border-radius: 6px; text-align: center; }
.center-label { flex: 1 1 auto; text-align: center; color: #333; font-size: 13px; }
.op { color: #999; }
.unit { color: #666; font-size: 12px; margin-left: auto; }
.units-tip { color: #999; font-size: 12px; margin-top: 6px; }

.checkbox { display: flex; align-items: center; gap: 8px; margin: 6px 0; font-size: 14px; color: #333; }

.time-range { display: flex; align-items: center; gap: 8px; flex: 1; }
.date-input { flex: 1; padding: 6px 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; min-width: 0; }
.year-input { width: 190px; padding: 6px 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; text-align: center; }
.separator { color: #666; font-size: 13px; }

.upload-area {
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: #fafafa;
}
.upload-area:hover, .upload-area.dragging {
  border-color: #1677ff;
  background: rgba(22, 119, 255, 0.04);
}
.hidden-input { display: none; }
.upload-content { color: #666; font-size: 13px; }
.file-name { color: #333; font-weight: 500; }
.upload-hint { font-size: 12px; color: #999; margin-top: 6px; }
</style>
