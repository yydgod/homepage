<script setup lang="ts">
import { computed } from 'vue'
import type { WidgetConfig } from '../../types'
import { useApiRequest } from '../../composables/useApiRequest'
import { RefreshCw } from 'lucide-vue-next'

const props = defineProps<{ widget: WidgetConfig }>()

const { status, rendered, errorMessage, retry } = useApiRequest(() => props.widget.api)

const lines = computed(() => rendered.value.split('\n'))
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 overflow-auto px-4 py-3 pt-6">
      <div v-if="status === 'loading'" class="flex items-center gap-2 text-[0.875em] opacity-60">
        <RefreshCw :size="14" class="animate-spin" />
        加载中…
      </div>

      <div v-else-if="status === 'error'" class="flex w-full flex-col items-center gap-2.5 text-center">
        <div class="text-[0.75em] leading-relaxed text-red-300/90">请求失败：{{ errorMessage }}</div>
        <button class="glass-btn !px-3 !py-1 !text-[0.75em]" @click="retry">
          <RefreshCw :size="12" />
          重试
        </button>
      </div>

      <div
        v-else-if="status === 'success'"
        class="whitespace-pre-wrap break-words text-center text-[0.875em] leading-relaxed"
      >
        <template v-for="(line, i) in lines" :key="i">
          {{ line }}<br v-if="i < lines.length - 1" />
        </template>
      </div>

      <div v-else class="text-[0.75em] opacity-40">请在设置中配置接口地址</div>
    </div>
  </div>
</template>
