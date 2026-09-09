<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { DrawerConfig, ShortcutConfig } from '../types'
import { useSettings } from '../composables/useSettings'
import { Focus, Ghost, GripVertical, Pencil, Trash2 } from 'lucide-vue-next'

const props = defineProps<{ drawer: DrawerConfig }>()

const emit = defineEmits<{
  (e: 'remove', id: string): void
  (e: 'update', id: string, patch: Partial<DrawerConfig>): void
}>()

const { openShortcutManager } = useSettings()

const blurred = computed(() => props.drawer.blur !== false)
const transparent = computed(() => props.drawer.transparent === true)

function adjustFont(delta: number) {
  const current = props.drawer.fontScale ?? 1
  const next = Math.min(1.6, Math.max(0.8, Math.round((current + delta) * 10) / 10))
  emit('update', props.drawer.id, { fontScale: next })
}

const colorInput = ref<HTMLInputElement | null>(null)

function setFontColor(event: Event) {
  const value = (event.target as HTMLInputElement).value
  emit('update', props.drawer.id, { fontColor: value || undefined })
}

/** 记录图标加载失败的标签，回退为首字徽章 */
const failedIds = reactive(new Set<string>())

function markFailed(id: string) {
  failedIds.add(id)
}

function initialOf(shortcut: ShortcutConfig): string {
  return (shortcut.name || '?').trim().charAt(0).toUpperCase()
}

function iconUrlOf(shortcut: ShortcutConfig): string {
  if (shortcut.icon) return shortcut.icon
  try {
    const { origin } = new URL(shortcut.url)
    return `${origin}/favicon.ico`
  } catch {
    return ''
  }
}

function openShortcut(shortcut: ShortcutConfig) {
  if (!shortcut.url) return
  window.open(shortcut.url, '_blank', 'noopener,noreferrer')
}

const empty = computed(() => props.drawer.shortcuts.length === 0)
</script>

<template>
  <div class="group relative h-full w-full">
    <!-- 拖拽手柄（编辑模式下 hover 显示，与插件手柄保持一致的裸 SVG 结构） -->
    <GripVertical
      :size="13"
      class="widget-drag-handle absolute left-0.5 top-1/2 z-10 -translate-y-1/2 cursor-grab p-0.5 text-white/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100 active:cursor-grabbing"
    />

    <!-- 抽屉内容：标签排列（一个格子一个标签，与网格对齐） -->
    <div class="flex h-full w-full items-center overflow-hidden px-5 py-1">
      <div v-if="empty" class="flex-1 text-center text-[0.7em] opacity-35">空抽屉，点击右上角编辑添加标签</div>
      <div
        v-else
        class="grid h-full w-full overflow-hidden"
        :style="{ gridTemplateColumns: `repeat(${drawer.w}, minmax(0, 1fr))`, gridAutoRows: '1fr' }"
      >
        <button
          v-for="shortcut in drawer.shortcuts"
          :key="shortcut.id"
          class="flex min-h-0 cursor-pointer flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg px-0.5 py-0.5 transition-all duration-200 hover:bg-white/10"
          :title="`${shortcut.name} · ${shortcut.url}`"
          @click="openShortcut(shortcut)"
        >
          <span
            class="flex h-[2.25em] w-[2.25em] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/20 bg-white/15 shadow-sm shadow-black/20"
          >
            <img
              v-if="iconUrlOf(shortcut) && !failedIds.has(shortcut.id)"
              :src="iconUrlOf(shortcut)"
              :alt="shortcut.name"
              class="h-[1.5em] w-[1.5em] object-contain"
              loading="lazy"
              @error="markFailed(shortcut.id)"
            />
            <span
              v-else
              class="bg-gradient-to-br from-primary to-primary-pink bg-clip-text text-[1.1em] font-semibold text-transparent"
            >
              {{ initialOf(shortcut) }}
            </span>
          </span>
          <span class="w-full truncate text-center text-[0.65em] leading-tight opacity-80">{{ shortcut.name }}</span>
        </button>
      </div>
    </div>

    <!-- 外观控制与编辑 / 删除（编辑模式 hover 显示） -->
    <div class="sc-actions absolute right-1 top-1 z-10 flex flex-wrap justify-end gap-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
      <button
        class="flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-md bg-slate-900/80 text-[9px] font-semibold text-white/70 backdrop-blur-md transition-all hover:bg-slate-700/90 hover:text-white"
        title="减小字体"
        @click.stop="adjustFont(-0.1)"
      >
        A−
      </button>
      <button
        class="flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-md bg-slate-900/80 text-[10px] font-semibold text-white/70 backdrop-blur-md transition-all hover:bg-slate-700/90 hover:text-white"
        title="增大字体"
        @click.stop="adjustFont(0.1)"
      >
        A+
      </button>
      <button
        v-if="!transparent"
        class="flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-md backdrop-blur-md transition-all"
        :class="blurred ? 'bg-slate-900/80 text-white/70 hover:bg-slate-700/90 hover:text-white' : 'bg-amber-500/80 text-white'"
        :title="blurred ? '关闭背景模糊' : '开启背景模糊'"
        @click.stop="emit('update', drawer.id, { blur: drawer.blur === false })"
      >
        <Focus :size="10" />
      </button>
      <button
        class="flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-md backdrop-blur-md transition-all"
        :class="transparent ? 'bg-amber-500/80 text-white' : 'bg-slate-900/80 text-white/70 hover:bg-slate-700/90 hover:text-white'"
        :title="transparent ? '恢复卡片背景' : '去掉边框与背景'"
        @click.stop="emit('update', drawer.id, { transparent: drawer.transparent !== true })"
      >
        <Ghost :size="10" />
      </button>
      <button
        class="relative flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-md bg-slate-900/80 backdrop-blur-md transition-all hover:bg-slate-700/90"
        title="修改字体颜色"
        @click.stop="colorInput?.click()"
      >
        <span
          class="h-2.5 w-2.5 rounded-full border border-white/30"
          :style="{ backgroundColor: drawer.fontColor || 'rgba(255, 255, 255, 0.9)' }"
        />
        <input
          ref="colorInput"
          type="color"
          :value="drawer.fontColor || '#ffffff'"
          class="absolute inset-0 h-0 w-0 opacity-0"
          @input="setFontColor"
        />
      </button>
      <button
        class="flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-md bg-slate-900/80 text-white/70 backdrop-blur-md transition-all hover:bg-slate-700/90 hover:text-white"
        title="编辑抽屉"
        @click.stop="openShortcutManager()"
      >
        <Pencil :size="10" />
      </button>
      <button
        class="flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-md bg-slate-900/80 text-white/70 backdrop-blur-md transition-all hover:bg-red-500/80 hover:text-white"
        title="删除抽屉"
        @click.stop="emit('remove', drawer.id)"
      >
        <Trash2 :size="10" />
      </button>
    </div>
  </div>
</template>
