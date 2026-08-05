# Task A2: NavigationWheel 几何参数化（黄金比例锚点 + 方向）

**Files:**
- Modify: `src/components/navigation-wheel/nav-wheel-geometry.js`、`nav-wheel.js`、`nav-wheel.css`
- Modify: `tests/unit/geometry.test.js`、`tests/e2e/nav-wheel.spec.js`
- Modify: `tests/e2e/visual-regression.spec.js`（导航轮相关 24 张基线重生成 —— 用户已确认：scenes/main-window/settings-window/components 各 2 主题 × 3 accent）

**Interfaces:**
- geometry 新增/改造（全部纯函数可单测）：
  - `anchorY(index, itemHeight, gap, viewportHeight, anchorRatio)` → 主轴锚点位置（替代 scrollTopForCenter 的中心语义；anchorRatio 默认 0.382）
  - `scrollTopForAnchor(index, itemHeight, gap, viewportHeight, anchorRatio)`
  - `findNearestIndex(scrollTop, count, itemHeight, gap, viewportHeight, anchorRatio)`（用锚点替代中心）
  - `focalScale/focalOpacity(offset, viewportLength, maxScale, falloff)` — offset 相对锚点
  - `direction: 'vertical' | 'horizontal'` — 主轴抽象（几何/渲染/滚动沿主轴；horizontal 供 Task A6 底部栏）
- `mountNavWheel(root, { items, onChange, anchorRatio = 0.382, direction = 'vertical' })`；setActive/scrollToIndex 保留

- [ ] **Step 1: 写失败单测**：geometry.test.js 适配 + 新增（anchorRatio 0.382 的锚点数学：首项初始态在 38.2%、末项 clamp、focal 峰值在锚点；horizontal 方向等价性）
- [ ] **Step 2: 实现几何参数化**（保持向后兼容默认值 0.382 直接生效）
- [ ] **Step 3: nav-wheel.spec 适配**：居中断言（delta < 4px 相对中心）→ 锚点断言（delta < 4px 相对 38.2% 锚点）
- [ ] **Step 4: 重生成 24 张导航轮相关基线**：确认仅选中位置变化（解码比对差异区域）后 `--update-snapshots`
- [ ] **Step 5: 全量回归 + 提交** `feat: NavigationWheel 黄金比例锚点（38.2%）+ 方向参数化`

---
