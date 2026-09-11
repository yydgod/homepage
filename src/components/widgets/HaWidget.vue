<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Component } from 'vue'
import type { HaConfig, WidgetConfig } from '../../types'
import {
  Activity,
  ChevronDown,
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

const errorText = ref('')
const states = ref<Map<string, HaState>>(new Map())
const lastUpdate = ref<Date | null>(null)

let stateTimer: number | undefined

const entityList = computed(() => cfg.value?.entities ?? [])
const refreshInterval = computed(() => (cfg.value?.refreshInterval ?? 30) * 1000)

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

function domainOf(entityId: string): string {
  return entityId.split('.')[0]
}

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
    errorText.value = ''
  } catch (err) {
    const e = err as Error
    if (e.name === 'TypeError') {
      errorText.value = '被浏览器拦截：① HA 配置 cors_allowed_origins: ["null"] 并重启；② Chrome 打开 chrome://flags/#local-network-access-check 设为 Disabled 并重启浏览器'
    } else {
      errorText.value = e.message
    }
    console.error('[HA] 状态拉取失败', e)
  }
}

function startTimers() {
  stopTimers()
  stateTimer = window.setInterval(fetchStates, refreshInterval.value)
}

function stopTimers() {
  if (stateTimer) window.clearInterval(stateTimer)
  stateTimer = undefined
}

onMounted(() => {
  if (connected.value) void fetchStates()
  startTimers()
})

onBeforeUnmount(stopTimers)

watch(
  () => [cfg.value?.baseUrl, cfg.value?.token, entityList.value.map((e) => e.id).join(',')],
  () => {
    if (connected.value) void fetchStates()
    startTimers()
  },
)

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
    numeric: state !== undefined && Number.isFinite(Number.parseFloat(state.state)),
  }
}

/** 状态是否「开启型」（用于高亮颜色） */
function isActiveState(state: string): boolean {
  return ['on', 'open', 'playing', 'unlocked', 'home', 'heat', 'cool'].includes(state)
}

/** 数值型（sensor）展开趋势图；开关型（switch/light）展开开关 */
function isSensorLike(id: string): boolean {
  return entityInfo(entityList.value.find((e) => e.id === id) ?? { id }).numeric
}

function isSwitchLike(id: string): boolean {
  return ['switch', 'light', 'input_boolean', 'fan'].includes(domainOf(id))
}

/** 展开/收起：数值实体展开时拉取历史趋势 */
const expandedId = ref<string | null>(null)

const CHART_RANGES = [1, 6, 24, 168] as const
const RANGE_LABELS: Record<number, string> = { 1: '1h', 6: '6h', 24: '24h', 168: '7d' }

/** 每个实体的历史缓存与时间范围 */
const histories = ref<
  Map<string, { pts: Array<{ t: number; v: number }>; range: { min: number; max: number } }>
>(new Map())
const historyHours = ref<Record<string, number>>({})

function chartHoursOf(id: string): number {
  return historyHours.value[id] ?? 24
}

async function fetchEntityHistory(id: string) {
  if (!connected.value) return
  const hours = chartHoursOf(id)
  try {
    const start = new Date(Date.now() - hours * 3600 * 1000)
    const startIso = start.toISOString().replace(/\.\d{3}Z$/, 'Z')
    const url = `${apiBase()}/api/history/period/${encodeURIComponent(startIso)}?filter_entity_id=${encodeURIComponent(id)}&minimal_response&no_attributes`
    const res = await fetch(url, { headers: authHeaders() })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as Array<Array<{ state: string; last_changed: string }>>
    const rows = data[0] ?? []
    const pts: Array<{ t: number; v: number }> = []
    for (const row of rows) {
      const v = Number.parseFloat(String(row.state))
      if (!Number.isFinite(v)) continue
      pts.push({ t: new Date(row.last_changed).getTime(), v })
    }
    // 降采样到最多 120 个点
    const step = Math.max(1, Math.ceil(pts.length / 120))
    const sampled = pts.filter((_, i) => i % step === 0 || i === pts.length - 1)
    if (sampled.length > 0) {
      const vs = sampled.map((p) => p.v)
      histories.value = new Map(histories.value).set(id, {
        pts: sampled,
        range: { min: Math.min(...vs), max: Math.max(...vs) },
      })
    } else {
      const next = new Map(histories.value)
      next.delete(id)
      histories.value = next
    }
  } catch (err) {
    console.error('[HA] 历史拉取失败', err)
  }
}

function toggleExpand(id: string) {
  if (expandedId.value === id) {
    expandedId.value = null
    return
  }
  expandedId.value = id
  if (isSensorLike(id)) void fetchEntityHistory(id)
}

function setChartHours(id: string, h: number) {
  historyHours.value = { ...historyHours.value, [id]: h }
  void fetchEntityHistory(id)
}

/** 开关控制：调用 HA toggle 服务，成功后刷新状态 */
const toggling = ref<Set<string>>(new Set())

async function toggleSwitch(id: string) {
  if (toggling.value.has(id)) return
  toggling.value = new Set(toggling.value).add(id)
  try {
    const res = await fetch(`${apiBase()}/api/services/${domainOf(id)}/toggle`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ entity_id: id }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    window.setTimeout(() => void fetchStates(), 500)
  } catch (err) {
    errorText.value = `开关操作失败：${(err as Error).message}`
    console.error('[HA] toggle 失败', err)
  } finally {
    const next = new Set(toggling.value)
    next.delete(id)
    toggling.value = next
  }
}

/** 展开趋势图的 SVG 坐标（viewBox 100x30） */
function chartPoints(id: string): { line: string; area: string } | null {
  const h = histories.value.get(id)
  if (!h || h.pts.length < 2) return null
  const { min, max } = h.range
  const span = max - min || 1
  const t0 = h.pts[0].t
  const t1 = h.pts[h.pts.length - 1].t
  const tSpan = t1 - t0 || 1
  const yTop = 2
  const yBottom = 28
  const pts = h.pts.map((p) => {
    const x = ((p.t - t0) / tSpan) * 100
    const y = yBottom - ((p.v - min) / span) * (yBottom - yTop)
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })
  return {
    line: pts.join(' '),
    area: `M${pts[0]} L${pts.join(' L')} L100,${yBottom} L0,${yBottom} Z`,
  }
}

/** 时段统计：最低 / 最高 / 增量（total_increasing 实体即累积量） */
function entityStats(id: string): { min: number; max: number; delta: number; isTotal: boolean } | null {
  const h = histories.value.get(id)
  if (!h || h.pts.length < 2) return null
  const state = states.value.get(id)
  const stateClass = state?.attributes?.state_class
  const isTotal = stateClass === 'total_increasing'
  const first = h.pts[0].v
  const last = h.pts[h.pts.length - 1].v
  return { min: h.range.min, max: h.range.max, delta: last - first, isTotal }
}

function fmtNum(v: number): string {
  return Math.abs(v) >= 1000 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2)
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
  emit('update', { ha: { ...cur, entities } })
  newEntityId.value = ''
  newEntityLabel.value = ''
  newEntityUnit.value = ''
  addingEntity.value = false
}

function removeEntityInCard(id: string) {
  const cur = cfg.value as HaConfig
  emit('update', { ha: { ...cur, entities: cur.entities.filter((e) => e.id !== id) } })
  if (expandedId.value === id) expandedId.value = null
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
        placeholder="HA 地址，如 http://localhost:8899"
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
        令牌在 HA「个人资料」创建。浏览器会拦截 file:// 页面直连局域网 HA 的请求，推荐运行代理
        <code class="rounded bg-white/10 px-1 text-[0.56em] text-white/70">python3 tools/ha-cors-proxy.py</code>
        后把上方地址填为 http://localhost:8899；或手动配置 HA 的 cors_allowed_origins ["null"] 并在 Chrome 关闭
        local-network-access-check
      </p>
    </div>

    <template v-else>
      <!-- 实体列表：点击行展开趋势图/开关 -->
      <div class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
        <div
          v-for="item in entityList"
          :key="item.id"
          class="shrink-0 overflow-hidden rounded-lg border transition-colors"
          :class="expandedId === item.id ? 'border-white/25 bg-white/10' : 'border-white/10 bg-white/5'"
        >
          <!-- 行主体 -->
          <div class="flex cursor-pointer items-center gap-2 px-2 py-1.5" @click="toggleExpand(item.id)">
            <component
              :is="domainIcon(item.id)"
              :size="13"
              class="shrink-0"
              :class="isActiveState(entityInfo(item).state) ? 'text-emerald-300' : 'opacity-55'"
            />
            <span class="min-w-0 flex-1 truncate text-[0.72em] opacity-80">{{ entityInfo(item).label }}</span>
            <template v-if="entityInfo(item).numeric">
              <span class="shrink-0 text-[0.95em] font-semibold tabular-nums">{{ entityInfo(item).state }}</span>
              <span class="shrink-0 text-[0.62em] opacity-50">{{ entityInfo(item).unit }}</span>
            </template>
            <template v-else>
              <span class="shrink-0 text-[0.75em] font-medium">{{ entityInfo(item).state }}</span>
            </template>
            <button
              class="shrink-0 cursor-pointer text-white/30 transition-colors hover:text-red-300"
              title="移除实体"
              @click.stop="removeEntityInCard(item.id)"
            >
              <Trash2 :size="11" />
            </button>
            <ChevronDown
              :size="12"
              class="shrink-0 text-white/40 transition-transform duration-200"
              :class="expandedId === item.id ? 'rotate-180' : ''"
            />
          </div>

          <!-- 展开区：数值 → 趋势图 + 统计；开关 → 开关控件 -->
          <div v-if="expandedId === item.id" class="border-t border-white/10 px-2 py-1.5">
            <!-- 开关型 -->
            <div v-if="isSwitchLike(item.id)" class="flex items-center justify-between gap-2">
              <span class="text-[0.62em] opacity-55">
                {{ isActiveState(entityInfo(item).state) ? '已开启' : '已关闭' }}
              </span>
              <button
                class="relative h-5 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-200"
                :class="isActiveState(entityInfo(item).state) ? 'bg-emerald-400/90' : 'bg-white/20'"
                :disabled="toggling.has(item.id)"
                title="切换开关"
                @click.stop="toggleSwitch(item.id)"
              >
                <span
                  class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200"
                  :class="isActiveState(entityInfo(item).state) ? 'left-[22px]' : 'left-0.5'"
                />
              </button>
            </div>

            <!-- 数值型 -->
            <template v-else-if="isSensorLike(item.id)">
              <div class="flex items-center justify-between gap-2">
                <span class="text-[0.6em] opacity-50">趋势</span>
                <div class="flex gap-0.5">
                  <button
                    v-for="r in CHART_RANGES"
                    :key="r"
                    class="cursor-pointer rounded px-1 py-0.5 text-[0.58em] transition-colors"
                    :class="chartHoursOf(item.id) === r ? 'bg-white/20 text-white' : 'text-white/45 hover:bg-white/10 hover:text-white'"
                    @click.stop="setChartHours(item.id, r)"
                  >
                    {{ RANGE_LABELS[r] }}
                  </button>
                </div>
              </div>

              <div class="relative mt-1 h-10 w-full overflow-hidden rounded-md bg-white/5">
                <svg
                  v-if="chartPoints(item.id)"
                  :viewBox="`0 0 100 30`"
                  preserveAspectRatio="none"
                  class="h-full w-full"
                >
                  <defs>
                    <linearGradient :id="`ha-area-${item.id}`" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="currentColor" stop-opacity="0.35" />
                      <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
                    </linearGradient>
                  </defs>
                  <path :d="chartPoints(item.id)!.area" :fill="`url(#ha-area-${item.id})`" />
                  <polyline
                    :points="chartPoints(item.id)!.line"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.2"
                    vector-effect="non-scaling-stroke"
                    stroke-linejoin="round"
                    stroke-linecap="round"
                  />
                </svg>
                <div v-else class="flex h-full items-center justify-center text-[0.58em] opacity-40">暂无历史数据</div>
              </div>

              <!-- 统计：最低 / 最高 / 累积量（total 型）或时段增量 -->
              <div v-if="entityStats(item.id)" class="mt-1 flex items-center gap-3 text-[0.58em] opacity-60">
                <span class="tabular-nums">低 {{ fmtNum(entityStats(item.id)!.min) }}</span>
                <span class="tabular-nums">高 {{ fmtNum(entityStats(item.id)!.max) }}</span>
                <span class="tabular-nums">
                  {{ entityStats(item.id)!.isTotal ? '累积' : '增量' }}
                  <span :class="entityStats(item.id)!.delta >= 0 ? 'text-emerald-300' : 'text-red-300'">
                    {{ entityStats(item.id)!.delta >= 0 ? '+' : '' }}{{ fmtNum(entityStats(item.id)!.delta) }}
                  </span>
                </span>
              </div>
            </template>

            <!-- 其他类型：仅提示 -->
            <div v-else class="text-[0.58em] opacity-40">该类型暂不支持展开操作</div>
          </div>
        </div>

        <div v-if="entityList.length === 0" class="py-2 text-center text-[0.65em] opacity-45">
          还没有实体，点击下方「添加实体」
        </div>

        <!-- 内联添加实体表单 -->
        <div v-if="addingEntity" class="flex shrink-0 flex-col gap-1 rounded-lg border border-dashed border-white/20 bg-white/5 p-1.5">
          <input
            v-model="newEntityId"
            type="text"
            placeholder="实体 ID，如 sensor.outdoor_temp / switch.fan"
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

      <!-- 错误与刷新 -->
      <div v-if="errorText" class="flex shrink-0 items-center justify-between gap-2 text-[0.6em] text-red-300/80">
        <span class="truncate">{{ errorText }}</span>
        <button class="flex shrink-0 cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 hover:bg-white/10" @click="fetchStates">
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
