<script setup lang="ts">
import { computed } from 'vue'
import type { ApiConfig, WidgetConfig } from '../../types'
import { useApiRequest } from '../../composables/useApiRequest'
import { RefreshCw } from 'lucide-vue-next'

const props = defineProps<{ widget: WidgetConfig }>()

/** mcstatus.io 在线查询（Access-Control-Allow-Origin: *，浏览器直连） */
function buildApi(): ApiConfig | undefined {
  const server = props.widget.mc?.server?.trim()
  if (!server) return undefined
  const kind = props.widget.mc?.protocol === 'bedrock' ? 'bedrock' : 'java'
  return {
    url: `https://api.mcstatus.io/v2/status/${kind}/${encodeURIComponent(server)}`,
    method: 'GET',
    headers: [],
    params: [],
    body: '',
    timeout: 8000,
    refreshInterval: 60,
    responsePath: '',
    renderTemplate: '',
  }
}

const { status, rawData, errorMessage, retry } = useApiRequest(buildApi)

/** mcstatus.io 响应结构 */
interface McResponse {
  online?: boolean
  version?: { name_clean?: string; name?: string }
  players?: { online?: number; max?: number }
  motd?: { clean?: string; raw?: string }
  edition?: string
}

const data = computed(() => rawData.value as McResponse | null)
const online = computed(() => data.value?.online === true)
const serverLabel = computed(() => props.widget.mc?.server?.trim() || '未配置服务器')
const onlineCount = computed(() => data.value?.players?.online ?? 0)
const maxCount = computed(() => data.value?.players?.max ?? 0)
const version = computed(() => data.value?.version?.name_clean ?? data.value?.version?.name ?? '')

/** 可读错误提示 */
const friendlyError = computed(() => {
  const msg = errorMessage.value ?? ''
  if (msg.toLowerCase().includes('failed to fetch')) {
    return '在线查询失败：请确认服务器公网可达（如 frp 转发），且地址格式为 host:port'
  }
  return msg
})
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 overflow-auto px-4 py-3 pt-6">
      <!-- 加载中 -->
      <div v-if="status === 'loading'" class="flex items-center gap-2 text-[0.875em] opacity-60">
        <RefreshCw :size="14" class="animate-spin" />
        查询服务器中…
      </div>

      <!-- 查询失败 -->
      <div v-else-if="status === 'error'" class="flex w-full flex-col items-center gap-2.5 text-center">
        <div class="text-[0.75em] leading-relaxed text-red-300/90">{{ friendlyError }}</div>
        <button class="glass-btn !px-3 !py-1 !text-[0.75em]" @click="retry">
          <RefreshCw :size="12" />
          重试
        </button>
      </div>

      <!-- 未配置 -->
      <div v-else-if="status === 'idle'" class="text-[0.75em] opacity-40">请在设置中配置服务器地址</div>

      <!-- 查询成功：仅展示地址 / 版本 / 在线人数 -->
      <template v-else>
        <!-- 服务器地址 -->
        <div class="flex max-w-full items-center gap-2">
          <span
            class="h-2 w-2 shrink-0 rounded-full"
            :class="online ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]'"
          />
          <span class="truncate text-[0.8em] font-medium">{{ serverLabel }}</span>
        </div>

        <!-- 服务器版本 -->
        <div v-if="online && version" class="text-[0.7em] opacity-60">
          版本 {{ version }}
        </div>

        <!-- 在线人数 -->
        <div v-if="online" class="flex items-baseline gap-1.5">
          <span class="text-[1.6em] font-semibold tabular-nums text-emerald-300">{{ onlineCount }}</span>
          <span class="text-[0.8em] tabular-nums opacity-55">/ {{ maxCount }} 在线</span>
        </div>
        <div v-else class="text-[1em] font-medium text-red-300">服务器离线</div>
      </template>
    </div>
  </div>
</template>
