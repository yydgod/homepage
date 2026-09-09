<script setup lang="ts">
import type { WidgetConfig, WidgetType } from '../../types'
import { useWidgets } from '../../composables/useWidgets'
import { useSettings } from '../../composables/useSettings'
import { WIDGET_PRESETS } from '../../presets/widgetPresets'
import { Pencil, Plus, Trash2 } from 'lucide-vue-next'

const { widgets, addWidget, flushSave, removeWidget, updateWidget } = useWidgets()
const { editWidget } = useSettings()

const TYPE_LABELS: Record<WidgetType, string> = {
  clock: '时钟',
  todo: '待办',
  search: '搜索',
  mc: 'MC',
  chat: '对话',
  api: 'API',
}

function handleAdd(build: () => WidgetConfig) {
  addWidget(build())
  // 立即持久化后自动刷新页面，让新插件完整渲染到网格
  flushSave()
  window.setTimeout(() => window.location.reload(), 200)
}

function toggleBlur(widget: WidgetConfig) {
  updateWidget(widget.id, { blur: widget.blur === false })
}

function toggleTransparent(widget: WidgetConfig) {
  updateWidget(widget.id, { transparent: widget.transparent !== true })
}

function setFontScale(widget: WidgetConfig, value: number) {
  updateWidget(widget.id, { fontScale: value })
}

function setFontColor(widget: WidgetConfig, value: string) {
  updateWidget(widget.id, { fontColor: value || undefined })
}
</script>

<template>
  <div class="space-y-6">
    <section>
      <h3 class="mb-3 text-sm font-medium text-white/85">添加插件</h3>
      <div class="grid grid-cols-1 gap-2">
        <button
          v-for="preset in WIDGET_PRESETS"
          :key="preset.name"
          class="group flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-left transition-all duration-200 hover:border-primary/40 hover:bg-white/10"
          @click="handleAdd(preset.build)"
        >
          <span
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/70 to-primary-pink/70 text-white transition-transform duration-200 group-hover:scale-110"
          >
            <Plus :size="16" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm text-white/90">{{ preset.name }}</span>
            <span class="block truncate text-xs text-white/45">{{ preset.description }}</span>
          </span>
        </button>
      </div>
      <p class="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs leading-relaxed text-white/45">
        API 插件通过统一配置即可调用任意接口。注意：本页以 file:// 方式打开时，接口需允许跨域（返回
        Access-Control-Allow-Origin: *），预设的「一言」「天气」均已支持。
      </p>
    </section>

    <section>
      <h3 class="mb-3 text-sm font-medium text-white/85">已添加的插件</h3>
      <div v-if="widgets.length === 0" class="rounded-xl border border-dashed border-white/15 py-8 text-center text-xs text-white/35">
        还没有插件，从上方添加一个吧
      </div>
      <ul v-else class="space-y-2">
        <li
          v-for="widget in widgets"
          :key="widget.id"
          class="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 transition-colors hover:bg-white/10"
        >
          <span
            class="shrink-0 rounded-md border border-white/15 bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60"
          >
            {{ TYPE_LABELS[widget.type] }}
          </span>
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm text-white/90">{{ widget.title }}</div>
            <div class="truncate text-xs text-white/40">{{ widget.api?.url ?? '内置插件' }}</div>
          </div>
          <input
            type="range"
            min="0.8"
            max="1.6"
            step="0.1"
            :value="widget.fontScale ?? 1"
            class="w-16 shrink-0 cursor-pointer accent-primary"
            :title="`字体大小：${(widget.fontScale ?? 1).toFixed(1)} 倍`"
            @input="setFontScale(widget, Number(($event.target as HTMLInputElement).value))"
          />
          <input
            type="color"
            :value="widget.fontColor || '#ffffff'"
            class="h-6 w-7 shrink-0 cursor-pointer rounded-md border border-white/15 bg-white/10 p-0.5"
            title="字体颜色"
            @input="setFontColor(widget, ($event.target as HTMLInputElement).value)"
          />
          <button
            class="relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200"
            :class="widget.transparent === true ? 'cursor-not-allowed bg-white/10' : widget.blur === false ? 'bg-white/15' : 'bg-primary/80'"
            :disabled="widget.transparent === true"
            :title="widget.transparent === true ? '无背景模式下不可用' : widget.blur === false ? '背景模糊已关闭，点击开启' : '背景模糊已开启，点击关闭'"
            @click="toggleBlur(widget)"
          >
            <span
              class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200"
              :class="widget.blur === false ? 'left-0.5' : 'left-[18px]'"
            />
          </button>
          <button
            class="relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200"
            :class="widget.transparent === true ? 'bg-primary/80' : 'bg-white/15'"
            :title="widget.transparent === true ? '无背景已开启，点击恢复卡片背景' : '卡片背景已开启，点击去掉边框与背景'"
            @click="toggleTransparent(widget)"
          >
            <span
              class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200"
              :class="widget.transparent === true ? 'left-[18px]' : 'left-0.5'"
            />
          </button>
          <button
            v-if="widget.type === 'api' || widget.type === 'mc' || widget.type === 'chat'"
            class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/50 transition-all hover:bg-white/15 hover:text-white"
            title="编辑配置"
            @click="editWidget(widget.id)"
          >
            <Pencil :size="13" />
          </button>
          <button
            class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/50 transition-all hover:bg-red-500/25 hover:text-red-200"
            title="删除插件"
            @click="removeWidget(widget.id)"
          >
            <Trash2 :size="13" />
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>
