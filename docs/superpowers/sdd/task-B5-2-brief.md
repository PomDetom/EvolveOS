# Task B5-2: 统一 Slider 组件（胶囊形，三处接入）

> 计划书章节：`docs/superpowers/plans/2026-08-09-app-shell-b5-design-language-ios.md` 的 Task B5-2（本文件为提取全文，作为唯一实施需求）。规格：`docs/superpowers/specs/2026-08-09-app-shell-b5-design-language-ios-design.md` §4。

## 绑定本任务的全局约束（必须遵守）

- 测试仅在 Web 环境执行（Vitest + Playwright）；不跑 tauri dev。
- 动画红线：布局/几何动画只允许 transform/opacity；模糊永不动画；时长/曲线经 CSS 变量。thumb hover/active 只动 transform；track 填充是背景渐变（paint-only，不动画）。
- 配置链路：本任务不涉及界面参数新增，customizer syncUI 的 `--fill` 机制保留（defaults→store→apply 链路已存在，不绕过直接写 CSS 变量）。
- 零运行时依赖；组件无抽象封装；遵循 `src/CLAUDE.md` 风格。
- 禁止升级核心依赖。
- **e2e 必须用 worktree 配置**：`npx playwright test --config=playwright.config.worktree.js`（端口 5174 新鲜 server）。共享 checkout 有陈旧 5173 server（PID 11964）serve 旧代码，勿用默认 `npm run test:e2e`。
- **视觉基线变化必须先解码比对确认由本次改动引起，再 `--update-snapshots`**。
- **e2e 截图前必须等待字体加载完成**（B5-1 已改显式 `document.fonts.load`，保留）。
- 提交前 `npm run build`；每任务结束全量回归绿（`npm test` + worktree e2e + build）。

## 前置接口（B5-1 已交付）

- `--font-sans` 含 `"Alibaba PuHuiTi"` 前缀——滑杆标签文字自动继承新字体（font-family 继承）。
- `--font-mono` 不动。

## Files

- Modify: `src/components/slider/slider.css`（整体替换为胶囊自绘）
- Modify: `src/demo/customizer-panel.js`（`.cust-range` → `.c-slider` 三处：renderSlider/syncUI/closest）
- Modify: `src/demo/motion-lab.js`（`.ml-slider` → `.c-slider` 四处：controls 模板 2 处 + JS 引用 2 处）
- Modify: `src/styles/customizer.css`（删 `.cust-range` 独立规则）
- Modify: `src/styles/motion-lab.css`（删 `.ml-slider` 独立规则 + `.ml-control` 布局适配）
- Modify: `tests/e2e/customizer.spec.js`（`.cust-range` → `.c-slider` 选择器）
- Modify: `tests/e2e/motion-lab.spec.js`（`.ml-slider` → `.c-slider` 选择器）
- Modify: `tests/unit/motion-lab.test.js`（`.ml-slider` → `.c-slider` 选择器）
- Test: `tests/unit/slider.test.js`（新建，renderSlider 签名 + 输出类名）

## Interfaces

- Consumes: Task B5-1 的 `--font-sans`（滑杆标签文字继承新字体）
- Produces: `.c-slider` 胶囊滑杆组件（track 用 `--fill` 变量驱动 accent 填充，thumb 20px 胶囊圆角）；`renderSlider({min,max,step,value,disabled,label})` 签名不变 —— B5-5 控件收尾沿用

## 实现步骤

### Step 1: 写失败单测（tests/unit/slider.test.js，新建）

```js
import { describe, it, expect } from 'vitest';
import { renderSlider } from '../../src/components/slider/slider.js';

describe('Slider 组件（B5-2：三区统一胶囊形）', () => {
  it('renderSlider 输出 .c-slider 且保留全部 props', () => {
    const html = renderSlider({ min: 0, max: 10, step: 0.5, value: 5, disabled: true, label: '测试' });
    expect(html).toContain('class="c-slider"');
    expect(html).toContain('min="0" max="10" step="0.5" value="5"');
    expect(html).toContain('disabled');
    expect(html).toContain('aria-label="测试"');
  });
  it('renderSlider 默认值', () => {
    const html = renderSlider({});
    expect(html).toContain('min="0" max="100" step="1" value="50"');
    expect(html).not.toContain('disabled');
  });
});
```

### Step 2: 运行确认红

Run: `npx vitest run tests/unit/slider.test.js`
Expected: FAIL（`slider.js` 现输出 `class="c-slider"` 但断言部分通过——需确认至少 1 个红，如 disabled/默认值断言；若现实现已符合，则改造为断言「组件/动效/外观三处不再有独立滑杆类名」的契约守卫，见 Step 3 注）

> 注：slider.js 现实现 `class="c-slider"`，类名断言可能已绿。真实 RED 信号放在 **Step 4 的集成断言**（e2e/单测查 `.cust-range`/`.ml-slider` 归零）。若 slider.test.js 全绿，接受（它是签名契约守卫），RED 以集成层为准。

### Step 3: slider.js 保持签名，slider.css 整体替换为胶囊

`src/components/slider/slider.js` 不改（renderSlider 已输出 `.c-slider`）。`src/components/slider/slider.css` 整体替换为：

```css
/* 统一 Slider（B5-2）：三区（组件/动效/外观）共用胶囊形。
   轨道 accent 填充经 --fill 变量（0-100%），customizer syncUI 已按值设置；
   动画红线：thumb hover/active 只动 transform（scale），track 填充是背景渐变（paint-only，不动画）。 */
.c-slider {
  -webkit-appearance: none; appearance: none;
  width: 100%; height: 24px; background: transparent;
}
.c-slider::-webkit-slider-runnable-track {
  height: 8px; border-radius: 999px;
  background: linear-gradient(var(--accent), var(--accent)) 0 / var(--fill, 50%) 100% no-repeat,
    var(--surface-hover);
}
.c-slider::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 20px; height: 20px; margin-top: -6px;
  border-radius: 8px;  /* 胶囊圆角拇指 */
  background: var(--surface-2); border: 2px solid var(--accent);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  transition: transform var(--dur-fast) var(--ease-spring);
}
.c-slider::-webkit-slider-thumb:hover { transform: scale(1.1); }
.c-slider::-webkit-slider-thumb:active { transform: scale(1.05); }
.c-slider::-moz-range-thumb {
  width: 16px; height: 16px; border-radius: 8px;
  background: var(--surface-2); border: 2px solid var(--accent);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}
.c-slider::-moz-range-track { height: 8px; border-radius: 999px; background: var(--surface-hover); }
.c-slider:disabled { opacity: 0.45; }
.c-slider:disabled::-webkit-slider-thumb { transform: none; }
```

### Step 4: 三处接入改造（删独立规则）

**① 组件分区**：`.c-slider` 已由 slider.css 全局定义，slider.js 输出不变 → 组件分区零改动（自动换胶囊）。`src/main.js:14` 已 import slider.css。

**② 外观定制器**（customizer-panel.js 三处 + customizer.css 删规则）：
- `customizer-panel.js:114`：`class="cust-range"` → `class="c-slider"`（renderSlider 内）
- `customizer-panel.js:205`：`querySelectorAll('.cust-range')` → `querySelectorAll('.c-slider')`（syncUI）
- `customizer-panel.js:346`：`e.target.closest('.cust-range')` → `e.target.closest('.c-slider')`（input 委托）
- `customizer.css`：删除 `.cust-range`/`.cust-range::-webkit-slider-thumb`/`.cust-range:disabled` 等全部 `.cust-range` 规则（约 145-168 行），`.cust-row` 结构保留
- **注意**：customizer syncUI 的 `--fill` 设置（`:210` `input.style.setProperty('--fill', ...)`）保留——胶囊 track 消费同一变量，机制天然兼容

**③ 动效分区**（motion-lab.js 四处 + motion-lab.css 删规则）：
- `motion-lab.js:84`：`class="ml-slider"` → `class="c-slider ml-slider"`（弹性滑杆；保留 `ml-slider` 类供 JS 语义定位，CSS 由 `.c-slider` 提供胶囊视觉）
- `motion-lab.js:90`：`class="ml-slider"` → `class="c-slider ml-slider"`（位移滑杆）
- `motion-lab.js:156,177,178`：JS `querySelector('.ml-slider')` **不改**（类仍存在，定位语义不变）
- `motion-lab.css`：删除 `.ml-slider` 独立规则（约 129 行 `accent-color: var(--accent)`），保留 `.ml-control` 布局（flex 行）；`.ml-control` 内滑杆弹性由 `.c-slider` 的 `width:100%` + `.ml-control { display:flex }` 自然撑开，无需额外规则

> **为什么保留 `ml-slider` 类**：motion-lab.js 用 `.ml-slider` 做语义定位（156/177/178 三处），删类需改 JS。保留双类（`.c-slider` 提供视觉、`.ml-slider` 保留定位）是最小改动。评审关注：`.c-slider` 的 `width:100%` 在 `.ml-control` flex 行内是否撑开——`.ml-control` 是 `display:flex; align-items:center`，子项默认 `flex:0 1 auto`，`width:100%` 会参与 flex 收缩到可用空间，`min-width:0` 由 flex 默认 `min-width:auto` 可能撑破——若视觉异常，给 `.ml-control .c-slider { min-width: 0; }` 兜底（实施时按实际观感决定，此注记入报告）。

### Step 5: e2e/单测选择器更新

- `tests/e2e/customizer.spec.js`：所有 `.cust-range` → `.c-slider`（约 6 处：21-23 的三个 `toHaveCount(0)`、52 的 `noise`、91 的 `radiusScale`、108 的 `scale`、112 的 `baseSize`）
- `tests/e2e/motion-lab.spec.js:14`：`.ml-slider` → `.c-slider`
- `tests/unit/motion-lab.test.js:28,30`：`.ml-slider` → `.c-slider`

### Step 6: 运行确认红（集成层）

Run: `npx vitest run tests/unit/slider.test.js tests/unit/motion-lab.test.js` → 若 slider.test 已绿，motion-lab.test 应红（`.c-slider` 尚未替换）
Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/customizer.spec.js -g "滑杆"` → 红（`.c-slider` 选择器找不到）

### Step 7: 运行确认绿

Run: `npx vitest run tests/unit/slider.test.js tests/unit/motion-lab.test.js` + `npx playwright test --config=playwright.config.worktree.js tests/e2e/customizer.spec.js tests/e2e/motion-lab.spec.js tests/e2e/form-controls.spec.js` → 全绿
Expected: 三处滑杆均为 `.c-slider` 胶囊；customizer syncUI `--fill` 继续驱动填充

### Step 8: 视觉基线重生成（三处滑杆变化）

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js --update-snapshots`
Expected: appearance/components/motion 分区 6 张（各 3 accent × 2 theme 中涉及滑杆的）重生成；app-main 2 张零变化（无滑杆）。**先解码比对**确认差异仅为滑杆形态。

### Step 9: 全量回归 + 提交

Run: `npx playwright test --config=playwright.config.worktree.js` → 全绿；`npm test` + `npm run build`
Expected: 全绿

```bash
git add src/components/slider/slider.css src/demo/customizer-panel.js src/demo/motion-lab.js src/styles/customizer.css src/styles/motion-lab.css tests/unit/slider.test.js tests/unit/motion-lab.test.js tests/e2e/customizer.spec.js tests/e2e/motion-lab.spec.js tests/e2e/visual-regression.spec.js tests/e2e/visual-regression.spec.js-snapshots
git commit -m "feat: 统一胶囊形 Slider 组件（组件/动效/外观三区共用 .c-slider，B5-2）"
```

> 提交惯例：feat + docs 两枚提交（docs 承载本任务报告/账本）。`playwright.config.worktree.js` 不得提交。

> 桌面验证（用户目检）：三区滑杆视觉一致胶囊形；动效试玩器横排布局不破。
