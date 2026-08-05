# Task A7: 基线收尾与合并指引

**Files:**
- Modify: `tests/e2e/visual-regression.spec.js`（+6 张应用壳基线：`['app-main', '.app-main']` × 深浅 × 3 accent，沿用 data-motion=off + animations disabled 稳定化）
- Modify: `README.md`（模式说明：`/` docs / Tauri 应用壳 / `?mode=strip` 悬浮条）
- Create: `docs/superpowers/sdd/progress-app-shell.md`（账本汇总，已存在则更新）

- [ ] **Step 1**: 视觉基线：18 张重生成（A2 已做）+ 6 张新增（app-main × 2 主题 × 3 accent）；全量 42 张对比稳定
- [ ] **Step 2**: README 模式说明（更新为当前状态：FloatStrip / 手机形态已实现，不再「规划」）
- [ ] **Step 3**: 全量回归四项（test + e2e + test:visual + build）
- [ ] **Step 4**: 账本留痕汇总（各任务提交/评审/遗留）
- [ ] **Step 5: 提交** `docs: 应用壳收尾（基线/README/账本）`（合并 main 由控制器在最终评审后执行）

---

## 说明（控制器补充）

- **A2 已完成** 18 张导航轮相关基线重生成；本任务只需 **+6 张 app-main 新增**（app 模式 `.app-main` 全元素截图 × 深浅 × 3 accent）。
- 视觉回归 spec 现状：`SHOTS` 数组是 `[name, selector]`，所有 shot 都 `page.goto('/')`（docs 模式）。app-main 在 `?mode=app`，需要给 SHOTS 加 mode 维度（如第三字段 `mode`，默认 `'/'`，app-main 用 `'/?mode=app'`），其余 6 组（tokens/components/scenes/main-window/settings-window/clipboard）行为不变（仍 `'/'`）。
- app-main 截图稳定性：`.app-main` 全元素截图，沿用现有稳定化（data-motion=off + animations: 'disabled'）；右窗默认收起（单窗口态概览页），无入场相位。
- **第 36 张既有基线必须零变化**（`--update-snapshots` 只新增 app-main-*，不得改动 tokens/clipboard/components/scenes/main-window/settings-window 既有 png——如有变化说明回归，停下调查）。
- README 更新点：① 形态表 FloatStrip 行从「规划」改「已实现」（`?mode=strip` 独立入口 + 应用壳右下 FloatBall 演示）；② 手机形态（≤900px 底部横滑 + 页面栈）已实现；③ 目录结构 src/app/ 注释（含 strip 入口、float-strip 组件）；④ 视觉基线数量 36→42；⑤ 特性列表 FloatStrip/手机形态移入已实现项。
- **合并 main 由控制器在最终评审后执行**，本任务不做 merge。

## Global Constraints（硬性，违反即失败）

- 全量回归四项全绿：`npm test`（45）+ `npm run test:e2e`（110 + 基线零冲击）+ `npm run test:visual`（42 张全绿）+ `npm run build`。
- docs 模式零冲击：既有 36 张基线零变化（只新增 6 张）。
- 测试仅在 Web 环境执行。
- 不做 merge（控制器负责）。

- [ ] **Step 1-4**: 实施 → 回归 → 提交（Step 5 提交信息 `docs: 应用壳收尾（基线/README/账本）`）

---
