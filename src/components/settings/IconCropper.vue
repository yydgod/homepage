<script setup lang="ts">
import { reactive, ref } from 'vue'
import { Check, X } from 'lucide-vue-next'

const props = defineProps<{ image: string }>()

const emit = defineEmits<{
  (e: 'done', cropped: string): void
  (e: 'cancel'): void
}>()

const stageEl = ref<HTMLDivElement | null>(null)

/** 图片在显示区域中的布局信息 */
interface DisplayInfo {
  /** 显示区域中图片的位置与尺寸 */
  x: number
  y: number
  w: number
  h: number
  /** 原图尺寸 */
  naturalW: number
  naturalH: number
}

const display = ref<DisplayInfo | null>(null)
const box = reactive({ size: 160, x: 0, y: 0 })
const dragging = ref(false)

function onImageLoad(event: Event) {
  const img = event.target as HTMLImageElement
  const stage = stageEl.value
  if (!stage) return
  const sw = stage.clientWidth
  const sh = stage.clientHeight
  const scale = Math.min(sw / img.naturalWidth, sh / img.naturalHeight)
  const w = img.naturalWidth * scale
  const h = img.naturalHeight * scale
  display.value = {
    x: (sw - w) / 2,
    y: (sh - h) / 2,
    w,
    h,
    naturalW: img.naturalWidth,
    naturalH: img.naturalHeight,
  }
  box.size = Math.max(60, Math.round(Math.min(w, h) * 0.8))
  box.x = Math.round((sw - box.size) / 2)
  box.y = Math.round((sh - box.size) / 2)
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

let lastX = 0
let lastY = 0
let startBoxX = 0
let startBoxY = 0

function onDragStart(event: MouseEvent) {
  dragging.value = true
  lastX = event.clientX
  lastY = event.clientY
  startBoxX = box.x
  startBoxY = box.y
  event.preventDefault()
}

function onDragMove(event: MouseEvent) {
  if (!dragging.value || !stageEl.value) return
  const dx = event.clientX - lastX
  const dy = event.clientY - lastY
  const maxX = stageEl.value.clientWidth - box.size
  const maxY = stageEl.value.clientHeight - box.size
  box.x = clamp(startBoxX + dx, 0, Math.max(0, maxX))
  box.y = clamp(startBoxY + dy, 0, Math.max(0, maxY))
}

function onDragEnd() {
  dragging.value = false
}

function onSizeChange(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  const stage = stageEl.value
  if (!stage) return
  box.size = value
  box.x = clamp(box.x, 0, Math.max(0, stage.clientWidth - box.size))
  box.y = clamp(box.y, 0, Math.max(0, stage.clientHeight - box.size))
}

function confirm() {
  const d = display.value
  if (!d) return
  const scale = d.naturalW / d.w
  const sx = clamp((box.x - d.x) * scale, 0, d.naturalW)
  const sy = clamp((box.y - d.y) * scale, 0, d.naturalH)
  const sw = clamp(box.size * scale, 1, d.naturalW - sx)
  const sh = clamp(box.size * scale, 1, d.naturalH - sy)
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const img = new Image()
  img.onload = () => {
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 128, 128)
    emit('done', canvas.toDataURL('image/png'))
  }
  img.src = props.image
}
</script>

<template>
  <div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="emit('cancel')" />

    <div class="relative z-10 w-full max-w-lg rounded-2xl border border-white/15 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-xl">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-white">裁切图标</h3>
        <button class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-white/60 transition-all hover:bg-white/10 hover:text-white" @click="emit('cancel')">
          <X :size="16" />
        </button>
      </div>

      <p class="mb-3 text-xs leading-relaxed text-white/45">拖动选框选择图标区域，通过下方滑杆调整裁切大小，输出为 128×128 方形图标。</p>

      <!-- 裁切舞台 -->
      <div
        ref="stageEl"
        class="relative h-72 w-full select-none overflow-hidden rounded-xl border border-white/10 bg-slate-800/60"
        @mousemove="onDragMove"
        @mouseup="onDragEnd"
        @mouseleave="onDragEnd"
      >
        <img :src="image" alt="裁切原图" class="pointer-events-none h-full w-full object-contain" @load="onImageLoad" />

        <!-- 选区框 -->
        <div
          class="absolute cursor-move rounded-sm border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
          :class="dragging ? 'border-primary' : 'border-white'"
          :style="{
            left: `${box.x}px`,
            top: `${box.y}px`,
            width: `${box.size}px`,
            height: `${box.size}px`,
          }"
          @mousedown="onDragStart"
        >
          <span class="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-white" />
          <span class="absolute -bottom-1 -left-1 h-2 w-2 rounded-full bg-white" />
          <span class="absolute -bottom-1 -right-1 h-2 w-2 rounded-full bg-white" />
          <span class="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-white" />
        </div>
      </div>

      <!-- 大小滑杆 -->
      <div class="mt-4">
        <div class="mb-1.5 flex items-center justify-between">
          <span class="text-xs text-white/60">裁切框大小</span>
          <span class="text-xs tabular-nums text-white/40">{{ box.size }}px</span>
        </div>
        <input
          type="range"
          min="60"
          :max="Math.max(80, Math.round(Math.min(display?.w ?? 300, display?.h ?? 300)))"
          step="4"
          :value="box.size"
          class="w-full cursor-pointer accent-primary"
          @input="onSizeChange"
        />
      </div>

      <div class="mt-5 flex justify-end gap-2">
        <button class="glass-btn !px-4" @click="emit('cancel')">取消</button>
        <button class="glass-btn-primary !px-4" @click="confirm">
          <Check :size="15" />
          使用此图标
        </button>
      </div>
    </div>
  </div>
</template>
