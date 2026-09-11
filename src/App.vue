<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { PencilLine, Settings } from 'lucide-vue-next'
import { useWallpaper } from './composables/useWallpaper'
import { useSettings } from './composables/useSettings'
import { hasSavedConfig, restoreFromBoundFile, loadBoundFileHandle } from './utils/storage'
import WidgetGrid from './components/WidgetGrid.vue'
import SettingsPanel from './components/settings/SettingsPanel.vue'

const { wallpaperStyle, overlayStyle } = useWallpaper()
const { openSettings, activeTab, editMode, toggleEditMode } = useSettings()

/** 本地配置为空（可能清除过浏览器数据）时展示恢复引导 */
const configLost = ref(false)

// 启动时：若本地配置已被清除但绑定过备份文件，自动从磁盘文件恢复
onMounted(async () => {
  if (hasSavedConfig()) return
  const handle = await loadBoundFileHandle()
  if (handle) {
    const restored = await restoreFromBoundFile()
    if (restored) {
      window.location.reload()
      return
    }
  }
  // 自动恢复失败：提示用户手动从备份文件恢复
  configLost.value = true
})

function goRestore() {
  configLost.value = false
  activeTab.value = 'data'
  openSettings()
}
</script>

<template>
  <div class="app-root relative h-full overflow-hidden" :class="{ 'edit-mode': editMode }">
    <!-- 壁纸背景层（外扩以抵消模糊边缘） -->
    <div class="absolute inset-0 -m-8" :style="wallpaperStyle" />
    <!-- 遮罩层 -->
    <div class="absolute inset-0" :style="overlayStyle" />

    <!-- 内容层 -->
    <div class="relative z-10 flex h-full flex-col overflow-y-auto">
      <main class="flex min-h-0 flex-1 flex-col px-4 pb-28 pt-8 sm:px-6">
        <WidgetGrid />
      </main>
    </div>

    <!-- 配置丢失提示条 -->
    <div
      v-if="configLost"
      class="absolute left-1/2 top-6 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full border border-amber-300/30 bg-slate-900/85 px-4 py-2.5 shadow-xl shadow-black/40 backdrop-blur-xl"
    >
      <span class="text-xs text-white/85">检测到本地配置为空（可能清除过浏览器数据）</span>
      <button
        class="cursor-pointer rounded-full bg-gradient-to-br from-primary to-primary-pink px-3 py-1 text-xs text-white transition-all hover:scale-105"
        @click="goRestore"
      >
        从备份文件恢复
      </button>
      <button class="cursor-pointer text-white/40 transition-colors hover:text-white" @click="configLost = false">✕</button>
    </div>

    <!-- 编辑模式开关 -->
    <button
      class="absolute bottom-24 right-8 z-20 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border transition-all duration-300 active:scale-95"
      :class="
        editMode
          ? 'border-transparent bg-gradient-to-br from-primary via-primary-purple to-primary-pink text-white shadow-xl shadow-primary/40'
          : 'border-white/15 bg-white/10 text-white/60 backdrop-blur-md hover:scale-110 hover:border-white/30 hover:bg-white/20 hover:text-white'
      "
      :title="editMode ? '退出编辑模式' : '进入编辑模式'"
      @click="toggleEditMode"
    >
      <PencilLine :size="22" />
    </button>

    <!-- 设置入口 -->
    <button
      class="absolute bottom-8 right-8 z-20 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary-purple to-primary-pink text-white shadow-xl shadow-primary/40 transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-primary/50 active:scale-95"
      title="个性化设置"
      @click="openSettings"
    >
      <Settings :size="22" class="transition-transform duration-500 hover:rotate-90" />
    </button>

    <SettingsPanel />
  </div>
</template>
