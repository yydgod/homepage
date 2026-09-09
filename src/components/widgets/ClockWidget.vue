<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const now = ref(new Date())
let timer: number | null = null

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = new Date()
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer !== null) window.clearInterval(timer)
})

const timeText = computed(() => {
  const h = now.value.getHours().toString().padStart(2, '0')
  const m = now.value.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
})

const secondsText = computed(() => now.value.getSeconds().toString().padStart(2, '0'))

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

const dateText = computed(() => {
  const d = now.value
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAYS[d.getDay()]}`
})

const greeting = computed(() => {
  const h = now.value.getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center gap-1.5 px-3">
    <div class="flex items-baseline gap-1.5">
      <span class="text-[3.75em] font-semibold tabular-nums tracking-tight">
        {{ timeText }}
      </span>
      <span class="text-[1.5em] font-light tabular-nums opacity-60">{{ secondsText }}</span>
    </div>
    <div class="text-[0.875em] opacity-70">
      {{ greeting }} · {{ dateText }}
    </div>
  </div>
</template>
