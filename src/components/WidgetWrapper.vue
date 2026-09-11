<script setup lang="ts">
import { computed, ref } from 'vue'
import type { WidgetConfig } from '../types'
import { Focus, Ghost, GripVertical, Pencil, Trash2 } from 'lucide-vue-next'
import { useSettings } from '../composables/useSettings'

const props = defineProps<{ widget: WidgetConfig }>()

const emit = defineEmits<{
  (e: 'remove', id: string): void
  (e: 'update', id: string, patch: Partial<WidgetConfig>): void
}>()

const { editWidget, editMode } = useSettings()

const blurred = computed(() => props.widget.blur !== false)
const transparent = computed(() => props.widget.transparent === true)

function handleEdit() {
  editWidget(props.widget.id)
}

function toggleBlur() {
  emit('update', props.widget.id, { blur: props.widget.blur === false })
}

function toggleTransparent() {
  emit('update', props.widget.id, { transparent: props.widget.transparent !== true })
}

function adjustFont(delta: number) {
  const current = props.widget.fontScale ?? 1
  const next = Math.min(1.6, Math.max(0.8, Math.round((current + delta) * 10) / 10))
  emit('update', props.widget.id, { fontScale: next })
}

const colorInput = ref<HTMLInputElement | null>(null)

function setFontColor(event: Event) {
  const value = (event.target as HTMLInputElement).value
  emit('update', props.widget.id, { fontColor: value || undefined })
}
</script>

<template>
  <div class="group relative h-full">
    <!-- 标题栏浮层：编辑模式开启且 hover 卡片时才显示 -->
    <header
      class="header-floated pointer-events-none absolute inset-x-0 top-0 z-10 flex -translate-y-1 items-center justify-between gap-2 bg-gradient-to-b from-black/50 via-black/25 to-transparent px-2.5 py-1.5 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100"
    >
      <div class="flex min-w-0 items-center gap-1.5">
        <GripVertical
          :size="14"
          class="widget-drag-handle shrink-0 cursor-grab text-white/50 transition-colors hover:text-white active:cursor-grabbing"
        />
        <span class="truncate text-xs font-medium tracking-wide text-white/80">{{ widget.title }}</span>
      </div>
      <div class="flex items-center gap-0.5">
        <button
          class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-[10px] font-semibold text-white/60 transition-all hover:bg-white/15 hover:text-white"
          title="减小字体"
          @click="adjustFont(-0.1)"
        >
          A−
        </button>
        <button
          class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-[11px] font-semibold text-white/60 transition-all hover:bg-white/15 hover:text-white"
          title="增大字体"
          @click="adjustFont(0.1)"
        >
          A+
        </button>
        <button
          class="relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-white/25 transition-all hover:scale-110"
          title="修改字体颜色"
          @click="colorInput?.click()"
        >
          <span
            class="h-3.5 w-3.5 rounded-full border border-white/30"
            :style="{ backgroundColor: widget.fontColor || 'rgba(255, 255, 255, 0.9)' }"
          />
          <input
            ref="colorInput"
            type="color"
            :value="widget.fontColor || '#ffffff'"
            class="absolute inset-0 h-0 w-0 opacity-0"
            @input="setFontColor"
          />
        </button>
        <button
          v-if="!transparent"
          class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md transition-all"
          :class="blurred ? 'text-white/60 hover:bg-white/15 hover:text-white' : 'bg-white/20 text-amber-300 hover:bg-white/25'"
          :title="blurred ? '关闭背景模糊' : '开启背景模糊'"
          @click="toggleBlur"
        >
          <Focus :size="12" />
        </button>
        <button
          class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md transition-all"
          :class="transparent ? 'bg-white/20 text-amber-300 hover:bg-white/25' : 'text-white/60 hover:bg-white/15 hover:text-white'"
          :title="transparent ? '恢复卡片背景' : '去掉边框与背景，内容浮于壁纸'"
          @click="toggleTransparent"
        >
          <Ghost :size="12" />
        </button>
        <button
          v-if="widget.type === 'api' || widget.type === 'mc' || widget.type === 'chat' || widget.type === 'ha'"
          class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-white/60 transition-all hover:bg-white/15 hover:text-white"
          title="编辑配置"
          @click="handleEdit"
        >
          <Pencil :size="12" />
        </button>
        <button
          class="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-white/60 transition-all hover:bg-red-500/40 hover:text-red-200"
          title="删除插件"
          @click="emit('remove', widget.id)"
        >
          <Trash2 :size="12" />
        </button>
      </div>
    </header>

    <div class="h-full">
      <slot />
    </div>
  </div>
</template>
