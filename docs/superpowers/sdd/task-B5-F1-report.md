# Task B5-F1 实施报告：普惠体 500 字重补齐（65 Medium）

> 简报：docs/superpowers/sdd/task-B5-F1-brief.md（唯一实施需求）。计划书：docs/superpowers/plans/2026-08-09-app-shell-b5-faux-weight-fix.md。
> 环境：worktree `C:\Repository\ui-design\.claude\worktrees\b5-design-language`，分支 `feature/b5-faux-weight-fix`（自 main 0b79e70 检出）。e2e 一律 `playwright.config.worktree.js`（端口 5174 新鲜 server）。

## 实现内容

| 文件 | 变更 |
|---|---|
| `src/assets/fonts/AlibabaPuHuiTi-3-65-Medium.woff2` | 新增（5,469,328 B ≈ 5.3MB，从 `C:\Users\PomDetom\Downloads\...` 复制，Step 1） |
| `src/styles/fonts.css` | 新增 500 @font-face（65 Medium），插于 55 与 85 之间保持字重升序；文件头注释更新为三档 55/65/85 并说明 B5-F1 意图 |
| `tests/unit/font-assets.test.js` | 「55/85 两个 WOFF2」→「55/65/85 三个 WOFF2」；「两档 @font-face」→「三档 @font-face」补 500 断言（逐字按简报） |
| `tests/e2e/tokens.spec.js` | 追加 B5-F1 用例：`document.fonts.load('500 14px "Alibaba PuHuiTi"')` + `document.fonts.check(...)`（逐字按简报） |
| `tests/e2e/visual-regression.spec.js-snapshots/*.png` | 8 张基线重生成（见「视觉基线解码比对」） |

未改动（全局约束兑现）：`--font-weight-*` 令牌、`--font-mono`、themes.css、既有 55/85 WOFF2、视觉规格文件本身、无任何运行时依赖、零动画改动、不涉及配置链路。

## TDD Evidence

### RED（Step 3）
- 命令：`npx vitest run tests/unit/font-assets.test.js`
- 结果：**1 failed / 3 passed**（退出码 1）
- 失败输出（摘）：
  ```
  FAIL tests/unit/font-assets.test.js > fonts.css 定义 55 Regular + 65 Medium + 85 Bold 三档 @font-face
  AssertionError: expected '/* 阿里普惠体（B5-1）：55 Regular 正文 + 85 Bol…' to contain 'AlibabaPuHuiTi-3-65-Medium.woff2'
  ```
- 为什么红：实现前 fonts.css 只有 400/700 两档，`AlibabaPuHuiTi-3-65-Medium.woff2` 路径与 `font-weight: 500` 断言均落空。
- 说明：按简报 Step 1→2 顺序，65 文件存在性断言在 Step 1 复制后即绿，红色聚焦在真正的实现面（fonts.css 500 档）——符合简报步骤排序。

### GREEN（Step 5）
- 命令：`npx vitest run tests/unit/font-assets.test.js`
- 结果：**4 passed**（1 file / 4 tests），退出码 0。

### e2e 断言（Step 6）
- 命令：`npx playwright test --config=playwright.config.worktree.js tests/e2e/tokens.spec.js`
- 结果：**4 passed**（含新增 B5-F1 500 face 加载断言）。

## 测试结果

- `npm test`（全量单测）：**14 文件 / 65 用例全绿**。
- `npx playwright test --config=playwright.config.worktree.js`（全量 e2e）：**112 passed + 1 flake**。
  - 唯一失败：`smoke.spec.js:5 › app shell renders`（首个测试，冷启动 vite 5174 下 5s 内 `.app-main` 未挂载，mount-timeout 型）。单独重跑同 spec **通过（647ms）**，确认为环境性冷启动抖动，非回归。已知抖动家族同型。
- `npm run build`：成功，`dist/assets/AlibabaPuHuiTi-3-65-Medium-*.woff2`（5,469.33 kB）正确打包。

## 视觉基线解码比对（Step 7）

命令：`npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js --update-snapshots` → **24 passed**（8 张 re-generated + 16 张保持原基线）。

**重生成的 8 张**（git status 确认仅这些有变更）：
- `appearance-partition` × 6（light/dark × indigo/amber/emerald，全重生成）
- `motion-partition-light-amber`、`motion-partition-dark-amber`

**解码比对**（旧基线存 `/tmp/b5f1-baseline-old`，Python/PIL 逐像素 diff + 连通域 + 调色板分析）：
- 变化量极小：appearance 每张约 2132–2139 px（占 2,009,536 的 0.106%）；motion-amber 276 px（0.03%）。
- 空间形态：appearance 变化像素呈 5 条 11px 高、窄 x 带的散点（x≈0–47 / 378–413 / 744–767；y≈60/354/441/528/615）——即文本行的字形笔画带；motion-amber 的 276 px 全部收敛在单一 35×12 标签框内（538,615)-(573,627)。非布局位移（布局位移会产生大块连续变化区）。
- 调色板不变：量化后新旧图互斥色仅 0–2 px（2M 量级），**无任何颜色/主题变化**。
- 字形笔锋：孤立标签 ink 色稳定（如 motion 标签 ink=(186,134,29) 琥珀强调色，新旧同色），墨迹覆盖以减薄为主（真 65 细于伪粗合成），少数单元格 ±4–10 px 属多色区域 ink 采样剪裁噪声。
- 结论：**差异仅为 medium 文字字形粗细（真 65 vs 伪粗描边），非布局、非颜色**，基线提交安全。

**未重生成的 16 张**（app-main ×6、components ×6、motion-indigo/emerald ×4）：以简报同款视觉流程新鲜截图逐像素比对，与旧基线差异**全部 < Playwright 默认阈值 51/channel**（components 1337 px / app-main 197 px / motion-indigo 4473 px，maxChannel>51 均为 0）——即这些分区确有 medium 文字渲染变化但幅度低于重生成阈值，且**无论 65 是否在截图前加载均落在阈值内**（未加载=伪粗=旧基线；已加载=真 65=轻微差异），基线稳定不抖。对照 `--font-weight-medium` 消费点：appearance 定制器标签/分区标题为中等字号长文本，笔画差达 >51 → 触发重生成；components/app-main 的按钮/徽标/标签/标题栏文字为 xs/sm 短文本，差异低于阈值。

## 全量回归（Step 8）

| 项 | 结果 |
|---|---|
| `npm test` | 65/65 全绿（14 文件） |
| 全量 e2e（worktree config） | 112 passed + 1 冷启动 flake（smoke 重跑绿，非回归） |
| `npm run build` | 成功 |

## Self-review 发现

- 三个代码文件与简报 Step 2/4/6 逐字一致；`git diff` 确认无多余改动。
- 全局约束逐条核对：令牌不动、themes.css 不动、55/85 不动、`--font-mono` 不动、无依赖新增、零动画改动、未触碰配置链路。
- `playwright.config.worktree.js` 未加入任何提交；temp 比对脚本/诊断 spec 已清理。
- 视觉基线重生成前已做解码比对（上节），满足「先解码确认再 update」要求。

## Concerns / 建议

1. **视觉规格未显式加载 500 档**（简报范围外，未改动 `visual-regression.spec.js`）：现规格 `document.fonts.load` 只显式拉 400/700，500 靠惰性触发。经验上 appearance 6/6 稳定加载并重生成，风险低；但 appearance 基线此后依赖「截图前 65 已加载」这一时序（其余分区两态均稳）。建议后续将 `'500 14px "Alibaba PuHuiTi"'` 并入视觉规格的 fonts.load（与 B5-1 对 400/700 的竞态适配同型），即可对 65 档取得完全确定性。此项超出简报 Files 范围，留待控制器/评审决定。
2. **smoke 冷启动 flake**：全量跑首测（`/?mode=app` 冷启动 vite 5174）偶发 5s 未挂载超时；重跑绿。环境性（资源受限 + 新 server 首请求），非本次改动引入。
3. 桌面目检（真 65 下按钮/标签/表单 label 清晰锐利、400/700 观感不变）由用户人工验证，Web 侧已由 tokens e2e + 基线重生成覆盖。

## 提交

- feat 提交：`feat: 普惠体 500 字重补齐（65 Medium，消除 medium 伪粗模糊，B5-F1）`（含 65 woff2 + fonts.css + 两个测试文件 + 8 张基线）
- docs 提交：本报告 + 账本 `progress-b5-fix.md` + 简报（`git add docs/superpowers/sdd/`）
