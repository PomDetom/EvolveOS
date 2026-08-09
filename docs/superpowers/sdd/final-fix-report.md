# B5 Final 评审修复报告（find 1 + find 2 闭环）

- **状态**：DONE（2026-08-09）
- **需求源**：最终整体评审 2 个 Important 发现（B5-final 全分支评审「With fixes」）
- **分支**：feature/b5-design-language（worktree b5-design-language）
- **提交**：fix（滑杆 --fill 全接线 + primary 阴影令牌化）+ docs（本报告 + 台账更新）

## 背景

B5 里程碑通过分任务评审，但最终整体评审返回「With fixes」——2 个 Important 均为计划 verbatim CSS 的既定后果（评审在 B5-2 Minor / B5-3 Important 裁定延期，账本「延期项汇总」），本次在最终评审阶段闭环修复：

1. **find 1**：Slider `--fill` 仅 customizer 接线 —— 动效/组件滑杆渲染静态 50% 填充（`var(--fill, 50%)` 兜底），与值不匹配（动效弹性默认 0.6 应为 60%、组件亮度 80/透明度 20 应为 80%/20%）。
2. **find 2**：primary 按钮彩影硬编码（`0 2px 8px color-mix(accent-400 30%)` / hover `0 4px 14px 40%`），与 shadow-intensity 定制器解耦（违反 src/CLAUDE.md「禁止硬编码值」）。

## 修复实现

### find 1：滑杆 --fill 全接线（三区全部按值填充）

| 文件 | 变更 |
|---|---|
| `src/components/slider/slider.js:1-7` | `renderSlider` 输出内联 `style="--fill:${((value-min)/(max-min))*100}%"`（clamp 0-100 + `max<=min` 除零兜底 0）。签名 `{min,max,step,value,disabled,label}` 不变，现有 slider.test.js 断言（class/min/max/step/value/disabled/aria-label）全部兼容。组件展示区（亮度 80→80%、透明度 20→20%、音量 50→50%）默认即按值。 |
| `src/demo/motion-lab.js:113-121 + 143-146` | 新增 `setSliderFill(input)`（min/max 取输入自身属性，弹性 0-1 / 位移 0-24 各自计算），`applyParams` 末尾对两滑杆调用。覆盖三条路径：初始渲染（mount 时 `apply()`）、`input` 事件、subscribe 同步 —— 默认视图即正确（弹性 0.6→60%、位移随卡 4%-67%）。 |

customizer 路径不动：`customizer-panel.js:210` syncUI 的 `--fill` setProperty 已工作，现覆盖 renderSlider 的内联默认（customizer 走自有 renderSlider 函数，无内联 `--fill`，仍由 syncUI 驱动）。三方共消费同一 CSS 渐变机制（slider.css `0 / var(--fill, 50%) 100%`）。

### find 2：primary 彩影令牌化（默认观感不变）

| 文件 | 变更 |
|---|---|
| `src/styles/themes.css:143-150` | 新增 `--shadow-glow: 0 2px 8px color-mix(in srgb, var(--accent-400) calc(60% * var(--shadow-intensity, 0.5)), transparent)` 与 `--shadow-glow-hover: 0 4px 14px ... calc(80% * ...)`。默认 intensity 0.5 → alpha 30%/40%，与既有 iOS 彩影逐字一致（默认观感零变化）。accent 色与亮暗主题正交 → 单档 `:root` 定义（沿用 themes.css 语义色 base 块模式）。 |
| `src/components/button/button.css:12-17` | primary 基类/hover 阴影改用 `var(--shadow-glow)` / `var(--shadow-glow-hover)`；`inset` 内高光保持独立（不并入令牌）。定制器「阴影强度」滑杆（defaults.js:21，0-1 默认 0.5 → apply.js:23 / customizer-css.js:23 驱动 `--shadow-intensity`）现实时缩放彩影。 |
| `src/components/button/button.css:5-6` | `.c-btn` transition 列表补 `filter`（B5-3 Minor ①：primary hover brightness 平滑过渡，零像素变化）。 |

## --fill 验证测试（新增，如何判别）

**测试：`tests/e2e/customizer.spec.js` 「B5-final：滑杆 --fill 按值渲染（非 50% 兜底，像素级）」** —— 覆盖评审指定「最薄弱链路」（customizer syncUI → track 渲染）。

- **判别逻辑**：此前唯一像素探针用的滑杆值=50（恰与 `var(--fill, 50%)` 兜底重合，无法判别接线与否）。本测试用 noise 滑杆（RANGES [0,0.12]，默认 0.06=恰 50% —— 同样与兜底重合，故**推到非 50% 值**）：`fill('0.03')`（25% 填充）与 `fill('0.09')`（75% 填充），实测渲染填充比例应 ≈0.25 / ≈0.75。若 `--fill` 未接线（恒 50% 兜底），两值渲染恒 50% → `|ratio−0.5| > 0.1` 断言必红。
- **像素测量（helpers.js `measureSliderFill`）**：Chromium 151 起 `getComputedStyle` 对 `::-webkit-slider-*` 伪元素反射失效（项目已知坑，B5-2 报告沉淀），故用截图 + 像素分析：注入样式隐藏 thumb（防 surface-2 拇指在填充区产生干扰列）→ `slider.screenshot()` → **页内 canvas 解码 PNG**（浏览器原生解码，零运行时依赖）→ 轨道中线逐列比对 accent 色（页内探针 resolve `var(--accent)` → opaque rgb）→ 返回 accent 列占比。无第三方 PNG 库依赖。
- **配套轻断言**：`tests/e2e/motion-lab.spec.js` 「弹性滑杆 --fill 按值填充」—— 默认 0.6 → parseFloat(`--fill`)=60（初始渲染即正确，非仅交互后），`fill('1')`→100、`fill('0.5')`→50。`tests/unit/slider.test.js` 新增 renderSlider 内联 `--fill` 单测（80%/20%/50% 精确 + 8/24 与 16/24 浮点正则）。
- 渲染消费机制（CSS 渐变）由 customizer 像素用例单点证明，三区 wiring 由 unit + motion-lab 断言覆盖 —— 全链路闭环。

## 视觉基线变化

- **重生成前**：`visual-regression` 全量 → **恰 6 张 motion-partition 失败**，其余 18 张通过（app-main 6 / appearance 6 / components 6 字节不变）。find 2 默认观感不变 → 无基线变化（预期）；components 滑杆在设置窗捕获 fold 之下 → 字节不变（预期，B5-2/3 既有局限）。
- **解码比对**（motion-partition light/dark indigo 程序化差分）：diff 像素 0.207%/0.211%，**bbox 全部局部化于滑杆行带**（x[129,940] y[359,400]，两带 y359-368 弹性行 + y391-400 位移行）；采样像素 old（track surface-hover/partial）→ new（indigo accent `rgb(112,125,241)` ≈ accent-500 #6e7bf2），即填充边界从 50% 移至值对应边界（60% / 33% / 67% 等）。**无布局移位、无配色意外、无行带外变化** —— 纯滑杆 track 填充变化。
- **重生成**：`--update-snapshots` → 24/24 通过；`git status` 确认**恰 6 张 motion-partition-*.png 变更**，其余 18 张未触碰。

## 全量回归

| 命令 | 结果 |
|---|---|
| `npx vitest run tests/unit/slider.test.js tests/unit/motion-lab.test.js`（聚焦） | 5/5 通过 |
| `npx playwright test --config=playwright.config.worktree.js tests/e2e/{customizer,motion-lab,form-controls,components-basic}.spec.js`（聚焦） | 19 passed / 1 failed（`components-basic.spec.js:8` 图标计数=1，冷上下文惰性挂载导航 flake，单独复跑 4/4 通过 → 确认 flake，非回归） |
| `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js`（更新前） | 6 failed（恰 motion-partition，解码比对后重生成） |
| `npx playwright test --config=playwright.config.worktree.js tests/e2e/visual-regression.spec.js --update-snapshots` | 24 passed |
| `npm test` | 14 files / **65 passed**（+1 slider --fill 单测） |
| `npx playwright test --config=playwright.config.worktree.js`（全量，前台） | 首次 **111 passed / 1 failed**（`app-shell.spec.js:270` 动效分区 `.ml-grid` 5s 挂载超时 flake，与 B5-3 记录的动效惰性挂载超时同型）→ 单独复跑 app-shell **31/31 passed** → **并集 112/112 绿** |
| `npm run build` | 通过（✓ built in 807ms） |

> **flake 说明**：两次失败（components-basic 图标计数、app-shell:270 动效分区挂载）均为环境 flake（共享 checkout tauri dev + 陈旧 5173 server + MCP + 全量双 worker 资源紧张导致的惰性挂载/导航超时），单独复跑各自全绿，与 B5-1/2/3/4/5 记录的 mount/惰性挂载超时 flake 同型，非本次修复回归。

## 顺手捆绑的 Minor（零风险）

- **B5-5 断言② 空 gap 数组真空通过守卫**（评审 Minor ①）：`customizer.spec.js` B5-5 用例断言②前补 `expect(gaps.length).toBeGreaterThan(0)`（原实现空数组时 `Math.max/min` 为 ±Infinity，`差 < 4` 真空通过）。与本次修复同文件（customizer.spec.js），一行守卫零风险。
- **`.c-btn` transition 补 `filter`**（B5-3 Minor ①）：`button.css` `.c-btn` transition 列表加 `filter`（primary hover brightness 平滑，paint-only 豁免内，零像素变化，无基线影响）。

## 关注点 / Concerns

- **`--shadow-glow` 使用 `calc(60% * var(--shadow-intensity, 0.5))` 乘法**：CSS Values 4 的 `calc()` 乘法需 Chromium 111+（本项目 Chromium 151，既有 `--shadow-md` 等已用 `calc(0.12 * var(--shadow-intensity))` 同型乘法先例），兼容无虞；但若未来回退旧内核需改回 `calc(var(--shadow-intensity) * 60%)` 同义式。
- **`--fill` 值含浮点序列化**（如 `--fill:66.66666666666666%`）：CSS 解析无损，仅字符串形态；测试用 parseFloat/正则抗序列化（motion-lab e2e `toBeCloseTo`、slider unit 正则）。
- **像素测量对 swiftshader 确定渲染依赖**：与既有 form-controls.spec.js 像素探针同假设（本项目视觉基线机制已确立），换 GPU/平台需重生成（既有基线平台耦合已知）。
- 未修复 Minor（零风险以外的免修项）保留于台账「延期项汇总」，本次不扩大范围。

## 提交

- `fix:` —— src（slider.js / motion-lab.js / themes.css / button.css）+ tests（customizer.spec.js / motion-lab.spec.js / helpers.js / slider.test.js）+ 6 张 motion-partition 基线。
- `docs:` —— 本报告 + progress-b5.md 台账 B5-final 节。
- `playwright.config.worktree.js` 与 `review-B5-*.diff` 未入库（worktree 本地配置 / 评审遗留未跟踪文件，项目惯例）。
