<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Component } from 'vue'
import type { HaConfig, WidgetConfig } from '../../types'
import {
  Activity,
  Circle,
  Fan,
  Gauge,
  Lightbulb,
  Lock,
  PanelTop,
  Play,
  Plus,
  Power,
  RefreshCw,
  Thermometer,
  Trash2,
} from 'lucide-vue-next'

const props = defineProps<{ widget: WidgetConfig }>()
const emit = defineEmits<{
  (e: 'update', patch: Partial<WidgetConfig>): void
}>()

const cfg = computed(() => props.widget.ha)

/** HA 状态响应 */
interface HaState {
  entity_id: string
  state: string
  attributes?: Record<string, unknown>
}

/** HA 历史返回：二维数组，外层按实体分组 */
type HaHistory = Array<Array<{ state: string; last_changed: string }>>

const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const errorText = ref('')
const states = ref<Map<string, HaState>>(new Map())
const history = ref<Array<{ t: number; v: number }>>([])
const historyRange = ref<{ min: number; max: number } | null>(null)
const lastUpdate = ref<Date | null>(null)

let stateTimer: number | undefined
let historyTimer: number | undefined

const entityList = computed(() => cfg.value?.entities ?? [])

const chartEntityId = computed(() => cfg.value?.chartEntityId?.trim() || entityList.value[0]?.id || '')
const chartHours = computed(() => cfg.value?.chartHours ?? 24)
const refreshInterval = computed(() => (cfg.value?.refreshInterval ?? 30) * 1000)

const CHART_RANGES = [1, 6, 24, 168] as const
const RANGE_LABELS: Record<number, string> = { 1: '1h', 6: '6h', 24: '24h', 168: '7d' }

/** 实体 domain → 图标 */
const DOMAIN_ICONS: Record<string, Component> = {
  light: Lightbulb,
  switch: Power,
  climate: Thermometer,
  sensor: Gauge,
  binary_sensor: Activity,
  cover: PanelTop,
  fan: Fan,
  media_player: Play,
  lock: Lock,
}

function domainIcon(entityId: string): Component {
  return DOMAIN_ICONS[entityId.split('.')[0]] ?? Circle
}

/** 数字型实体才可绘制统计图 */
const chartable = computed(() => history.value.length > 0)

/** 连接已配置（地址 + 令牌） */
const connected = computed(() => Boolean(cfg.value?.baseUrl?.trim() && cfg.value?.token?.trim()))

function apiBase(): string {
  return (cfg.value?.baseUrl ?? '').trim().replace(/\/+$/, '')
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${cfg.value?.token ?? ''}`,
    'Content-Type': 'application/json',
  }
}

/** 拉取全部实体状态（一次全量，本地筛选，减少请求数） */
async function fetchStates() {
  if (!connected.value) return
  try {
    const res = await fetch(`${apiBase()}/api/states`, { headers: authHeaders() })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as HaState[]
    const map = new Map<string, HaState>()
    for (const s of data) map.set(s.entity_id, s)
    states.value = map
    lastUpdate.value = new Date()
    if (status.value === 'idle' || status.value === 'loading') status.value = 'ready'
    errorText.value = ''
  } catch (err) {
    const e = err as Error
    status.value = status.value === 'ready' ? 'ready' : 'error'
    errorText.value = e.message
    console.error('[HA] 状态拉取失败', e)
  }
}

/** 拉取统计图实体的历史数据 */
async function fetchHistory() {
  if (!connected.value || !chartEntityId.value) return
  const id = chartEntityId.value
  try {
    const start = new Date(Date.now() - chartHours.value * 3600 * 1000)
    const startIso = start.toISOString().replace(/\.\d{3}Z$/, 'Z')
    const url = `${apiBase()}/api/history/period/${encodeURIComponent(startIso)}?filter_entity_id=${encodeURIComponent(id)}&minimal_response&no_attributes`
    const res = await fetch(url, { headers: authHeaders() })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as HaHistory
    const rows = data[0] ?? []
    const points: Array<{ t: number; v: number }> = []
    for (const row of rows) {
      const v = Number.parseFloat(String(row.state))
      if (!Number.isFinite(v)) continue
      const t = new Date(row.last_changed).getTime()
      points.push({ t, v })
    }
    // 降采样到最多 120 个点
    const step = Math.max(1, Math.ceil(points.length / 120))
    const sampled = points.filter((_, i) => i % step === 0 || i === points.length - 1)
    history.value = sampled
    if (sampled.length > 0) {
      const vs = sampled.map((p) => p.v)
      historyRange.value = { min: Math.min(...vs), max: Math.max(...vs) }
    } else {
      historyRange.value = null
    }
  } catch (err) {
    console.error('[HA] 历史拉取失败', err)
  }
}

function startTimers() {
  stopTimers()
  stateTimer = window.setInterval(fetchStates, refreshInterval.value)
  historyTimer = window.setInterval(fetchHistory, 120000)
}

function stopTimers() {
  if (stateTimer) window.clearInterval(stateTimer)
  if (historyTimer) window.clearInterval(historyTimer)
  stateTimer = undefined
  historyTimer = undefined
}

onMounted(() => {
  if (connected.value) {
    status.value = 'loading'
    void fetchStates()
    void fetchHistory()
  }
  startTimers()
})

onBeforeUnmount(stopTimers)

watch(
  () => [cfg.value?.baseUrl, cfg.value?.token, entityList.value.map((e) => e.id).join(',')],
  () => {
    if (connected.value) {
      void fetchStates()
      void fetchHistory()
    }
    startTimers()
  },
)

watch(chartEntityId, () => void fetchHistory())
watch(chartHours, () => void fetchHistory())

/** 实体展示信息 */
function entityInfo(item: { id: string; label?: string; unit?: string }) {
  const state = states.value.get(item.id)
  const attrs = state?.attributes
  const friendlyName = typeof attrs?.friendly_name === 'string' ? attrs.friendly_name : item.id
  const unit = item.unit || (typeof attrs?.unit_of_measurement === 'string' ? attrs.unit_of_measurement : '')
  return {
    label: item.label || friendlyName,
    state: state?.state ?? '—',
    unit,
  }
}

/** 状态是否「开启型」（用于高亮颜色） */
function isActiveState(state: string): boolean {
  return ['on', 'open', 'playing', 'unlocked', 'home', 'heat', 'cool'].includes(state)
}

/** 卡片内连接配置草稿 */
const connBaseUrl = ref(cfg.value?.baseUrl ?? '')
const connToken = ref(cfg.value?.token ?? '')

function saveConnection() {
  const baseUrl = connBaseUrl.value.trim().replace(/\/+$/, '')
  const token = connToken.value.trim()
  if (!baseUrl || !token) return
  emit('update', {
    ha: { ...(cfg.value ?? { entities: [], chartHours: 24, refreshInterval: 30 }), baseUrl, token },
  })
}

/** 卡片内添加实体 */
const addingEntity = ref(false)
const newEntityId = ref('')
const newEntityLabel = ref('')
const newEntityUnit = ref('')

function addEntityInCard() {
  const id = newEntityId.value.trim()
  if (!id) return
  const cur = cfg.value as HaConfig
  const entities = [
    ...cur.entities,
    { id, label: newEntityLabel.value.trim() || undefined, unit: newEntityUnit.value.trim() || undefined },
  ]
  emit('update', { ha: { ...cur, entities, chartEntityId: cur.chartEntityId || id } })
  newEntityId.value = ''
  newEntityLabel.value = ''
  newEntityUnit.value = ''
  addingEntity.value = false
}

function removeEntityInCard(id: string) {
  const cur = cfg.value as HaConfig
  const entities = cur.entities.filter((e) => e.id !== id)
  emit('update', {
    ha: { ...cur, entities, chartEntityId: cur.chartEntityId === id ? entities[0]?.id ?? '' : cur.chartEntityId },
  })
}

/** SVG 面积图坐标（viewBox 100x36，底部留 4 给填充） */
const chartViewBox = { w: 100, h: 36 }

const areaPath = computed(() => {
  if (!chartable.value || !historyRange.value) return ''
  const { min, max } = historyRange.value
  const span = max - min || 1
  const t0 = history.value[0].t
  const t1 = history.value[history.value.length - 1].t
  const tSpan = t1 - t0 || 1
  const yTop = 2
  const yBottom = chartViewBox.h - 2
  const points = history.value.map((p) => {
    const x = ((p.t - t0) / tSpan) * chartViewBox.w
    const y = yBottom - ((p.v - min) / span) * (yBottom - yTop)
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })
  const line = points.join(' ')
  return `M${points[0]} L${line.replaceAll(' ', ' L')} L${chartViewBox.w},${yBottom} L0,${yBottom} Z`
})

const linePoints = computed(() => {
  if (!chartable.value || !historyRange.value) return ''
  const { min, max } = historyRange.value
  const span = max - min || 1
  const t0 = history.value[0].t
  const t1 = history.value[history.value.length - 1].t
  const tSpan = t1 - t0 || 1
  const yTop = 2
  const yBottom = chartViewBox.h - 2
  return history.value
    .map((p) => {
      const x = ((p.t - t0) / tSpan) * chartViewBox.w
      const y = yBottom - ((p.v - min) / span) * (yBottom - yTop)
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
})

const lastValue = computed(() => {
  const item = entityList.value.find((e) => e.id === chartEntityId.value)
  return item ? entityInfo(item) : null
})

function setChartHours(h: number) {
  emit('update', { ha: { ...(cfg.value as HaConfig), chartHours: h } })
}
</script>

<template>
  <div class="flex h-full flex-col gap-2 overflow-hidden">
    <!-- 未配置连接：卡片内直接填写地址与令牌 -->
    <div v-if="!connected" class="flex min-h-0 flex-1 flex-col justify-center gap-1.5 px-1">
      <div class="mb-1 flex items-center gap-1.5 text-[0.68em] opacity-60">
        <Gauge :size="13" class="shrink-0" />
        配置 Home Assistant 连接
      </div>
      <input
        v-model="connBaseUrl"
        type="text"
        placeholder="HA 地址，如 http://192.168.1.10:8123"
        class="h-8 w-full rounded-lg border border-white/10 bg-white/10 px-2.5 text-[0.72em] outline-none backdrop-blur-md transition-colors [color:var(--font-color)] placeholder:text-white/30 focus:border-primary/60"
      />
      <input
        v-model="connToken"
        type="password"
        placeholder="长期访问令牌"
        class="h-8 w-full rounded-lg border border-white/10 bg-white/10 px-2.5 text-[0.72em] outline-none backdrop-blur-md transition-colors [color:var(--font-color)] placeholder:text-white/30 focus:border-primary/60"
      />
      <button
        class="h-8 w-full cursor-pointer rounded-lg bg-gradient-to-br from-primary to-primary-pink text-[0.72em] text-white shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="!connBaseUrl.trim() || !connToken.trim()"
        @click="saveConnection"
      >
        连接
      </button>
      <p class="text-[0.58em] leading-relaxed opacity-40">
        令牌在 HA「个人资料」创建；需在 configuration.yaml 配置 cors_allowed_origins: ["null"] 允许本页访问
      </p>
    </div>

    <template v-else>
      <!-- 状态列表 + 卡片内添加实体 -->
      <div class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
        <div
          v-for="item in entityList"
          :key="item.id"
          class="flex shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5"
        >
          <component
            :is="domainIcon(item.id)"
            :size="13"
            class="shrink-0"
            :class="isActiveState(entityInfo(item).state) ? 'text-emerald-300' : 'opacity-55'"
          />
          <span class="min-w-0 flex-1 truncate text-[0.72em] opacity-80">{{ entityInfo(item).label }}</span>
          <span class="shrink-0 text-[0.78em] font-medium tabular-nums">{{ entityInfo(item).state }}</span>
          <span v-if="entityInfo(item).unit" class="shrink-0 text-[0.62em] opacity-50">{{ entityInfo(item).unit }}</span>
          <button
            class="shrink-0 cursor-pointer text-white/30 transition-colors hover:text-red-300"
            title="移除实体"
            @click="removeEntityInCard(item.id)"
          >
            <Trash2 :size="11" />
          </button>
        </div>

        <div v-if="entityList.length === 0" class="py-2 text-center text-[0.65em] opacity-45">
          还没有实体，点击下方「添加实体」
        </div>

        <!-- 内联添加实体表单 -->
        <div v-if="addingEntity" class="flex shrink-0 flex-col gap-1 rounded-lg border border-dashed border-white/20 bg-white/5 p-1.5">
          <input
            v-model="newEntityId"
            type="text"
            placeholder="实体 ID，如 sensor.outdoor_temp"
            class="h-7 w-full rounded-md border border-white/10 bg-white/10 px-2 text-[0.68em] outline-none [color:var(--font-color)] placeholder:text-white/30 focus:border-primary/60"
            @keydown.enter="addEntityInCard"
          />
          <div class="flex gap-1">
            <input
              v-model="newEntityLabel"
              type="text"
              placeholder="显示名（可选）"
              class="h-7 min-w-0 flex-1 rounded-md border border-white/10 bg-white/10 px-2 text-[0.68em] outline-none [color:var(--font-color)] placeholder:text-white/30 focus:border-primary/60"
              @keydown.enter="addEntityInCard"
            />
            <input
              v-model="newEntityUnit"
              type="text"
              placeholder="单位"
              class="h-7 w-14 rounded-md border border-white/10 bg-white/10 px-2 text-[0.68em] outline-none [color:var(--font-color)] placeholder:text-white/30 focus:border-primary/60"
              @keydown.enter="addEntityInCard"
            />
            <button
              class="h-7 shrink-0 cursor-pointer rounded-md bg-gradient-to-br from-primary to-primary-pink px-2 text-[0.68em] text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
              :disabled="!newEntityId.trim()"
              @click="addEntityInCard"
            >
              添加
            </button>
          </div>
        </div>
        <button
          v-else
          class="flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-lg border border-dashed border-white/20 py-1.5 text-[0.65em] text-white/55 transition-colors hover:border-white/40 hover:bg-white/10 hover:text-white"
          @click="addingEntity = true"
        >
          <Plus :size="11" />
          添加实体
        </button>
      </div>

      <!-- 统计图 -->
      <div class="flex shrink-0 flex-col gap-1.5">
        <div class="flex items-center justify-between gap-2">
          <div class="flex min-w-0 items-center gap-1.5 text-[0.65em] opacity-60">
            <Activity :size="11" class="shrink-0" />
            <span class="truncate">{{ lastValue?.label ?? chartEntityId }}</span>
            <span v-if="lastValue" class="shrink-0 tabular-nums opacity-80">
              {{ lastValue.state }}{{ lastValue.unit }}
            </span>
          </div>
          <div class="flex shrink-0 gap-0.5">
            <button
              v-for="r in CHART_RANGES"
              :key="r"
              class="cursor-pointer rounded px-1 py-0.5 text-[0.6em] transition-colors"
              :class="chartHours === r ? 'bg-white/20 text-white' : 'text-white/45 hover:bg-white/10 hover:text-white'"
              @click="setChartHours(r)"
            >
              {{ RANGE_LABELS[r] }}
            </button>
          </div>
        </div>

        <div class="relative h-full min-h-0 w-full flex-1 overflow-hidden rounded-lg border border-white/10 bg-white/5">
          <svg v-if="chartable && historyRange" :viewBox="`0 0 ${chartViewBox.w} ${chartViewBox.h}`" preserveAspectRatio="none" class="h-full w-full">
            <defs>
              <linearGradient :id="`ha-area-${widget.id}`" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="currentColor" stop-opacity="0.35" />
                <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
              </linearGradient>
            </defs>
            <path :d="areaPath" :fill="`url(#ha-area-${widget.id})`" />
            <polyline
              :points="linePoints"
              fill="none"
              stroke="currentColor"
              stroke-width="1.2"
              vector-effect="non-scaling-stroke"
              stroke-linejoin="round"
              stroke-linecap="round"
            />
          </svg>
          <div v-else class="flex h-full items-center justify-center text-[0.62em] opacity-40">
            暂无数值历史（仅数字型实体支持统计图）
          </div>
        </div>
      </div>

      <!-- 错误与刷新 -->
      <div v-if="errorText" class="flex shrink-0 items-center justify-between gap-2 text-[0.6em] text-red-300/80">
        <span class="truncate">{{ errorText }}</span>
        <button class="flex shrink-0 cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 hover:bg-white/10" @click="fetchStates(); fetchHistory()">
          <RefreshCw :size="10" />
          重试
        </button>
      </div>
      <div v-else class="flex shrink-0 items-center justify-end gap-1 text-[0.58em] opacity-35">
        <RefreshCw :size="9" class="shrink-0" />
        <span>更新于 {{ lastUpdate ? lastUpdate.toLocaleTimeString('zh-CN') : '—' }}</span>
      </div>
    </template>
  </div>
</template>
