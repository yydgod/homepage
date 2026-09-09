# Homepage · 浏览器起始页

一款可本地 `file://` 双击直开的浏览器起始页：自定义壁纸、可拖拽的插件网格、标签抽屉，以及零代码接入任意 API 的通用插件方案。

## ✨ 特性

- **自定义壁纸**：本地图片上传（自动压缩），支持模糊、亮度、遮罩、填充方式等样式调节
- **渐变主题**：8 套内置渐变主题 + 自定义三色渐变，全站颜色一键联动
- **插件网格**：24 列正方形细网格，自由拖拽、按格缩放，拖拽时显示辅助网格线
- **编辑模式**：未开启时卡片纯净无干扰，开启后 hover 浮出操作按钮
- **卡片外观**：每个插件可独立设置背景模糊、无背景模式、字体大小、字体颜色
- **标签抽屉**：抽屉卡片占网格格位、可迁移，内部标签「一个格子一个标签」均匀排布；标签图标支持本地上传、剪贴板粘贴并手动裁切
- **内置插件**：
  - 时钟 / 待办清单 / 搜索框（多引擎切换）
  - MC 服务器状态（在线人数、版本、MOTD）
  - DeepSeek 多轮对话（流式输出，Markdown 渲染）
  - 通用 API 插件（零代码接入任意接口）
- **数据持久化**：所有配置保存在 localStorage，刷新不丢失

## 🚀 快速使用

无需构建、无需服务器：

1. 直接双击 `dist/index.html`，用浏览器打开即可
2. 或克隆仓库后打开：`git clone https://github.com/yydgod/homepage` → 双击 `dist/index.html`

> 说明：起始页以 `file://` 协议运行，调用的远程接口需支持 CORS（`Access-Control-Allow-Origin: *`）。
> 内置的「一言」「天气」「MC 服务器」预设均已支持；DeepSeek 官方 API 允许 `file://` 场景（origin: null）直接调用。

## 🛠 开发

```bash
npm install       # 安装依赖
npm run dev       # 本地开发（Vite dev server）
npm run build     # 构建单文件产物到 dist/
```

构建使用 `vite-plugin-singlefile`，JS/CSS 全部内联进单个 `dist/index.html`，保证 `file://` 双击直开。

## 🧩 通用 API 插件

插件类型 `api` 通过一份统一 schema 调用任意接口并渲染返回内容，无需写代码：

| 配置项 | 说明 | 示例 |
|---|---|---|
| `url` | 接口地址 | `https://v1.hitokoto.cn` |
| `method` | GET / POST / PUT / DELETE | `GET` |
| `headers` | 请求头键值对 | `Authorization` |
| `params` | query 参数 | `city=beijing` |
| `body` | 请求体 JSON（非 GET） | `{"key":"value"}` |
| `timeout` | 超时（毫秒） | `8000` |
| `refreshInterval` | 轮询间隔（秒，0 关闭） | `30` |
| `responsePath` | 响应字段路径 | `data.list[0].temp` |
| `renderTemplate` | 渲染模板 | `当前温度：{{value}}℃` |

模板支持 `{{value}}`、`{{value.xxx}}`、`{{data}}`、`{{data.xxx}}` 插值，字段缺失显示「—」。

## 🤖 DeepSeek 对话插件

1. 设置 → 插件 → 添加「DeepSeek 对话」
2. 点击插件右上角编辑，填入 API Key（[platform.deepseek.com](https://platform.deepseek.com) 申请，仅保存在本地浏览器）
3. 支持 `deepseek-chat` / `deepseek-reasoner` 模型、自定义系统提示词、多轮对话、流式输出与 Markdown 渲染

## 🏗 技术栈

- Vue 3 + TypeScript + Vite 5
- Tailwind CSS 3.4（玻璃拟态风格）
- gridstack.js（插件网格拖拽/缩放）
- marked + DOMPurify（对话 Markdown 渲染与 XSS 消毒）
- vite-plugin-singlefile（单文件构建）
- localStorage 持久化

## 📁 项目结构

```
├── index.html                 # Vite 入口
├── vite.config.ts             # singlefile + base './'
├── src/
│   ├── App.vue                # 主布局：壁纸背景 + 网格 + 设置抽屉 + 编辑模式
│   ├── types/index.ts         # 全部类型契约（Wallpaper/Drawer/Widget/Api/Chat…）
│   ├── utils/                 # storage / image / path / template / color / id
│   ├── composables/           # useWallpaper / useDrawers / useWidgets / useApiRequest / useSettings / useTheme
│   ├── presets/               # 主题预设、插件预设与搜索引擎清单
│   └── components/
│       ├── WidgetGrid.vue     # gridstack 网格容器（24 列正方形 cell）
│       ├── WidgetWrapper.vue  # 插件卡片外壳与操作按钮
│       ├── DrawerCard.vue     # 标签抽屉卡片
│       ├── widgets/           # 时钟/待办/搜索/MC/对话/通用API
│       └── settings/          # 设置抽屉、各配置表单、图标裁切器
└── dist/index.html            # 单文件构建产物（可直接双击使用）
```

## 📄 License

MIT
