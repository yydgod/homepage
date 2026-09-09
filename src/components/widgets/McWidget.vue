<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ApiConfig, WidgetConfig } from '../../types'
import { useApiRequest } from '../../composables/useApiRequest'
import { RefreshCw, Server } from 'lucide-vue-next'

const props = defineProps<{ widget: WidgetConfig }>()

const iconFailed = ref(false)

/** 构造 mcsrvstat 查询配置（支持 CORS，file:// 下可用） */
function buildApi(): ApiConfig | undefined {
  const server = props.widget.mc?.server?.trim()
  if (!server) return undefined
  return {
    url: `https://api.mcsrvstat.us/3/${encodeURIComponent(server)}`,
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

interface McResponse {
  online?: boolean
  hostname?: string
  ip?: string
  port?: number
  version?: string
  icon?: string
  motd?: { raw?: string[]; clean?: string[]; html?: string[] }
  players?: { online?: number; max?: number; list?: Array<{ name: string }> }
}

const data = computed(() => rawData.value as McResponse | null)
const online = computed(() => data.value?.online === true)
const serverLabel = computed(() => props.widget.mc?.server?.trim() || '未配置服务器')
const onlineCount = computed(() => data.value?.players?.online ?? 0)
const maxCount = computed(() => data.value?.players?.max ?? 0)
const motdHtml = computed(() => data.value?.motd?.html ?? data.value?.motd?.clean ?? [])
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
        <div class="text-[0.75em] leading-relaxed text-red-300/90">查询失败：{{ errorMessage }}</div>
        <button class="glass-btn !px-3 !py-1 !text-[0.75em]" @click="retry">
          <RefreshCw :size="12" />
          重试
        </button>
      </div>

      <!-- 未配置 -->
      <div v-else-if="status === 'idle'" class="text-[0.75em] opacity-40">请在设置中配置服务器地址</div>

      <!-- 查询成功 -->
      <template v-else>
        <!-- 服务器信息头部 -->
        <div class="flex w-full items-center gap-2.5">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/20 bg-white/15 shadow-md shadow-black/20">
            <img
              v-if="data?.icon && !iconFailed"
              :src="data.icon"
              alt="服务器图标"
              class="h-7 w-7 object-contain"
              @error="iconFailed = true"
            />
            <Server v-else :size="18" class="opacity-70" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <span
                class="h-2 w-2 shrink-0 rounded-full"
                :class="online ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]'"
              />
              <span class="truncate text-[0.8em] font-medium">{{ serverLabel }}</span>
            </div>
            <div v-if="online && data?.version" class="truncate text-[0.65em] opacity-55">
              版本 {{ data.version }}
            </div>
          </div>
        </div>

        <!-- 在线状态 -->
        <div v-if="online" class="flex items-baseline gap-1.5">
          <span class="text-[1.6em] font-semibold tabular-nums text-emerald-300">{{ onlineCount }}</span>
          <span class="text-[0.8em] tabular-nums opacity-55">/ {{ maxCount }} 在线</span>
        </div>
        <div v-else class="text-[1em] font-medium text-red-300">服务器离线</div>

        <!-- MOTD -->
        <div v-if="online && motdHtml.length > 0" class="w-full space-y-0.5 text-center">
          <p
            v-for="(line, i) in motdHtml"
            :key="i"
            class="truncate text-[0.7em] leading-snug opacity-85"
            v-html="line"
          />
        </div>

        <!-- 在线玩家列表（最多 5 个） -->
        <div v-if="online && data?.players?.list && data.players.list.length > 0" class="flex flex-wrap items-center justify-center gap-1">
          <span
            v-for="player in data.players.list.slice(0, 5)"
            :key="player.name"
            class="rounded-md border border-white/10 bg-white/10 px-1.5 py-0.5 text-[0.6em] opacity-80"
          >
            {{ player.name }}
          </span>
          <span v-if="data.players.list.length > 5" class="text-[0.6em] opacity-50">
            +{{ data.players.list.length - 5 }}
          </span>
        </div>
      </template>
    </div>
  </div>
</template>
