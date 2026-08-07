# Task B2-R4: 图标选中态去光晕 — 执行报告

- **状态**：完成（2026-08-07）
- **提交**：`079f9d7` `feat: 图标选中态去光晕（只留衬底 + active:hover 优先）`
- **验证**：npm test 60/60（10 文件）；npm run test:e2e 88/88（含新「图标选中态：无光晕层、衬底为选中底色」+ B2-3「导航图标选中项放大加粗」回归 + 其余零冲击）；npm run test:visual 18/18（基线重生成后连跑两遍全绿）；npm run build 通过
- **实现**：
  - `nav-wheel.js`：item 模板删 `<div class="c-navwheel__glow"></div>`。`renderItemIcons`（B2-3 原地改 svg 宽高/粗细）与 `setFocal`（滚动 transform/opacity）**逐字不动**。
  - `nav-wheel.css`：删 `.c-navwheel__glow` 全部规则（radial-gradient 层 + opacity/transform 分层 + transition）。保留 B2-3 `.c-navwheel__icon` 40px 圆角衬底（hover `--surface-hover`、active `--accent-100`）。补：
    ```css
    .c-navwheel__item--active:hover .c-navwheel__icon { background: var(--accent-100); color: var(--accent); }
    ```
    —— 闭环 B2-3 M-3：选中项 hover 不被浅灰覆盖；与 `.c-navwheel__item:hover .c-navwheel__icon` 特异性同级，置于其后取胜。选中态现在只走 color/background（paint-only 豁免），无任何 transform/opacity 分层动画残留。
  - `app-shell.spec.js`：新用例按简报草稿落，但**修正了简报测试的挂载竞态**（见下）。
- **TDD 关键发现（简报测试草稿有竞态，已修正）**：简报 Step 1 的 `await expect(page.locator('.c-navwheel__glow')).toHaveCount(0)` 在应用壳挂载前对空 DOM 会**直接通过**（count=0 满足），随后 `.evaluate` 自动等待挂载 → 该断言在仍有光晕时也会绿，形同虚设。实测：不加守卫首跑即绿（7 个 glow 却通过）。修正为先等 `.app-main__nav-l .c-navwheel__item` 挂载到 7 项再断言 count(glow)=0 → 修正后红（7≠0 失败）→ 实现 → 绿。此修正使「删光晕」成为真门禁。
- **视觉基线解码比对**（`--update-snapshots` 前）：
  - **app-main 6 张**：差异全部收敛于左窗 active 图标区（bbox 62×60，~2450px）——即光晕层移除，无其他位移。
  - **components-partition 5 张**（dark-amber/dark-emerald/dark-indigo/light-emerald/light-indigo）：nav-wheel 演示实例 active 项衬底区（partition 坐标 y≈200-300、x≈272-447，~8990px）差异 = 光晕移除。**light-amber 零差异**——验证为 amber accent-100 光晕在浅色下本就不可见（旧/新图 active 项区域逐像素相同），符合预期非缺陷。
  - **motion-partition 3 张**：零差异（零冲击确认）。
  - 已删除新旧比对用临时备份目录。
- **发现的既有基线不稳定（非本次改动引入，需知悉）**：components-partition 长截图（720×8626，多帧拼接）存在 run-to-run 抖动——同代码连渲两遍，dark-indigo 差 37501px、light-indigo 差 575px；旧代码新渲 vs R3 已提交基线 dark-emerald 差 25387px。已证实**与本次改动无关**（旧代码新渲即可复现同类漂移）。根因指向 `.app-main::after` 噪点覆盖层（`position:absolute; inset:0` 的 120px feTurbulence 平铺，B2-R2 引入）与拼接截图的子像素相位：浅色差异集中在噪点灰度（均值 delta≈39、max 191，像素近乎白色噪点粒）；深色主题噪点对比强 → dark 漂移更大。**R4 未修复**（越出任务边界，属 B2-R2 噪点层与视觉基线交互的既有问题）；本次重生成基线后 test:visual 连跑两遍 18/18 绿。若后续 R-验收/CI 再现 dark 系 components-partition 偶发失败，属此既有抖动，建议在基线稳定性修复中统一处理（如拼接截图相位稳定或深色噪点对比收窄）。
- **简报/报告**：docs/superpowers/sdd/task-B2-R4-brief.md / task-B2-R4-report.md
- **评审**：待评审
