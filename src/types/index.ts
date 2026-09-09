// ---------- 壁纸 ----------
export interface WallpaperConfig {
  /** 压缩后的 base64 图片，空串表示使用默认渐变背景 */
  imageBase64: string
  /** 填充方式：cover 铺满 / contain 完整显示 / tile 平铺 */
  fillMode: 'cover' | 'contain' | 'tile'
  /** 背景模糊，单位 px */
  blur: number
  /** 背景亮度，0.2 ~ 1.5 */
  brightness: number
  /** 遮罩颜色（hex） */
  overlayColor: string
  /** 遮罩不透明度，0 ~ 1 */
  overlayOpacity: number
}

// ---------- 快捷方式（标签，位于抽屉内） ----------
export interface ShortcutConfig {
  id: string
  name: string
  url: string
  /** 可选自定义图标 URL，缺省时显示名称首字徽章 */
  icon?: string
}

// ---------- 抽屉（标签容器卡片） ----------
export interface DrawerConfig {
  id: string
  name: string
  /** 网格坐标与尺寸（抽屉卡片与插件共用同一网格） */
  x: number
  y: number
  w: number
  h: number
  /** 抽屉内的标签排列 */
  shortcuts: ShortcutConfig[]
  /** 卡片背景毛玻璃模糊，false 表示关闭（默认开启） */
  blur?: boolean
  /** 无背景模式：true 时去掉边框与背景，内容直接浮在壁纸上（默认关闭） */
  transparent?: boolean
  /** 内容字体缩放倍率，0.8 ~ 1.6（默认 1） */
  fontScale?: number
  /** 内容字体颜色（hex），缺省时使用默认白色系 */
  fontColor?: string
}

// ---------- 待办 ----------
export interface TodoItem {
  id: string
  text: string
  done: boolean
}

// ---------- 通用 API 插件配置（核心契约） ----------
export interface ApiConfig {
  /** 接口地址（完整 URL） */
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  /** 请求头键值对 */
  headers: Array<{ key: string; value: string }>
  /** query 参数键值对 */
  params: Array<{ key: string; value: string }>
  /** 请求体 JSON 文本，非 GET 时生效 */
  body: string
  /** 超时时间（毫秒） */
  timeout: number
  /** 轮询间隔（秒），0 表示不轮询 */
  refreshInterval: number
  /** 响应数据字段路径，如 data.list[0].temp，空表示整个响应 */
  responsePath: string
  /** 渲染模板，支持 {{value}}、{{value.xxx}}、{{data}}、{{data.xxx}} 插值 */
  renderTemplate: string
}

// ---------- Minecraft 服务器状态插件 ----------
export interface McConfig {
  /** 服务器地址，如 mc.hypixel.net 或 play.example.com:25565 */
  server: string
}

// ---------- DeepSeek 对话插件 ----------
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatConfig {
  /** DeepSeek API Key */
  apiKey: string
  /** 模型：deepseek-chat 或 deepseek-reasoner */
  model: string
  /** 系统提示词（可选） */
  systemPrompt?: string
  /** API 基础地址（默认 https://api.deepseek.com） */
  baseUrl?: string
}

// ---------- 插件 ----------
export type WidgetType = 'clock' | 'todo' | 'search' | 'mc' | 'chat' | 'api'

export interface WidgetConfig {
  id: string
  type: WidgetType
  title: string
  /** gridstack 网格坐标与尺寸 */
  x: number
  y: number
  w: number
  h: number
  /** 卡片背景毛玻璃模糊，false 表示关闭（默认开启） */
  blur?: boolean
  /** 无背景模式：true 时去掉边框与背景，内容直接浮在壁纸上（默认关闭） */
  transparent?: boolean
  /** type === 'api' 时的接口配置 */
  api?: ApiConfig
  /** type === 'todo' 时的待办列表 */
  todos?: TodoItem[]
  /** type === 'search' 时的搜索引擎 ID（baidu/bing/google/sogou/github） */
  searchEngine?: string
  /** type === 'mc' 时的 MC 服务器配置 */
  mc?: McConfig
  /** type === 'chat' 时的 DeepSeek 对话配置 */
  chat?: ChatConfig
  /** type === 'chat' 时的对话历史 */
  chatMessages?: ChatMessage[]
  /** 内容字体缩放倍率，0.8 ~ 1.6（默认 1） */
  fontScale?: number
  /** 内容字体颜色（hex），缺省时使用默认白色系 */
  fontColor?: string
}

// ---------- 主题 ----------
export interface ThemeConfig {
  /** 预设 ID，'custom' 表示自定义渐变色 */
  presetId: string
  /** 渐变三色（起始 / 中间 / 结束），hex 格式 */
  colors: [string, string, string]
}

// ---------- 应用总配置 ----------
export interface AppConfig {
  theme: ThemeConfig
  wallpaper: WallpaperConfig
  drawers: DrawerConfig[]
  widgets: WidgetConfig[]
  /** 网格列数（用于旧布局迁移检测） */
  columns?: number
}

/** gridstack 回写的布局项 */
export interface WidgetLayout {
  id: string
  x: number
  y: number
  w: number
  h: number
}
