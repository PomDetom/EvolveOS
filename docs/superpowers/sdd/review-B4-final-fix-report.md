# B4 最终评审修复留痕（review-B4-final-fix）

- 分支：`feature/b4-desktop-realism`
- 修复提交：`562ab24503df888a3fa9a2eee7a6695651681bf1`
- 触发：整分支最终评审发现 1 Important（合并阻断）+ 2 merge-recommended Minor，本波全部闭环。

## Fix 1 [Important] 缺失 `core:window:allow-set-focus` 权限

`src/app/app-main.js` 的 B4-5 再聚焦路径在真机桌面静默失效：第二次点击 FloatBall（strip 已开）调用 `stripWindow.setFocus()`，但 `src-tauri/capabilities/default.json` 从未授权 `core:window:allow-set-focus`（不在 `core:window:default` 内）→ 真机构建下 ACL 拒绝 → unhandled promise rejection + strip 不聚焦。与 B4-1 修复的静默权限失败同类。

- `src-tauri/capabilities/default.json`：`permissions` 数组新增 `"core:window:allow-set-focus"`。
- `tests/unit/window-capabilities.test.js`：strip 窗口 `it` 块的 `required` 数组新增 `'core:window:allow-set-focus'`（守卫该权限常驻）。
- `src/app/app-main.js`：`stripWindow.setFocus()` → `stripWindow.setFocus().catch(() => {})`，未来任何失败保持静默。
- `tests/e2e/app-shell.spec.js`：Tauri strip 测试的 mock `setFocus()` 改为 `setFocus() { return Promise.resolve(); }`，使 `.catch` 分支被真实执行。

## Fix 2 [Minor] 过期用户文档文案

B4-3（删色相/色温/饱和度滑杆）与 B4-4（扩 12 预设）后，README 与 src/CLAUDE.md 的计数过期。

- `README.md`：「6 套主题色：靛蓝 / 青绿 / 天蓝 / 琥珀 / 紫罗兰 / 翡翠」→「12 套主题色：靛蓝 / 青绿 / 天蓝 / 琥珀 / 紫罗兰 / 翡翠 / 玫红 / 橙 / 青柠 / 青 / 蓝 / 品红」。
- `README.md`：「11 条滑杆实时预览（含色相/色温/饱和度微调）」→「9 条滑杆实时预览」（删去 B4-3 移除的三条微调描述）。
- `src/CLAUDE.md`：「`data-accent`（6 套主题色）」→「`data-accent`（12 套主题色）」。

**滑杆数核验**：`src/config/defaults.js` 的 `RANGES` 共 9 个 key —— `opacity / blur / noise / baseSize / scale / radiusScale / durationScale / springStrength / shadowIntensity`；定制器滑杆全部来自 `RANGES`（customizer-panel.js：滑杆均取自 `RANGES` 的 `[min, max, step]`）。9 条核验成立。

## Fix 3 [Minor] strip 页/窗口跟随保存的主题与强调色

`src/app/strip-main.js` 的 `mountStripMode()` 从不应用配置 → 独立 strip（`?mode=strip`，真实 strip 窗口用）在深色主题用户处仍渲染硬编码的默认浅色/靛蓝。

- 新增 import：`getConfig`（`../config/store.js`）、`applyConfig`（`../config/apply.js`）。
- `mountStripMode()` 顶部、渲染前调用 `applyConfig(getConfig())`。
- Tauri strip 窗口与浏览器 `?mode=strip` 均生效；headless 浏览器默认浅色 → 既有 e2e 不受影响。

## 验证输出（全部实际运行）

1. `npx vitest run tests/unit/window-capabilities.test.js` → **2 passed**（新 set-focus 断言绿）。
2. `npx playwright test tests/e2e/app-shell.spec.js -g "独立 strip 窗口"` → **1 passed**。
   `npx playwright test tests/e2e/floatstrip.spec.js` → **7 passed**。
3. 全量：
   - `npm test` → **57 passed（11 文件）**。
   - `npm run test:e2e` → **103 passed（含全部 24 张视觉基线）**，未运行 `--update-snapshots`，视觉基线零漂移。
   - `npm run build` → **✓ built**。
4. 过期文案 grep：`README.md` 与 `src/CLAUDE.md` 已无「6 套主题色」「11 条滑杆」。

## 遗留观察（未改，超出本次命名文件范围）

- 根 `CLAUDE.md:5` 项目说明含「6 套主题色」；`docs/tauri-integration.md:246` 含「6 套主题色（ACCENTS）」——同为过期计数，本次按「只改命名文件」未动，建议后续收尾。
- 其余命中均为历史文档（`docs/superpowers/plans/`、`specs/`、`sdd/*.diff`、`progress-b4.md`）或 `src/styles/base.css:25` 焦点环注释（评审留痕明示「历史文案，不动」），不属本次范围。
