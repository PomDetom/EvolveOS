# Task B2-R7: Tauri 背景修复（桌面显示背景层）+ 关闭背景选项

（用户反馈：桌面端三个背景无效、主题颜色不正常——根因是 `[data-tauri="1"]` 隐藏背景层 + WebView2 透明窗口下 backdrop-filter 无法模糊桌面壁纸）

## Global Constraints（约束本任务）

- 测试仅在 Web 环境执行；动画红线（背景层静态、blur 不动画）；配置链路不绕过。
- 零运行时依赖；遵循 src/CLAUDE.md。
- **命名保留**：`--glass-*` / `data-glass` / `data-backdrop` 结构不变（新增 `none` 值）。
- 视觉基线会变（外观分区背景装饰按钮 3→4）→ 确认差异由本次改动引起后 `--update-snapshots`。
- TDD；`npm test` + `npm run test:e2e` + `npm run test:visual` + `npm run build` 全绿。

## 背景（用户 Tauri 目检反馈）

网页端正常显示背景，桌面端（Tauri）「三个背景无效 + 主题颜色不正常」。控制器根因确认：
- `app-main.css:48` `[data-tauri="1"] .app-main__backdrop { opacity: 0 }` 在 Tauri 下隐藏装饰背景层；
- 原设计意图「Tauri 模糊真实壁纸」不成立（WebView2 透明窗口下 backdrop-filter 无法模糊桌面）；
- 结果桌面端：无装饰背景 + 表面 0.48 半透明平涂在桌面上 → 观感异常。

**用户决策**：① 桌面端也显示背景层（删隐藏规则）；② tauri.conf.json 窗口 `transparent` 改 `false`（背景层是不透明的 `--surface-solid` 实底，桌面壁纸本就看不到，透明已无意义且是 WebView2 渲染怪癖来源）；③ 外观分区背景装饰加「关闭背景」预设。

## Files

- Modify: `src/app/app-main.css`（删 `[data-tauri="1"]` 隐藏规则；加 `data-backdrop="none"` 平铺实底预设）
- Modify: `src/app/app-main.js`（BD_LABELS 加 `none: '关闭'`，背景装饰按钮 3→4）
- Modify: `src-tauri/tauri.conf.json`（窗口 `transparent: true` → `false`）
- Modify: `tests/e2e/app-shell.spec.js`（「背景层」用例扩展 none 预设）
- Test: 视觉基线重生成（外观分区 6 张，按钮 3→4）

## Interfaces

- Consumes: `data-backdrop="gradient|geo|grid"`（R3）；`.app-main__backdrop` 背景层；BD_LABELS（app-main.js）
- Produces: `data-backdrop="none"` 新值（`--backdrop-bg: var(--surface-solid)` 平铺实底，无渐变装饰）；桌面端（Tauri）背景层可见；窗口不透明

## 当前状态（实测事实）

- `app-main.js:135` `const BD_LABELS = { gradient: '渐变', geo: '几何', grid: '网格' };`——按钮由 `Object.keys(BD_LABELS)` 生成（144-146 行），点击更新 `appMain.dataset.backdrop`（150-159 行）。模板默认 `data-backdrop="gradient"`（94 行）。
- `app-main.css:48` `.app-main[data-tauri="1"] .app-main__backdrop { opacity: 0; }`（待删）。
- `tauri.conf.json` 窗口 `"transparent": true`（约第 19 行）。
- e2e「背景层」用例（app-shell.spec.js 约 370-383 行）：断言 backdrop 可见 + 默认 gradient + 切 geo。

## Steps

### Step 1: 写失败 e2e（app-shell.spec.js，「背景层」用例扩展）

在既有「背景层」用例内（切 geo 之后）追加「关闭背景」断言：

```js
  // 关闭背景：data-backdrop=none → 背景层平铺实底（无渐变装饰）
  await page.locator('.app-main__backdrop-opt[data-bd="none"]').click();
  await expect(page.locator('.app-main')).toHaveAttribute('data-backdrop', 'none');
  const flat = await page.locator('.app-main__backdrop').evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(flat).not.toMatch(/radial-gradient\(|linear-gradient\(/);
```

### Step 2: 运行确认红

Run: `npx playwright test tests/e2e/app-shell.spec.js -g "背景层"`
Expected: FAIL（`data-bd="none"` 按钮不存在）

### Step 3: app-main.js 加「关闭背景」按钮

`BD_LABELS` 改为：
```js
const BD_LABELS = { gradient: '渐变', geo: '几何', grid: '网格', none: '关闭' };
```
（按钮 3→4 自动生效；点击逻辑复用，无改动）

### Step 4: app-main.css 删 Tauri 隐藏规则 + 加 none 预设

删除：
```css
.app-main[data-tauri="1"] .app-main__backdrop { opacity: 0; }
```
（及第 47 行过时注释「Tauri：背景层透明，模糊真实壁纸」）

新增 none 预设（放在 grid 预设之后）：
```css
.app-main[data-backdrop="none"] { --backdrop-bg: var(--surface-solid); }
```

### Step 5: tauri.conf.json 关透明

`"transparent": true` → `"transparent": false`（窗口变不透明；装饰背景层为不透明实底，桌面壁纸本就不透出，行为与浏览器一致）

### Step 6: 运行绿 + 基线重生成

Run: `npx playwright test tests/e2e/app-shell.spec.js -g "背景层"`（扩展用例绿）→ `npm run test:e2e`（全量，其余零冲击）+ `npm test` + `npm run build`；视觉基线 `--update-snapshots`（外观分区 6 张重生成——背景装饰按钮 3→4；其余 18 张不动）。若 `--update-snapshots` no-op（同 R2/R6 阈值问题），删除外观分区 6 张快照强制重生成。
Expected: 全绿

### Step 7: 提交

```bash
git add src/app/app-main.css src/app/app-main.js src-tauri/tauri.conf.json tests/e2e/app-shell.spec.js tests/e2e/visual-regression.spec.js tests/e2e/visual-regression.spec.js-snapshots/
git commit -m "feat: Tauri 桌面显示背景层（关窗口透明）+ 背景装饰「关闭背景」预设"
```
