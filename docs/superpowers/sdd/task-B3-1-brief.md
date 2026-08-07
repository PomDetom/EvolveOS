# Task B3-1: 外观分组重命名（全局语义 + desc）

## 任务定位

应用壳 B3 第二个任务。B3 的目标是让设置「外观」分区从「看起来只调字体」升级为「全局 UI 外观调整」——分组标题改全局语义名 + 每组加一行描述。**「玻璃材质→表面质感」已在 B2-R5 完成**，本任务只改其余 5 组，并给全部 6 组加 desc。

## 现状（src/demo/customizer-panel.js，GROUPS 常量约 39-81 行）

当前 6 组：`色彩` / `表面质感`（已改）/ `排版` / `圆角` / `动效` / `阴影`。每组结构 `{ title, pre?, sliders }`。唯一既有分组标题断言是 tests/e2e/customizer.spec.js:43 的「表面质感」（保持不动）。

## 需求（唯一需求源）

**1. 重命名 5 组 title**（`表面质感` 不动）：

| 现 title | 新 title |
|---|---|
| 色彩 | **整体色调** |
| 表面质感 | 表面质感（不动） |
| 排版 | **文字排版** |
| 圆角 | **边角形状** |
| 动效 | **动效节奏** |
| 阴影 | **阴影层次** |

**2. 每组加 `desc` 字段**，渲染在组标题下、pre/sliders 之前：

| title | desc |
|---|---|
| 整体色调 | 主题色/色相/饱和度/色温 |
| 表面质感 | 透明度/模糊/噪点强度/亚克力材质 |
| 文字排版 | 基准字号/缩放 |
| 边角形状 | 圆角比例 |
| 动效节奏 | 时长缩放/弹性强度 |
| 阴影层次 | 阴影强度 |

**3. 渲染**：`renderCustomizerGroups`（customizer-panel.js:302-310）的组模板改为：

```js
container.innerHTML = GROUPS.map((g) => `
  <section class="cust-group">
    <h4 class="cust-group__title">${g.title}</h4>
    ${g.desc ? `<p class="cust-group__desc">${g.desc}</p>` : ''}
    ${g.pre ? g.pre(cfg) : ''}
    ${g.sliders.map((s) => renderSlider(cfg, s)).join('')}
  </section>`).join('');
```

**4. 样式**（src/styles/customizer.css）：加 `.cust-group__desc`（次要色小字），并相应收紧 `.cust-group__title` 的下边距使 desc 紧贴标题。样式要点：
- `color: var(--text-3)`；`font-size: var(--font-size-xs)`
- 让 desc 贴住标题下方（`.cust-group__title` 现 `margin-bottom: var(--space-3)` 需调小，desc 承担与后续内容的间距），可用负 margin 或改 title margin-bottom 达成，保持组内紧凑
- **不改组内滑杆布局**；不动 `.cust-group__title` 的 flex 结构与其 `::after` 分隔线

## 待修改文件

- `src/demo/customizer-panel.js`：GROUPS 重命名 + desc；组模板渲染 desc
- `src/styles/customizer.css`：`.cust-group__desc` 样式 + 标题下边距调整
- `tests/e2e/customizer.spec.js`：新增用例断言 6 组新标题 + desc
- `tests/e2e/visual-regression.spec.js-snapshots/`：`appearance-partition-*.png`（6 张）重生成

## 测试（TDD：先写断言确认红，再实现确认绿）

customizer.spec.js 新增用例（放在既有「外观分区：表面质感组标题」用例附近）：

```js
test('外观分组标题体现全局语义（重命名 + desc）', async ({ page }) => {
  await page.goto('/?mode=app');
  await page.locator('.c-titlebar__control--settings').click();
  await page.locator('.app-main__nav-r .c-navwheel__item').nth(1).click(); // 外观
  const group = page.locator('.cust-group');
  await expect(group).toHaveCount(6);
  await expect(group.nth(0).locator('.cust-group__title')).toHaveText('整体色调');
  await expect(group.nth(0).locator('.cust-group__desc')).toHaveText('主题色/色相/饱和度/色温');
  await expect(group.nth(1).locator('.cust-group__title')).toHaveText('表面质感');
  await expect(group.nth(1).locator('.cust-group__desc')).toHaveText('透明度/模糊/噪点强度/亚克力材质');
  await expect(group.nth(2).locator('.cust-group__title')).toHaveText('文字排版');
  await expect(group.nth(2).locator('.cust-group__desc')).toHaveText('基准字号/缩放');
  await expect(group.nth(3).locator('.cust-group__title')).toHaveText('边角形状');
  await expect(group.nth(3).locator('.cust-group__desc')).toHaveText('圆角比例');
  await expect(group.nth(4).locator('.cust-group__title')).toHaveText('动效节奏');
  await expect(group.nth(4).locator('.cust-group__desc')).toHaveText('时长缩放/弹性强度');
  await expect(group.nth(5).locator('.cust-group__title')).toHaveText('阴影层次');
  await expect(group.nth(5).locator('.cust-group__desc')).toHaveText('阴影强度');
});
```

既有用例「外观分区：表面质感组标题 + 亚克力开关 + 噪点滑杆」（customizer.spec.js:39-46）必须继续通过（`toContainText('表面质感')` 在新实现下仍匹配）。

## 视觉基线（重点：必须先解码比对再重生成）

重命名 + desc 会改变 `appearance-partition-*.png`（6 张：light/dark × indigo/amber/emerald）。流程：

1. 先跑 `npm run test:visual`，确认只有 `appearance-partition-*` 失败（app-main/components-partition/motion-partition 应零漂移）。
2. **解码比对**失败快照，确认差异区域 = 分组标题文字 + desc 行（本次改动引入），无布局位移/无意外区域。
3. 确认后 `--update-snapshots` 只重生成 appearance-partition 6 张（`npx playwright test tests/e2e/visual-regression.spec.js -g "appearance-partition" --update-snapshots`）。
4. 复跑 `npm run test:visual` 全绿。

如出现 app-main 或其它分区基线漂移，**不要 update-snapshots**，报告给控制器（可能是 no-op 抖动或真实回归）。

## 验证要求

- `npx playwright test tests/e2e/customizer.spec.js`（新旧用例全绿）
- `npm run test:e2e`（全量交互绿，含视觉基线重生成后）
- `npm test`（单元全量绿——customizer.test.js 只测订阅退订，应零影响）
- `npm run build` 通过

## 提交

一个 commit，message：`feat: 外观分组重命名（整体色调/表面质感/文字排版/边角形状/动效节奏/阴影层次）+ desc`

## 报告

完整报告写入 `docs/superpowers/sdd/task-B3-1-report.md`：改动说明、测试命令与输出摘要、**基线重生成的解码比对说明**（差异区域确认）、self-review、提交哈希。回复本会话只需：状态（DONE/DONE_WITH_CONCERNS/BLOCKED）+ 提交哈希 + 一行测试摘要 + 疑虑（如有）。
