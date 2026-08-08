# SDD ledger — plan: docs/superpowers/plans/2026-08-08-app-shell-b4-desktop-realism.md

Base: 79d866f（branch feature/b4-desktop-realism，自 main 检出；工作树 Cargo.toml 行尾噪声未动）
交接：无（本迭代由 brainstorming 产出）
规格：docs/superpowers/specs/2026-08-08-app-shell-b4-desktop-realism-design.md（唯一需求源）
计划书：docs/superpowers/plans/2026-08-08-app-shell-b4-desktop-realism.md（唯一实施需求源）

## Pre-flight 扫描（2026-08-08，干净，无阻塞冲突）

- 无任务间矛盾；无「测试断言空洞/逻辑块逐字重复」的计划强制造缺陷。
- B4-2 默认 14×1 计算值不变 → 视觉零漂移；B4-3/4 各重生成 appearance-partition 6 张（删滑杆 + 网格 6→12）。
- B4-3 删色彩微调链：先 grep `hexToHsl`/`temperatureToHue` 消费点再删导出；存量 localStorage `color:{...}` 死键不清理。
- B4-5/6 e2e 用 `page.addInitScript` 注入 mock `__TAURI__`；浏览器路径必须零回归。capability `windows` 须含 `"strip"` 否则 strip 窗口自身权限被拒。
- B4-2 e2e 断言读真实元素解析 `fontSize`（getComputedStyle 自定义属性返回未解析 calc 字符串）。

## Task B4-1: 窗口控制权限修复

- **状态**：完成（2026-08-08，见 task-B4-1-report.md）
- **提交**：`f5a16dc` `fix: Tauri 窗口控制权限（min/max/close/拖拽 capability 授权，闭环 B4-1）`
- **验证**：TDD 红→绿（单测断言 7 项窗口权限，纯配置改动）；npm test 61/61（11 files，+1 新增）；npm run test:e2e 100 passed（含视觉基线 24，纯配置零漂移，未跑 --update-snapshots）；npm run build 通过
- **实现**：`src-tauri/capabilities/default.json` permissions 追加 7 项 `core:window:allow-*`（minimize/maximize/unmaximize/toggle-maximize/close/is-maximized/start-dragging）；新增 `tests/unit/window-capabilities.test.js` 作配置守卫
- **简报/报告**：docs/superpowers/sdd/task-B4-1-brief.md / task-B4-1-report.md
- **评审**：规格 ✅ / Approved（0 Critical，0 Important，2 Minor 免修）——Minor：① 单测断言包含而非精确集（brief 字面，后续可收紧）；② 提交拆为 fix + docs 两枚（B3 既有惯例，非偏差）
- **执行状态**：Task B4-1：✅ 完成（f5a16dc，评审通过）

## Task B4-2: 文字排版真实生效（baseSize/scale 全局缩放）

- **状态**：完成（2026-08-08，见 task-B4-2-report.md；DONE_WITH_CONCERNS：两处 verbatim 适配）
- **提交**：`b6ba3ac` `feat: 文字排版真实生效（字号令牌派生自 --font-size-base，baseSize/scale 全局缩放，闭环 B4-4）`
- **验证**：TDD 红→绿（单测先红 `expected '14px' to be 'calc(14px * 1.15)'` → 改三处源 → 绿）；npm test 62/62（+1）；npm run test:e2e 101 passed（含视觉 24 **零漂移**，未跑 --update-snapshots；含新增「文字排版全局缩放字号」e2e）；npm run build 通过
- **实现**：`--font-size-base = calc(baseSize px * scale)`（applyConfig + customizer-css 导出对齐）；tokens.css 字号令牌全部派生自 `--font-size-base`（`* 5/7、6/7、8/7、10/7、12/7、*2`，默认 14×1 计算值浮点精确整数 → 零漂移）
- **verbatim 适配**：① brief 乘数 0.714/0.857/1.143/1.429/1.714 默认 14×1 下产生 9.996/11.998/16.002/20.006/23.996 子像素值 → 视觉 3/24 漂移（stash 归因确证）→ 改精确有理数以兑现零漂移 MUST；② brief e2e 选择器 `.cust-row:has-text("缩放")` 与「时长缩放」strict 冲突 → 改 `.cust-range[data-key="scale"]`
- **简报/报告**：docs/superpowers/sdd/task-B4-2-brief.md / task-B4-2-report.md
- **评审**：规格 ✅ / Approved（0 Critical，0 Important，3 Minor 免修）——Minor：① 单测断言精确字符串（brief 字面契约，可接受）；② e2e 方向断言可补精确值（brief 字面）；③ 提交拆 fix + docs 两枚（既有惯例）
- **执行状态**：Task B4-2：✅ 完成（b6ba3ac，评审通过）

## Task B4-3: 删色彩微调组（色相/饱和度/色温），强调色 = 预设色板直出

- **状态**：完成（2026-08-08，见 task-B4-3-report.md；DONE_WITH_CONCERNS：两处 verbatim 适配）
- **提交**：`8eb3162` `feat: 删色彩微调组（色相/饱和度/色温），强调色=预设色板直出（B4-3）`
- **验证**：TDD 红→绿（单测层红信号不在 apply.test.js —— 替换用例后即绿，因删 import 也删了唯一红引用；真实红信号在 customizer.test.js 渲染面板 `RANGES['hue']` 变 undefined → 两处 `g.sliders` 未定义兜底修复）；npm test 56/56（11 files）；npm run test:e2e 100 passed（含视觉基线 24；appearance-partition 6 张重生成）；npm run build 通过
- **实现**：全链删净 —— `defaults.js` 删 `color:{...}` + RANGES hue/saturation/temperature 三行；`apply.js` 删 `applyColorTint`/`temperatureToHue`/`hexToHsl`（grep 确认无残留消费者）/ACCENTS import/两处覆盖调用；`customizer-panel.js` 删 CFG_PATH 三键、整体色调组 sliders、`hueSliderValue`/`tintHsl`/`tintSwatch`、renderSlider/fmtValue/syncUI 的 hue 分支，预览卡 `--preview-accent` 改 `ACCENTS.find(...).color`；`customizer-css.js` 删 tint/temp 导出链；`customizer.css` 删死 CSS `.cust-tint-swatch`；`tokens.css` 注释去色温滑杆引用
- **verbatim 适配**：① brief 新 e2e 断言 `rgb(45, 212, 191)` —— 实测未注册 CSS 自定义属性保持原始序列化（hex）→ 改 `'#2dd4bf'`（与 tokens.spec 对同一变量既有断言一致，语义不变）；② brief「一个 commit」与报告需含 feat 哈希冲突 → 沿用 B4-1/2 惯例拆 feat + docs 两枚（报告承载哈希）
- **简报/报告**：docs/superpowers/sdd/task-B4-3-brief.md / task-B4-3-report.md
- **评审**：规格 ✅ / Approved（0 Critical，0 Important，2 Minor 免修）——Minor：① 提交拆 feat + docs 两枚（既有惯例）；② brief Step 1 预期红自相矛盾（既要删 temperatureToHue 又要其报不存在），实施者正确把真实 RED 定位到 customizer.test.js 闭环
- **执行状态**：Task B4-3：✅ 完成（8eb3162，评审通过）

## Task B4-4: 强调色预设扩至 12 套

- **状态**：完成（2026-08-08，评审通过，0 Critical/Important，2 Minor 免修）
- **提交**：`2fb1f72` `feat: 强调色预设扩至 12 套（玫红/橙/青柠/青/蓝/品红），B4-4`
- **验证**：TDD 红→绿（新用例实测 6 卡红 → 实现后绿）；npm test 56/56；npm run test:e2e 101 passed（含视觉基线 24，appearance-partition 6 张重生成）；npm run build 通过
- **实现**：defaults.js ACCENTS 6→12（rose #f43f5e/orange #f97316/lime #84cc16/cyan #06b6d4/blue #3b82f6/fuchsia #d946ef，color=设计规格 500 值，与 amber/emerald 既有惯例同构）；themes.css 6 个 `:root[data-accent]` 全阶色板（50–950 + 4 语义令牌，--accent 取 400、--accent-contrast 取 950）；e2e 断言 12 卡 + rose 点击 → `--accent`=#fb7185（rose-400）、`--preview-accent`=#f43f5e（ACCENTS color）
- **视觉基线**：仅 appearance-partition 6 张重生成（解码比对：色卡网格 3×2→3×4 多两行，内容下移 175px 均匀位移，其余 18 张零漂移）；复跑 24 全绿
- **简报/报告**：docs/superpowers/sdd/task-B4-4-brief.md / task-B4-4-report.md
- **评审**：规格 ✅ / Approved（0 Critical，0 Important，2 Minor）——Minor：① README/CLAUDE.md「6 套主题色」与 README「11 条滑杆」过期文案留收尾（非本 diff，收尾任务改）；② 新 CSS 块用单空格分号（brief 字面格式，非错误）
- **执行状态**：Task B4-4：✅ 完成（2fb1f72，评审通过）

## Task B4-5: 独立悬浮窗 —— 主窗创建 strip 窗口

- **状态**：完成（2026-08-08，评审通过，0 Critical/Important，3 Minor 免修）
- **提交**：`f307803` `feat: 主窗 FloatBall 创建独立 strip 窗口（透明置顶，B4-5）`
- **验证**：TDD 红→绿（单测 windows 无 strip 红 → 实现绿；e2e mock 实测 0 调用红 → 实现绿）；npm test 57/57（+1）；npm run test:e2e 102 passed（含视觉 24 零漂移，未跑 --update-snapshots；首轮 2 例 smoke/toast 冷启动 flake 复跑绿非因果）；floatstrip 浏览器回归 6/6；npm run build 通过
- **实现**：capability `windows` 加 `"strip"` + permissions 追加 4 项（create-webview-window/set-position/outer-position/set-size）；app-main.js `mountFloatBall` onExpand Tauri 分支——`WebviewWindow('strip', { url:'/?mode=strip', transparent, decorations:false, alwaysOnTop, resizable:false })`，已存在 → setFocus，`tauri://destroyed` 置空句柄，`return` 保证浏览器分支零改动；window-capabilities.test 追加 strip 断言；e2e mock `__TAURI__` 验证创建 opts
- **备注**：`stripWindow` 句柄放模块作用域（brief 字面「模块变量」；评审裁定与函数作用域功能等价，Playwright 每测试重载页面无跨测泄漏）
- **简报/报告**：docs/superpowers/sdd/task-B4-5-brief.md / task-B4-5-report.md
- **评审**：规格 ✅ / Approved（0 Critical，0 Important，3 Minor）——Minor：① 模块作用域句柄（无害）；② setFocus 未 await（cosmetic）；③ e2e 只断言 5/8 opts（brief 字面，width/height 未守卫，可选加固）
- **执行状态**：Task B4-5：✅ 完成（f307803，评审通过）

## Task B4-6: 独立悬浮窗 —— strip 窗口行为

- **状态**：完成（2026-08-08，评审通过，0 Critical/Important，0 Minor）
- **提交**：`7b3e5a7` `feat: strip 窗口行为（系统拖拽/尺寸贴合/位置持久化/关闭，B4-6）`（amend 自 1df5f19）
- **验证**：TDD 红→绿（e2e mock 实测 0 调用红 → 实现绿）；floatstrip 7/7（新用例 + 浏览器回归）；npm test 57/57；npm run test:e2e 103 passed（含视觉 24 零漂移，未跑 --update-snapshots）；npm run build 通过
- **实现**：mountFloatStrip 加 `windowMode`/`onResize`（默认 false/noop 向后兼容）；`startDrag` 窗口分支系统拖拽；`toggleOrientation` 窗口模式 `onResize()`/非窗口 `setPos`，`--rotating` 移除与 `onStateChange` 无条件；strip-main Tauri 分支（`.strip-root--window` 铺满 + 位置恢复 try/catch + fit 贴合 + onMoved 去抖 200ms 保存 + onClose→win.close）；float-strip.css 铺满规则
- **控制器裁定修复**：brief 原 verbatim `if (windowMode) { onResize(); return; }` 早退跳过 `--rotating` 类移除 → 真 Tauri 旋转后内容 opacity:0 永不可见（实施者披露）→ 裁定改为分支只 gate setPos/onResize、类移除与 onStateChange 无条件（评审验证浏览器路径字节等价）
- **测试适配（已披露）**：rotate 点击前加 `hover()`（`.c-strip__ctrl` 既有 pointer-events:none 直到 hover；真 Tauri 窗口=内容尺寸指针恒在 strip 上），断言不变
- **简报/报告**：docs/superpowers/sdd/task-B4-6-brief.md / task-B4-6-report.md
- **评审**：规格 ✅ / Approved（0 Critical，0 Important，0 Minor）——评审独立验证 rotate 修复形态 + 浏览器字节等价 + e2e 会红于 pre-task 码
- **执行状态**：Task B4-6：✅ 完成（7b3e5a7，评审通过）
