<template>
  <div class="algorithm-config-panel">
    <div class="config-container">
      <div class="up">
        <!-- 模型类型选择 -->
        <div class="config-section">
          <h4 class="section-title" @click="toggle('model')">
            <span class="title-icon">🎯</span>
            模型类型
            <span class="algorithm-badge">{{ getModelTypeDisplay() }}</span>
            <span class="chevron" :class="{ open: openSection === 'model' }">▾</span>
          </h4>
          <div class="config-content" v-show="openSection === 'model'">
            <select 
              class="config-select" 
              v-model="selectedModel"
              @change="onModelChange"
            >
              <option value="traditional">传统多目标模型</option>
              <option value="collaborative-stress">多目标协同胁迫控制模型</option>
              <option value="pareto">帕累托多目标模型</option>
            </select>
          </div>
        </div>

        <!-- 算法选择 -->
        <div class="config-section">
          <h4 class="section-title" @click="toggle('algorithm')">
            <span class="title-icon">⚙️</span>
            优化算法
            <span class="algorithm-badge">{{ selectedAlgorithm.toUpperCase() }}</span>
            <span class="chevron" :class="{ open: openSection === 'algorithm' }">▾</span>
          </h4>
          <div class="config-content" v-show="openSection === 'algorithm'">
            <select 
              class="config-select" 
              v-model="selectedAlgorithm"
              @change="onAlgorithmChange"
            >
              <option value="pso">粒子群算法 (PSO)</option>
              <option value="nsga2">NSGA-II算法</option>
              <option value="moea">多目标进化算法</option>
              <option value="paem">PAEM算法</option>
            </select>
          </div>
        </div>
      </div>

      <div class='center'>
        <!-- 约束选择 -->
        <div class="config-section">
          <h4 class="section-title" @click="toggle('constraints')">
            <span class="title-icon">🔒</span>
            约束条件
            <span class="count-badge">{{ selectedConstraintsCount }}/8</span>
            <span class="chevron" :class="{ open: openSection === 'constraints' }">▾</span>
          </h4>
          <div class="config-content" v-show="openSection === 'constraints'">
            <div class="constraint-group">
              <div class="constraint-category">
                <h5>水量平衡约束</h5>
                <label class="constraint-item">
                  <input type="checkbox" v-model="constraints.waterBalance" />
                  <span>水量平衡</span>
                </label>
              </div>
              <div class="constraint-category">
                <h5>水库运行约束</h5>
                <label class="constraint-item">
                  <input type="checkbox" v-model="constraints.waterLevel" />
                  <span>水位约束</span>
                </label>
                <label class="constraint-item">
                  <input type="checkbox" v-model="constraints.capacity" />
                  <span>库容约束</span>
                </label>
                <label class="constraint-item">
                  <input type="checkbox" v-model="constraints.flowRate" />
                  <span>出库流量约束</span>
                </label>
              </div>
              <div class="constraint-category">
                <h5>发电约束</h5>
                <label class="constraint-item">
                  <input type="checkbox" v-model="constraints.power" />
                  <span>发电出力约束</span>
                </label>
                <label class="constraint-item">
                  <input type="checkbox" v-model="constraints.guaranteedOutput" />
                  <span>保证出力约束</span>
                </label>
              </div>
              <div class="constraint-category">
                <h5>其他约束</h5>
                <label class="constraint-item">
                  <input type="checkbox" v-model="constraints.iceControl" />
                  <span>防凌约束</span>
                </label>
                <label class="constraint-item">
                  <input type="checkbox" v-model="constraints.nonNegativity" />
                  <span>非负性约束</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- 目标选择 -->
        <div class="config-section">
          <h4 class="section-title" @click="toggle('objectives')">
            <span class="title-icon">🎯</span>
            目标函数
            <span class="count-badge">{{ selectedObjectivesCount }}/4</span>
            <span class="chevron" :class="{ open: openSection === 'objectives' }">▾</span>
          </h4>
          <div class="config-content" v-show="openSection === 'objectives'">
            <div class="objective-group">
              <div class="objective-item-enhanced">
                <label class="objective-item">
                  <input type="checkbox" v-model="objectives.waterSupply" />
                  <span>供水目标 (H_water)</span>
                  <div class="sub-objectives">
                    <small>工业生活用水保证率 + 农业供水保证率</small>
                  </div>
                </label>
                <div class="objective-details" v-if="objectives.waterSupply">
                  <div class="weight-control">
                    <label>权重:</label>
                    <div class="number-input-group">
                      <input 
                        type="number" 
                        v-model="objectiveWeights.water" 
                        min="0" 
                        max="1" 
                        step="0.1"
                        class="weight-input"
                        :readonly="weightAdjustMode === 'template'"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="objective-item-enhanced">
                <label class="objective-item">
                  <input type="checkbox" v-model="objectives.powerGeneration" />
                  <span>发电目标 (H_ele)</span>
                  <div class="sub-objectives">
                    <small>防凌期发电保证率 + 非防凌期发电保证率</small>
                  </div>
                </label>
                <div class="objective-details" v-if="objectives.powerGeneration">
                  <div class="weight-control">
                    <label>权重:</label>
                    <div class="number-input-group">
                      <input 
                        type="number" 
                        v-model="objectiveWeights.power" 
                        min="0" 
                        max="1" 
                        step="0.1"
                        class="weight-input"
                        :readonly="weightAdjustMode === 'template'"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="objective-item-enhanced">
                <label class="objective-item">
                  <input type="checkbox" v-model="objectives.sedimentTransport" />
                  <span>输沙目标 (H_sed)</span>
                  <div class="sub-objectives">
                    <small>调沙年份频率 + 调沙流量控制</small>
                  </div>
                </label>
                <div class="objective-details" v-if="objectives.sedimentTransport">
                  <div class="weight-control">
                    <label>权重:</label>
                    <div class="number-input-group">
                      <input 
                        type="number" 
                        v-model="objectiveWeights.sediment" 
                        min="0" 
                        max="1" 
                        step="0.1"
                        class="weight-input"
                        :readonly="weightAdjustMode === 'template'"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="objective-item-enhanced">
                <label class="objective-item">
                  <input type="checkbox" v-model="objectives.ecological" />
                  <span>生态目标 (H_eco)</span>
                  <div class="sub-objectives">
                    <small>生态供水保证率 + 生态脉冲频次</small>
                  </div>
                </label>
                <div class="objective-details" v-if="objectives.ecological">
                  <div class="weight-control">
                    <label>权重:</label>
                    <div class="number-input-group">
                      <input 
                        type="number" 
                        v-model="objectiveWeights.ecological" 
                        min="0" 
                        max="1" 
                        step="0.1"
                        class="weight-input"
                        :readonly="weightAdjustMode === 'template'"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 综合目标函数显示 -->
            <div class="comprehensive-objective" v-if="selectedModel === 'collaborative-stress'">
              <h5>综合目标函数</h5>
              <div class="formula">
                H_tiji = {{ objectiveWeights.water }}×H_water + {{ objectiveWeights.power }}×H_ele + {{ objectiveWeights.sediment }}×H_sed + {{ objectiveWeights.ecological }}×H_eco
              </div>
              
              <!-- 权重配置选项 -->
              <div class="weight-config-section">
                <div class="weight-mode-selector">
                  <label>权重调整模式:</label>
                  <select v-model="weightAdjustMode" class="mode-select">
                    <option value="template">模板选择</option>
                    <option value="manual">手动调整</option>
                  </select>
                </div>
                
                <!-- 模板选择器 -->
                <div v-if="weightAdjustMode === 'template'" class="template-selector">
                  <div class="template-buttons">
                    <button 
                      v-for="(template, name) in weightTemplates" 
                      :key="name"
                      @click="applyWeightTemplate(name)"
                      :class="['template-btn', { active: currentTemplate === name }]"
                    >
                      {{ getTemplateDisplayName(name) }}
                    </button>
                  </div>
                </div>
                
                <!-- 当前模板显示 -->
                <div class="current-template">
                  <span class="template-indicator">
                    当前配置: {{ currentTemplate === 'custom' ? '自定义' : getTemplateDisplayName(currentTemplate) }}
                  </span>
                  <span class="weight-sum-indicator" :class="{ 'sum-error': Math.abs(weightSum - 1) > 0.01 }">
                    权重总和: {{ weightSum.toFixed(3) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="center_section">
          <!-- 胁迫控制参数 -->
          <div class="config-section">
            <h3 class="section-title" @click="toggle('stress')">
              <i class="fas fa-balance-scale"></i>
              胁迫控制参数
              <span class="chevron" :class="{ open: openSection === 'stress' }">▾</span>
            </h3>
            
            <div v-show="openSection === 'stress'">
              <div v-if="selectedModel === 'collaborative-stress'">
                <div class="stress-param-control">
                  <label>胁迫度阈值:</label>
                  <div class="number-input-group param-input-group">
                    <button class="control-btn" @click="adjustStressParam('threshold', -0.05)">-</button>
                    <input 
                      type="number" 
                      v-model.number="stressParams.threshold" 
                      step="0.01" 
                      min="0" 
                      max="1"
                      @input="stressParams.threshold = Math.max(0, Math.min(1, parseFloat(($event.target as HTMLInputElement).value)))"
                    >
                    <button class="control-btn" @click="adjustStressParam('threshold', 0.05)">+</button>
                  </div>
                </div>
                
                <div class="stress-param-control">
                  <label>协作权重:</label>
                  <div class="number-input-group param-input-group">
                    <button class="control-btn" @click="adjustStressParam('cooperationWeight', -0.05)">-</button>
                    <input 
                      type="number" 
                      v-model.number="stressParams.cooperationWeight" 
                      step="0.01" 
                      min="0" 
                      max="1"
                      @input="stressParams.cooperationWeight = Math.max(0, Math.min(1, parseFloat(($event.target as HTMLInputElement).value)))"
                    >
                    <button class="control-btn" @click="adjustStressParam('cooperationWeight', 0.05)">+</button>
                  </div>
                </div>
                
                <div class="stress-param-control">
                  <label>满意度计算方法:</label>
                  <div class="param-input-group">
                    <select v-model="stressParams.satisfactionMethod" class="form-select">
                      <option value="linear">线性函数</option>
                      <option value="exponential">指数函数</option>
                      <option value="sigmoid">S型函数</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 性能阈值设置 -->
          <div class="config-section">
            <h3 class="section-title" @click="toggle('thresholds')">
              <i class="fas fa-chart-line"></i>
              性能阈值设置
              <span class="chevron" :class="{ open: openSection === 'thresholds' }">▾</span>
            </h3>
            
            <div v-show="openSection === 'thresholds'">
            <div class="threshold-control">
              <label>工业供水保证率:</label>
              <div class="number-input-group param-input-group">
                <button class="control-btn" @click="adjustThreshold('industrialWaterRate', -0.01)">-</button>
                <input 
                  type="number" 
                  v-model.number="thresholds.industrialWaterRate" 
                  step="0.01" 
                  min="0" 
                  max="1"
                  @input="thresholds.industrialWaterRate = Math.max(0, Math.min(1, parseFloat(($event.target as HTMLInputElement).value)))"
                >
                <button class="control-btn" @click="adjustThreshold('industrialWaterRate', 0.01)">+</button>
              </div>
            </div>
            
            <div class="threshold-control">
              <label>农业供水保证率:</label>
              <div class="number-input-group param-input-group">
                <button class="control-btn" @click="adjustThreshold('agriculturalWaterRate', -0.01)">-</button>
                <input 
                  type="number" 
                  v-model.number="thresholds.agriculturalWaterRate" 
                  step="0.01" 
                  min="0" 
                  max="1"
                  @input="thresholds.agriculturalWaterRate = Math.max(0, Math.min(1, parseFloat(($event.target as HTMLInputElement).value)))"
                >
                <button class="control-btn" @click="adjustThreshold('agriculturalWaterRate', 0.01)">+</button>
              </div>
            </div>
            
            <div class="threshold-control">
              <label>凌期发电保证率:</label>
              <div class="number-input-group param-input-group">
                <button class="control-btn" @click="adjustThreshold('icePeriodPowerRate', -0.01)">-</button>
                <input 
                  type="number" 
                  v-model.number="thresholds.icePeriodPowerRate" 
                  step="0.01" 
                  min="0" 
                  max="1"
                  @input="thresholds.icePeriodPowerRate = Math.max(0, Math.min(1, parseFloat(($event.target as HTMLInputElement).value)))"
                >
                <button class="control-btn" @click="adjustThreshold('icePeriodPowerRate', 0.01)">+</button>
              </div>
            </div>
            
            <div class="threshold-control">
              <label>非凌期发电保证率:</label>
              <div class="number-input-group param-input-group">
                <button class="control-btn" @click="adjustThreshold('nonIcePeriodPowerRate', -0.01)">-</button>
                <input 
                  type="number" 
                  v-model.number="thresholds.nonIcePeriodPowerRate" 
                  step="0.01" 
                  min="0" 
                  max="1"
                  @input="thresholds.nonIcePeriodPowerRate = Math.max(0, Math.min(1, parseFloat(($event.target as HTMLInputElement).value)))"
                >
                <button class="control-btn" @click="adjustThreshold('nonIcePeriodPowerRate', 0.01)">+</button>
              </div>
            </div>
            
            <div class="threshold-control">
              <label>生态流量 (m³/s):</label>
              <div class="number-input-group param-input-group">
                <button class="control-btn" @click="adjustThreshold('ecologicalFlow', -10)">-</button>
                <input 
                  type="number" 
                  v-model.number="thresholds.ecologicalFlow" 
                  step="10" 
                  min="0"
                  @input="thresholds.ecologicalFlow = Math.max(0, parseFloat(($event.target as HTMLInputElement).value))"
                >
                <button class="control-btn" @click="adjustThreshold('ecologicalFlow', 10)">+</button>
              </div>
            </div>
            
            <div class="threshold-control">
              <label>输沙流量 (m³/s):</label>
              <div class="number-input-group param-input-group">
                <button class="control-btn" @click="adjustThreshold('sedimentFlow', -50)">-</button>
                <input 
                  type="number" 
                  v-model.number="thresholds.sedimentFlow" 
                  step="50" 
                  min="0"
                  @input="thresholds.sedimentFlow = Math.max(0, parseFloat(($event.target as HTMLInputElement).value))"
                >
                <button class="control-btn" @click="adjustThreshold('sedimentFlow', 50)">+</button>
              </div>
            </div>
            
            <div class="threshold-control">
              <label>防凌控制流量 (m³/s):</label>
              <div class="number-input-group param-input-group">
                <button class="control-btn" @click="adjustThreshold('iceControlFlow', -50)">-</button>
                <input 
                  type="number" 
                  v-model.number="thresholds.iceControlFlow" 
                  step="50" 
                  min="0"
                  @input="thresholds.iceControlFlow = Math.max(0, parseFloat(($event.target as HTMLInputElement).value))"
                >
                <button class="control-btn" @click="adjustThreshold('iceControlFlow', 50)">+</button>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'

// 模型类型选择
const selectedModel = ref<'traditional' | 'collaborative-stress' | 'pareto'>('collaborative-stress')
const selectedAlgorithm = ref<'pso' | 'nsga2' | 'moea' | 'paem'>('pso')

// 约束选择
const constraints = reactive({
  waterBalance: true,
  waterLevel: true,
  capacity: true,
  flowRate: true,
  power: true,
  guaranteedOutput: true,
  iceControl: false,
  nonNegativity: true
})

// 目标选择
const objectives = reactive({
  waterSupply: true,
  powerGeneration: true,
  sedimentTransport: true,
  ecological: true
})

// 目标权重
const objectiveWeights = reactive({
  water: 0.3,
  power: 0.3,
  sediment: 0.2,
  ecological: 0.2
})

// 胁迫控制参数
const stressParams = reactive({
  threshold: 0.6,
  cooperationWeight: 0.5,
  satisfactionMethod: 'sigmoid'
})

// 阈值设置
const thresholds = reactive({
  industrialWaterRate: 0.95,
  agriculturalWaterRate: 0.85,
  icePeriodPowerRate: 0.90,
  nonIcePeriodPowerRate: 0.95,
  ecologicalFlow: 300,
  sedimentFlow: 2000,
  iceControlFlow: 1000
})

// 权重模板
const weightTemplates = reactive<Record<string, { water: number; power: number; sediment: number; ecological: number }>>({
  balanced: { water: 0.25, power: 0.25, sediment: 0.25, ecological: 0.25 },
  waterFirst: { water: 0.4, power: 0.3, sediment: 0.2, ecological: 0.1 },
  powerFirst: { water: 0.3, power: 0.4, sediment: 0.2, ecological: 0.1 },
  ecological: { water: 0.2, power: 0.2, sediment: 0.2, ecological: 0.4 },
  sedimentFirst: { water: 0.2, power: 0.2, sediment: 0.4, ecological: 0.2 },
  traditional: { water: 0.35, power: 0.35, sediment: 0.15, ecological: 0.15 }
})

// 权重调整模式
const weightAdjustMode = ref<'template' | 'manual'>('template')

// 计算属性
const selectedConstraintsCount = computed(() => Object.values(constraints).filter(Boolean).length)
const selectedObjectivesCount = computed(() => Object.values(objectives).filter(Boolean).length)

const configCompleteness = computed(() => {
  let total = 0
  let completed = 0
  total += 10; if (selectedModel.value) completed += 10
  total += 10; if (selectedAlgorithm.value) completed += 10
  total += 20; if (selectedConstraintsCount.value >= 3) completed += 20
  total += 30; if (selectedObjectivesCount.value >= 2) completed += 30
  total += 20
  if (selectedModel.value === 'collaborative-stress') {
    const weightSumVal = Object.values(objectiveWeights).reduce((sum, w) => sum + Number(w), 0)
    if (Math.abs(weightSumVal - 1.0) < 0.01) completed += 20
  } else {
    completed += 20
  }
  total += 10; if (Object.values(thresholds).every(val => Number(val) > 0)) completed += 10
  return Math.round((completed / total) * 100)
})

const constraintStatus = computed(() => {
  const required = ['waterBalance', 'waterLevel', 'capacity', 'flowRate'] as const
  return required.every(key => (constraints as any)[key])
})

const weightSum = computed(() => Object.values(objectiveWeights).reduce((sum, w) => sum + Number(w), 0))

const getCurrentConfig = () => ({
  modelType: selectedModel.value,
  algorithm: selectedAlgorithm.value,
  constraints: { ...constraints },
  objectives: { ...objectives },
  objectiveWeights: { ...objectiveWeights },
  stressParams: { ...stressParams },
  thresholds: { ...thresholds },
  status: {
    completeness: configCompleteness.value,
    constraintStatus: constraintStatus.value,
    weightSumStatus: selectedModel.value === 'collaborative-stress' && Math.abs(weightSum.value - 1) < 0.01
  }
})

const getModelTypeDisplay = () => {
  const modelTypes: Record<string, string> = {
    'traditional': '传统多目标',
    'collaborative-stress': '协同胁迫控制',
    'pareto': '帕累托多目标'
  }
  return modelTypes[selectedModel.value] || '未知'
}

const onModelChange = () => {
  if (selectedModel.value === 'collaborative-stress') {
    Object.keys(objectives).forEach(key => { (objectives as any)[key] = true })
    normalizeWeights()
  } else if (selectedModel.value === 'pareto') {
    Object.keys(objectiveWeights).forEach(key => { (objectiveWeights as any)[key] = 0.25 })
  }
}

const onAlgorithmChange = () => {
  if (selectedAlgorithm.value === 'nsga2') {
    if (selectedObjectivesCount.value < 2) {
      objectives.waterSupply = true
      objectives.powerGeneration = true
    }
  }
}

const normalizeWeights = () => {
  const activeObjectives = Object.keys(objectives).filter(key => (objectives as any)[key])
  const totalWeight = activeObjectives.reduce((sum, key) => {
    const weightKey = key === 'waterSupply' ? 'water' : key === 'powerGeneration' ? 'power' : key === 'sedimentTransport' ? 'sediment' : 'ecological'
    return sum + Number((objectiveWeights as any)[weightKey])
  }, 0)
  if (totalWeight > 0 && activeObjectives.length > 0) {
    activeObjectives.forEach(key => {
      const weightKey = key === 'waterSupply' ? 'water' : key === 'powerGeneration' ? 'power' : key === 'sedimentTransport' ? 'sediment' : 'ecological'
      ;(objectiveWeights as any)[weightKey] = Number((objectiveWeights as any)[weightKey]) / totalWeight
    })
  }
}

const adjustStressParam = (paramKey: 'threshold' | 'cooperationWeight', delta: number) => {
  const currentValue = Number((stressParams as any)[paramKey])
  const newValue = Math.max(0, Math.min(1, currentValue + delta))
  ;(stressParams as any)[paramKey] = Math.round(newValue * 100) / 100
}

const adjustThreshold = (thresholdKey: keyof typeof thresholds, delta: number) => {
  const currentValue = Number((thresholds as any)[thresholdKey])
  let newValue = currentValue + delta
  if ((thresholdKey as string).includes('Rate')) {
    newValue = Math.max(0, Math.min(1, newValue))
    ;(thresholds as any)[thresholdKey] = Math.round(newValue * 100) / 100
  } else {
    newValue = Math.max(0, newValue)
    ;(thresholds as any)[thresholdKey] = Math.round(newValue)
  }
}

const applyWeightTemplate = (templateName: string) => {
  const template = weightTemplates[templateName]
  if (template) {
    const activeObjectives = Object.keys(objectives).filter(key => (objectives as any)[key])
    const activeWeightKeys = activeObjectives.map(key => key === 'waterSupply' ? 'water' : key === 'powerGeneration' ? 'power' : key === 'sedimentTransport' ? 'sediment' : 'ecological')
    const activeWeightSum = activeWeightKeys.reduce((sum, key) => sum + (template as any)[key], 0)
    activeWeightKeys.forEach(key => { (objectiveWeights as any)[key] = (template as any)[key] / activeWeightSum })
    Object.keys(objectiveWeights).forEach(key => { if (!activeWeightKeys.includes(key)) (objectiveWeights as any)[key] = 0 })
  }
}

const getTemplateDisplayName = (templateName: string) => {
  const names: Record<string, string> = {
    balanced: '均衡模式',
    waterFirst: '供水优先',
    powerFirst: '发电优先',
    ecological: '生态优先',
    sedimentFirst: '输沙优先',
    traditional: '传统模式'
  }
  return names[templateName] || templateName
}

const getCurrentTemplate = () => {
  const threshold = 0.05
  for (const [templateName, template] of Object.entries(weightTemplates)) {
    const matches = Object.keys(template).every(key => Math.abs(Number((objectiveWeights as any)[key]) - (template as any)[key]) < threshold)
    if (matches) return templateName
  }
  return 'custom'
}

const currentTemplate = computed(() => getCurrentTemplate())

// 监听器（轻日志）
watch(objectives, () => { if (selectedModel.value === 'collaborative-stress') normalizeWeights() }, { deep: true })

// 折叠/展开
type Section = 'model' | 'algorithm' | 'constraints' | 'objectives' | 'stress' | 'thresholds'
const openSection = ref<Section | null>(null)
function toggle(section: Section) {
  openSection.value = openSection.value === section ? null : section
}

// 暴露方法
defineExpose({
  getCurrentConfig,
  normalizeWeights
})
</script>

<style scoped lang="scss">
.algorithm-config-panel { width: 420px; max-height: 70vh; overflow-y: auto; overflow-x: hidden; background: rgba(255,255,255,0.95); border-radius: 10px; padding: 16px; box-shadow: 0 6px 20px rgba(0,0,0,0.2); scrollbar-width: thin; scrollbar-gutter: stable both-edges; }
.config-container { display: grid; grid-template-columns: 1fr; gap: 12px; width: 100%; }
.up { display: grid; grid-template-columns: 1fr; gap: 12px; }
.center { display: grid; grid-template-columns: 1fr; gap: 12px; }
.center_section { display: grid; gap: 12px; }

.config-section { background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 12px; width: 100%; box-sizing: border-box; overflow-x: hidden; }
.section-title { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; color: #333; font-size: 16px; font-weight: 600; padding-bottom: 8px; border-bottom: 1px solid #eee; cursor: pointer; }
.section-title .chevron { margin-left: auto; transition: transform 0.2s ease; color: #999; }
.section-title .chevron.open { transform: rotate(180deg); }
.title-icon { font-size: 18px; }
.config-content { display: flex; flex-direction: column; gap: 10px; width: 100%; box-sizing: border-box; }

.algorithm-badge, .count-badge { background: rgba(22,119,255,0.08); color: #1677ff; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-left: auto; border: 1px solid rgba(22,119,255,0.25); }

.config-select, .param-select, .form-select, .mode-select { background: #fff; border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; color: #333; font-size: 14px; transition: all 0.2s ease; cursor: pointer; width: 100%; box-sizing: border-box; }
.config-select:focus, .param-select:focus, .form-select:focus, .mode-select:focus { outline: none; border-color: #1677ff; box-shadow: 0 0 0 2px rgba(22,119,255,0.2); }

.constraint-group, .objective-group { display: flex; flex-direction: column; gap: 12px; }
.constraint-category { background: #fff; border-radius: 8px; padding: 10px; border: 1px solid #eee; }
.constraint-category h5 { color: #666; font-size: 13px; font-weight: 600; margin: 0 0 8px 0; }
.constraint-item, .objective-item { display: flex; align-items: center; gap: 8px; padding: 2px 0; cursor: pointer; transition: color 0.2s ease; }
.constraint-item:hover, .objective-item:hover { color: #1677ff; }
.constraint-item input[type="checkbox"], .objective-item input[type="checkbox"] { width: 16px; height: 16px; accent-color: #1677ff; cursor: pointer; }
.constraint-item span, .objective-item span { color: #333; font-size: 14px; }

.objective-item-enhanced { background: #fff; border-radius: 8px; padding: 10px; border: 1px solid #eee; transition: border-color 0.2s ease; }
.objective-item-enhanced:hover { border-color: #d9d9d9; }
.objective-details { margin-top: 8px; padding-top: 8px; border-top: 1px solid #f0f0f0; }

.weight-control { display: flex; align-items: center; justify-content: space-between; background: #fff; border-radius: 8px; border: 1px solid #eee; padding: 8px 10px; }
.weight-control label { color: #333; font-size: 14px; font-weight: 500; margin-right: 12px; min-width: 80px; }

.number-input-group { display: flex; align-items: center; background: #fff; border-radius: 6px; padding: 4px; min-width: 140px; border: 1px solid #ddd; }
.number-input-group input { flex: 1; background: transparent; border: none; color: #333; text-align: center; font-size: 14px; padding: 6px 8px; min-width: 0; }
.number-input-group input:focus { outline: none; background: #fff; }
.control-btn { background: #f5f5f5; border: 1px solid #ddd; color: #333; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; transition: all 0.2s ease; margin: 0 2px; }
.control-btn:hover { background: #e6f4ff; border-color: #1677ff; color: #1677ff; }

.sub-objectives small { color: #666; font-size: 12px; }

.comprehensive-objective { background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 10px; margin-top: 10px; }
.comprehensive-objective h5 { color: #333; font-size: 14px; margin: 0 0 8px 0; }
.formula { color: #333; font-family: 'Courier New', monospace; font-size: 13px; background: #fafafa; padding: 8px; border-radius: 4px; border-left: 3px solid #1677ff; margin-bottom: 10px; }

.weight-config-section { background: #fff; border-radius: 8px; padding: 10px; border: 1px solid #eee; }
.weight-mode-selector { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.weight-mode-selector label { color: #333; font-size: 14px; font-weight: 500; min-width: 100px; }
.template-selector { margin-bottom: 10px; }
.template-buttons { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; }
.template-btn { background: #fff; border: 1px solid #ddd; border-radius: 6px; padding: 8px 12px; color: #333; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; text-align: center; }
.template-btn:hover { background: #e6f4ff; border-color: #1677ff; color: #1677ff; }
.template-btn.active { background: rgba(22,119,255,0.08); border-color: #1677ff; color: #1677ff; box-shadow: 0 0 0 2px rgba(22,119,255,0.2); }
.current-template { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 8px 10px; background: #fafafa; border-radius: 6px; border: 1px solid #eee; }
.template-indicator { color: #666; font-size: 12px; font-weight: 500; }
.weight-sum-indicator { color: #52c41a; font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 12px; background: #f6ffed; border: 1px solid #b7eb8f; }
.weight-sum-indicator.sum-error { color: #ff4d4f; background: #fff1f0; border-color: #ffa39e; }

.stress-param-control, .threshold-control { display: flex; align-items: center; justify-content: flex-start; gap: 12px; margin: 8px 0; padding: 8px 10px; background: #fff; border-radius: 8px; border: 1px solid #eee; box-sizing: border-box; width: 100%; }
.stress-param-control label, .threshold-control label { color: #333; font-size: 14px; font-weight: 500; margin-right: 12px; min-width: 140px; }
.param-input-group { flex: 1 1 auto; min-width: 0; }

@media (max-width: 768px) {
  .stress-param-control, .threshold-control { flex-direction: column; align-items: flex-start; gap: 8px; }
  .param-input-group { width: 100%; max-width: 100%; flex: 0 0 auto; }
  .up { grid-template-columns: 1fr; }
  .center { grid-template-columns: 1fr; }
  .weight-mode-selector { flex-direction: column; align-items: flex-start; gap: 6px; }
  .number-input-group { min-width: 100px; }
  .algorithm-config-panel { width: calc(100vw - 64px); }
}

/* WebKit scrollbar styling to reduce visual gutter width */
.algorithm-config-panel::-webkit-scrollbar { width: 8px; }
.algorithm-config-panel::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 6px; }
.algorithm-config-panel::-webkit-scrollbar-track { background: transparent; }
</style>


