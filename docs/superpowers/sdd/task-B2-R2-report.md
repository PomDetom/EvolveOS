# Task B2-R2: 表面应用亚克力 + 去高光 + 噪点层 + 闭环 M-1 — 实施报告

- **状态**：DONE（评审修复轮 R1/5 完成：视觉基线 18 张重生成 + 其余 `--glass-*` 消费者一致化；初版基线「no-op」结论已更正，见下）
- **提交**：见本报告文末「提交」
- **需求源**：docs/superpowers/sdd/task-B2-R2-brief.md（唯一需求源）
- **分支**：feature/b2-visual（R1 材质令牌 + 噪点配置链路已完成并入）

## 变更文件

| 文件 | 变更 |
|---|---|
| `src/app/app-main.css` | 表面 backdrop-filter 全量消费亚克力配方（nav-l/nav-r/pages/card + 手机 stack/stack-page/dock）；`[data-glass="off"]` 降级块不变；新增 `.app-main::after` 噪点覆盖层 + `[data-glass="off"]` 时 `opacity: 0` |
| `src/styles/base.css` | `.glass` backdrop-filter 改亚克力配方 + `box-shadow` 去除 `--shadow-inset-highlight` |
| `src/components/title-bar/title-bar.css` | `.c-titlebar` 亚克力配方 + 新增 `:root[data-glass="off"] .c-titlebar` 降级纯色（闭环 B2-1 M-1） |
| `src/components/navigation-wheel/nav-wheel.css` | 新增 `data-glass="off"` 时 `.c-navwheel__mask`/`--bottom` 遮罩渐变底色换 `--surface-solid`（闭环 B2-1 M-1）；默认渐变仍 `var(--glass-bg)`（亚克力着色底） |
| `src/components/card/card.css` | `.c-card--glass` 亚克力配方 + 去除 inset-highlight 反光 |
| `src/components/dialog/dialog.css` | `.c-dialog` 亚克力配方 + 去除 inset-highlight 反光 |
| `src/components/floating-window/floating-window.css` | `.c-fwin`/`.c-fwin--pinned` 亚克力配方 + 去除 inset-highlight 反光 |
| `tests/e2e/app-shell.spec.js` | 新增「亚克力材质：表面增饱和模糊 + 噪点层存在」用例（brief Step 1 字面） |

## TDD 证据

- **Step 1/2（红）**：新增用例后运行 `npx playwright test tests/e2e/app-shell.spec.js -g "亚克力材质"` → FAIL（实测 `blur(24px) saturate(1.4)`，无 `brightness(`、无噪点层 backgroundImage）。
- **Step 3-6（实现）**：按上表落地（app-main 表面 + 噪点层 → base.css `.glass` → card/dialog/floating-window → titlebar/nav-wheel 闭环 M-1）。
- **Step 7（绿）**：`-g "亚克力材质|玻璃两档"` → 2 passed（新用例 + B2-1 两档回归）；全量见下。

## 与 brief 的一处字面差异（手机/卡片表面）

brief Step 3 称 `.app-main__nav-l/.nav-r/.pages/.card` + 手机 `.app-main__stack/.stack-page/.dock`「现为 `background: var(--glass-bg); backdrop-filter: blur(...) saturate(1.4)`」。实测（git show 55d0bcc 复核 B2-1 交付）：nav-l/nav-r/pages/titlebar 有 backdrop-filter；**`.app-main__card` 与手机 `stack/stack-page/dock` 只有 `background: var(--glass-bg)` 半透明着色、无 backdrop-filter**（B2-1 仅接背景未接模糊）。按 brief Interfaces「Produces: 全部表面 backdrop-filter …」与 Files「用亚克力配方」的明确意图，对这四者**补上亚克力配方 backdrop-filter**（等同把 brief 的「改为」落到「新增」），并保持既有 `[data-glass="off"]` 降级块（本就对 card 与手机表面写 `backdrop-filter: none`，此补全使其从空操作变为真正生效）。桌面/手机两处降级块本身逐字未动。

## 视觉基线：18 张全重生成（评审修复轮更正初版「no-op」错误结论）

brief Step 7 预期「18 张全重生成，差异=材质/去反光」——**该预期成立**。初版报告的「重生成=no-op（字节级不变）」结论**错误**，根因与更正如下：

- **根因**：Playwright `--update-snapshots` **只为「本来会失败」的用例重写快照**（官方语义）。亚克力 vs 玻璃的像素差是**小幅度均匀变化**（mean ≈2-4/通道），低于 `toHaveScreenshot` 默认 per-pixel 容差（≈0.2 色彩距离阈值）→ 视觉测试对陈旧基线**容差内通过** → `--update-snapshots` 视为「无失败用例」而**不重写** → 快照 mtime 保持 B2-3 时代未动、git status clean，形成「no-op」假象。
- **独立复核（评审与实施者双方一致）**：SwiftShader + `toHaveScreenshot(animations:'disabled')` **会合成 backdrop-filter 与 SVG 噪点层**。同页隔离实验：`brightness(2) saturate(5)` 显著改变像素；噪点 `opacity 0→0.9` 显著改变像素；fresh server 下 raw `screenshot()` 与 `toHaveScreenshot` actual 均捕获亚克力渲染（app-main-light-indigo = c7c630a ≠ 陈旧基线 be8392）。
- **修复动作**：删除 18 张陈旧基线 → `--update-snapshots`（无基线 → 必失败 → 重写）→ 18 张全新基线全部产生**真实新字节**（md5 全变，含 4 个消费者一致化修复的观感）。
- **解码比对（确认差异=材质/噪点、无布局位移）**：canvas 像素级比对 old vs new（代表性 4 张）——`app-main-light-indigo` meanΔR/G/B=2.43/2.84/0.9、`app-main-dark-indigo`=2.69/2.58/4.01、`components-partition-light-amber`=0.16/0.19/0.23、`motion-partition-dark-emerald`=1.44/1.28/1.35；**全部抽样 `>30` 级大差异像素 0%**、宽高逐位一致 → 差异为亚克力配方（saturate 1.8 + brightness）与噪点层的均匀着色/纹理变化，**无布局位移**。
- **材质正确性双保险**：截图基线（重生成后逐像素锁定亚克力观感）+ e2e 计算样式用例（「玻璃两档」「亚克力材质」断言 saturate(1.8)/brightness/噪点 data-URI）。

## 评审修复轮（R1/5）：`--glass-*` 其余消费者一致化 + 基线重生成

评审确认（Important）：`--update-snapshots` 重生成会真实产生新字节、既有 18 张为陈旧基线，仅容差内通过；并给 Minor：spec §3.3「其余 `--glass-*` 消费者材质值一致化」未覆盖。本轮修复：

- **基线**：删除陈旧基线强制重生成（见上节），18 张全新字节、逐像素通过。
- **一致化（4 处，均换亚克力配方 `blur(...) saturate(var(--acrylic-saturate)) brightness(var(--acrylic-brightness))`）**：
  - `src/components/toast/toast.css:15` `.c-toast--default`（原 `saturate(1.4)`）
  - `src/components/float-strip/float-strip.css:25` `.c-strip`（原仅 blur）
  - `src/scenes/settings-window/settings-window.css:22` `.csettings`（原 `saturate(1.4)`）
  - `src/styles/motion-lab.css:36` `.ml-pop`（原仅 blur）
  - `src/styles/layout.css` `.topbar` 为 docs 死规则（B1 deferred），未碰。
- **手机 stack/stack-page 嵌套双全屏 blur**：spec §3.3 两者均在清单内、合规；保持现状，记为性能注记（stack 自身 blur 冗余，stack-page 全覆盖其上；不构成功能缺陷，留待后续性能优化，本轮不改）。
- **验证（重跑覆盖项）**：`npm run test:visual` 18/18（fresh 基线逐像素全绿）；`npm run test:e2e` 86/86（含「亚克力材质」「玻璃两档」回归）；`npm test` 60/60；`npm run build` 通过。

## 验证结果

- `npm test`：**60/60**（10 files，含 apply 15 + store 8 + customizer 2）
- `npm run test:e2e`：**86/86**（含新「亚克力材质」+「玻璃两档」回归 + 其余零冲击 + 18 张视觉基线对比全绿）
- `npm run test:visual`：**18/18**（重生成后的 fresh 基线，逐像素全绿）
- `npm run build`：**通过**

## 命名边界核对

- `--glass-*` / `data-glass` / `--glass-enabled` 一律未改名 ✓
- `.cust-group` count 6 未破坏（e2e app-shell.spec.js「设置模式：选择外观」通过）✓
- `.c-navwheel__mask` 默认渐变仍 `var(--glass-bg)`（亚克力着色底 = 该变量），仅补降级分支 ✓
- customizer.css 仍消费 `--shadow-inset-highlight`/`--glass-highlight`（其预览属 R5 范围，token 定义保留，无破坏）✓
- 噪点层 `z-index: var(--z-float)`（10）：toast/悬浮球在 body 级 `--z-toast`（40）之上不受覆盖；strip（pointer-events:none + 子项 auto）在噪点层（z10）之下但交互不受挡（噪点 pointer-events:none）——按任务注记「以噪点覆盖整个应用壳、pointer-events:none 不挡交互」为准，无需微调 ✓

## 提交

```
1d45bd4 feat: 表面应用亚克力材质（去高光反光 + 噪点层 + 标题栏/遮罩降级闭环）
bbfbe62 fix: 亚克力材质一致化其余 --glass-* 消费者 + 视觉基线重生成（评审 R1/5）
```

（1d45bd4：7 个 CSS + 1 个 e2e spec；bbfbe62：4 个消费者 CSS + 18 张重生成快照。）
