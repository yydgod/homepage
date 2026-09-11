import type { AppConfig, DrawerConfig, ShortcutConfig, ThemeConfig, WallpaperConfig, WidgetConfig } from '../types'
import { HITOKOTO_API } from '../presets/widgetPresets'
import { DEFAULT_THEME } from '../presets/themePresets'

const STORAGE_KEY = 'qishiyepage:config:v1'

/** 当前网格列数（24 列细网格，正方形 cell） */
const GRID_COLUMNS = 24

const DEFAULT_CONFIG: AppConfig = {
  theme: { presetId: DEFAULT_THEME.id, colors: [...DEFAULT_THEME.colors] as ThemeConfig['colors'] },
  wallpaper: {
    imageBase64: '',
    fillMode: 'cover',
    blur: 0,
    brightness: 1,
    overlayColor: '#0F172A',
    overlayOpacity: 0.3,
  },
  // 默认不含抽屉：首屏直接展示插件，抽屉由用户在设置中自行添加
  drawers: [],
  widgets: [
    { id: 'wg-search', type: 'search', title: '搜索框', x: 0, y: 0, w: 12, h: 3, searchEngine: 'baidu' },
    { id: 'wg-clock', type: 'clock', title: '时钟', x: 12, y: 0, w: 8, h: 3 },
    {
      id: 'wg-todo',
      type: 'todo',
      title: '待办清单',
      x: 0,
      y: 3,
      w: 8,
      h: 7,
      todos: [
        { id: 'td-1', text: '欢迎使用起始页，点击 + 添加待办', done: false },
        { id: 'td-2', text: '打开右下角设置，探索壁纸与插件', done: false },
      ],
    },
    {
      id: 'wg-hitokoto',
      type: 'api',
      title: '一言',
      x: 8,
      y: 3,
      w: 8,
      h: 5,
      api: { ...HITOKOTO_API },
    },
  ],
  columns: GRID_COLUMNS,
}

/** 是否已有已保存的配置（localStorage 中存在即视为已编辑过） */
export function hasSavedConfig(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null
  } catch {
    return false
  }
}

/** 读取本地配置，缺字段时与默认值合并，解析失败时回退默认 */
export function loadAppConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return clone(DEFAULT_CONFIG)
    const parsed = JSON.parse(raw) as Partial<AppConfig>
    // 抽屉数据：优先使用已保存的 drawers（空数组同样生效，表示用户删光了抽屉）
    let drawers: DrawerConfig[]
    if (Array.isArray(parsed.drawers)) {
      drawers = parsed.drawers
    } else if (Array.isArray(parsed.shortcuts) && parsed.shortcuts.length > 0) {
      // 旧数据迁移：把独立的快捷方式列表收进一个「常用」抽屉
      drawers = [
        {
          id: 'dr-common',
          name: '常用',
          x: 0,
          y: 0,
          w: 12,
          h: 1,
          shortcuts: parsed.shortcuts.map((s) => ({
            id: s.id,
            name: s.name,
            url: s.url,
            icon: s.icon,
          })),
        },
      ]
    } else {
      drawers = clone(DEFAULT_CONFIG.drawers)
    }
    // 旧数据迁移：历史布局基于 12 列，切换 24 列后坐标等比 ×2
    const needsScale = parsed.columns !== GRID_COLUMNS
    if (needsScale) {
      drawers = drawers.map((d) => ({
        ...d,
        x: Math.round(d.x * 2),
        y: Math.round(d.y * 2),
        w: Math.round(d.w * 2),
        h: Math.round(d.h * 2),
      }))
    }
    let widgets = Array.isArray(parsed.widgets) ? parsed.widgets : clone(DEFAULT_CONFIG.widgets)
    if (needsScale && Array.isArray(parsed.widgets)) {
      widgets = widgets.map((w) => ({
        ...w,
        x: Math.round(w.x * 2),
        y: Math.round(w.y * 2),
        w: Math.round(w.w * 2),
        h: Math.round(w.h * 2),
      }))
    }
    return {
      theme: parsed.theme?.colors?.length === 3 ? parsed.theme : clone(DEFAULT_CONFIG.theme),
      wallpaper: { ...DEFAULT_CONFIG.wallpaper, ...(parsed.wallpaper ?? {}) },
      drawers,
      widgets,
      columns: GRID_COLUMNS,
    }
  } catch (e) {
    console.error('读取本地配置失败，已回退默认配置', e)
    return clone(DEFAULT_CONFIG)
  }
}

/** 读全量 → 更新指定部分 → 写回（同步原子操作，无竞态） */
function persist(update: (config: AppConfig) => void) {
  try {
    const config = loadAppConfig()
    update(config)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    // 已绑定本地文件时自动同步（防抖）
    if (isFileSyncSupported()) syncToFileDebounced()
  } catch (e) {
    console.error('保存配置失败', e)
  }
}

export function saveTheme(theme: ThemeConfig) {
  persist((c) => {
    c.theme = theme
  })
}

export function saveWallpaper(wallpaper: WallpaperConfig) {
  persist((c) => {
    c.wallpaper = wallpaper
  })
}

export function saveDrawers(drawers: DrawerConfig[]) {
  persist((c) => {
    c.drawers = drawers
  })
}

export function saveWidgets(widgets: WidgetConfig[]) {
  persist((c) => {
    c.widgets = widgets
  })
}

/** 防抖：用于壁纸滑杆等高频变更场景 */
export function debounce<T extends (...args: never[]) => void>(fn: T, ms = 300): T {
  let timer: number | null = null
  return ((...args: Parameters<T>) => {
    if (timer !== null) window.clearTimeout(timer)
    timer = window.setTimeout(() => fn(...args), ms)
  }) as T
}

// ---------- 数据备份：清除浏览器记录后仍可恢复 ----------

const EXPORT_FILE_NAME = '起始页配置.json'
const IDB_NAME = 'qishiyepage'
const IDB_STORE = 'kv'
const IDB_HANDLE_KEY = 'config-file-handle'

/** 是否支持 File System Access API（Chrome/Edge；file:// 下可用） */
export function isFileSyncSupported(): boolean {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window
}

/** 极简 IndexedDB 键值封装（持久化文件句柄，清除站点数据后句柄丢失但磁盘文件仍在） */
function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) req.result.createObjectStore(IDB_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await idbOpen()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(value, key)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await idbOpen()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly')
    const req = tx.objectStore(IDB_STORE).get(key)
    req.onsuccess = () => {
      db.close()
      resolve(req.result as T | undefined)
    }
    req.onerror = () => {
      db.close()
      reject(req.error)
    }
  })
}

async function idbDelete(key: string): Promise<void> {
  const db = await idbOpen()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).delete(key)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

/** 当前绑定的本地同步文件句柄 */
let boundHandle: FileSystemFileHandle | null = null

/**
 * 绑定已有本地文件：之后每次保存配置都会自动写入该文件。
 * 若文件内已是有效配置则直接使用（不覆盖），返回 usedExisting = true。
 */
export async function bindLocalFile(): Promise<{ handle: FileSystemFileHandle; usedExisting: boolean }> {
  const [handle] = await window.showOpenFilePicker({
    types: [
      {
        description: 'JSON 配置文件',
        accept: { 'application/json': ['.json'] },
      },
    ],
  })
  boundHandle = handle
  await idbSet(IDB_HANDLE_KEY, handle)
  // 文件已有有效配置：直接使用文件内容，不覆盖
  try {
    const file = await handle.getFile()
    const text = await file.text()
    const parsed = JSON.parse(text) as AppConfig
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.widgets)) {
      localStorage.setItem(STORAGE_KEY, text)
      return { handle, usedExisting: true }
    }
  } catch {
    // 空文件或非 JSON：继续写入当前配置
  }
  await syncToBoundFile()
  return { handle, usedExisting: false }
}

/** 新建备份文件：把当前配置写入用户选择的新文件 */
export async function createLocalFile(): Promise<FileSystemFileHandle> {
  const handle = await window.showSaveFilePicker({
    suggestedName: EXPORT_FILE_NAME,
    types: [
      {
        description: 'JSON 配置文件',
        accept: { 'application/json': ['.json'] },
      },
    ],
  })
  boundHandle = handle
  await idbSet(IDB_HANDLE_KEY, handle)
  await syncToBoundFile()
  return handle
}

/** 读取已绑定的文件句柄（页面启动时恢复用） */
export async function loadBoundFileHandle(): Promise<FileSystemFileHandle | null> {
  if (!isFileSyncSupported()) return null
  try {
    const handle = await idbGet<FileSystemFileHandle>(IDB_HANDLE_KEY)
    boundHandle = handle ?? null
    return boundHandle
  } catch {
    return null
  }
}

/** 将当前配置写入绑定文件（自动同步）；供 persist 防抖调用与手动触发 */
export async function syncToBoundFile(): Promise<boolean> {
  if (!boundHandle) return false
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const writable = await boundHandle.createWritable()
    await writable.write(raw)
    await writable.close()
    return true
  } catch (err) {
    console.error('[备份] 自动同步文件失败', err)
    return false
  }
}

/** persist 时自动同步到绑定文件（防抖） */
const syncToFileDebounced = debounce(() => void syncToBoundFile(), 400)

/** 配置保存后调用（内部已接入 persist 流程） */
export function notifyConfigChanged() {
  syncToFileDebounced()
}

/** 从绑定文件恢复配置（清除站点数据后启动时自动调用，成功返回 true） */
export async function restoreFromBoundFile(): Promise<boolean> {
  if (!boundHandle) return false
  try {
    const perm = await boundHandle.queryPermission({ mode: 'readwrite' })
    if (perm !== 'granted') {
      const requested = await boundHandle.requestPermission({ mode: 'readwrite' })
      if (requested !== 'granted') return false
    }
    const file = await boundHandle.getFile()
    const text = await file.text()
    const parsed = JSON.parse(text) as AppConfig
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.widgets)) return false
    localStorage.setItem(STORAGE_KEY, text)
    return true
  } catch (err) {
    console.error('[备份] 从文件恢复失败', err)
    return false
  }
}

/** 解除文件绑定 */
export async function unbindLocalFile(): Promise<void> {
  boundHandle = null
  await idbDelete(IDB_HANDLE_KEY)
}

/** 导出配置为 JSON 下载 */
export function exportConfigFile() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return
  const blob = new Blob([raw], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = EXPORT_FILE_NAME
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 3000)
}

/** 从本地文件导入配置（读取后校验并覆盖当前配置），成功返回 true */
export function importConfigFile(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppConfig
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.widgets)) {
          resolve(false)
          return
        }
        localStorage.setItem(STORAGE_KEY, String(reader.result))
        resolve(true)
      } catch {
        resolve(false)
      }
    }
    reader.onerror = () => resolve(false)
    reader.readAsText(file)
  })
}

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T
}
