import { ref, watch } from 'vue'
import type { WidgetConfig, WidgetLayout } from '../types'
import { debounce, loadAppConfig, saveWidgets } from '../utils/storage'

// 模块级单例：所有组件共享同一份插件列表
const widgets = ref<WidgetConfig[]>(loadAppConfig().widgets)

const persist = debounce(() => saveWidgets(widgets.value), 300)
watch(widgets, persist, { deep: true })

export function useWidgets() {
  function addWidget(config: WidgetConfig) {
    widgets.value.push(config)
  }

  /** 立即持久化（绕过防抖），供添加插件后刷新页面等场景使用 */
  function flushSave() {
    saveWidgets(widgets.value)
  }

  function removeWidget(id: string) {
    widgets.value = widgets.value.filter((w) => w.id !== id)
  }

  function updateWidget(id: string, patch: Partial<WidgetConfig>) {
    const index = widgets.value.findIndex((w) => w.id === id)
    if (index >= 0) widgets.value[index] = { ...widgets.value[index], ...patch }
  }

  /** gridstack 布局回写：仅更新坐标尺寸，避免重建网格 */
  function applyLayout(layouts: WidgetLayout[]) {
    for (const layout of layouts) {
      const widget = widgets.value.find((w) => w.id === layout.id)
      if (widget) {
        widget.x = layout.x
        widget.y = layout.y
        widget.w = layout.w
        widget.h = layout.h
      }
    }
  }

  function findWidget(id: string): WidgetConfig | undefined {
    return widgets.value.find((w) => w.id === id)
  }

  return { widgets, addWidget, flushSave, removeWidget, updateWidget, applyLayout, findWidget }
}
