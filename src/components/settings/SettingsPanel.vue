<script setup lang="ts">
import { computed } from 'vue'
import type { WidgetConfig } from '../../types'
import { useSettings } from '../../composables/useSettings'
import { useWidgets } from '../../composables/useWidgets'
import { Image, LayoutGrid, Link2, X } from 'lucide-vue-next'
import WallpaperSettings from './WallpaperSettings.vue'
import ThemeSettings from './ThemeSettings.vue'
import ShortcutManager from './ShortcutManager.vue'
import WidgetManager from './WidgetManager.vue'
import ApiConfigForm from './ApiConfigForm.vue'
import McConfigForm from './McConfigForm.vue'
import ChatConfigForm from './ChatConfigForm.vue'

const { open, activeTab, editingWidgetId, closeSettings, backToWidgetList } = useSettings()
const { updateWidget, findWidget } = useWidgets()

const editingWidget = computed(() => {
  if (!editingWidgetId.value) return null
  return findWidget(editingWidgetId.value) ?? null
})

const TABS = [
  { key: 'wallpaper', label: '壁纸', icon: Image },
  { key: 'shortcuts', label: '抽屉', icon: Link2 },
  { key: 'widgets', label: '插件', icon: LayoutGrid },
] as const

function saveApi(patch: Partial<WidgetConfig>) {
  if (editingWidgetId.value) {
    updateWidget(editingWidgetId.value, patch)
  }
  backToWidgetList()
}
</script>

<template>
  <teleport to="body">
    <transition name="drawer">
      <div v-if="open" class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeSettings" />
        <aside
          class="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-slate-900/85 shadow-2xl backdrop-blur-2xl"
        >
          <header class="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
            <h2 class="text-base font-semibold text-white">个性化设置</h2>
            <button
              class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-white/60 transition-all hover:bg-white/10 hover:text-white"
              @click="closeSettings"
            >
              <X :size="16" />
            </button>
          </header>

          <nav class="flex shrink-0 gap-1 border-b border-white/10 px-4 py-2">
            <button
              v-for="tab in TABS"
              :key="tab.key"
              class="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-all duration-200"
              :class="
                activeTab === tab.key
                  ? 'bg-white/15 text-white shadow-inner'
                  : 'text-white/55 hover:bg-white/5 hover:text-white'
              "
              @click="activeTab = tab.key"
            >
              <component :is="tab.icon" :size="13" />
              {{ tab.label }}
            </button>
          </nav>

          <div class="min-h-0 flex-1 overflow-y-auto p-5">
            <div v-if="activeTab === 'wallpaper'" class="space-y-8">
              <ThemeSettings />
              <WallpaperSettings />
            </div>
            <ShortcutManager v-else-if="activeTab === 'shortcuts'" />
            <ApiConfigForm v-else-if="editingWidget && editingWidget.type === 'api'" :widget="editingWidget" @save="saveApi" @back="backToWidgetList" />
            <McConfigForm v-else-if="editingWidget && editingWidget.type === 'mc'" :widget="editingWidget" @save="saveApi" @back="backToWidgetList" />
            <ChatConfigForm v-else-if="editingWidget" :widget="editingWidget" @save="saveApi" @back="backToWidgetList" />
            <WidgetManager v-else />
          </div>
        </aside>
      </div>
    </transition>
  </teleport>
</template>
