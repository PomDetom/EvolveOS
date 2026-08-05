# ui-design — Tauri 统一 UI 设计系统

为多个 Rust Tauri 桌面应用（剪贴板、密码管理、记账等）建立统一设计语言的**设计系统展示页**。
纯原生 Web（Vite + HTML/CSS/JS，**零框架零运行时依赖**），组件 = 原生 HTML + CSS 类（BEM `c-` 前缀）+ 渐进增强 JS。

## 特性

- **克制的玻璃质感**：rgba 层叠 + `backdrop-filter` 模糊 + 高光描边，深/浅双主题
- **6 套主题色**：靛蓝 / 青绿 / 天蓝 / 琥珀 / 紫罗兰 / 翡翠，`data-accent` 一键切换
- **滑动选择导航（NavigationWheel）**：滚动 focal 变形、拖拽惯性、居中吸附、键盘选择
- **主题定制器**：11 条滑杆实时预览 + 导出 CSS 变量 + 设置页整页嵌入
- **3 个场景模板**：剪贴板悬浮窗 / 主窗口 / 设置页（Tauri 接入见下文文档）
- **32 组件完整矩阵**：按钮/表单/数据展示/浮层反馈/悬浮窗专属组件

## 快速开始

```bash
npm install        # 安装依赖（要求 Node ^20.19.0 || >=22.12.0）
npm run dev        # 开发服务器 (localhost:5173)
```

## 命令

| 命令 | 说明 |
|---|---|
| `npm run dev` | 开发服务器 (localhost:5173) |
| `npm test` | Vitest 单元测试（几何/spring/store/apply） |
| `npm run test:e2e` | Playwright 交互测试（自动拉起 dev server） |
| `npm run test:visual` | 视觉回归（对比基线快照；首次或界面变更后先 `npx playwright test tests/e2e/visual-regression.spec.js --update-snapshots` 重新生成） |
| `npm run build` | 生产构建（dist/） |
| `npm run preview` | 预览生产构建 |

## 目录结构

```
src/
├── main.js                 # 入口：骨架组装 + 全局挂载
├── styles/                 # 设计令牌（tokens/themes/motion/base/layout）
├── config/                 # 可配置层（defaults/store/apply）
├── motion/                 # spring 曲线 / 时长缩放
├── components/             # 32 个组件（各自 css + js，render()/mount() 契约）
├── demo/                   # 展示区（令牌/组件矩阵/动效实验室/主题定制器）
└── scenes/                 # 3 个场景模板（剪贴板悬浮窗/主窗口/设置页）
tests/
├── unit/                   # Vitest 单元测试
└── e2e/                    # Playwright 交互测试 + 视觉回归
docs/                       # 规格与计划文档
```

## 文档

| 文档 | 说明 |
|---|---|
| [Tauri 接入指南](docs/tauri-integration.md) | 透明窗口/拖拽/窗口控制/macOS/主题跟随/定制器嵌入/悬浮窗 |
| [设计规格](docs/superpowers/specs/2026-08-04-tauri-ui-design.md) | 已确认的设计规格 |
| [实施计划](docs/superpowers/plans/2026-08-04-tauri-ui-design.md) | 21 任务实施计划 + 修订记录 |

## 全局约束

- 零运行时依赖；动画只动 transform/opacity，模糊永不动画，6 项以上动画必须 stagger
- 所有时长/曲线经 CSS 变量引用（`--dur-*`/`--ease-*`，定制器可调）
- 图标全部内联 SVG（24×24，stroke 1.8）；文案中文
- `data-theme`/`data-accent` 挂 `<html>`
- 验收提示：动效流畅度与 stagger 遵守可在 DevTools Performance 面板录制
  NavigationWheel 拖动观察帧率（帧耗时 < 16ms 为佳）
