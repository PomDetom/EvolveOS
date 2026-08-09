# Task B6-R2-2 报告：按钮精致浅色半透明材质（+ 按钮像素基线）

- **任务**: B6-R2-2（来源：`docs/superpowers/sdd/task-B6-R2-2-brief.md`；规格 `docs/superpowers/specs/2026-08-09-app-shell-b6-page-style-refresh-r2-design.md` §5，唯一需求源）
- **分支**: `feature/b6-r2-page-style-refresh`（共享 checkout，无 worktree 隔离）
- **状态**: DONE

## 实施内容

1. **`src/components/button/button.css`** — primary/danger 重写为精致浅色材质（brief Step 3 原值 verbatim）：
   - `.c-btn--primary`：底 `var(--accent-100)`（浅 tint，非旧 `var(--accent)` 纯色）+ 字 `var(--accent-600)` + 柔和 accent 描边 `1px solid color-mix(in srgb, var(--accent-500) 45%, transparent)` + 顶部白内高光 `inset 0 1px 0 rgba(255,255,255,0.5)` + `--shadow-sm`。
   - hover：`translateY(-1px)` 上浮 + 阴影加深 `--shadow-md` + 底色深一档 `--accent-200`（两主题一致）。
   - active：`translateY(0) scale(0.97)` 压下 + 阴影回落 `--shadow-sm`。
   - `.c-btn--danger`：同机制 —— `--danger-50` 底 + `--danger-600` 字 + `color-mix(in srgb, var(--danger-500) 45%, transparent)` 描边 + 白内高光；hover 底色 `color-mix(in srgb, var(--danger-50) 75%, var(--danger-500))` 深一档。
   - **删除**旧 B6-3 `:root[data-theme]` color-mix 明暗 hover 规则（primary/danger 共 4 条）；`secondary`/`ghost` 不动；`.c-btn` 基类 transition 已含 transform/background/box-shadow（hover 过渡生效，无需改）。全局 `box-sizing: border-box` → 加 1px 描边不改 32px 高度。

2. **`tests/e2e/components-basic.spec.js`** — 按钮断言全部同步到新材质语义：
   - **替换** B6-3「实色扁平 + luma 明暗 hover」用例 → brief Step 1 verbatim「B6-R2-2：primary 浅色材质」（accent-100 底 / accent-600 字 / 描边存在 / hover 上浮 transform + --shadow-md blur-16 + accent-200 底；色值经 `toRGB` 归一化，与 Chromium 151 的 oklab/color(srgb) 序列化解耦）。
   - **删除** B6-3「主按钮 hover 中性投影（--shadow-sm 无内高光）」用例（其 hover=shadow-sm+无 inset 语义被新材质直接取代，新用例已覆盖 hover shadow-md）。
   - **新增**「B6-R2-2 补充」用例（spec §5 验证清单补齐）：静止态顶部白内高光 inset + active `scale(0.97)`（`page.mouse.down` 触发 :active）+ danger 浅色材质（danger-50 底 / danger-600 字 / 描边）。
   - **更新** B5-3 用例按钮断言：`not.toContain('inset')`（扁平实心）→ `toContain('inset')`（顶部白内高光），`backgroundImage === 'none'`（纯 tint 无渐变）保留。
   - `grep accent-300|color-mix|accent-contrast|lightLuma|darkLuma|not.toContain('inset')` 无残留旧断言（color-mix 仅剩 badge/悬浮球既有用例引用）。

3. **`tests/e2e/visual-regression.spec.js`** — SHOTS 加 `['buttons', '.app-main__settings [data-page="components"] .showcase:has-text("按钮")', 8]`（修复 B6 最终评审 Important-1 跟进项：按钮矩阵在设置窗 fold 下，components-partition 截图不含按钮，本 SHOT 下滚到按钮 showcase 单独捕获）。

4. **`tests/e2e/visual-regression.spec.js-snapshots/`** — 新增 6 张 `buttons-*` 基线（light/dark × indigo/amber/emerald）。

## TDD 证据（RED → GREEN）

**Step 1-2 RED**（实施前）：`npx playwright test --config=playwright.config.worktree.js tests/e2e/components-basic.spec.js -g "B6-R2-2"`
```
3 failed
× B5-3：徽标/按钮/悬浮球 iOS 风格（按钮 B6-R2-2 浅色材质）→ box-shadow 无 inset（旧实色扁平无内高光）
× B6-R2-2：按钮 primary 浅色材质 → 底为 var(--accent) 非 accent-100、无描边、hover 无上浮
× B6-R2-2：按钮顶部内高光 + active 压下 + danger 浅色材质 → inset 断言失败
```
**Step 4 GREEN**（实现后）：同一命令 → `3 passed`；components-basic 全文件 → `6 passed`。

## 视觉基线（Step 5，先解码比对再更新）

**解码比对闸门**（裸跑 `--update-snapshots` 之前）：`npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js` → **24 passed（既有 24 张零变化）+ 6 failed（buttons 无基线）**。这证明按钮材质改动在 components-partition 截图 fold 之下、不影响任何既有基线（无需解码逐像素比对 —— 裸跑即通过=字节一致）。

**更新**：`--update-snapshots` → 30 passed；`git status` 确认 **仅新增 6 张 buttons-*.png（untracked `??`），既有 24 张零修改**（总数 24 → 30）。新基线 PNG 体积 78-190KB（swiftshader 确定性渲染，非空）。

## 全量回归（Step 6）

- `npx playwright test --config=playwright.config.worktree.js` → **123 passed（全绿）**（三轮运行，前两轮含与本次改动无关的加载时序 flake：smoke「app shell renders」/ app-shell「亚克力两档」/ mobile-nav「概览主题状态卡」—— 均为 `page.goto` 后首断言 5s 内惰性挂载元素未就绪的冷启动时序问题，三个用例隔离重跑均绿；第三轮全量全绿）。
- `npm test` → **15 files / 68 passed**（customizer 曾因与后台 e2e 并发 CPU 争用偶发 1 flake，独占重跑全绿）。
- `npm run build` → **✓**

## 文件变更

- `src/components/button/button.css`（primary/danger 浅色材质三态，删 color-mix 明暗规则）
- `tests/e2e/components-basic.spec.js`（按钮断言同步新材质语义）
- `tests/e2e/visual-regression.spec.js`（SHOTS + buttons 项）
- `tests/e2e/visual-regression.spec.js-snapshots/`（+6 张 buttons 基线）
- `docs/superpowers/sdd/task-B6-R2-2-report.md`、`docs/superpowers/sdd/progress-b6-r2.md`、`docs/superpowers/sdd/task-B6-R2-2-brief.md`

## 自评

- **完整性**：primary/danger 新材质三态 + 旧 color-mix 规则删除 + B5-3/B6-3 断言同步 + buttons 像素基线（6 新 + 既有零变化）+ 全量回归全绿 ✓
- **质量**：CSS 沿用既有 `.c-btn` 基类 transition（transform/background/box-shadow 过渡天然生效）、全部引用令牌（accent-100/200/500/600、danger-50/500/600、shadow-sm/md）无硬编码色值，风格与现有代码一致 ✓
- **纪律**：材质体系（themes.css）、`--font-mono`、12 套色板、配置链路（defaults→store→apply）均未触碰；secondary/ghost 未动；`playwright.config.worktree.js` 未提交；组件/动效等既有 24 张基线零变化 ✓
- **动画红线**：hover/active 仅 transform（translateY/scale）+ background + box-shadow（paint-only 豁免，duration 经 `--dur-fast`）；无 layout 属性动画、模糊永不动画 ✓

## 备注 / 关注点

- **danger hover 色档**：brief 用 `color-mix(in srgb, var(--danger-50) 75%, var(--danger-500))`（规格 §5 允许「80% 或既有所需档位」），落地按 brief 75%。
- **`--accent-100` 为不透明浅 tint**（观感柔和似半透明，与 nav 选中一致）—— 非字面 translucency，两主题均生效（浅色=pastel tonal，深色=浅色 pastel 按钮）。
- **基线无关性已证**：按钮改动全在 fold 下，components-partition 等 24 张基线字节不变；新 buttons 基线独立捕获按钮 showcase。
- **e2e 冷启动 flake（环境）**：全量三轮中偶现的 3 个失败均与本次改动无关（未触碰相关代码），隔离重跑全绿，第三轮全量全绿；已记入账本，供控制器在最终评审时知悉。

---

## 评审（独立评审占位）

（独立评审结论待控制器评审后填写 / 无评审发现则标 clean。）
