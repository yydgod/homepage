<script setup lang="ts">
import { ref } from 'vue'
import type { WallpaperConfig } from '../../types'
import { useWallpaper } from '../../composables/useWallpaper'
import { ImagePlus, Loader2, Trash2 } from 'lucide-vue-next'

const { wallpaper, uploadImage, updateStyle, removeWallpaper } = useWallpaper()

const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const errorMessage = ref('')

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploading.value = true
  errorMessage.value = ''
  try {
    await uploadImage(file)
  } catch (err) {
    console.error('壁纸上传失败', err)
    errorMessage.value = (err as Error).message
  } finally {
    uploading.value = false
    input.value = ''
  }
}

const FILL_MODES: Array<{ value: WallpaperConfig['fillMode']; label: string }> = [
  { value: 'cover', label: '铺满' },
  { value: 'contain', label: '完整' },
  { value: 'tile', label: '平铺' },
]

function rangeValue(event: Event): number {
  return Number((event.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <label class="mb-2 block text-xs font-medium text-white/60">壁纸图片</label>
      <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileChange" />
      <button class="glass-btn w-full !py-3" :disabled="uploading" @click="fileInput?.click()">
        <Loader2 v-if="uploading" :size="16" class="animate-spin" />
        <ImagePlus v-else :size="16" />
        {{ uploading ? '压缩处理中…' : wallpaper.imageBase64 ? '更换壁纸' : '上传本地壁纸' }}
      </button>
      <p v-if="errorMessage" class="mt-1.5 text-xs text-red-300">{{ errorMessage }}</p>
      <p class="mt-1.5 text-xs leading-relaxed text-white/40">
        支持 JPG / PNG / WebP 等常见格式，图片会自动压缩，无需担心体积。
      </p>
    </div>

    <div>
      <label class="mb-2 block text-xs font-medium text-white/60">填充方式</label>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="mode in FILL_MODES"
          :key="mode.value"
          class="cursor-pointer rounded-lg border px-2 py-2 text-xs transition-all duration-200"
          :class="
            wallpaper.fillMode === mode.value
              ? 'border-primary/60 bg-primary/25 text-white shadow-lg shadow-primary/20'
              : 'border-white/15 bg-white/10 text-white/60 hover:border-white/30 hover:bg-white/15'
          "
          @click="updateStyle({ fillMode: mode.value })"
        >
          {{ mode.label }}
        </button>
      </div>
    </div>

    <div class="space-y-5">
      <div>
        <div class="mb-2 flex items-center justify-between">
          <span class="text-xs font-medium text-white/60">背景模糊</span>
          <span class="text-xs tabular-nums text-white/40">{{ wallpaper.blur }}px</span>
        </div>
        <input
          type="range"
          min="0"
          max="30"
          step="1"
          :value="wallpaper.blur"
          class="w-full cursor-pointer accent-primary"
          @input="updateStyle({ blur: rangeValue($event) })"
        />
      </div>

      <div>
        <div class="mb-2 flex items-center justify-between">
          <span class="text-xs font-medium text-white/60">背景亮度</span>
          <span class="text-xs tabular-nums text-white/40">{{ wallpaper.brightness.toFixed(2) }}</span>
        </div>
        <input
          type="range"
          min="0.2"
          max="1.5"
          step="0.05"
          :value="wallpaper.brightness"
          class="w-full cursor-pointer accent-primary"
          @input="updateStyle({ brightness: rangeValue($event) })"
        />
      </div>

      <div>
        <div class="mb-2 flex items-center justify-between">
          <span class="text-xs font-medium text-white/60">遮罩强度</span>
          <span class="text-xs tabular-nums text-white/40">{{ Math.round(wallpaper.overlayOpacity * 100) }}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="0.8"
          step="0.05"
          :value="wallpaper.overlayOpacity"
          class="w-full cursor-pointer accent-primary"
          @input="updateStyle({ overlayOpacity: rangeValue($event) })"
        />
      </div>
    </div>

    <div>
      <label class="mb-2 block text-xs font-medium text-white/60">遮罩颜色</label>
      <div class="flex items-center gap-3">
        <input
          type="color"
          :value="wallpaper.overlayColor"
          class="h-10 w-16 cursor-pointer rounded-lg border border-white/15 bg-white/10 p-1"
          @input="updateStyle({ overlayColor: ($event.target as HTMLInputElement).value })"
        />
        <span class="text-xs text-white/40">深色遮罩可提升文字可读性</span>
      </div>
    </div>

    <button
      v-if="wallpaper.imageBase64"
      class="glass-btn w-full !border-red-400/30 !text-red-300 hover:!bg-red-500/20"
      @click="removeWallpaper"
    >
      <Trash2 :size="15" />
      移除壁纸，恢复默认渐变
    </button>
  </div>
</template>
