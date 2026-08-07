# Task B3-1: 外观分组重命名（整体色调/表面质感/文字排版/边角形状/动效节奏/阴影层次）+ desc — 实施报告

- **状态**：DONE
- **提交**：`352398a`
- **需求源**：docs/superpowers/sdd/task-B3-1-brief.md（唯一需求源，标题/desc/模板/CSS/测试逐字执行）
- **分支**：feature/b3-settings

## 任务背景

B3 目标：设置「外观」分区从「看起来只调字体」升级为「全局 UI 外观调整」——分组标题改全局语义名 + 每组加一行描述。「玻璃材质→表面质感」已在 B2-R5 完成，本任务只改其余 5 组标题，并给全部 6 组加 `desc`。定制器 GROUPS 由 `renderCustomizerGroups`（customizer-panel.js）渲染，抽屉面板与外观设置分区共用同一实现——两侧都获得新标题/desc（设计使然）。

## 改动说明

| 文件 | 变更 |
|---|---|
| `src/demo/customizer-panel.js` | GROUPS 常量：5 组 title 重命名（色彩→**整体色调**、排版→**文字排版**、圆角→**边角形状**、动效→**动效节奏**、阴影→**阴影层次**；表面质感不动）+ 全部 6 组加 `desc` 字段；`renderCustomizerGroups` 组模板按 brief 逐字加 `desc` 渲染行（`${g.desc ? ... : ''}` 守卫）；模块 doc 注释同步 6 组新名 + desc 说明 |
| `src/styles/customizer.css` | 新增 `.cust-group__desc`（`color: var(--text-3)`；`font-size: var(--font-size-xs)`；`margin-bottom: var(--space-3)`，由 desc 承担与后续内容的间距）；`.cust-group__title` 的 `margin-bottom` 从 `var(--space-3)` 收紧为 `var(--space-1)` 使 desc 紧贴标题下方；**未动** `.cust-group__title` 的 flex 结构与 `::after` 分隔线，未改组内滑杆布局 |
| `tests/e2e/customizer.spec.js` | 新增用例「外观分组标题体现全局语义（重命名 + desc）」（brief 逐字）：断言 6 组新标题 + 6 条 desc；既有用例「外观分区：表面质感组标题 + 亚克力开关 + 噪点滑杆」（`toContainText('表面质感')`）在新实现下继续通过 |
| `tests/e2e/visual-regression.spec.js-snapshots/` | `appearance-partition-*.png`（6 张：light/dark × indigo/amber/emerald）按基线流程重生成 |

- **配置链路**：本任务仅重命名分组标签 + 加静态文本 desc，零配置改动（defaults → store → apply 链路未触碰）。
- **动画红线**：desc 为静态文本，未触碰任何动画；CSS 中唯一 transition 仍是既有 `.cust-group__title` 相关（未改）。仅 transform/opacity 动效规则不受影响。

## TDD 证据

- **Step 1（红）**：先写新用例 → `npx playwright test tests/e2e/customizer.spec.js -g "外观分组标题体现全局语义"` → **1 failed**。`expect(...).toHaveText('整体色调')` 实测收到 `"色彩"`（`<h4 class="cust-group__title">色彩</h4>`）——正是待改的旧标题。
- **Step 3（绿）**：实现后 `npx playwright test tests/e2e/customizer.spec.js` → **5 passed**（新用例 + 既有 4 用例，含「表面质感」用例零冲击）。

## 验证结果

| 命令 | 结果 |
|---|---|
| `npx playwright test tests/e2e/customizer.spec.js` | 5 passed（新用例 + 既有 4 用例） |
| `npm run test:visual`（基线比对前） | 6 failed（**仅** appearance-partition）/ 18 passed（app-main、components-partition、motion-partition 零漂移） |
| `npx playwright test tests/e2e/visual-regression.spec.js -g "appearance-partition" --update-snapshots` | 6 passed（仅重生成 appearance-partition 6 张，git status 确认无其它分区文件变动） |
| `npm run test:visual`（复跑） | 24 passed 全绿 |
| `npm run test:e2e` | 99 passed（含 24 张视觉回归 + 新交互用例；B3-P0 为 98，+1 为本任务新增） |
| `npm test` | 60/60 passed（10 files；customizer.test.js 只测订阅退订，零影响） |
| `npm run build` | 通过（Vite，435ms） |

## 视觉基线重生成：解码比对说明

**流程执行**：先跑 `npm run test:visual` 确认只有 `appearance-partition-*` 失败（18 张其它分区零漂移）→ 解码比对失败快照 → `--update-snapshots` 只重生成 appearance-partition 6 张 → 复跑全绿。

**解码比对方法**（环境 Read 工具无法直接显示 PNG，改用 numpy/PIL 逐像素解码比对）：

1. **尺寸变化**：expected 720×1493 → actual 720×1613，**+120px 整**。6 组各加一行 desc（约 +20px/组，含字体行高 + margin 调整），120px = 6 行 desc 的精确高度增量。
2. **差异区域**：逐行 diff 带分析，6 张快照一致——差异带全部落在**分组区顶部 y≈145–679**（6 组标题/desc 所在行）+ **底部 y1493–1612 的 +120px 高度延伸**（86400px = 120×720，正是新增的 6 行 desc 高度）。**y680–1492 整段逐像素一致（maxdiff=0）**：设置页头部、各组下方内容、分区下部均无任何意外改动。
3. **位移性质**：对 group 2 内容区做垂直位移相关验证，best shift **+20px、匹配率 99.99%**——实际截图内容 = 期望截图同一内容向下平移 20px。证明差异是**纯竖直插入 desc 行**导致的级联下移，非布局重排/重绘/破损。
4. **暗色主题额外顶部细带**：dark 三张在 y1–143 出现若干 1–3px 细带，合计仅 **184px**（143×720 区域内）——玻璃表面/头部文字的次像素 AA 抖动（SwiftShader 软件栅格化下确定性渲染，与 18 张零漂移其它分区同源）。已随基线重生成确定性固化。
5. **无意外区域**：app-main（应用壳整窗）、components-partition、motion-partition 三组 18 张**零漂移**，确认无级联污染。

**结论**：差异区域 = 分组标题文字（色彩→整体色调 等 5 组改名）+ 每组新增 desc 行（6 行），为本次改动引入；无布局位移（y680–1492 逐像素一致）、无意外区域。满足 brief「必须先解码比对再重生成」要求。

## Self-review 结论

- **规格符合**：5 组 title 按表逐字重命名、表面质感不动；6 组 desc 逐字；组模板、CSS、测试用例均按 brief 逐字实现；既有「表面质感」断言（customizer.spec.js:43 `toContainText`）在新实现下继续匹配。
- **配置链路**：零配置改动，无绕过。
- **动画红线**：仅静态文本 + 既有 title transition（未改），无新增动画。
- **样式红线**：`.cust-group__title` flex 结构与 `::after` 分隔线原样保留；desc 用令牌变量（`--text-3`/`--font-size-xs`/`--space-3`），无硬编码值。
- **质量**：customizer.spec 5/5、full e2e 99/99、单测 60/60、build 通过；视觉基线按流程重生成后全绿。
- **结论**：Ready to merge（DONE），无遗留 Minor。

## 备注

- `src-tauri/Cargo.toml` 为本会话前已有的行尾（LF→CRLF）噪声改动，**未碰、未提交、保持 unstaged**（提交前/后 `git status` 均确认）。
- 提交内容（`352398a`）：`src/demo/customizer-panel.js`、`src/styles/customizer.css`、`tests/e2e/customizer.spec.js`、`tests/e2e/visual-regression.spec.js-snapshots/appearance-partition-*.png`（6 张）、`docs/superpowers/sdd/task-B3-1-brief.md`。
