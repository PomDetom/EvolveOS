# Task B5-1: 字体全局替换（阿里普惠体 55/85）— 实施报告

- **状态**：DONE
- **需求源**：docs/superpowers/sdd/task-B5-1-brief.md（唯一需求源，本文件为逐字转录 + 一处 verbatim 适配，见「verbatim 适配说明」）
- **分支**：feature/b5-design-language（worktree b5-design-language）

## 任务背景

B5「设计语言统一」第一个任务。将全局正文字体替换为阿里普惠体：`src/styles/fonts.css` 定义 55 Regular（400）+ 85 Bold（700）两档 `@font-face`（WOFF2 官方包），`--font-sans` 加 `"Alibaba PuHuiTi"` 前缀 → 滑杆/组件/控件文字经 font-family 继承自动生效（B5-2/3/5 接口）。`--font-mono` 不动。零运行时依赖、零动画改动、纯配置 + 测试。

## 改动说明

| 文件 | 变更 |
|---|---|
| `src/assets/fonts/AlibabaPuHuiTi-3-55-Regular.woff2`（新增，5.0MB） | 从 Downloads 官方包复制 |
| `src/assets/fonts/AlibabaPuHuiTi-3-85-Bold.woff2`（新增，5.3MB） | 从 Downloads 官方包复制 |
| `src/styles/fonts.css`（新增） | 两档 `@font-face`：`'Alibaba PuHuiTi'` 400/700，`font-display: swap`，逐字按 brief |
| `src/styles/base.css` | 顶部（首行）加 `@import './fonts.css';`（@import 须先于其他规则） |
| `src/styles/tokens.css` | `--font-sans` 前缀加 `"Alibaba PuHuiTi"`，`--font-mono` 不动 |
| `tests/unit/font-assets.test.js`（新增） | 4 断言：WOFF2 存在性 + fonts.css 两档 @font-face + tokens `--font-sans` 前缀 + base.css `@import` 守卫 |
| `tests/e2e/tokens.spec.js` | 追加「B5-1：--font-sans 全局指向阿里普惠体」e2e（computed fontFamily 含前缀 + `document.fonts.check` 确认已加载） |
| `tests/e2e/visual-regression.spec.js` | 截图前显式 load 普惠体两档（替代仅 `document.fonts.ready`，见下） |
| `tests/e2e/visual-regression.spec.js-snapshots/*`（24 张） | 全量重生成（字体替换预期内） |

- **动画红线**：零动画改动（纯 @font-face + 令牌 + 测试）。
- **配置链路**：本任务不涉及界面参数，无 defaults → store → apply 链路。
- **`--font-mono`**：保留 JetBrains Mono/Cascadia，未触碰。

### verbatim 适配说明（重要披露）

Brief 的 e2e 字体等待代码为：
```js
await page.evaluate(() => document.fonts.ready);
...
const loaded = await page.evaluate(() => document.fonts.check('14px "Alibaba PuHuiTi"'));
expect(loaded).toBe(true);
```
实测**该序列竞态**：`page.goto` 完成后立刻 `document.fonts.ready` 会先 settle（此时字体尚未被渲染惰性触发加载，`status` 已为 `"loaded"` 但两档 face 仍是 `unloaded`），随后 `check()` 返回 `false` → 断言红。排查证据（临时调试 spec，已删除）：在 evaluate 内 `await document.fonts.ready` 后立即 `check('14px "Alibaba PuHuiTi"')` 恒为 `false`，延时 500ms 后再查为 `true`；两档 face 最终均 `status: "loaded"`，字体文件 HTTP 200 正常。

**适配**：两处 e2e（tokens.spec.js 新测试 + visual-regression.spec.js 截图前）改用 `document.fonts.load('14px "Alibaba PuHuiTi"')` / `document.fonts.load('700 14px "Alibaba PuHuiTi"')` **显式强制拉取并等待**，随后 `check()` 稳定为 `true`。理由：`FontFaceSet.load()` 规范上强制发起加载并返回完成 promise，消除「ready 早 settle」竞态；仅改等待机制，**不改任何断言**（computed fontFamily 含前缀 + check 为 true 两条断言原样保留）。视觉回归同样改用显式 load，更契合「CJK 字体大、截图前必须等加载完成防基线抖动」的初衷。

## TDD 证据

- **Step 2 写测试**：`tests/unit/font-assets.test.js`（逐字按 brief 建）。
- **Step 3 RED**：`npx vitest run tests/unit/font-assets.test.js` → **3 failed | 1 passed**。
  失败三条正符合 brief 预期红态：
  - `fonts.css` 不存在 → `readFileSync` ENOENT（@font-face 断言无法通过）；
  - `tokens.css --font-sans 含 Alibaba PuHuiTi 前缀` 失败（未改前缀）；
  - `base.css 引入 fonts.css` 失败（无 @import）。
  通过一条为 WOFF2 存在性（Step 1 已复制字体文件，属实现前置产物，非代码集成）。
- **Step 4-6 实现**：fonts.css 新建、tokens.css 前缀、base.css @import（均逐字按 brief）。
- **Step 7 GREEN**：`npx vitest run tests/unit/font-assets.test.js` → **4 passed**（`✓ tests/unit/font-assets.test.js (4 tests)`）。

## 验证结果

| 命令 | 结果 |
|---|---|
| `npx vitest run tests/unit/font-assets.test.js`（改前） | 3 failed | 1 passed（RED，符合 brief 预期） |
| `npx vitest run tests/unit/font-assets.test.js`（改后） | 4 passed（GREEN） |
| `npx vitest run tests/e2e/… `（含浏览器字体加载确认，临时 debug spec） | 确认两档 face `loaded`、`check` 400/700 均 `true`；`document.fonts.ready`+`check` 竞态复现后弃用 |
| `npx playwright test --config=playwright.config.worktree.js tests/e2e/tokens.spec.js` | 3 passed（含新增 B5-1 断言） |
| `npm test` | 13 files / **62 passed**（+4 为本任务新增 font-assets.test.js） |
| `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js --update-snapshots` | **24 passed**，24 张全量重生成 |
| `npx playwright test --config=playwright.config.worktree.js`（全量 e2e，前台） | 首次 **106 passed / 1 failed**（app-shell.spec.js:270 `.csg` 计数超时 flake，见下） |
| `npx playwright test --config=playwright.config.worktree.js tests/e2e/app-shell.spec.js`（flake 单独复跑） | **30 passed**（1.9m，含 line 270 用例）→ 确认 flake |
| `npm run build` | 通过（Vite，`✓ built in 860ms`；两 WOFF2 进 dist/assets，各 5.2/5.6MB） |

> **全量 e2e flake 说明**：全量 e2e 合计 107 用例（基线 106 + 本任务新增 tokens B5-1）。后台先行版（controller 已终止挂死进程）曾 `Target crashed` 挂死；前台重跑后仅剩 1 例失败 —— `app-shell.spec.js:270` `.csg` 5s 超时为 0 元素（组件分区惰性挂载在资源紧张时未按时完成）。该 `.csg` 计数 7 断言在 visual-regression.spec.js（components 分区截图前置断言）与 app-shell.spec.js 单独复跑中**均通过**，判定为环境 flake（共享 checkout tauri dev + 5173 server 仍在运行，资源偏紧）而非代码回归。

### 视觉基线解码比对（先比对、后提交）

新旧对比样本 3 张（跨 shot 类型）：`app-main-light-indigo`、`appearance-partition-light-indigo`、`components-partition-dark-amber`。方法：PIL 逐像素差分 + 色板量化对比 + 大 delta（≥100）像素的颜色转移分析（Read 工具本环境无法渲染图片，故以程序化分析替代目检）。

- **变化量**：全部 24 张变化像素占比 0.17%–1.65%（motion 分区文字最密集 1.63–1.65%，components 暗色最低 0.42–0.49%）——稀疏、均匀，无单张异常（>20% 则疑布局/颜色断裂）。
- **色板**：old/new 量化 top 色（/8）**集合完全相同**，仅计数在「纯背景」与「背景-文字 AA 中间色」桶间迁移 —— 字形替换特征，无新增/消失颜色。
- **大 delta 转移**：delta≥100 像素的 old→new 颜色转移全部为 **背景↔文字色翻转**（浅色 `(31,31,31)`↔`(13-18,…)`/`(5,5,6)`；深色 `(28,28,29)`↔`(8,7,3)` 琥珀色文字）。无 accent↔背景、无整块区域翻转 → **无布局位移、无配色意外**。
- **结论**：24 张差异均为**纯文字字形替换**（普惠体 vs 原系统字体），符合 B5-1 预期，可提交基线。

## Self-review 结论

- **规格符合**：`@font-face` 两档、`--font-sans` 前缀、`--font-mono` 不动、零依赖、零动画改动，均按 brief。
- **单测守卫**：4 断言逐字取自 brief；`new URL(path, import.meta.url)` 两参字面量问题沿用 window-capabilities 的「先取变量再作 base」模式（brief 注明的同款适配）。
- **e2e 断言**：tokens B5-1 两条断言（computed fontFamily 含前缀 + check 已加载）原样保留；仅等待机制由 `fonts.ready` 适配为 `fonts.load`（竞态修复，已披露）。
- **质量**：单测 62/62、全量 e2e 107 用例并集全绿（首次 1 例 `.csg` 超时 flake → 单独复跑 app-shell.spec.js 30/30 绿）、build 通过。
- **结论**：Ready to merge（DONE）。

## 备注

- `playwright.config.worktree.js`（worktree 本地配置，端口 5174）**未提交**。
- 临时产物（debug-font.spec.js、PIL 分析脚本、/tmp 新旧快照备份）均在 repo 外或已删除，不入库。
- 提交惯例：feat + docs 两枚提交（docs 承载本报告/台账/评审哈希）。
