# EvolveOS — 多应用综合管理系统

EvolveOS 是一个**多应用综合管理系统**——以统一应用壳承载多个桌面应用（剪贴板 / 密码 / 记账…），共享设计系统（令牌 / 34 组件 / 主题定制器）为基础设施。应用 = 自己的页面（`src/apps/<id>/`，壳零侵入），壳提供一体式标题栏、级联双窗导航、统一设置与开发治理（框架 `ui/*` / 应用 `app/<id>/*` 双轨）。纯原生 Web（Vite + HTML/CSS/JS，**零框架零运行时依赖**），组件 = 原生 HTML + CSS 类（BEM `c-` 前缀）+ 渐进增强 JS。

## 两种形态

| 形态 | 入口 | 说明 |
|---|---|---|
| **应用壳**（主体） | 浏览器 `/`（默认，与 Tauri 一致）；`?mode=app` 显式 | 一体式标题栏 + 级联双滑动窗口（左=应用列表 / 右=应用目录或设置目录，纯图标栏）+ 黄金比例锚点（38.2%）+ 右下 FloatBall 悬浮条演示；手机（≤900px）底部横滑应用轮 + 全屏页面栈；模块占位，逐个填充真实小应用；设计系统展示已内化为设置「组件」「动效」分区 |
| **FloatStrip 悬浮条** | 浏览器 `?mode=strip` | 独立悬浮条形态：横竖双形态 + 四边磁吸 + 无边框内容优先（与 app 互斥渲染），供独立透明窗口接入 |

## 特性

- **克制的玻璃质感**：rgba 层叠 + `backdrop-filter` 模糊 + 高光描边，深/浅双主题
- **12 套主题色**：靛蓝 / 青绿 / 天蓝 / 琥珀 / 紫罗兰 / 翡翠 / 玫红 / 橙 / 青柠 / 青 / 蓝 / 品红，`data-accent` 一键切换
- **滑动选择导航（NavigationWheel）**：黄金比例锚点（38.2%）、滚动 focal 变形、拖拽惯性、居中吸附、横竖方向参数化
- **主题定制器**：9 条滑杆实时预览 + 导出 CSS 变量 + 设置页整页嵌入
- **Tauri 壳**：无边框透明窗口（960×560）、窗口控制桥、拖拽 region
- **FloatStrip 悬浮条**：横竖双形态 + 四边磁吸 + 无边框内容优先（`?mode=strip` 独立入口 + 应用壳右下 FloatBall 演示）
- **手机形态**：≤900px 底部横滑应用轮 + 全屏页面栈（与桌面级联双窗经媒体查询切换）

## 快速开始

```bash
npm install        # 安装依赖（要求 Node ^20.19.0 || >=22.12.0）
npm run dev        # 开发服务器 (localhost:5173) → 浏览器打开应用壳模式
npm run tauri:dev  # 桌面窗口运行（应用壳模式）
```

## 命令

| 命令 | 说明 |
|---|---|
| `npm run dev` | 开发服务器 (localhost:5173) |
| `npm test` | Vitest 单元测试（几何/spring/store/apply/mode） |
| `npm run test:e2e` | Playwright 交互测试（自动拉起 dev server） |
| `npm run test:visual` | 视觉回归（对比基线快照；界面变更后先 `npx playwright test tests/e2e/visual-regression.spec.js --update-snapshots` 重新生成） |
| `npm run build` | 生产构建（dist/） |
| `npm run tauri:dev` | Tauri 桌面开发运行（应用壳） |
| `npm run tauri:build` | Tauri release 打包 |

## 目录结构

```
src/
├── main.js                 # 入口：模式分支（app / strip）
├── styles/                 # 设计令牌（tokens/themes/motion/base/layout）
├── config/                 # 可配置层（defaults/store/apply）
├── motion/                 # spring 曲线 / 时长缩放
├── components/             # 34 组件（各自 css + js，render()/mount() 契约；含 float-strip 悬浮条）
├── demo/                   # 应用壳复用的展示模块（组件矩阵/动效实验室/定制器）
├── app/                    # 应用壳（mode 解析 / app-main / strip-main 入口 / FloatBall 演示）
├── apps/                   # 应用（每个子目录一个应用，src/apps/<id>/index.js 导出 module，壳 glob 发现）
├── scenes/                 # 场景模板（剪贴板悬浮窗；设置页共享 settings-pages）
src-tauri/                  # Tauri 2 壳（无边框透明窗口 + 窗口控制）
tests/
├── unit/                   # Vitest 单元测试
└── e2e/                    # Playwright 交互测试 + 视觉回归（30 张基线）
docs/                       # 规格 / 计划 / 执行留痕（全部集中在此，随代码提交）
```

## 文档

| 文档 | 说明 |
|---|---|
| [Tauri 接入指南](docs/tauri-integration.md) | 透明窗口/拖拽/窗口控制/macOS/主题跟随/定制器嵌入/悬浮窗 |
| [应用壳设计规格](docs/superpowers/specs/2026-08-05-app-shell-ui-design.md) | 应用壳 UI 设计（级联双窗/纯图标/黄金比例锚点/悬浮条/手机形态） |
| [设计系统规格](docs/superpowers/specs/2026-08-04-tauri-ui-design.md) | 设计系统基础规格 |
| [应用壳实施计划](docs/superpowers/plans/2026-08-05-app-shell.md) | 应用壳转型实施计划（7 任务，含执行交接指引） |
| [设计系统实施计划](docs/superpowers/plans/2026-08-04-tauri-ui-design.md) | 21 任务实施计划 + 修订记录 |

## 全局约束

- 零运行时依赖；动画只动 transform/opacity，模糊永不动画，6 项以上动画必须 stagger
- 所有时长/曲线经 CSS 变量引用（`--dur-*`/`--ease-*`，定制器可调）
- 图标全部内联 SVG（24×24，stroke 1.8）；文案中文
- `data-theme`/`data-accent`/`data-motion` 挂 `<html>`
- 滑动导航选中锚点为黄金比例 38.2%；滑动窗口纯图标，名称由标题栏承担
- 测试仅在 Web 环境执行（不跑 webview 真机验证）
