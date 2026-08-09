# Task B5-F1: 普惠体 500 字重补齐（65 Medium）

> 计划书章节：`docs/superpowers/plans/2026-08-09-app-shell-b5-faux-weight-fix.md` 的 Task B5-F1（本文件为提取全文，作为唯一实施需求）。规格：`docs/superpowers/specs/2026-08-09-app-shell-b5-faux-weight-fix-design.md`。

## 绑定本任务的全局约束（必须遵守）

- 测试仅在 Web 环境执行（Vitest + Playwright）；不跑 tauri dev。
- **e2e 必须用 worktree 配置**：`npx playwright test --config=playwright.config.worktree.js`（端口 5174 新鲜 server）。共享 checkout 有陈旧 5173 server（PID 11964）serve 旧代码，勿用默认 `npm run test:e2e`。
- **视觉基线变化必须先解码比对确认由本次改动引起，再 `--update-snapshots`**；本修复改 medium 字重渲染 → 预期内多分区重生成。
- **e2e 截图前必须等待字体加载完成**（B5-1 已改显式 `document.fonts.load`，保留）。
- 动画红线：本任务零动画改动。
- 配置链路：本任务不涉及界面参数（纯字体资产 + @font-face + 测试）。
- 零运行时依赖；禁止升级核心依赖；遵循 `src/CLAUDE.md` 风格。
- 提交前 `npm run build`；每任务结束全量回归绿。
- `--font-weight-*` 令牌定义**不动**（400/500/600/700 保持）；600 行为不动（就近 700）；`--font-mono` 不动；themes.css 不动。
- 字体文件来源（用户已提供）：`C:\Users\PomDetom\Downloads\AlibabaPuHuiTi-3-65-Medium\AlibabaPuHuiTi-3-65-Medium.woff2`（5.3MB，已确认存在）。
- 既有 55/85 WOFF2 已在 `src/assets/fonts/`（B5-1），不得删改。

## Files

- Create: `src/assets/fonts/AlibabaPuHuiTi-3-65-Medium.woff2`（从 Downloads 复制）
- Modify: `src/styles/fonts.css`（新增 500 @font-face + 注释更新）
- Modify: `tests/unit/font-assets.test.js`（补 65 存在性 + 500 face 断言）
- Modify: `tests/e2e/tokens.spec.js`（补 500 face 加载断言）

## Interfaces

- Consumes: B5-1 的 `--font-sans: "Alibaba PuHuiTi", ...` 前缀（本次不碰）
- Produces: `@font-face 'Alibaba PuHuiTi'` 新增 500 档 —— medium 消费点（`var(--font-weight-medium)`）自动经字重匹配命中真 65，无需改任何 CSS 消费点

## 实现步骤

### Step 1: 复制字体文件到 src/assets/fonts/

```bash
cp "C:/Users/PomDetom/Downloads/AlibabaPuHuiTi-3-65-Medium/AlibabaPuHuiTi-3-65-Medium.woff2" src/assets/fonts/
```

### Step 2: 扩展失败单测（tests/unit/font-assets.test.js）

将既有「55/85 两个 WOFF2 文件存在」用例改为含 65，并给「fonts.css 定义两档 @font-face」用例补 500 断言：

```js
  it('55/65/85 三个 WOFF2 文件存在', () => {
    // 仅存在性守卫，不读内容（二进制大文件）
    expect(readFileSync(base('assets/fonts/AlibabaPuHuiTi-3-55-Regular.woff2'))).toBeTruthy();
    expect(readFileSync(base('assets/fonts/AlibabaPuHuiTi-3-65-Medium.woff2'))).toBeTruthy();
    expect(readFileSync(base('assets/fonts/AlibabaPuHuiTi-3-85-Bold.woff2'))).toBeTruthy();
  });

  it('fonts.css 定义 55 Regular + 65 Medium + 85 Bold 三档 @font-face', () => {
    const css = readFileSync(base('styles/fonts.css'), 'utf8');
    expect(css).toContain("font-family: 'Alibaba PuHuiTi'");
    expect(css).toContain('AlibabaPuHuiTi-3-55-Regular.woff2');
    expect(css).toContain('AlibabaPuHuiTi-3-65-Medium.woff2');
    expect(css).toContain('AlibabaPuHuiTi-3-85-Bold.woff2');
    expect(css).toContain('font-weight: 400');
    expect(css).toContain('font-weight: 500');
    expect(css).toContain('font-weight: 700');
    expect(css).toContain('font-display: swap');
  });
```

（tokens.css `--font-sans` 前缀断言、base.css `@import` 断言保持原样。）

### Step 3: 运行确认红

Run: `npx vitest run tests/unit/font-assets.test.js`
Expected: FAIL（65 文件不存在 → 存在性断言红；fonts.css 无 500 档 → @font-face 断言红）

### Step 4: 实现 fonts.css 500 档

`src/styles/fonts.css` 在两个既有 @font-face 之后新增（并更新文件头注释，注明三档 55/65/85）：

```css
@font-face {
  font-family: 'Alibaba PuHuiTi';
  src: url('../assets/fonts/AlibabaPuHuiTi-3-65-Medium.woff2') format('woff2');
  font-weight: 500; font-display: swap;
}
```

> 与 55/85 逐字同结构，仅文件与字重不同。放在 55 与 85 之间保持字重升序。

### Step 5: 单测确认绿

Run: `npx vitest run tests/unit/font-assets.test.js`
Expected: PASS

### Step 6: e2e 补 500 face 加载断言（tests/e2e/tokens.spec.js 追加）

在既有 B5-1 tokens 测试后追加：

```js
test('B5-F1：--font-sans 的 medium 字重指向普惠体 500（65 Medium）', async ({ page }) => {
  await page.goto('/?mode=app');
  // 显式强制加载 500 档（B5-1 竞态适配同型：document.fonts.ready 早 settle，须显式 load）
  await page.evaluate(() => document.fonts.load('500 14px "Alibaba PuHuiTi"'));
  const loaded = await page.evaluate(() =>
    document.fonts.check('500 14px "Alibaba PuHuiTi"'));
  expect(loaded).toBe(true);
});
```

### Step 7: 视觉基线重生成（medium 文字渲染变化）

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js --update-snapshots`
Expected: 含 medium 文字的分区重生成（app-main/appearance/components/motion 中以 `--font-weight-medium` 渲染的标签/按钮/徽标文字变清晰）。**先解码比对**：随机抽 2-3 张新旧图确认差异仅文字字形粗细（真 65 vs 伪粗描边），非布局/颜色变化，再提交基线。

### Step 8: 全量回归 + 提交

Run: `npx playwright test --config=playwright.config.worktree.js` → 全绿；`npm test` + `npm run build`
Expected: 全绿

```bash
git add src/assets/fonts/AlibabaPuHuiTi-3-65-Medium.woff2 src/styles/fonts.css tests/unit/font-assets.test.js tests/e2e/tokens.spec.js tests/e2e/visual-regression.spec.js-snapshots
git commit -m "feat: 普惠体 500 字重补齐（65 Medium，消除 medium 伪粗模糊，B5-F1）"
```

> 提交惯例：feat + docs 两枚提交（docs 承载本任务报告/账本 `progress-b5-fix.md`）。`playwright.config.worktree.js` 不得提交。

> 桌面验证（用户目检）：按钮/标签/表单 label 等 medium 文字不再"糊糊"，清晰锐利；400 正文与 700 加粗观感不变。
