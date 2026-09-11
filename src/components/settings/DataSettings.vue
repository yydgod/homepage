<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  bindLocalFile,
  createLocalFile,
  exportConfigFile,
  importConfigFile,
  isFileSyncSupported,
  loadBoundFileHandle,
  restoreFromBoundFile,
  syncToBoundFile,
  unbindLocalFile,
} from '../../utils/storage'
import { Download, FileCheck2, FileUp, HardDrive, Link2Off, RefreshCw } from 'lucide-vue-next'

const fileSyncSupported = isFileSyncSupported()
const boundName = ref<string>('')
const busy = ref(false)
const message = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

onMounted(async () => {
  const handle = await loadBoundFileHandle()
  if (handle) boundName.value = handle.name
})

function flash(text: string) {
  message.value = text
  window.setTimeout(() => {
    if (message.value === text) message.value = ''
  }, 4000)
}

async function handleBind() {
  if (busy.value) return
  busy.value = true
  try {
    const { handle, usedExisting } = await bindLocalFile()
    boundName.value = handle.name
    if (usedExisting) {
      // 文件里已有有效配置：直接使用，刷新让配置生效
      flash(`已使用 ${handle.name} 中的配置（未覆盖文件），正在刷新…`)
      window.setTimeout(() => window.location.reload(), 800)
    } else {
      // 空文件/无内容：写入当前配置
      const ok = await syncToBoundFile()
      flash(ok ? `已绑定 ${handle.name}，当前配置已写入该文件` : `已绑定 ${handle.name}，但首次写入失败，请点「立即同步」重试授权`)
    }
  } catch (err) {
    // 用户取消选择或浏览器不支持
    if ((err as Error).name !== 'AbortError') {
      flash('绑定失败：请使用 Chrome/Edge 浏览器')
    }
  } finally {
    busy.value = false
  }
}

async function handleCreate() {
  if (busy.value) return
  busy.value = true
  try {
    const handle = await createLocalFile()
    boundName.value = handle.name
    const ok = await syncToBoundFile()
    flash(ok ? `已新建 ${handle.name}，配置已写入` : `已新建 ${handle.name}，但首次写入失败，请点「立即同步」重试授权`)
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      flash('新建失败：请使用 Chrome/Edge 浏览器')
    }
  } finally {
    busy.value = false
  }
}

async function handleSyncNow() {
  if (busy.value || !boundName.value) return
  busy.value = true
  try {
    const ok = await syncToBoundFile()
    flash(ok ? `已写入 ${boundName.value}，可打开该文件确认内容` : '写入失败：请重试（浏览器可能要求授权）')
  } finally {
    busy.value = false
  }
}

async function handleRestoreFromFile() {
  if (busy.value || !boundName.value) return
  busy.value = true
  try {
    const ok = await restoreFromBoundFile()
    if (ok) {
      flash('已从绑定文件恢复，正在刷新…')
      window.setTimeout(() => window.location.reload(), 600)
    } else {
      flash('恢复失败：文件内容不是有效的配置文件')
    }
  } finally {
    busy.value = false
  }
}

async function handleUnbind() {
  await unbindLocalFile()
  boundName.value = ''
  flash('已解除文件绑定')
}

function handleExport() {
  exportConfigFile()
  flash('已导出配置文件（浏览器下载）')
}

function handleImportFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  void importConfigFile(file).then((ok) => {
    if (ok) {
      flash('导入成功，正在刷新…')
      window.setTimeout(() => window.location.reload(), 600)
    } else {
      flash('导入失败：文件内容不是有效的配置文件')
    }
  })
}
</script>

<template>
  <div class="space-y-6">
    <section class="space-y-3">
      <div class="flex items-center gap-2">
        <HardDrive :size="16" class="text-primary" />
        <h3 class="text-sm font-medium text-white/85">数据备份</h3>
      </div>
      <p class="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs leading-relaxed text-white/45">
        你的编辑（壁纸、抽屉、插件、主题）默认存在浏览器本地数据中，<span class="text-red-300/80">清除浏览器记录/站点数据会一起清空</span>。
        通过下方方式把配置保存到磁盘文件，清除后即可一键恢复。
      </p>
    </section>

    <!-- 自动同步（Chrome 专属） -->
    <section v-if="fileSyncSupported" class="space-y-2">
      <h4 class="text-xs font-medium text-white/70">自动同步到本地文件（推荐）</h4>
      <p class="text-xs leading-relaxed text-white/45">
        「使用已有备份文件」：选择磁盘上的配置文件，若文件内已有配置会<span class="text-white/70">直接使用、不覆盖</span>；
        文件为空时才写入当前配置。「新建备份文件」：创建新文件并写入当前配置。
        绑定后每次编辑都会自动写入文件，清除浏览器数据后重新打开起始页会自动恢复。
      </p>
      <div v-if="boundName" class="flex flex-wrap items-center gap-2">
        <span class="flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1.5 text-xs text-emerald-300">
          <FileCheck2 :size="13" />
          已绑定：{{ boundName }}
        </span>
        <button class="glass-btn !px-3 !py-1.5 !text-xs" :disabled="busy" @click="handleSyncNow">
          <RefreshCw :size="12" />
          立即同步
        </button>
        <button class="glass-btn !px-3 !py-1.5 !text-xs" :disabled="busy" @click="handleRestoreFromFile">
          <Download :size="12" />
          从文件恢复
        </button>
        <button class="flex cursor-pointer items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-white/55 transition-colors hover:bg-white/10" @click="handleUnbind">
          <Link2Off :size="12" />
          解除绑定
        </button>
      </div>
      <div v-else class="flex flex-wrap gap-2">
        <button class="glass-btn-primary !px-4 !py-2 !text-xs" :disabled="busy" @click="handleBind">
          <HardDrive :size="13" />
          使用已有备份文件
        </button>
        <button class="glass-btn !px-4 !py-2 !text-xs" :disabled="busy" @click="handleCreate">
          <FileCheck2 :size="13" />
          新建备份文件
        </button>
      </div>
      <p class="text-[11px] leading-relaxed text-white/35">
        提示：清除浏览器数据会同时清掉文件授权（浏览器安全限制），届时重新打开起始页会看到顶部提示条，点「从备份文件恢复」
        重新选择一次该文件即可，磁盘上的配置不会丢。
      </p>
    </section>

    <!-- 手动导出 / 导入（全浏览器通用） -->
    <section class="space-y-2">
      <h4 class="text-xs font-medium text-white/70">手动导出 / 导入</h4>
      <div class="flex flex-wrap gap-2">
        <button class="glass-btn !px-3 !py-1.5 !text-xs" @click="handleExport">
          <Download :size="12" />
          导出配置
        </button>
        <button class="glass-btn !px-3 !py-1.5 !text-xs" @click="fileInput?.click()">
          <FileUp :size="12" />
          导入配置
        </button>
        <input ref="fileInput" type="file" accept=".json,application/json" class="hidden" @change="handleImportFile" />
      </div>
      <p class="text-[11px] leading-relaxed text-white/35">
        导出后把 JSON 文件存到任意位置，清除浏览器数据后点「导入配置」选择该文件即可完整恢复。
      </p>
    </section>

    <div v-if="message" class="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs text-white/80">
      {{ message }}
    </div>
  </div>
</template>
