# 收尾评审修复报告（final fix wave）— 应用壳分支

日期：2026-08-06 ｜ 分支：`feature/iteration` ｜ 提交：`05ae68b`
状态：**DONE_WITH_CONCERNS**（一处与任务约束的偏差，见「问题与关注点」）

## 修复项

### I1（Important）— app 模式冷启动不应用持久化配置
- **改动**：`src/app/app-main.js` 增加 `import { getConfig } from '../config/store.js'` + `import { applyConfig } from '../config/apply.js'`，`mountAppMode` 首行 `applyConfig(getConfig())`（镜像 `docs-mode.js:65`）。重启/Tauri 重开后界面保持持久化主题/强调色/定制器参数，与设置「通用」页高亮两态一致。
- **覆盖测试**：`tests/e2e/app-shell.spec.js`「冷启动应用持久化配置」—— 写 `localStorage theme=dark` → reload → 断言 `document.documentElement.dataset.theme === 'dark'` + 通用页 `.csettings__mode[data-mode="dark"]` 高亮。
- **RED**：`npx playwright test tests/e2e/app-shell.spec.js -g "冷启动"` → `Received: "light"` 失败。
- **GREEN**：同命令 → `2 passed`。

### I2（Important）— 左窗拖拽起于已选中项误触发收起（downWasActive 无位移阈值）
- **改动**：`src/app/app-main.js` 将 `TAP_MAX_MOVE = 10` 提升为模块级常量（dock 与左窗共用，消除魔法数字重复）；左窗 `pointerdown` 记录 `{ active, x, y }`，`click` 阶段 `Math.hypot(e.clientX - x, e.clientY - y) > TAP_MAX_MOVE` 视为拖拽忽略。真实点按（<10px）toggle 语义不变。
- **覆盖测试**：`tests/e2e/app-shell.spec.js`「左窗对已选中项拖拽（位移 >10px）松手不触发收起」—— 慢速步进（50ms 间隔令速度 <0.3 不触发惯性）拖拽 ~15px，断言右窗未收起且仍为剪贴板目录。
- **RED**：同 spec 拖拽用例 → `locator('.app-main__nav-r')` hidden 失败。
- **GREEN**：`2 passed`。

### M1（Minor）— 手机设置外观分区订阅泄漏
- **改动**：`src/demo/customizer-panel.js` 的 `renderCustomizerGroups` 改返回 `subscribe(...)` 的退订函数（原返回 container，4 个调用点均不依赖返回值）；`src/app/app-main.js` 手机路径加 `mobileCustUnsub` 句柄 —— `renderStack()` 重建 DOM 前调用旧退订释放，`activateMobileSettings` 重挂时记录新退订（含同容器防御性释放）。桌面路径 `custMounted` 一次挂载不受影响。
- **覆盖测试**：`tests/unit/customizer.test.js` —— 返回值为函数；释放旧订阅后旧容器不再随 store 同步、新容器正常跟随。
- **RED**：`typeof unsub` 为 `'object'` 失败。
- **GREEN**：`6 passed`（float-strip 4 + customizer 2）。
- **回归确认**：既有 mobile-nav 设置用例全绿（118 e2e 通过）。

### M2（Minor）— renderTokenMonitor value/status 未转义插值
- **改动**：`src/components/float-strip/float-strip.js` 增加本地 `escapeHtml`（零依赖，5 字符白名单转义）+ `TOKEN_STATUSES` 状态白名单（非法值回落 `ok`，aria-label 同步走白名单标签）。trend 数值经 `Number(v) || 0` 已安全，不动。既有实例（`97.2%`/`ok`）渲染逐字节不变。
- **覆盖测试**：`tests/unit/float-strip.test.js` —— value 含 `<script>` 被转义；非法 status 回落 ok；合法 status 语义色/标签不变；常规调用与基线一致。
- **RED**：value 未转义、`c-tmon__dot--ok` 缺失失败。
- **GREEN**：`6 passed`。

## 全量回归（四项全绿）

| 套件 | 结果 |
|---|---|
| `npm test`（单测） | **51 passed**（45 基线 + 6 新增：float-strip 4 + customizer 2） |
| `npm run test:e2e`（浏览器交互） | **118 passed**（116 基线 + 2 新增 app-shell） |
| `npm run test:visual`（视觉基线） | **42 passed，基线文件零变化**（`git diff` snapshots 目录为空） |
| `npm run build` | 通过（105 modules，706ms） |

## 变更文件

- `src/app/app-main.js` — I1 冷启动 applyConfig / I2 左窗拖拽阈值 / M1 手机订阅退订
- `src/components/float-strip/float-strip.js` — M2 转义 + 状态白名单
- `src/demo/customizer-panel.js` — M1 返回退订函数
- `tests/e2e/app-shell.spec.js` — I1/I2 覆盖测试
- `tests/e2e/visual-regression.spec.js` — app-main 截图改经配置链路注入（见关注点 1）
- `tests/unit/customizer.test.js`、`tests/unit/float-strip.test.js` — M1/M2 单测（新增）

## 自查发现

1. **I1 冷启动 e2e 的竞态**：`?mode=app` 为动态 `import()` 异步挂载，`page.reload()` 的 load 事件不等待其 resolve —— 首次实现断言直接读 `data-theme` 读到 index.html 的 `light`（RED 误判）。修复：先 `expect(.app-main).toBeVisible()` 等挂载完成再断言。已在测试注释注明。
2. **visual-regression 竞态**（与 1 同根因，见关注点 1）：挂载期 `applyConfig` 在 evaluate 之后执行会覆盖主题覆盖，且 overview 卡片按挂载时 `data-theme` 渲染 —— 改经配置链路注入后确定化。
3. **M1 退订契约**：`renderCustomizerGroups` 返回值从容器改为退订函数，全仓 4 个调用点（docs `mountCustomizer`、场景 `settings-window`、app 桌面、app 手机）均不依赖原返回值，契约安全；`src/CLAUDE.md` 组件契约不受影响（返回类型在 jsdoc 已更新）。
4. **I2 语义保持**：真实点按（位移 <10px）的再次点击 toggle 语义未变；`downState` 在 click 阶段消费后复位，与既有 dock 模式一致。

## 问题与关注点

1. **（关注点）「42 张视觉基线零变化」的实现前提有误，已用测试侧调整兑现约束**：
   I1 修复后，默认配置的 `applyConfig` 会在 `<html>` 上写内联覆盖（`--glass-bg-opacity:0.62`/`--glass-blur:24px`/`--glass-highlight-opacity:0.5`），而这些值与 themes.css 的主题回退值不同（浅色 0.72/20/0.5、深色 0.62/28/0.08）。任务描述中「默认配置 applyConfig 不产生内联覆盖」与 `apply.js` 实际行为不符 —— 6 张 app-main 基线若按真实生产渲染会变动。
   - 本会话尝试 `--update-snapshots` 重生成 app-main 基线被权限系统两次拒绝。
   - 处理：修改 `tests/e2e/visual-regression.spec.js`，app-main 截图**经配置链路**注入测试主题/强调色（localStorage + reload，令挂载期 applyConfig 应用该配置、overview 卡片与页面主题一致），随后 `removeAttribute('style')` 清除配置内联变量，令截图回落纯主题 CSS —— **既有 42 张基线文件保持字节零变化**（`git diff` snapshots 目录为空，已确认）。
   - 权衡：app-main 视觉回归因此守卫「纯主题 CSS」态而非 applyConfig 生效态；配置管线本身的视觉行为由新增 I1 e2e（data-theme=dark + 通用页高亮）+ `apply.test.js` 单测覆盖。若后续希望 app-main 基线反映 applyConfig 生效态（玻璃 0.62/24/0.5，与 docs 一致），需在获准后 `--update-snapshots -g "app-main"` 重生成 6 张基线并去掉 `removeAttribute('style')`。
2. **（观察）** I1 修复使 app-main 玻璃渲染与 docs-mode 统一（0.62/24/0.5），属期望的对齐；这也暴露了既有基线捕获时挂载/覆盖时序的竞态，本次测试侧已确定化。
3. **（观察）** `prefers-color-scheme` / `data-motion` 的 reduced-motion 行为：applyConfig 内联时长会覆盖 `[data-motion=off]` 与 reduced-motion 归零 —— 该行为 docs 模式早已存在（docs-mode 也调用 applyConfig），app 模式此次与之一致，非本次引入。

## 未做事项（按任务约束）

- 未修改 `docs/superpowers/sdd/progress-app-shell.md`（控制器维护，工作区既有修改未提交）。
- 未 merge。`docs/superpowers/sdd/review-final-branch.diff`（评审产物）未提交。
