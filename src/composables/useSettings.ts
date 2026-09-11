import { ref } from 'vue'

export type SettingsTab = 'wallpaper' | 'shortcuts' | 'widgets' | 'data'

// 模块级单例：设置抽屉的打开状态、激活标签页与编辑目标
const open = ref(false)
const activeTab = ref<SettingsTab>('wallpaper')
const editingWidgetId = ref<string | null>(null)
/** 编辑模式：开启后插件才显示操作按钮、hover 高亮并可拖拽/缩放 */
const editMode = ref(false)

export function useSettings() {
  function toggleEditMode() {
    editMode.value = !editMode.value
  }
  function openSettings() {
    open.value = true
  }

  function openShortcutManager() {
    open.value = true
    activeTab.value = 'shortcuts'
  }

  /** 打开设置并定位到指定 API 插件的编辑表单 */
  function editWidget(id: string) {
    open.value = true
    activeTab.value = 'widgets'
    editingWidgetId.value = id
  }

  function closeSettings() {
    open.value = false
    editingWidgetId.value = null
  }

  function backToWidgetList() {
    editingWidgetId.value = null
  }

  return { open, activeTab, editingWidgetId, editMode, toggleEditMode, openSettings, openShortcutManager, editWidget, closeSettings, backToWidgetList }
}
