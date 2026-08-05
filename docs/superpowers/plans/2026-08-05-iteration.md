# 迭代期实施计划书（2026-08-05）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 进入迭代期：搭建 Tauri 壳支持桌面实际场景测试，并修复账本登记的遗留缺陷（deferred minors 与已知事项）。

**Architecture:** 在现有纯 Web 设计系统上增加 `src-tauri/`（Tauri 2 壳，引用 `dist/` 与 dev server）；迭代修复沿用现有组件/配置层模式，全部改动遵循根 CLAUDE.md 铁律与 src/docs 细则。

**Tech Stack:** Tauri 2 + Rust 1.97（本机已具备 rustup/cargo/VS2022）、现有 Vite 前端、Vitest + Playwright。

## Global Constraints

- 零运行时依赖（前端）不变；Tauri 壳的 Rust 依赖仅限 tauri 官方 crate。
- 前端代码在 Tauri 环境（`window.__TAURI__` 存在）与浏览器环境双态运行：窗口控制仅在 Tauri 下接线，浏览器保持演示行为。
- 动画红线、令牌引用、配置链路等既有规范全部生效。
- 每任务：计划/工作内容/提交留痕入 `docs/superpowers/sdd/`，随代码提交。
- 视觉基线：任何不改变默认渲染的改动，36 张基线不得重生成。

---

### Task I1: Tauri 壳搭建

**Files:**
- Create: `src-tauri/`（Cargo.toml / tauri.conf.json / src/main.rs + lib.rs / build.rs / icons / capabilities）
- Modify: `package.json`（tauri scripts: `tauri`、`tauri:dev`、`tauri:build`；devDependencies 加 `@tauri-apps/cli`）
- Create: `.taurignore`（忽略 node_modules/dist 等）

**Interfaces:**
- Produces: `npx tauri dev` 可启动桌面窗口加载本设计系统；tauri.conf.json 按 `docs/tauri-integration.md` §1.1 配置（880×560、decorations:false、transparent:true、shadow:true、minWidth 720/minHeight 480）
- `withGlobalTauri: true` — 前端通过 `window.__TAURI__` 访问 API

- [ ] **Step 1: 安装 CLI 并初始化**

Run: `npm install -D @tauri-apps/cli`
Run: `npx tauri init --app-name ui-design --window-title "UI Design System" --frontend-dist ../dist --dev-url http://localhost:5173 --before-dev-command "npm run dev" --before-build-command "npm run build"`（非交互参数；如 CLI 版本参数有差异，用 `npx tauri init --help` 确认后等价替代）

- [ ] **Step 2: 按指南配置 tauri.conf.json**

按 `docs/tauri-integration.md` §1.1：`decorations: false`、`transparent: true`、`shadow: true`、880×560、minWidth 720 / minHeight 480；`withGlobalTauri: true`；productName 自定义（中文「UI 设计系统」或英文标识，identifier 取 `com.uidesign.system`）。

- [ ] **Step 3: Rust 入口与能力配置**

默认生成的 main.rs/lib.rs 保持；`capabilities/default.json` 保持默认（core:default）；图标用 `npx tauri icon` 生成或使用默认占位图标。

- [ ] **Step 4: 验证编译与启动**

Run: `npm run tauri dev`（后台）— 预期首次编译 5-15 分钟（下载 crate）；成功后窗口加载设计系统页面（无边框透明窗口）。
Run: 窗口可见性验证（截图或进程存在 + 无 panic 日志）。
Run: 浏览器回归 `npm run test:e2e` 不受影响（前端零改动）。

- [ ] **Step 5: 提交**

`chore: Tauri 壳搭建（src-tauri + 配置 + scripts）`（含 package.json / src-tauri / .taurignore）

---

### Task I2: 窗口控制与拖拽接线

**Files:**
- Modify: `src/demo/` 或 `src/main.js`（窗口控制桥）
- Modify: `src/components/title-bar/title-bar.js`（按钮行为挂接）

**Interfaces:**
- Produces: `main.js` 中 `bindWindowControls()`：检测 `window.__TAURI__?.window`，存在时给 `.c-titlebar__control--min/max/close` 绑定 `getCurrentWindow().minimize()/toggleMaximize()/close()`（各 API 失败时静默降级）；浏览器环境不绑定（保持演示）
- 拖拽：`data-tauri-drag-region` 已标注，Tauri 自动接管 — 验证 TitleBar 可拖动窗口

- [ ] **Step 1: 写失败测试**

Playwright 无法测 Tauri API — 测试改为**桥接可测**：`bindWindowControls` 接受注入的 `windowApi` 参数（测试注入 mock 断言三按钮调用对应 API；无 API 时按钮保留默认演示行为）。

- [ ] **Step 2: 实现桥接**

按 Interfaces；`window.__TAURI__` 探测 + 注入参数双通道。

- [ ] **Step 3: 真机验证**

`npm run tauri dev` 下：三按钮分别最小化/最大化还原/关闭窗口；标题栏拖动窗口；透明与玻璃质感目检。

- [ ] **Step 4: 提交**

`feat: 窗口控制桥（Tauri API 接线 + 浏览器降级）`

---

### Task I3: 迭代修复批 1（低风险遗留项）

**Files:** 按项分布（见各子项）

**Interfaces:** 无新接口；修复现有行为。

- [ ] **Step 1: 滚动吸附补专用 e2e**（`tests/e2e/nav-wheel.spec.js` 追加：wheel 滚动后停止 → 吸附到最近项并选中；参考最终审查复评的实测方法）
- [ ] **Step 2: toast e2e flake 排查**（`tests/e2e/overlays.spec.js`：全量偶发失败 — 定位时序根因（2500ms 自动消失 vs 断言窗口），加稳定性处理）
- [ ] **Step 3: motion 红线口径文档固化**（`docs/CLAUDE.md` 或根 CLAUDE.md：红线补充「paint-only 过渡（background/border-color/box-shadow）豁免」说明 — 与既有实现的实际情况一致）
- [ ] **Step 4: 小修批**（每项独立小提交或合并一个提交，各自有测试/验证）：
  - `.tsw__mode` 补 `aria-pressed`（theme-switcher.js）
  - popover 常驻 document 监听 → 打开时一次性注册（popover.js）
  - tab 指示条 resize 重定位（tab.js）
  - `.c-btn--primary:hover` 阴影 → `--shadow-md` 令牌化（button.css）
  - fwin close 按钮补行为（floating-window.js：关闭 = 演示区移除）
  - 键盘方向键 select 前 preventDefault（已修？核实 nav-wheel.js）与 velocity EMA 平滑（如时间允许）
- [ ] **Step 5: 全量回归 + 提交**

Run: `npm test` + `npm run test:e2e` 全绿；提交 `fix: 迭代修复批 1（无障碍/浮层/令牌化/稳定性）`

---

### Task I4: 迭代修复批 2（规格缺口）

**Files:** 按项分布

**Interfaces:** 无新接口。

- [ ] **Step 1: 窄屏折叠导航**（规格 §10 缺口）：`@media (max-width: 900px)` 下侧边 NavigationWheel 折叠为顶部下拉（复用现有组件；顶部栏快捷跳转已有，折叠交互用简单 select/菜单）— 若工作量超预期，降级为「导航容器隐藏 + 顶部导航可用」并在报告注明取舍
- [ ] **Step 2: localStorage 不可用提示条**（规格 §13 缺口）：store.js 写失败时一次性 toast 提示（复用 toast 组件；隐私模式场景）
- [ ] **Step 3: 全量回归 + 提交**

Run: 全量测试；新样式/结构不改变默认渲染 → 基线不重生成；提交 `feat: 迭代修复批 2（窄屏折叠/存储降级提示）`

---

### Task I5: 桌面真机验收与收尾

- [ ] **Step 1: 桌面实测清单**：`npm run tauri dev` 下逐项验收 — 无边框透明窗口、标题栏拖动、三按钮窗口控制、深浅主题切换、6 套主题色、定制器实时生效、悬浮窗场景（剪贴板模拟窗拖拽）、NavigationWheel 滑动；记录发现的问题
- [ ] **Step 2: 修复实测发现**（若有，按 SDD 修复循环处理）
- [ ] **Step 3: 全量回归**：npm test + npm run test:e2e + npm run build；更新留痕
- [ ] **Step 4: 提交与汇总**：实测报告写入留痕；向用户汇报迭代期成果与待决事项
