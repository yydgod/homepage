<script setup lang="ts">
import { computed, ref } from 'vue'
import type { WidgetConfig } from '../../types'
import { SEARCH_ENGINES } from '../../presets/widgetPresets'
import { ArrowRight, Search } from 'lucide-vue-next'

const props = defineProps<{ widget: WidgetConfig }>()

const emit = defineEmits<{
  (e: 'update', patch: Partial<WidgetConfig>): void
}>()

const query = ref('')

const currentEngine = computed(
  () => SEARCH_ENGINES.find((e) => e.id === (props.widget.searchEngine ?? 'baidu')) ?? SEARCH_ENGINES[0],
)

function selectEngine(id: string) {
  emit('update', { searchEngine: id })
}

function doSearch() {
  const keyword = query.value.trim()
  if (!keyword) return
  const url = currentEngine.value.url.replace('{q}', encodeURIComponent(keyword))
  window.open(url, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center gap-3 px-5">
    <div
      class="flex w-full max-w-xl items-center gap-2.5 rounded-full border border-white/25 bg-white/15 px-5 py-2.5 shadow-lg shadow-black/20 backdrop-blur-xl transition-all duration-200 focus-within:border-white/40 focus-within:bg-white/20"
    >
      <Search :size="17" class="shrink-0 opacity-55" />
      <input
        v-model="query"
        type="text"
        placeholder="搜索网页、代码或任何内容…"
        class="w-full bg-transparent text-[0.875em] outline-none placeholder:text-white/40"
        @keyup.enter="doSearch"
      />
      <button
        class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-pink text-white shadow-md transition-all duration-200 hover:scale-110 active:scale-95"
        title="搜索"
        @click="doSearch"
      >
        <ArrowRight :size="14" />
      </button>
    </div>

    <div class="flex flex-wrap items-center justify-center gap-1.5">
      <button
        v-for="engine in SEARCH_ENGINES"
        :key="engine.id"
        class="cursor-pointer rounded-full border px-2.5 py-0.5 text-[0.75em] transition-all duration-200"
        :class="
          engine.id === currentEngine.id
            ? 'border-primary/60 bg-primary/25 shadow-md shadow-primary/20'
            : 'border-white/15 bg-white/10 opacity-55 hover:border-white/30 hover:bg-white/15 hover:opacity-100'
        "
        @click="selectEngine(engine.id)"
      >
        {{ engine.name }}
      </button>
    </div>
  </div>
</template>
