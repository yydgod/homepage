<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Component } from 'vue'
import { GridStack } from 'gridstack'
import type { DrawerConfig, WidgetConfig, WidgetLayout } from '../types'
import { useWidgets } from '../composables/useWidgets'
import { useDrawers } from '../composables/useDrawers'
import WidgetWrapper from './WidgetWrapper.vue'
import DrawerCard from './DrawerCard.vue'
import ClockWidget from './widgets/ClockWidget.vue'
import TodoWidget from './widgets/TodoWidget.vue'
import SearchWidget from './widgets/SearchWidget.vue'
import McWidget from './widgets/McWidget.vue'
import ChatWidget from './widgets/ChatWidget.vue'
import ApiWidget from './widgets/ApiWidget.vue'
import HaWidget from './widgets/HaWidget.vue'

const { widgets, applyLayout: applyWidgetLayout, removeWidget, updateWidget } = useWidgets()
const { drawers, applyLayout: applyDrawerLayout, removeDrawer, updateDrawer } = useDrawers()

const containerEl = ref<HTMLDivElement | null>(null)
let grid: GridStack | null = null

const GRID_COLUMNS = 24

/** 正方形 cell：cellHeight 跟随列宽动态计算，窗口变化时同步 */
function syncSquareCells() {
  if (!grid || !containerEl.value) return
  const width = containerEl.value.clientWidth
  if (width <= 0) return
  const colWidth = width / GRID_COLUMNS
  grid.cellHeight(colWidth)
  // 供 CSS 覆盖规则使用（卡片高度 = h * cellHeight - 间距）
  containerEl.value.style.setProperty('--gs-cell-height', `${colWidth}px`)
}

const COMPONENT_MAP: Record<string, Component> = {
  clock: ClockWidget,
  todo: TodoWidget,
  search: SearchWidget,
  mc: McWidget,
  chat: ChatWidget,
  api: ApiWidget,
  ha: HaWidget,
}

onMounted(() => {
  if (!containerEl.value) return
  grid = GridStack.init(
    {
      // 24 列细网格：更灵活的自由摆放
      column: GRID_COLUMNS,
      cellHeight: 90,
      // margin 置 0：卡片间距由 CSS 扣除实现，保证拖拽吸附与视觉网格精确一致
      margin: 0,
      // 自由放置模式：允许把卡片拖到任意空位，不做自动紧凑排序
      float: true,
      animate: true,
      draggable: { handle: '.widget-drag-handle' },
      resizable: { handles: 'se' },
    },
    containerEl.value,
  )

  // 正方形 cell：初始化后动态同步 cellHeight
  window.addEventListener('resize', syncSquareCells)
  window.setTimeout(syncSquareCells, 0)

  // 拖拽/缩放/增删结束后回写布局（同时同步插件与快捷方式两个数据源）
  grid.on('change', (_event, items) => {
    const layouts: WidgetLayout[] = (items ?? []).map((node) => ({
      id: String(node.id ?? ''),
      x: node.x ?? 0,
      y: node.y ?? 0,
      w: node.w ?? 1,
      h: node.h ?? 1,
    }))
    applyWidgetLayout(layouts)
    applyDrawerLayout(layouts)
  })

  // 拖拽/缩放过程中显示辅助网格线（隐藏小网格）
  const el = containerEl.value
  grid.on('dragstart', () => el?.classList.add('show-grid'))
  grid.on('resizestart', () => el?.classList.add('show-grid'))
  grid.on('dragstop', () => el?.classList.remove('show-grid'))
  grid.on('resizestop', () => el?.classList.remove('show-grid'))
})

// 新增插件/抽屉：DOM 渲染后把未注册的卡片加入 gridstack
watch(
  [() => widgets.value.length, () => drawers.value.length],
  async () => {
    if (!grid || !containerEl.value) return
    await nextTick()
    const els = containerEl.value.querySelectorAll<HTMLElement>('.grid-stack-item')
    const managed = grid.getGridItems()
    els.forEach((el) => {
      if (!managed.includes(el)) {
        grid?.makeWidget(el, { autoPosition: true })
      }
    })
  },
)

function detachFromGrid(id: string) {
  const el = containerEl.value?.querySelector<HTMLElement>(`.grid-stack-item[gs-id="${id}"]`)
  if (el && grid) grid.removeWidget(el, false, false)
}

function handleRemoveWidget(id: string) {
  detachFromGrid(id)
  removeWidget(id)
}

function handleRemoveDrawer(id: string) {
  detachFromGrid(id)
  removeDrawer(id)
}

function handleUpdateDrawer(id: string, patch: Partial<DrawerConfig>) {
  updateDrawer(id, patch)
}

function handleUpdate(id: string, patch: Partial<WidgetConfig>) {
  updateWidget(id, patch)
}

// 数据高度变化（如对话插件折叠/展开）→ 同步到 gridstack 引擎
watch(
  () => widgets.value.map((w) => `${w.id}:${w.h}:${w.x}:${w.y}:${w.w}`),
  (next, prev) => {
    if (!grid || !containerEl.value) return
    next.forEach((key, i) => {
      if (prev && key === prev[i]) return
      const widget = widgets.value[i]
      if (!widget) return
      const el = containerEl.value?.querySelector<HTMLElement>(`.grid-stack-item[gs-id="${widget.id}"]`)
      if (el && grid.getGridItems().includes(el)) {
        grid.update(el, { x: widget.x, y: widget.y, w: widget.w, h: widget.h })
      }
    })
  },
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncSquareCells)
  grid?.destroy(false)
  grid = null
})
</script>

<template>
  <div ref="containerEl" class="grid-stack w-full flex-1">
    <!-- 插件卡片 -->
    <div
      v-for="widget in widgets"
      :key="widget.id"
      class="grid-stack-item"
      :class="{ 'no-blur': widget.blur === false, transparent: widget.transparent === true }"
      :gs-id="widget.id"
      :gs-x="widget.x"
      :gs-y="widget.y"
      :gs-w="widget.w"
      :gs-h="widget.h"
    >
      <div
        class="grid-stack-item-content"
        :style="{
          '--font-scale': widget.fontScale ?? 1,
          '--font-color': widget.fontColor || 'rgba(255, 255, 255, 0.92)',
        }"
      >
        <WidgetWrapper :widget="widget" @remove="handleRemoveWidget" @update="handleUpdate">
          <component :is="COMPONENT_MAP[widget.type]" :widget="widget" @update="(patch: Partial<WidgetConfig>) => handleUpdate(widget.id, patch)" />
        </WidgetWrapper>
      </div>
    </div>

    <!-- 抽屉卡片（内部排列标签） -->
    <div
      v-for="drawer in drawers"
      :key="drawer.id"
      class="grid-stack-item"
      :class="{ 'no-blur': drawer.blur === false, transparent: drawer.transparent === true }"
      :gs-id="drawer.id"
      :gs-x="drawer.x"
      :gs-y="drawer.y"
      :gs-w="drawer.w"
      :gs-h="drawer.h"
    >
      <div
        class="grid-stack-item-content"
        :style="{
          '--font-scale': drawer.fontScale ?? 1,
          '--font-color': drawer.fontColor || 'rgba(255, 255, 255, 0.92)',
        }"
      >
        <DrawerCard :drawer="drawer" @remove="handleRemoveDrawer" @update="handleUpdateDrawer" />
      </div>

      <!-- 抽屉名称：位于卡片框之外的下方；未命名时不显示 -->
      <div
        v-if="drawer.name"
        class="drawer-label"
        :style="{
          color: drawer.fontColor || 'rgba(255, 255, 255, 0.6)',
          fontSize: `${((drawer.fontScale ?? 1) * 0.7).toFixed(2)}em`,
        }"
      >
        {{ drawer.name }}
      </div>
    </div>
  </div>
</template>
