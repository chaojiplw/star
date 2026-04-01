<template>
  <div class="run-config-panel">
    <div class="panel-header">
      <div class="title">模型运行</div>
      <button class="close-btn" type="button" @click="$emit('close')">×</button>
    </div>

    <div class="panel-content">
      <!-- 1) 运行控制 -->
      <div class="section">
        <div class="section-title">运行控制</div>
        <div class="kv-row single">
          <div class="kv"><span class="k">模型</span><span class="v">{{ algorithmDisplay }}算法模型</span></div>
        </div>
      </div>

      <!-- 2) 参数说明（算法 + 约束概览并排） -->
      <div class="section">
        <div class="section-title">参数说明</div>
        <ul class="desc-list">
          <li>种群大小：{{ config?.algorithmParams?.population ?? '-' }}</li>
          <li>迭代次数：{{ config?.algorithmParams?.iterations ?? '-' }}</li>
          <li v-if="config?.algorithm === 'pso'">提示：PSO 常用 w/c1/c2 = 0.4–0.9 / 1.2–2.0</li>
          <li v-else-if="config?.algorithm === 'paem'">提示：PAEM 建议适度放宽精度以提速</li>
          <li v-else>提示：NSGA-II 兼顾收敛与多样性，建议 population 100+</li>
        </ul>

        <div class="accordion">
          <div class="accordion-title">约束概览</div>
          <div v-for="name in reservoirNames" :key="name" class="acc-item">
            <div class="acc-header" @click="toggleReservoir(name)">
              <span class="acc-name">{{ name }}</span>
              <span class="acc-icon" :class="{ open: isExpanded(name) }">▾</span>
            </div>
            <div class="acc-body" v-show="isExpanded(name)">
              <div class="summary-grid">
                <div class="item" v-if="summary(name).storage"><span class="label">库容</span><span class="value">{{ summary(name).storage }}</span></div>
                <div class="item" v-if="summary(name).power"><span class="label">出力</span><span class="value">{{ summary(name).power }}</span></div>
                <div class="item" v-if="summary(name).outflow"><span class="label">下泄流量</span><span class="value">{{ summary(name).outflow }}</span></div>
                <div class="item" v-if="summary(name).iceControl"><span class="label">防凌流量</span><span class="value">{{ summary(name).iceControl }}</span></div>
                <div class="item" v-if="summary(name).ecological"><span class="label">生态流量</span><span class="value">{{ summary(name).ecological }}</span></div>
                <div class="item" v-if="summary(name).sediment"><span class="label">调沙</span><span class="value">{{ summary(name).sediment }}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3) 情景设置 -->
      <div class="section">
        <div class="section-title with-actions">
          <span>情景设置</span>
          <div class="actions">
            <button class="btn small" @click="openNewScenario">添加情景</button>
            <button class="btn small" @click="showScenarioTable = !showScenarioTable">{{ showScenarioTable ? '隐藏表格' : '显示表格' }}</button>
            <button class="btn small danger" @click="clearScenarios" :disabled="scenarios.length === 0">清空</button>
          </div>
        </div>

        <!-- 情景表格 -->
        <div v-if="showScenarioTable" class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>情景名称</th>
                <th>调水类型</th>
                <th>调水流量</th>
                <th>评价模型</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(s, idx) in scenarios" :key="idx">
                <td>{{ s.name }}</td>
                <td>
                  <div class="multi-value">
                    <span v-for="t in s.waterTypes" :key="t" class="tag">{{ t }}</span>
                  </div>
                </td>
                <td>
                  <div class="multi-value">
                    <span v-for="r in s.flowRates" :key="r" class="tag">{{ r }}</span>
                  </div>
                </td>
                <td>
                  <div class="multi-value">
                    <span v-for="m in s.evaluationModels" :key="m" class="tag">{{ m }}</span>
                  </div>
                </td>
                <td>
                  <button class="btn tiny" @click="editScenario(idx)">修改</button>
                  <button class="btn tiny danger" @click="deleteScenario(idx)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="scenarios.length === 0" class="empty">暂无情景，请点击“添加情景”</div>
        </div>

        <!-- 添加/编辑情景弹层 -->
        <div v-if="showModal" class="modal-overlay" @click="closeModal">
          <div class="modal" @click.stop>
            <div class="modal-header">
              <div class="modal-title">{{ editingIndex >= 0 ? '编辑情景' : '新建情景' }}</div>
              <button class="close-btn" @click="closeModal">×</button>
            </div>
            <div class="modal-body">
              <div class="form-row">
                <label>情景名称</label>
                <input class="input" v-model="currentScenario.name" placeholder="请输入情景名称" />
              </div>

              <div class="form-row">
                <label>调水类型</label>
                <div class="checkboxes">
                  <label v-for="t in waterTypeOptions" :key="t" class="check-item">
                    <input type="checkbox" :value="t" v-model="currentScenario.waterTypes" />
                    <span>{{ t }}</span>
                  </label>
                </div>
              </div>

              <div class="form-row">
                <label>调水流量</label>
                <div class="checkboxes">
                  <label v-for="r in flowRateOptions" :key="r" class="check-item">
                    <input type="checkbox" :value="r" v-model="currentScenario.flowRates" />
                    <span>{{ r }}</span>
                  </label>
                </div>
              </div>

              <div class="form-row">
                <label>评价模型</label>
                <div class="checkboxes">
                  <label v-for="m in evaluationModelOptions" :key="m" class="check-item">
                    <input type="checkbox" :value="m" v-model="currentScenario.evaluationModels" />
                    <span>{{ m }}</span>
                  </label>
                </div>
              </div>

              <div v-if="validationMessage" class="validation">{{ validationMessage }}</div>
            </div>
            <div class="modal-footer">
              <button class="btn" @click="closeModal">取消</button>
              <button class="btn primary" @click="saveScenario">保存</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部运行按钮 -->
    <div class="footer">
      <button class="lg-btn" @click="onRunControl">运行模型</button>
      <button class="lg-btn primary" :disabled="scenarios.length === 0" @click="onRunScenarios">运行情景</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface AlgoParams { population?: number; iterations?: number }
interface ModelConfig {
  model?: string
  algorithm?: string
  algorithmParams?: AlgoParams
}

const props = defineProps<{ config?: ModelConfig & { selectedReservoir?: string; userRanges?: any; constraints?: Record<string, any> } }>()

const algorithmDisplay = computed(() => {
  const alg = props.config?.algorithm || 'pso'
  return alg === 'nsga2' ? 'NSGA-II'
       : alg === 'paem' ? 'PAEM'
       : 'PSO'
})

const reservoirDisplay = computed(() => props.config?.selectedReservoir || '—')
const userRanges = computed(() => props.config?.userRanges)

// 约束折叠逻辑
const constraintsMap = computed(() => props.config?.constraints || {})
const reservoirNames = computed<string[]>(() => ['龙羊峡', '刘家峡'])
const expanded = ref<Record<string, boolean>>({})
const isExpanded = (name: string) => !!expanded.value[name]
const toggleReservoir = (name: string) => { expanded.value[name] = !expanded.value[name] }

const summary = (name: string) => {
  const d = (constraintsMap.value as any)?.[name]
  if (!d) return {}
  const isSelected = name === props.config?.selectedReservoir
  const ur = isSelected ? props.config?.userRanges : null
  const storageMin = ur?.storage?.min ?? d.storageMin
  const storageMax = ur?.storage?.max ?? d.storageMax
  const powerMin = ur?.power?.min ?? Math.min(d.powerMinDry, d.powerMinWet)
  const powerMax = ur?.power?.max ?? d.powerMax
  const outflowMin = ur?.outflow?.min ?? d.outflowMin
  const outflowMax = ur?.outflow?.max ?? d.outflowMax
  const iceMin = ur?.iceControl?.min ?? d.flows?.iceControl?.[0]
  const iceMax = ur?.iceControl?.max ?? d.flows?.iceControl?.[1]
  const ecoMin = ur?.ecological?.min ?? d.flows?.ecological?.[0]
  const ecoMax = ur?.ecological?.max ?? d.flows?.ecological?.[1]
  const sed = ur?.sediment?.single ?? d.flows?.sediment
  return {
    storage: `${storageMin} – ${storageMax} 亿m³`,
    power: `${powerMin} – ${powerMax} 万kW`,
    outflow: `${outflowMin} – ${outflowMax} m³/s`,
    iceControl: (iceMin != null && iceMax != null) ? `${iceMin} – ${iceMax} m³/s` : undefined,
    ecological: (ecoMin != null && ecoMax != null) ? `${ecoMin} – ${ecoMax} m³/s` : undefined,
    sediment: (sed != null) ? `≥ ${sed} m³/s` : undefined
  }
}

// 情景数据
type Scenario = { name: string; waterTypes: string[]; flowRates: string[]; evaluationModels: string[] }
const scenarios = ref<Scenario[]>([])
const showScenarioTable = ref(false)

const waterTypeOptions = ['上线调水', '下线调水']
const flowRateOptions = ['1800m³/s', '2200m³/s']
const evaluationModelOptions = ['投影寻踪', '模糊优选', '非负矩阵优先']

const showModal = ref(false)
const editingIndex = ref(-1)
const currentScenario = ref<Scenario>({ name: '', waterTypes: [], flowRates: [], evaluationModels: [] })
const validationMessage = ref('')

const openNewScenario = () => {
  editingIndex.value = -1
  currentScenario.value = { name: generateScenarioName(), waterTypes: [], flowRates: [], evaluationModels: [] }
  validationMessage.value = ''
  showModal.value = true
}

const editScenario = (idx: number) => {
  editingIndex.value = idx
  const s = scenarios.value[idx]
  currentScenario.value = { name: s.name, waterTypes: [...s.waterTypes], flowRates: [...s.flowRates], evaluationModels: [...s.evaluationModels] }
  validationMessage.value = ''
  showModal.value = true
}

const deleteScenario = (idx: number) => {
  if (confirm('确定删除该情景吗？')) scenarios.value.splice(idx, 1)
}

const closeModal = () => { showModal.value = false; editingIndex.value = -1; validationMessage.value = '' }

const validateScenario = (): boolean => {
  validationMessage.value = ''
  if (!currentScenario.value.name.trim()) { validationMessage.value = '请输入情景名称'; return false }
  if (currentScenario.value.flowRates.length === 0 || currentScenario.value.flowRates.length === 2) { validationMessage.value = '请选择一种调水流量'; return false }
  if (currentScenario.value.evaluationModels.length === 0) { validationMessage.value = '请至少选择一种评价模型'; return false }
  return true
}

const saveScenario = () => {
  if (!validateScenario()) return
  if (editingIndex.value >= 0) scenarios.value[editingIndex.value] = { ...currentScenario.value }
  else scenarios.value.push({ ...currentScenario.value })
  closeModal()
}

const clearScenarios = () => { if (confirm('确定要清空所有情景吗？')) scenarios.value = [] }

const generateScenarioName = () => {
  const nums = scenarios.value
    .map(s => s.name.match(/情景(\d+)/))
    .filter(Boolean)
    .map(m => parseInt((m as RegExpMatchArray)[1]))
  let n = 1
  while (nums.includes(n)) n++
  return `情景${n}`
}

// 事件抛出，交由父组件联动运行监控
// 运行时声明 emits，避免 Vue 提示未声明的事件
const emit = defineEmits(['run-model', 'run-scenarios'])

// 按钮行为（留空给父组件接入后端/控制流程）
const onRunControl = () => {
  console.log('运行控制 with algorithm:', algorithmDisplay.value)
  emit('run-model')
}
const onRunScenarios = () => {
  console.log('运行情景 with scenarios:', scenarios.value)
  emit('run-scenarios', scenarios.value)
}
</script>

<style scoped lang="scss">
.run-config-panel {
  width: 560px;
  max-width: 96vw;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 80vh;
  background: rgba(255,255,255,0.96);
  border-radius: 10px;
  padding: 12px 14px 14px 14px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.15);
}
.panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.panel-content { flex: 1 1 auto; overflow-y: auto; padding-right: 2px; display: grid; gap: 10px; }
.title { font-size: 16px; font-weight: 700; color: #1f2937; letter-spacing: .2px; }
.close-btn { width: 28px; height: 28px; border: 1px solid #e5e7eb; background: #fff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); cursor: pointer; }
.close-btn:hover { background: #f9fafb; }

.section {
  background: #fff;
  border: 1px solid #edf2f7;
  border-radius: 10px;
  padding: 12px;
  margin-top: 10px;
  box-shadow: 0 2px 10px rgba(17, 24, 39, 0.04);
}
.section-title {
  position: relative;
  font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 10px;
  padding-left: 10px;
}
.section-title.with-actions { display: flex; align-items: center; justify-content: space-between; }
.section-title::before {
  content: '';
  position: absolute; left: 0; top: 50%; transform: translateY(-50%);
  width: 4px; height: 14px; border-radius: 2px; background: #1677ff;
}
.with-actions { background: #f8fafc; border: 1px solid #eef2f7; border-radius: 8px; padding: 6px 8px; }
.with-actions .actions { display: flex; gap: 6px; }

.kv-row { display: grid; grid-template-columns: 1fr; gap: 8px; }
.kv { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: #f8fafc; border: 1px solid #eef2f7; border-radius: 8px; }
.k { color: #6b7280; min-width: 40px; }
.v { color: #111827; font-weight: 600; }

.desc-list { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
.desc-list li { background: #f9fbff; border: 1px solid #e6f0ff; color: #111827; font-size: 13px; padding: 8px 10px; border-radius: 8px; }
.desc-list li.divider { background: #f3f4f6; border-color: #e5e7eb; color: #374151; font-weight: 700; }

.desc-two-col { display: grid; grid-template-columns: 1.2fr 1fr; gap: 10px; align-items: start; }
.constraint-summary { background: #f8fafc; border: 1px solid #eef2f7; border-radius: 10px; padding: 10px; }
.summary-title { font-size: 12px; color: #374151; font-weight: 700; margin-bottom: 6px; }
.summary-grid { display: grid; grid-template-columns: 1fr; gap: 6px; }
.summary-grid .item { display: flex; justify-content: space-between; gap: 8px; padding: 6px 8px; border: 1px solid #eef2f7; border-radius: 8px; background: #fff; }
.summary-grid .label { color: #6b7280; }
.summary-grid .value { color: #111827; font-weight: 600; }

/* 折叠手风琴样式 */
.accordion { margin-top: 8px; }
.accordion-title { font-size: 12px; color: #374151; font-weight: 700; margin-bottom: 6px; padding-left: 10px; position: relative; }
.accordion-title::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 3px; height: 12px; border-radius: 2px; background: #1677ff; }
.acc-item { border: 1px solid #eef2f7; border-radius: 10px; background: #fff; margin-bottom: 8px; overflow: hidden; }
.acc-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; cursor: pointer; background: #f8fafc; }
.acc-name { color: #111827; font-weight: 700; }
.acc-icon { color: #6b7280; transition: transform .15s ease; }
.acc-icon.open { transform: rotate(180deg); }
.acc-body { padding: 8px 10px; }

.btn { padding: 6px 10px; border-radius: 8px; border: 1px solid #e5e7eb; background: #fff; cursor: pointer; font-size: 12px; color: #111827; transition: all .15s ease; }
.btn:hover { background: #f3f4f6; }
.btn.small { padding: 4px 10px; }
.btn.tiny { padding: 2px 8px; font-size: 12px; margin-right: 4px; }
.btn.primary { background: #1677ff; color: #fff; border-color: #1677ff; }
.btn.primary:hover { filter: brightness(1.05); }
.btn.success { background: #10b981; color: #fff; border-color: #10b981; }
.btn.danger { background: #ef4444; color: #fff; border-color: #ef4444; }

.table-wrapper { overflow-x: auto; border: 1px solid #edf2f7; border-radius: 10px; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { border-bottom: 1px solid #f1f5f9; text-align: left; padding: 10px; font-size: 12px; color: #111827; }
.table thead th { background: #f8fafc; color: #374151; font-weight: 700; }
.table tbody tr:nth-child(odd) { background: #fcfdff; }
.multi-value { display: flex; gap: 6px; flex-wrap: wrap; }
.tag { background: #f0f5ff; color: #1d4ed8; padding: 2px 8px; border-radius: 999px; border: 1px solid #dbe7ff; font-size: 12px; font-weight: 600; }
.empty { text-align: center; color: #9ca3af; padding: 10px; }

.modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #fff; border-radius: 14px; width: 90%; max-width: 520px; box-shadow: 0 20px 50px rgba(2, 6, 23, 0.18); overflow: hidden; border: 1px solid #e5e7eb; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid #eef2f7; }
.modal-title { color: #1677ff; font-weight: 800; letter-spacing: .2px; }
.modal-body { padding: 12px 14px; }
.form-row { margin-bottom: 12px; }
.form-row label { display: block; margin-bottom: 6px; color: #374151; font-weight: 600; }
.input { width: 100%; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; }
.checkboxes { display: flex; gap: 10px; flex-wrap: wrap; }
.check-item { display: flex; align-items: center; gap: 6px; padding: 6px 10px; border: 1px solid #eef2f7; border-radius: 8px; background: #fff; }
.check-item:hover { background: #f8fafc; }
.validation { background: #fff1f0; border: 1px solid #ff4d4f; color: #b91c1c; padding: 8px; border-radius: 8px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 14px; border-top: 1px solid #eef2f7; }

.footer { display: flex; gap: 8px; justify-content: space-between; margin-top: 12px; }
.lg-btn { flex: 1 1 0; padding: 10px 12px; border-radius: 10px; border: 1px solid #e5e7eb; background: #fff; color: #111827; cursor: pointer; font-weight: 700; }
.lg-btn.primary { background: #1677ff; color: #fff; border-color: #1677ff; }
.lg-btn:disabled { opacity: .6; cursor: not-allowed; }
</style>


