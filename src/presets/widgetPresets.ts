import type { ApiConfig, WidgetConfig, WidgetType } from '../types'
import { uid } from '../utils/id'

// ---------- API 插件预设（均支持 CORS，file:// 下可直接调用） ----------

/** 一言 · hitokoto.cn（Access-Control-Allow-Origin: *） */
export const HITOKOTO_API: ApiConfig = {
  url: 'https://v1.hitokoto.cn',
  method: 'GET',
  headers: [],
  params: [],
  body: '',
  timeout: 8000,
  refreshInterval: 30,
  responsePath: 'hitokoto',
  renderTemplate: '{{value}}',
}

/** 天气示例 · wttr.in（Access-Control-Allow-Origin: *） */
export const WEATHER_API: ApiConfig = {
  url: 'https://wttr.in/Beijing?format=j1',
  method: 'GET',
  headers: [],
  params: [],
  body: '',
  timeout: 10000,
  refreshInterval: 1800,
  responsePath: 'current_condition[0]',
  renderTemplate: '{{value.temp_C}}℃ · {{value.weatherDesc[0].value}}\n体感 {{value.FeelsLikeC}}℃ · 湿度 {{value.humidity}}%',
}

/** 空白 API 模板（自定义接口起点） */
export const EMPTY_API: ApiConfig = {
  url: 'https://api.example.com/data',
  method: 'GET',
  headers: [],
  params: [],
  body: '',
  timeout: 8000,
  refreshInterval: 0,
  responsePath: 'data',
  renderTemplate: '{{value}}',
}

// ---------- 搜索引擎清单（搜索框插件） ----------

export interface SearchEngine {
  id: string
  name: string
  /** 搜索地址模板，{q} 将被替换为编码后的关键词 */
  url: string
}

export const SEARCH_ENGINES: SearchEngine[] = [
  { id: 'baidu', name: '百度', url: 'https://www.baidu.com/s?wd={q}' },
  { id: 'bing', name: '必应', url: 'https://www.bing.com/search?q={q}' },
  { id: 'google', name: 'Google', url: 'https://www.google.com/search?q={q}' },
  { id: 'sogou', name: '搜狗', url: 'https://www.sogou.com/web?query={q}' },
  { id: 'github', name: 'GitHub', url: 'https://github.com/search?q={q}' },
  { id: 'deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com/?q={q}' },
]

// ---------- 插件预设清单（设置面板中供用户添加） ----------

export interface WidgetPreset {
  type: WidgetType
  name: string
  description: string
  build: () => WidgetConfig
}

export const WIDGET_PRESETS: WidgetPreset[] = [
  {
    type: 'clock',
    name: '时钟',
    description: '实时时间与日期展示',
    build: () => ({ id: uid('wg'), type: 'clock', title: '时钟', x: 0, y: 0, w: 8, h: 3 }),
  },
  {
    type: 'todo',
    name: '待办清单',
    description: '随手记录、勾选完成',
    build: () => ({ id: uid('wg'), type: 'todo', title: '待办清单', x: 0, y: 0, w: 8, h: 7, todos: [] }),
  },
  {
    type: 'search',
    name: '搜索框',
    description: '浏览器搜索，多引擎切换',
    build: () => ({ id: uid('wg'), type: 'search', title: '搜索框', x: 0, y: 0, w: 12, h: 3, searchEngine: 'baidu' }),
  },
  {
    type: 'mc',
    name: 'MC 服务器',
    description: '查询指定 MC 服务器的在线情况',
    build: () => ({ id: uid('wg'), type: 'mc', title: 'MC 服务器', x: 0, y: 0, w: 8, h: 5, mc: { server: 'play.cubecraft.net' } }),
  },
  {
    type: 'chat',
    name: 'DeepSeek 对话',
    description: '调用 DeepSeek API 的多轮对话',
    build: () => ({
      id: uid('wg'),
      type: 'chat',
      title: 'DeepSeek 对话',
      x: 0,
      y: 0,
      w: 10,
      h: 10,
      chat: { apiKey: '', model: 'deepseek-chat' },
      chatMessages: [],
    }),
  },
  {
    type: 'api',
    name: '一言',
    description: '每日一句，来自 hitokoto.cn',
    build: () => ({ id: uid('wg'), type: 'api', title: '一言', x: 0, y: 0, w: 8, h: 5, api: { ...HITOKOTO_API } }),
  },
  {
    type: 'api',
    name: '天气',
    description: 'wttr.in 实时天气示例',
    build: () => ({ id: uid('wg'), type: 'api', title: '天气', x: 0, y: 0, w: 8, h: 7, api: { ...WEATHER_API } }),
  },
  {
    type: 'api',
    name: '自定义 API',
    description: '零代码接入任意接口',
    build: () => ({ id: uid('wg'), type: 'api', title: '自定义 API', x: 0, y: 0, w: 8, h: 5, api: { ...EMPTY_API } }),
  },
  {
    type: 'ha',
    name: 'Home Assistant',
    description: '展示家电状态与历史统计图',
    build: () => ({
      id: uid('wg'),
      type: 'ha',
      title: 'Home Assistant',
      x: 0,
      y: 0,
      w: 10,
      h: 8,
      ha: { baseUrl: '', token: '', entities: [], chartHours: 24, refreshInterval: 30 },
    }),
  },
]
