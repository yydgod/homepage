<script setup lang="ts">
import { ref } from 'vue'
import type { WidgetConfig } from '../../types'
import { ArrowLeft, Save, Server } from 'lucide-vue-next'

const props = defineProps<{ widget: WidgetConfig }>()

const emit = defineEmits<{
  (e: 'save', patch: Partial<WidgetConfig>): void
  (e: 'back'): void
}>()

const server = ref(props.widget.mc?.server ?? '')
const protocol = ref(props.widget.mc?.protocol ?? 'java')

function submit() {
  const value = server.value.trim()
  if (!value) return
  emit('save', { mc: { server: value, protocol: protocol.value } })
}
</script>

<template>
  <div class="space-y-6">
    <button class="flex cursor-pointer items-center gap-1.5 text-xs text-white/50 transition-colors hover:text-white" @click="emit('back')">
      <ArrowLeft :size="13" />
      返回插件列表
    </button>

    <section class="space-y-3">
      <div class="flex items-center gap-2">
        <Server :size="16" class="text-primary" />
        <h3 class="text-sm font-medium text-white/85">MC 服务器地址</h3>
      </div>
      <input v-model="server" type="text" placeholder="如 frp-any.com:43544 或 mc.hypixel.net" class="glass-input font-mono !text-xs" />
      <div class="flex items-center gap-2">
        <span class="shrink-0 text-xs text-white/50">服务器类型</span>
        <select v-model="protocol" class="glass-input !w-40 !text-xs">
          <option value="java">Java 版</option>
          <option value="bedrock">基岩版</option>
        </select>
      </div>
      <p class="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs leading-relaxed text-white/45">
        通过 mcstatus.io 在线查询服务器状态，浏览器直连、无需安装任何东西。服务器需公网可达
        （如通过 frp 转发），地址格式 host:port，不带端口时使用默认端口（Java 25565 / 基岩 19132）。
        每 60 秒自动刷新一次。
      </p>
    </section>

    <button class="glass-btn-primary w-full !py-2.5" :disabled="!server.trim()" @click="submit">
      <Save :size="15" />
      保存并应用
    </button>
  </div>
</template>
