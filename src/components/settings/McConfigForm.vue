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

function submit() {
  const value = server.value.trim()
  if (!value) return
  emit('save', { mc: { server: value } })
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
      <input v-model="server" type="text" placeholder="如 mc.hypixel.net 或 play.example.com:25565" class="glass-input font-mono !text-xs" />
      <p class="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs leading-relaxed text-white/45">
        数据来自 mcsrvstat.us 公共查询接口（支持跨域，file:// 直开可用），每 60 秒自动刷新一次。
        支持 Java 版与基岩版服务器，可带端口号。
      </p>
    </section>

    <button class="glass-btn-primary w-full !py-2.5" :disabled="!server.trim()" @click="submit">
      <Save :size="15" />
      保存并应用
    </button>
  </div>
</template>
