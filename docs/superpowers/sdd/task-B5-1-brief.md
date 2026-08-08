# Task B5-1: 字体全局替换（阿里普惠体 55/85）

> 计划书章节：`docs/superpowers/plans/2026-08-09-app-shell-b5-design-language-ios.md` 的 Task B5-1（本文件为提取全文，作为唯一实施需求）。规格：`docs/superpowers/specs/2026-08-09-app-shell-b5-design-language-ios-design.md` §3。

## 绑定本任务的全局约束（必须遵守）

- 测试仅在 Web 环境执行（Vitest + Playwright）；不跑 tauri dev。
- 动画红线：布局/几何动画只允许 transform/opacity；模糊永不动画；时长/曲线经 CSS 变量。
- 配置链路：界面参数修改必须经 defaults → store → apply，不绕过直接写 CSS 变量（本任务不涉及界面参数，无此链路）。
- 零运行时依赖；组件无抽象封装；遵循 `src/CLAUDE.md` 风格。
- 禁止升级核心依赖。
- **e2e 必须用 worktree 配置**：`npx playwright test --config=playwright.config.worktree.js`（端口 5174 新鲜 server，`reuseExistingServer:false`）。共享 checkout 有陈旧 5173 server（PID 11964）serve 旧代码，勿用默认 `npm run test:e2e`。
- **视觉基线变化必须先解码比对确认由本次改动引起，再 `--update-snapshots`**。B5-1 字体替换 → 预期内全量重生成。
- **e2e 截图前必须等待字体加载完成**（`document.fonts.ready`），否则 CJK 大字体未加载完会截图系统字体 → 基线抖动。
- 提交前 `npm run build`；每任务结束全量回归绿（`npm test` + worktree e2e + build）。
- `--font-mono` 保留（JetBrains Mono/Cascadia），本任务不碰。

## Files

- Create: `src/assets/fonts/AlibabaPuHuiTi-3-55-Regular.woff2`、`src/assets/fonts/AlibabaPuHuiTi-3-85-Bold.woff2`（从用户 Downloads 复制）
- Create: `src/styles/fonts.css`（@font-face 两档）
- Modify: `src/styles/base.css`（顶部引入 fonts.css）
- Modify: `src/styles/tokens.css:23`（`--font-sans` 加普惠体前缀）
- Modify: `tests/e2e/tokens.spec.js`（加 `--font-sans` 断言）
- Modify: `tests/e2e/visual-regression.spec.js`（截图前等 `document.fonts.ready`）
- Test: `tests/unit/font-assets.test.js`（新建，字体文件存在性 + tokens 引用守卫）

## Interfaces

- Produces: `@font-face 'Alibaba PuHuiTi'`（400/700）+ `--font-sans` 含 `"Alibaba PuHuiTi"` 前缀 —— B5-2/3/5 的滑杆/组件/控件文字自动继承（font-family 继承）
- `--font-mono` 不变（JetBrains Mono/Cascadia，B5 全程不碰）

## 实现步骤

### Step 1: 复制字体文件到 src/assets/fonts/

```bash
mkdir -p src/assets/fonts
cp "C:/Users/PomDetom/Downloads/AlibabaPuHuiTi-3-55-Regular/AlibabaPuHuiTi-3-55-Regular.woff2" src/assets/fonts/
cp "C:/Users/PomDetom/Downloads/AlibabaPuHuiTi-3-85-Bold/AlibabaPuHuiTi-3-85-Bold.woff2" src/assets/fonts/
```

### Step 2: 写失败单测（tests/unit/font-assets.test.js，新建）

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('阿里普惠体字体（B5-1：全局字体替换）', () => {
  // Vitest 3.2 + Vite 会将 `new URL(path, import.meta.url)` 字面量按 dev asset URL 解析，
  // 先取到变量再作 base，命中磁盘上真实的文件（同 window-capabilities.test.js 模式）。
  const moduleURL = import.meta.url;
  const base = (p) => new URL(`../../src/${p}`, moduleURL);

  it('55/85 两个 WOFF2 文件存在', () => {
    // 仅存在性守卫，不读内容（二进制大文件）
    expect(readFileSync(base('assets/fonts/AlibabaPuHuiTi-3-55-Regular.woff2'))).toBeTruthy();
    expect(readFileSync(base('assets/fonts/AlibabaPuHuiTi-3-85-Bold.woff2'))).toBeTruthy();
  });

  it('fonts.css 定义 55 Regular + 85 Bold 两档 @font-face', () => {
    const css = readFileSync(base('styles/fonts.css'), 'utf8');
    expect(css).toContain("font-family: 'Alibaba PuHuiTi'");
    expect(css).toContain('AlibabaPuHuiTi-3-55-Regular.woff2');
    expect(css).toContain('AlibabaPuHuiTi-3-85-Bold.woff2');
    expect(css).toContain('font-weight: 400');
    expect(css).toContain('font-weight: 700');
    expect(css).toContain('font-display: swap');
  });

  it('tokens.css --font-sans 含 Alibaba PuHuiTi 前缀', () => {
    const css = readFileSync(base('styles/tokens.css'), 'utf8');
    expect(css).toMatch(/--font-sans:\s*"Alibaba PuHuiTi",/);
  });

  it('base.css 引入 fonts.css', () => {
    const css = readFileSync(base('styles/base.css'), 'utf8');
    expect(css).toMatch(/@import.*fonts\.css/);
  });
});
```

### Step 3: 运行确认红

Run: `npx vitest run tests/unit/font-assets.test.js`
Expected: FAIL（fonts.css 不存在 / tokens.css 无前缀 / base.css 无 @import）

### Step 4: 实现 fonts.css（src/styles/fonts.css，新建）

```css
/* 阿里普惠体（B5-1）：55 Regular 正文 + 85 Bold 标题，WOFF2 官方包。拉丁缺字形回退系统字体栈
   （--font-sans 后续已含 -apple-system/Segoe UI）。font-display: swap → 首屏系统字体占位、加载后替换。 */
@font-face {
  font-family: 'Alibaba PuHuiTi';
  src: url('../assets/fonts/AlibabaPuHuiTi-3-55-Regular.woff2') format('woff2');
  font-weight: 400; font-display: swap;
}
@font-face {
  font-family: 'Alibaba PuHuiTi';
  src: url('../assets/fonts/AlibabaPuHuiTi-3-85-Bold.woff2') format('woff2');
  font-weight: 700; font-display: swap;
}
```

### Step 5: 改 tokens.css 的 --font-sans

`src/styles/tokens.css:23` 改为：

```css
  --font-sans: "Alibaba PuHuiTi", -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
```

> 普惠体排最前（中文/标点走普惠体）；拉丁（英文/数字）在普惠体缺字形时回退 Segoe UI。`--font-size-*`/`--font-weight-*` 不动。

### Step 6: base.css 引入 fonts.css

`src/styles/base.css` 顶部（第一行 `*, *::before` 之前）加：

```css
@import './fonts.css';
```

> 必须置于 CSS 首行（@import 规则须先于其他规则）。base.css 由 main.js:4 引入，Tauri/浏览器共用。

### Step 7: 单测确认绿

Run: `npx vitest run tests/unit/font-assets.test.js`
Expected: PASS

### Step 8: e2e 加 --font-sans 断言（tests/e2e/tokens.spec.js 追加）

```js
test('B5-1：--font-sans 全局指向阿里普惠体', async ({ page }) => {
  await page.goto('/?mode=app');
  // 等字体加载完成（CJK 字体大，font-display:swap 会先渲染系统字体占位）
  await page.evaluate(() => document.fonts.ready);
  const fam = await page.evaluate(() =>
    getComputedStyle(document.body).fontFamily);
  expect(fam).toContain('Alibaba PuHuiTi');
  // 普惠体已加载（55 Regular）
  const loaded = await page.evaluate(() =>
    document.fonts.check('14px "Alibaba PuHuiTi"'));
  expect(loaded).toBe(true);
});
```

### Step 9: 视觉回归加字体等待（tests/e2e/visual-regression.spec.js）

在 `await locator.scrollIntoViewIfNeeded();` 之前（约 SETTLE_MS 那行前）加：

```js
        await page.evaluate(() => document.fonts.ready); // B5-1：CJK 字体大，截图前必须等加载完成防抖动
```

### Step 10: 视觉基线重生成（预期内全量）

Run: `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js --update-snapshots`
Expected: 24 张重生成（字体替换 → 全量文字渲染变化）。**先解码比对**：随机抽 2-3 张新旧图确认差异仅文字字形（非布局/颜色意外变化），再提交基线。

### Step 11: 全量回归 + 提交

Run: `npx playwright test --config=playwright.config.worktree.js` → 全绿；`npm test` + `npm run build`
Expected: 全绿（新增 font-assets 单测 + tokens e2e + 24 视觉重生成）

```bash
git add src/assets/fonts/ src/styles/fonts.css src/styles/base.css src/styles/tokens.css tests/unit/font-assets.test.js tests/e2e/tokens.spec.js tests/e2e/visual-regression.spec.js tests/e2e/visual-regression.spec.js-snapshots
git commit -m "feat: 阿里普惠体全局替换（--font-sans 前缀 + 55/85 WOFF2，B5-1）"
```

> 提交惯例：本项目 B3/B4 既有惯例为 feat + docs 两枚提交（docs 承载评审哈希）。若评审有结论，另加一枚 docs 提交留痕（见 task-B5-1-report.md 说明）。`playwright.config.worktree.js` 属于 worktree 本地配置，**不得提交**。

> 桌面验证（用户目检）：`npm run tauri:dev` 后中文/英文整体换普惠体观感；标题 85、正文 55。
