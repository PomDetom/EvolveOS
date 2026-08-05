# Task A5: FloatStrip 悬浮条组件

**Files:**
- Create: `src/components/float-strip/float-strip.css`、`float-strip.js`
- Create: `src/app/strip-main.js`（`?mode=strip` 入口：独立渲染悬浮条实例）
- Modify: `src/app/app-main.js`（右下 FloatBall + 模拟演示）
- Create: `tests/e2e/floatstrip.spec.js`

**Interfaces:**
- `float-strip.js` 导出 `renderFloatStrip({ content })` + `mountFloatStrip(root, { onStateChange })`：
  - DOM：`.c-strip`（`--strip-orientation: horizontal|vertical`）> 内容区 `.c-strip__content` + hover 浮现 `.c-strip__ctrl`（旋转/拖动/关闭）
  - 双形态：横条（内容横向）/ 竖条（内容纵向）；旋转按钮 + 双击内容区切换（transition 只动 transform/opacity + 布局用 CSS 变量方向）
  - 四边磁吸：pointer 拖动，距屏幕边缘 < 24px 吸附（transform 定位，不触发 layout 动画）
  - 无边框：常态零边框零标题栏；hover 浮现半透明细边框 + 控制条
  - token 监测内容模板：`renderTokenMonitor({ value, status, trend })`（数值 + 状态点 + 迷你趋势条）
- `strip-main.js`：body 级独立渲染悬浮条（`?mode=strip` 时 main.js 分支进入）
- `floatstrip.spec.js` 用例：渲染 / 旋转切换（orientation 类翻转 + 内容布局）/ 磁吸（拖动到边缘 → 吸附类）/ 无边框 hover 浮现 / 双击旋转

- [ ] **Step 1-3**: TDD → 组件实现（红线：旋转/磁吸/浮现只动 transform/opacity）→ 绿
- [ ] **Step 4**: strip 入口接线 + 应用壳 FloatBall 模拟演示（右下贴边可拖）
- [ ] **Step 5**: 全量回归 + build
- [ ] **Step 6: 提交** `feat: FloatStrip 悬浮条（横竖形态/四边磁吸/无边框）`

---
