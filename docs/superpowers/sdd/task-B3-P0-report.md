# Task B3-P0: 概览「主题状态」卡陈旧修复（桌面+手机） — 实施报告

- **状态**：DONE
- **提交**：`71e55cd`
- **需求源**：docs/superpowers/sdd/task-B3-P0-brief.md（唯一需求源，修复逻辑按 brief「正确修法」逐字执行）
- **分支**：feature/b3-settings

## 背景与根因（brief §背景与根因，验证成立）

标题栏主题按钮点击链 `applyConfig(saveConfig({ theme: next }))`：`saveConfig` 先写 localStorage、再**同步**触发 store 订阅回调（`src/config/store.js:43`），然后 `applyConfig` 才写 `document.documentElement.dataset.theme`（`src/config/apply.js:57`）。原订阅回调内读 `data-theme` 读到的是**旧值**，故概览「主题状态」卡 label 不更新（B2 最终评审 Issue 1 parked）。手机端 `.app-main__stack-page[data-stack="overview"]` 的 label 在 R8 修复中完全未覆盖。

## 变更文件

| 文件 | 变更 |
|---|---|
| `src/app/app-main.js` | import 补 `prefersDark`（`applyConfig, prefersDark` from `../config/apply.js`）；subscribe 回调改读 `getConfig().theme` + `prefersDark()` 解析 system（与既有 `updateThemeIcon` 同模式），回调同步执行时能读到**新** theme；同一回调更新两处 label：桌面 `.app-main__page[data-page="home"].app-main__page--active .app-main__theme-row span`（`--active` 守卫保留）+ 手机 `.app-main__stack-page[data-stack="overview"] .app-main__theme-row span`（新增，无条件更新），各用 querySelector + 空值守卫（同现有风格） |
| `tests/e2e/app-shell.spec.js` | 既有用例「标题栏快捷主题按钮：三态循环 light→dark→system 且与设置同步」在 light→dark 点击与 `data-theme='dark'` 断言之后、进设置模式之前补桌面概览 label 断言（`.first()` + 精确文本 `当前主题：深色`） |
| `tests/e2e/mobile-nav.spec.js` | 新增用例「手机形态：概览主题状态卡随主题按钮实时更新」：seed `theme:'light'` + reload → 断言初始 `当前主题：浅色` → 点 `.c-titlebar__control--theme`（light→dark）→ 断言 `当前主题：深色` |

## 正确修法（brief §正确修法 逐字执行）

```js
const cfg = getConfig();
const isDark = cfg.theme === 'system' ? prefersDark() : cfg.theme === 'dark';
const label = `当前主题：${isDark ? '深色' : '浅色'}`;
```

- 配置链路：本次只**读** `getConfig()`，不写任何绕过链路的 CSS 变量 ✓
- 动画红线：仅文本同步，未触碰任何动画 ✓
- 无视觉基线变化：只改文本 label（同文替换），`npm run test:e2e` 中 24 张视觉回归全绿，零漂移 ✓

## 与 brief 的唯一偏差（已在代码注释 + 本报告披露）

brief 手机断言 snippet 未 seed 主题：默认 `theme:'system'`（`src/config/defaults.js:2`），Playwright fresh context 下首次点击 `THEME_CYCLE['system']→light`（index 2→0），label 保持「浅色」，第二断言恒红——**即便实现正确也无法转绿**（brief 注释「light → dark」与实际 cycle 不符）。

**处理**：手机用例补 `localStorage.setItem('ui-design-config', JSON.stringify({ theme: 'light' }))` + `reload()`（与桌面用例既有 seed 模式完全一致），使点击成为真正的 light → dark。断言文本、选择器、用例意图与 brief 逐字一致。此偏差仅在测试初始化，不改变被测行为。

## TDD 证据

- **Step 1（红，桌面）**：`npx playwright test tests/e2e/app-shell.spec.js -g "三态循环"` → **1 failed**。新断言期望 `当前主题：深色`，实测 `12 × locator resolved to <span>当前主题：浅色</span>`——正是 brief 所述的「订阅先于 applyConfig、读到旧 data-theme」根因。
- **Step 1（红，手机）**：`npx playwright test tests/e2e/mobile-nav.spec.js -g "手机形态：概览主题状态卡"` → **1 failed**。初始 `当前主题：浅色` 断言通过（seed 生效），点击后期望 `当前主题：深色`，实测仍 `浅色`——手机 label 完全未更新。
- **Step 3（绿，桌面）**：同一命令 → **1 passed**。
- **Step 4（绿，手机）**：`npx playwright test tests/e2e/mobile-nav.spec.js` → **8 passed**（新增用例 + 既有 7 用例零冲击）。

## 验证结果

| 命令 | 结果 |
|---|---|
| `npx playwright test tests/e2e/app-shell.spec.js -g "三态循环"` | 1 passed |
| `npx playwright test tests/e2e/mobile-nav.spec.js` | 8 passed（含新用例，其余 7 用例零冲击） |
| `npm test` | 60/60 passed（10 files，零单测触碰） |
| `npm run test:e2e` | 98 passed（含全部 24 张视觉回归，无基线漂移；未 update-snapshots） |
| `npm run build` | 通过（Vite，386ms） |

## Self-review 结论

- **规格符合**：两处 label（桌面 + 手机）都在同一 subscribe 回调内按 brief 逐字逻辑更新；桌面 `--active` 守卫保留、手机无条件更新；import 只补 `prefersDark`（apply.js 已导出，jsdom 缺 matchMedia 有守卫）；`renderOverview` 初始渲染读 `data-theme` 不受影响（`applyConfig(getConfig())` 在渲染前已跑）。
- **配置链路**：仅读不写，无绕过。
- **风格**：与既有 `updateThemeIcon` 模式一致；两 label 各用 querySelector + 空值守卫；测试沿用 `.first()` + 精确文本（`.app-main__theme-row span` 匹配 3 个 span：当前主题/色板/强调色）。
- **质量**：full e2e + 单测 + build 全绿；视觉基线零漂移（改动纯文本同步）。
- **结论**：Ready to merge（DONE），无遗留 Minor。

## 备注

- `src-tauri/Cargo.toml` 为本会话前已有的行尾（LF→CRLF）噪声改动，**未碰、未提交、保持 unstaged**。
- 提交内容：`src/app/app-main.js`、`tests/e2e/app-shell.spec.js`、`tests/e2e/mobile-nav.spec.js`、`docs/superpowers/sdd/task-B3-P0-report.md`。
