# Task B5-5 Report: 控件语言收尾（外观页密度/对齐统一）

**状态**：DONE_WITH_MINOR_CONCERNS（2026-08-09）
**简报**：docs/superpowers/sdd/task-B5-5-brief.md

## 摘要

外观页控件行对齐/密度统一，以 customizer.css 对齐为主（settings-window.css 零改动，见下）。核心改动为 `.cust-row--switch` 密度下限 20→40px（两处 switch 行整体增高 +33px），其余对齐项（标签基线、slider 行距、accent 网格等高）实测既有规则已满足，保留为断言兜底。e2e 按 TDD 追加「外观页控件行对齐统一」用例。

## 实施内容

### customizer.css（按简报 verbatim + 注释）

```css
.cust-row__head {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-bottom: 6px; min-height: 20px;   /* + min-height 20（标签行高下限） */
}
.cust-row--switch { ...; min-height: 40px; }                          /* + min-height 40（密度统一） */
.cust-row--switch .cust-row__head { margin-bottom: 0; min-height: auto; } /* + min-height auto */
.cust-accent-grid { ...; align-items: stretch; }                      /* + align-items: stretch（3 列等高） */
```

全部为静态值，无布局动画（红线：只动 transform/opacity，本任务纯静态）。`.cust-row { margin-bottom: var(--space-3) }`、`.cust-row--switch .c-switch { flex-shrink: 0 }` 既有规则保持。

### settings-window.css：不改（决策见下）

### e2e（tests/e2e/customizer.spec.js 追加 B5-5 用例）

三组断言：
1. **标签基线**：前 4 个 slider 行 `.cust-row__head` 内 label.bottom ≈ value.bottom（< 2px，`align-items: baseline` 保证）。
2. **行距一致**：表面质感组 透明度/模糊/噪点 连续 slider 段相邻行距差 < 4px。
3. **switch 行密度**：`.cust-row--switch` 标签垂直居中于行（< 1px）+ 行高 ≥ 40px（min-height 兜底）。

## TDD 证据

### RED（改 CSS 前）

命令：`npx playwright test --config=playwright.config.worktree.js tests/e2e/customizer.spec.js -g "行对齐"`

```
Error: expect(received).toBeGreaterThanOrEqual(expected)
Expected: >= 40
Received:    20
at tests\e2e\customizer.spec.js:149:15
1 failed
```

失败输出显示 switch 行高 20 < 40 —— 密度下限缺失（亚克力材质 switch 行 20px，紧邻 slider 行 56.4px，视觉密度割裂）。断言 ①（基线）与 ②（slider 行距）已通过 → 证明「标签基线/行距既有规则已满足」（简报 Step 3 兜底条款的预期态）。

### GREEN（改 CSS 后）

命令同前：`1 passed (10.1s)`；全文件 `8 passed (45.0s)`。

## 视觉基线（解码比对 → 重生成）

**重生成前**：全量跑 visual-regression（无 update），结果**恰 6 张 appearance-partition 失败、其余 18 张通过**（app-main/components/motion 零变化，符合简报预期）。

**解码比对**（light-indigo 为代表）：
- Playwright 权威报错：`Expected an image 1088px by 1814px, received 1088px by 1847px` —— 唯一结构差异为外观分区元素增高 +33px。
- pixelmatch 报：`35904 pixels (ratio 0.02 of all image pixels) are different` —— 35904 = 33×1088 = **恰为多出的 33 行**，重叠区零像素差（除 8 个文本 AA 单步像素，y618-624）。
- probe（临时脚本，已删）实测：外观元素现高 1846.97px；两 switch 行 40px。基线 1814 = 1847 − 33，33px 恰等于两 switch 行增高之和（亚克力 +20、动效 +13）—— 增高完全归因于本次 `.cust-row--switch min-height:40px`。

结论：基线变化**仅为 switch 行密度增高（元素增高 33px）**，无任何其它内容变化。

**重生成**：`--update-snapshots` → 24/24 通过；git 确认恰 6 张 appearance-partition-*.png 变更，其余 18 张字节未动。

## 全量回归

- `npm test`：64/64 绿（14 files，含 B5-2 slider.test 签名契约守卫）。
- `npx playwright test --config=playwright.config.worktree.js`（全量）：**110 用例 108 通过 + 2 flake**。
  - `app-shell.spec.js:373` 浏览器装饰背景层预设切换、`floatstrip.spec.js:25` 旋转切换 —— 与本任务无关（strip/backdrop 域）。
  - 单独复跑两 spec：**39/39 全绿** → 判定为环境 flake（本机资源竞争：用户 tauri dev + 陈旧 5173 server + MCP servers），非回归。报告留痕。
- `npm run build`：通过（786ms，两 WOFF2 5.2/5.6MB 入 dist）。

## Files Changed

- `src/styles/customizer.css`（M）：行对齐/密度统一（verbatim）。
- `tests/e2e/customizer.spec.js`（M）：追加 B5-5 用例。
- `tests/e2e/visual-regression.spec.js-snapshots/appearance-partition-{light,dark}×{indigo,amber,emerald}-chromium-win32.png`（M，6 张）。
- `src/scenes/settings-window/settings-window.css`（未改）。

## 偏离说明（verbatim 适配，项目惯例 B5-1/2/3/4 同型）

**简报 verbatim e2e 断言与真实 DOM 结构性不匹配，需适配**（已记录）：

1. **断言 1「前 3 行 .cust-row__label top 一致」**：实测首 3 个 `.cust-row__label` top 差 204px（亚克力 855 / 透明度 1011 / 模糊 1079），因外观页首行为 switch 行且三行纵向堆叠——**任意纵向堆叠行的 label top 都不可能 < 2px**，该断言结构性不可能通过（即使 verbatim CSS 后仍差 42px）。适配为「slider 行内 label 与 value 同基线」（`align-items: baseline` 的真实保证），语义等价。
2. **断言 2「前 4 行 .cust-row 间距差 < 4px」**：真实 DOM 首 4 行 = [switch, 透明度, 模糊, 噪点]，其中 switch→透明度 间隔着**玻璃预览卡（非 .cust-row）**，gap 由卡片 92px 高度主导（136px vs slider 行距 68px），非行距可比；且 switch 行 40px ≠ slider 行 56px。适配为「连续 slider 段（透明度/模糊/噪点）行距一致」，实测差 0px。
3. **适配后的 RED 驱动**：改为断言 ③「switch 行高 ≥ 40px」—— 这是 verbatim CSS 唯一产生实际渲染变化的点（其余既有规则已满足，简报 Step 3 已预见），RED（20<40）→ GREEN（40）完整闭环。
4. **动效 switch 行 `.c-switch` 在 `.cust-switch-wrap` 内**（行高 line-height 使按钮与标签中轴差 3.2px，既有历史问题，非本任务引入）；断言 ③ 改以「标签中心 vs 行中心」度量（`align-items: center` 的 flex 保证），不度量嵌套按钮。该 3.2px 记入 Minor（供最终评审分诊，可加 `.cust-switch-wrap { display:flex; align-items:center }` 修正，本任务最小化不改）。

## settings-window.css 决策：不改

比对简报 Step 4 要求与现状：`.csettings__field { margin-bottom: var(--space-5) }` 已存在（settings-window.css:65）、`.csettings__field-label` 已 sm/medium（:68）、`.csettings__modes` 已 `align-self: flex-start`（:76）。无明确观感偏差 → 按简报默认「改动最小」零改动，记入本报告。

## 自评（self-review）

- CSS 全部静态对齐值，无动画（红线）；间距经 `var(--space-*)` 令牌，无硬编码色值。
- 配置链路未触碰（无 defaults/store/apply 改动）——符合任务约束。
- e2e 适配偏离有代码级证据（probe 实测数值），非猜测。
- 视觉基线解码比对：Playwright 尺寸报错 + pixelmatch 35904px 恰等 33×1088 + probe 元素高 1846.97 三方互证，基线变化完全归因 switch 行增高。
- 未提交 `playwright.config.worktree.js`（任务要求）；`review-B5-*.diff` 为前序评审产物，保持未跟踪。

## Concerns

1. **动效 switch 行嵌套按钮 3.2px 中轴偏移**（Minor，既有）：min-height:40px 后该行标签居中、switch 因 `.cust-switch-wrap` line-height 偏移 3.2px。非本任务引入、非 verbatim 范围内，留最终评审分诊。
2. **非 customizer 滑杆 track 填充静态 50%**（账本指出的 plan-mandated，最终评审分诊项）—— 本次 customizer.css 改动未触碰 `.c-slider`/`.cust-range` 区域，无交互。
3. **全量 e2e 2 flake**（环境资源竞争）已复跑确认非回归，留痕如上。
4. **断言 ② 覆盖仅 2 个 gap**（表面质感组 3-slider 连续段）—— 行距一致性断言强度有限，但为页面中最长连续 slider 段；分组边界（space-5）与预览卡间隔属设计性差异，不计入行距。

## 提交

- feat：`git add src/styles/customizer.css tests/e2e/customizer.spec.js tests/e2e/visual-regression.spec.js tests/e2e/visual-regression.spec.js-snapshots && git commit -m "feat: 外观页控件行对齐统一（标签基线/行距/分组，B5-5）"`
- docs：本报告 + 简报 + 账本（`git add docs/superpowers/sdd/`）
