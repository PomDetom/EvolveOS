# Task B2-1 报告：玻璃材质两档（磨砂 backdrop-filter / 纯色不透明降级）

- 分支：`feature/b2-visual`（自 main 检出）
- 状态：DONE
- 提交：见文末「提交」

## 实现说明

### 配置链路三件套（defaults → store → apply）

- `src/config/defaults.js`：`glass` 追加 `blurEnabled: true`。既有持久化配置（无该键）经 `deepMerge` 自动补全默认值，向后兼容（store.test.js 覆盖）。
- `src/config/apply.js`：`applyConfig` 玻璃变量区写 `--glass-enabled`（`1|0`，机器可读）+ `root.dataset.glass = blurEnabled ? 'on' : 'off'`（CSS 降级选择器用后者）。两处都由单测锁定。
- `src/styles/themes.css`：`--surface-solid` 深浅两套（light `#f8f9fb` / dark `#14161c`，按 brief 字面值）。

### 表面接玻璃 + 降级（app-main.css）

- `.app-main__nav-l` / `.app-main__nav-r` / `.app-main__pages`：新增 `background: var(--glass-bg)` + `backdrop-filter: blur(var(--glass-blur)) saturate(1.4)`（原为透出 body 的 `--glass-bg`）。
- `.app-main__card`：`var(--surface-1)` → `var(--glass-bg)`。
- 手机形态 `.app-main__stack` / `.app-main__stack-page` / `.app-main__dock`：`var(--surface-1)` → `var(--glass-bg)`。
- 降级：`:root[data-glass="off"] .app-main__{nav-l,nav-r,pages,card}` → `background: var(--surface-solid); backdrop-filter: none;`（手机形态在 `@media (max-width:900px)` 内同规则）。属性为静态切换、无 transition，backdrop-filter 永不动画（红线合规）；切页/推入动画仍只动 transform/opacity。

### 玻璃开关 UI（共享定制器实现）

- `src/demo/customizer-panel.js`：GROUPS「玻璃材质」组 `pre` 改为 `glassSwitchRow(cfg) + glassPreview()`；`glassSwitchRow` 仿 `motionSwitchRow`（`.cust-row.cust-row--switch` + `data-glass-switch` 容器 + `renderSwitch`），点击写 `saveConfig({ glass: { blurEnabled } })` + `applyConfig`；`syncUI` 同步玻璃开关 aria-checked；`renderCustomizerGroups` 加 `[data-glass-switch]` 点击委托。抽屉面板与设置「外观」分区共用同一实现（B1-3 迁移后的契约）。未新增分组，`.cust-group` count 6 保持。

### 测试

- 单测（apply.test.js，既有真实 `document.documentElement` 风格）：`blurEnabled=true` → `--glass-enabled:1` + `data-glass="on"`；`false` → `0` + `"off"`。
- e2e（app-shell.spec.js「玻璃两档」）：默认 `html data-glass="on"` + 导航栏 backdrop-filter 含 blur → 设置→外观玻璃开关点击关闭 → `data-glass="off"` + backdrop-filter `none` + 开关 aria-checked 翻转 → reload 持久化保持 off（完整配置链路验证）。
- 视觉基线：暗色 9 张重生成（亮色 9 张像素级不变）。

## 测试证据

| 步骤 | 命令 | 结果 |
|---|---|---|
| 红 | `npx vitest run tests/unit/apply.test.js` | 新 2 用例 FAIL（`--glass-enabled` 未写） |
| 绿 | `npx vitest run tests/unit/apply.test.js` | 13/13 PASS |
| 红 | `npx playwright test tests/e2e/app-shell.spec.js -g "玻璃两档"` | FAIL（`[data-glass-switch]` 未挂载） |
| 绿 | `npx playwright test tests/e2e/app-shell.spec.js -g "玻璃两档"` | 1/1 PASS |
| 单测全量 | `npm test` | 56/56 PASS（9 文件） |
| e2e 全量 | `npm run test:e2e` | 74/83 PASS（余 9 为视觉暗色，基线重生成前预期失败） |
| 视觉重生成 | `npx playwright test tests/e2e/visual-regression.spec.js --update-snapshots` | 18/18 PASS |
| e2e 全量（重生成后） | `npm run test:e2e` | 83/83 PASS |
| 构建 | `npm run build` | PASS |

### 基线差异确认（先解码比对）

对 `app-main-dark-indigo` 期望/实际 PNG 做逐像素差分（System.Drawing）：
- 尺寸 1280×720，平均绝对差 38.98/通道，最大差 53，94.1% 像素变化；
- 分列区域（左窗 47 / 右窗区 40 / 内容区 38）一致，无局部结构性位移。

判定：暗色表面由玻璃层叠加 body 半透明底色而整体加深（约 -54/通道，与合成计算 `rgba(24 26 32 / 0.62)` 双层叠加预测吻合），为玻璃材质变化，非布局破坏。亮色下双层叠加近白，渲染与旧基线像素一致，无需重生成。

## 遇到的问题与判断

1. **暗色表面明显加深（mean abs diff ~39）**：`--glass-bg`（暗色 alpha 0.62）现直接绘在表面，叠加 body 同样半透明的 `--glass-bg` 底 → 暗色下表面显著变暗。这是 brief 字面指令（表面接 `var(--glass-bg)`）的必然结果，视觉基线按预期重生成；B2-2「浏览器装饰背景层」将提供模糊对象，届时观感由该任务统一。判断：按规格字面落地，留待整体评审确认暗色观感。
2. **`--surface-solid` 暗色值**：brief 给定 `#14161c`（rgb 20 22 28），与 `--glass-bg-rgb`（24 26 32 = #181a20）略有出入，按 brief 字面使用。
3. **apply.js 编辑事故**：Step 4 首次 Edit 意外删掉 `--glass-bg-opacity` 行 → 既有单测变红，立即恢复，最终全绿（无残留）。
4. **e2e 路径选择**：brief Step 7 草稿用 localStorage 直写验证降级，Step 9 允许改为驱动真实开关；本实现走「外观分区玻璃开关 → data-glass 翻转 + reload 持久化」，覆盖配置链路 + 真实交互，比草稿更强。
5. **手机形态降级**：`.app-main__stack`/`__stack-page`/`__dock` 的降级规则置于 `@media (max-width:900px)` 内（与玻璃规则同媒体上下文），选择器特异性（`:root[data-glass="off"]` + 类）恒高于默认类规则，不依赖顺序。

## 提交

- `55d0bcc`：`feat: 玻璃材质两档（磨砂 backdrop-filter / 纯色不透明降级）`

改动文件：`src/config/defaults.js`、`src/config/apply.js`、`src/styles/themes.css`、`src/app/app-main.css`、`src/demo/customizer-panel.js`、`tests/unit/apply.test.js`、`tests/e2e/app-shell.spec.js`、`tests/e2e/visual-regression.spec.js-snapshots/`（暗色 9 张重生成）、`docs/superpowers/sdd/task-B2-1-report.md`、`docs/superpowers/sdd/progress-b2.md`。
