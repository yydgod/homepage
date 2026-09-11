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

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T
}
