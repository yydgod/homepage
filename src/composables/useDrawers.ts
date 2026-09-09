import { ref, watch } from 'vue'
import type { DrawerConfig, ShortcutConfig, WidgetLayout } from '../types'
import { loadAppConfig, saveDrawers } from '../utils/storage'
import { uid } from '../utils/id'

// 模块级单例：所有组件共享同一份抽屉列表
const drawers = ref<DrawerConfig[]>(loadAppConfig().drawers)

watch(drawers, () => saveDrawers(drawers.value), { deep: true })

export function useDrawers() {
  function addDrawer(name: string) {
    drawers.value.push({ id: uid('dr'), name: name.trim() || '新抽屉', x: 0, y: 0, w: 8, h: 2, shortcuts: [] })
  }

  function updateDrawer(id: string, patch: Partial<DrawerConfig>) {
    const index = drawers.value.findIndex((d) => d.id === id)
    if (index >= 0) drawers.value[index] = { ...drawers.value[index], ...patch }
  }

  function removeDrawer(id: string) {
    drawers.value = drawers.value.filter((d) => d.id !== id)
  }

  /** 抽屉内标签操作 */
  function addShortcut(drawerId: string, data: { name: string; url: string; icon?: string }) {
    const drawer = drawers.value.find((d) => d.id === drawerId)
    if (drawer) drawer.shortcuts.push({ id: uid('sc'), ...data })
  }

  function updateShortcut(drawerId: string, shortcutId: string, patch: Partial<ShortcutConfig>) {
    const drawer = drawers.value.find((d) => d.id === drawerId)
    if (!drawer) return
    const index = drawer.shortcuts.findIndex((s) => s.id === shortcutId)
    if (index >= 0) drawer.shortcuts[index] = { ...drawer.shortcuts[index], ...patch }
  }

  function removeShortcut(drawerId: string, shortcutId: string) {
    const drawer = drawers.value.find((d) => d.id === drawerId)
    if (drawer) drawer.shortcuts = drawer.shortcuts.filter((s) => s.id !== shortcutId)
  }

  /** gridstack 布局回写：仅更新抽屉的坐标尺寸 */
  function applyLayout(layouts: WidgetLayout[]) {
    for (const layout of layouts) {
      const drawer = drawers.value.find((d) => d.id === layout.id)
      if (drawer) {
        drawer.x = layout.x
        drawer.y = layout.y
        drawer.w = layout.w
        drawer.h = layout.h
      }
    }
  }

  /** 立即持久化（供添加后刷新页面等场景使用） */
  function flushSave() {
    saveDrawers(drawers.value)
  }

  function findDrawer(id: string): DrawerConfig | undefined {
    return drawers.value.find((d) => d.id === id)
  }

  return {
    drawers,
    addDrawer,
    updateDrawer,
    removeDrawer,
    addShortcut,
    updateShortcut,
    removeShortcut,
    applyLayout,
    flushSave,
    findDrawer,
  }
}
