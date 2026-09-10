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

/** 实体 domain → 图标 */
function domainIcon(entityId: string): Component {
  return DOMAIN_ICONS[entityId.split('.')[0]] ?? Circle
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
    // 浏览器对跨域/私有网络拦截的报错统一为 TypeError: Failed to fetch，转成可读提示
    if (e.name === 'TypeError') {
      errorText.value = '请求被浏览器拦截：请检查 HA 的 cors_allowed_origins 配置（file:// 需填 "null"），或 Chrome 的 Private Network Access 限制'
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
        令牌在 HA「个人资料」创建。连接前需在 HA 的 configuration.yaml 配置跨域：http: cors_allowed_origins: ["null"]（file:// 的 Origin 是字符串 null），
        并用 Chrome 打开 chrome://flags/#block-insecure-private-network-requests 关闭 Private Network Access 拦截，然后重启 HA
      </p>
    </div>

    <template v-else>
      <!-- 实体状态列表 + 卡片内添加实体 -->
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
          <!-- 数字实体：大号数值 + 单位 -->
          <template v-if="entityInfo(item).numeric">
            <span class="shrink-0 text-[0.95em] font-semibold tabular-nums">{{ entityInfo(item).state }}</span>
            <span class="shrink-0 text-[0.62em] opacity-50">{{ entityInfo(item).unit }}</span>
          </template>
          <!-- 非数字实体：状态文本 -->
          <template v-else>
            <span class="shrink-0 text-[0.75em] font-medium">{{ entityInfo(item).state }}</span>
          </template>
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
