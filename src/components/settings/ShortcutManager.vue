<script setup lang="ts">
import { ref } from 'vue'
import type { DrawerConfig, ShortcutConfig } from '../../types'
import { useDrawers } from '../../composables/useDrawers'
import { Check, ChevronDown, ChevronRight, ClipboardPaste, ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-vue-next'
import IconCropper from './IconCropper.vue'

const { drawers, addDrawer, updateDrawer, removeDrawer, addShortcut, updateShortcut, removeShortcut, flushSave } =
  useDrawers()

const newDrawerName = ref('')
const expandedId = ref<string | null>(null)

/** 抽屉内标签表单 */
const tagForm = ref({ name: '', url: '', icon: '' })
const editingTagId = ref<string | null>(null)

/** 图标上传与裁切 */
const cropperImage = ref('')
const showCropper = ref(false)

function openCropperWith(file: File | Blob) {
  const reader = new FileReader()
  reader.onload = () => {
    cropperImage.value = String(reader.result)
    showCropper.value = true
  }
  reader.readAsDataURL(file)
}

function handleIconFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) openCropperWith(file)
  input.value = ''
}

/** 粘贴事件：支持在图标输入框上 Ctrl+V 直接粘贴图片 */
function handleIconPaste(event: ClipboardEvent) {
  const items = event.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        openCropperWith(file)
        return
      }
    }
  }
}

/** 粘贴按钮：读取系统剪贴板中的图片（部分浏览器需授权，失败时提示用 Ctrl+V） */
async function handleClipboardRead() {
  try {
    if (!navigator.clipboard?.read) {
      alert('当前环境不支持读取剪贴板，请直接 Ctrl+V 粘贴到图标输入框')
      return
    }
    const items = await navigator.clipboard.read()
    for (const item of items) {
      const type = item.types.find((t) => t.startsWith('image/'))
      if (type) {
        const blob = await item.getType(type)
        openCropperWith(blob)
        return
      }
    }
    alert('剪贴板中没有图片，请先复制一张图片')
  } catch (err) {
    console.error('读取剪贴板失败', err)
    alert('读取剪贴板失败，请直接在图标输入框按 Ctrl+V 粘贴')
  }
}

function onCropped(cropped: string) {
  tagForm.value.icon = cropped
  showCropper.value = false
}

/** 重命名抽屉 */
const renamingId = ref<string | null>(null)
const renameText = ref('')

function reloadSoon() {
  flushSave()
  window.setTimeout(() => window.location.reload(), 200)
}

function handleAddDrawer() {
  const name = newDrawerName.value.trim()
  if (!name) return
  addDrawer(name)
  newDrawerName.value = ''
  reloadSoon()
}

function handleRemoveDrawer(id: string) {
  removeDrawer(id)
  reloadSoon()
}

function startRename(drawer: DrawerConfig) {
  renamingId.value = drawer.id
  renameText.value = drawer.name
}

function submitRename(id: string) {
  const name = renameText.value.trim()
  if (name) updateDrawer(id, { name })
  renamingId.value = null
  reloadSoon()
}

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function submitTag(drawerId: string) {
  const name = tagForm.value.name.trim()
  const url = normalizeUrl(tagForm.value.url)
  if (!name || !url) return
  const payload = { name, url, icon: tagForm.value.icon.trim() || undefined }
  if (editingTagId.value) {
    updateShortcut(drawerId, editingTagId.value, payload)
  } else {
    addShortcut(drawerId, payload)
  }
  resetTagForm()
  reloadSoon()
}

function startEditTag(drawerId: string, tag: ShortcutConfig) {
  if (!expandedId.value || expandedId.value !== drawerId) expandedId.value = drawerId
  editingTagId.value = tag.id
  tagForm.value = { name: tag.name, url: tag.url, icon: tag.icon ?? '' }
}

function resetTagForm() {
  editingTagId.value = null
  tagForm.value = { name: '', url: '', icon: '' }
}

function handleRemoveTag(drawerId: string, tagId: string) {
  removeShortcut(drawerId, tagId)
  reloadSoon()
}

/** 卡片外观控制 */
function toggleBlur(drawer: DrawerConfig) {
  updateDrawer(drawer.id, { blur: drawer.blur === false })
}

function toggleTransparent(drawer: DrawerConfig) {
  updateDrawer(drawer.id, { transparent: drawer.transparent !== true })
}

function setFontScale(drawer: DrawerConfig, value: number) {
  updateDrawer(drawer.id, { fontScale: value })
}

function setFontColor(drawer: DrawerConfig, value: string) {
  updateDrawer(drawer.id, { fontColor: value || undefined })
}
</script>

<template>
  <div class="space-y-6">
    <!-- 添加抽屉 -->
    <form class="flex items-center gap-2" @submit.prevent="handleAddDrawer">
      <input v-model="newDrawerName" type="text" placeholder="新抽屉名称，如「常用」「设计资源」" class="glass-input" />
      <button type="submit" class="glass-btn-primary shrink-0">
        <Plus :size="15" />
        添加抽屉
      </button>
    </form>

    <p class="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs leading-relaxed text-white/45">
      抽屉是一张可拖拽的卡片，内部排列多个标签。在编辑模式下可把抽屉拖到任意位置，点击标签在新标签页打开。
    </p>

    <!-- 抽屉列表 -->
    <div class="space-y-2">
      <div
        v-for="drawer in drawers"
        :key="drawer.id"
        class="overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-colors hover:bg-white/10"
      >
        <div class="flex items-center gap-2 px-3 py-2.5">
          <button
            class="flex cursor-pointer items-center gap-1 text-white/50 transition-colors hover:text-white"
            @click="toggleExpand(drawer.id)"
          >
            <ChevronRight v-if="expandedId !== drawer.id" :size="14" class="transition-transform" />
            <ChevronDown v-else :size="14" />
          </button>

          <template v-if="renamingId === drawer.id">
            <input v-model="renameText" type="text" class="glass-input !py-1 !text-xs" @keyup.enter="submitRename(drawer.id)" />
            <button class="cursor-pointer text-white/50 hover:text-white" @click="submitRename(drawer.id)">
              <Check :size="14" />
            </button>
            <button class="cursor-pointer text-white/50 hover:text-white" @click="renamingId = null">
              <X :size="14" />
            </button>
          </template>
          <template v-else>
            <span class="min-w-0 flex-1 truncate text-sm text-white/90">{{ drawer.name }}</span>
            <span class="shrink-0 text-xs text-white/40">{{ drawer.shortcuts.length }} 个标签</span>
            <button
              class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/50 transition-all hover:bg-white/15 hover:text-white"
              title="重命名"
              @click="startRename(drawer)"
            >
              <Pencil :size="13" />
            </button>
            <button
              class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/50 transition-all hover:bg-red-500/25 hover:text-red-200"
              title="删除抽屉"
              @click="handleRemoveDrawer(drawer.id)"
            >
              <Trash2 :size="13" />
            </button>
          </template>
        </div>

        <!-- 展开的标签管理与外观设置 -->
        <div v-if="expandedId === drawer.id" class="border-t border-white/10 px-3 py-3">
          <ul class="space-y-1.5">
            <li
              v-for="tag in drawer.shortcuts"
              :key="tag.id"
              class="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/10"
            >
              <div class="min-w-0 flex-1">
                <div class="truncate text-xs text-white/90">{{ tag.name }}</div>
                <div class="truncate text-[11px] text-white/40">{{ tag.url }}</div>
              </div>
              <button
                class="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-white/50 transition-all hover:bg-white/15 hover:text-white"
                title="编辑标签"
                @click="startEditTag(drawer.id, tag)"
              >
                <Pencil :size="12" />
              </button>
              <button
                class="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-white/50 transition-all hover:bg-red-500/25 hover:text-red-200"
                title="删除标签"
                @click="handleRemoveTag(drawer.id, tag.id)"
              >
                <Trash2 :size="12" />
              </button>
            </li>
          </ul>

          <form class="mt-3 space-y-2 rounded-lg border border-white/10 bg-white/5 p-3" @submit.prevent="submitTag(drawer.id)">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-white/70">{{ editingTagId ? '编辑标签' : '添加标签' }}</span>
              <button v-if="editingTagId" type="button" class="cursor-pointer text-white/40 hover:text-white" @click="resetTagForm">
                <X :size="13" />
              </button>
            </div>
            <input v-model="tagForm.name" type="text" placeholder="标签名称" class="glass-input !py-1.5 !text-xs" />
            <input v-model="tagForm.url" type="text" placeholder="网址（自动补全协议）" class="glass-input !py-1.5 !text-xs" />
            <input
              v-model="tagForm.icon"
              type="text"
              placeholder="图标 URL（可选，可直接 Ctrl+V 粘贴图片）"
              class="glass-input !py-1.5 !text-xs"
              @paste="handleIconPaste"
            />
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="glass-btn shrink-0 !px-2.5 !py-1.5 !text-xs"
                title="读取剪贴板中的图片"
                @click="handleClipboardRead"
              >
                <ClipboardPaste :size="13" />
                粘贴
              </button>
              <label
                class="glass-btn shrink-0 cursor-pointer !px-2.5 !py-1.5 !text-xs"
                title="上传本地图片并裁切为图标"
              >
                <ImagePlus :size="13" />
                上传图标
                <input
                  type="file"
                  accept="image/*"
                  class="sr-only"
                  @change="handleIconFileChange"
                />
              </label>
              <template v-if="tagForm.icon">
                <img
                  :src="tagForm.icon"
                  alt="图标预览"
                  class="h-7 w-7 shrink-0 rounded-md border border-white/20 bg-white/15 object-contain"
                />
                <button
                  type="button"
                  class="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-white/50 transition-all hover:bg-red-500/25 hover:text-red-200"
                  title="清除图标"
                  @click="tagForm.icon = ''"
                >
                  <X :size="12" />
                </button>
              </template>
            </div>
            <button type="submit" class="glass-btn-primary w-full !py-1.5 !text-xs">
              <Check v-if="editingTagId" :size="13" />
              <Plus v-else :size="13" />
              {{ editingTagId ? '保存标签' : '添加标签' }}
            </button>
          </form>

          <!-- 卡片外观 -->
          <div class="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
            <span class="text-xs font-medium text-white/70">卡片外观</span>
            <div class="mt-2.5 flex items-center gap-4">
              <div class="flex items-center gap-2">
                <span class="text-[11px] text-white/50">模糊</span>
                <button
                  class="relative h-5 w-9 cursor-pointer rounded-full transition-colors duration-200"
                  :class="drawer.transparent === true ? 'cursor-not-allowed bg-white/10' : drawer.blur === false ? 'bg-white/15' : 'bg-primary/80'"
                  :disabled="drawer.transparent === true"
                  @click="toggleBlur(drawer)"
                >
                  <span
                    class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200"
                    :class="drawer.blur === false ? 'left-0.5' : 'left-[18px]'"
                  />
                </button>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-[11px] text-white/50">无背景</span>
                <button
                  class="relative h-5 w-9 cursor-pointer rounded-full transition-colors duration-200"
                  :class="drawer.transparent === true ? 'bg-primary/80' : 'bg-white/15'"
                  @click="toggleTransparent(drawer)"
                >
                  <span
                    class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200"
                    :class="drawer.transparent === true ? 'left-[18px]' : 'left-0.5'"
                  />
                </button>
              </div>
              <div class="flex flex-1 items-center gap-2">
                <span class="shrink-0 text-[11px] text-white/50">字号</span>
                <input
                  type="range"
                  min="0.8"
                  max="1.6"
                  step="0.1"
                  :value="drawer.fontScale ?? 1"
                  class="w-full min-w-0 cursor-pointer accent-primary"
                  @input="setFontScale(drawer, Number(($event.target as HTMLInputElement).value))"
                />
              </div>
              <div class="flex shrink-0 items-center gap-2">
                <span class="text-[11px] text-white/50">颜色</span>
                <input
                  type="color"
                  :value="drawer.fontColor || '#ffffff'"
                  class="h-6 w-8 cursor-pointer rounded-md border border-white/15 bg-white/10 p-0.5"
                  @input="setFontColor(drawer, ($event.target as HTMLInputElement).value)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 图标裁切器 -->
    <IconCropper
      v-if="showCropper"
      :image="cropperImage"
      @done="onCropped"
      @cancel="showCropper = false"
    />
  </div>
</template>
