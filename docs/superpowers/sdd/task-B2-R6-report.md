# Task B2-R6 执行留痕报告：亚克力可见性调参（明显亚克力）

- 分支：`feature/b2-visual`
- 日期：2026-08-07
- 状态：**DONE_WITH_CONCERNS**（代码/测试全绿；视觉基线重生成结果与 brief 预期有偏差，详见「基线解码比对」）
- 需求源：`docs/superpowers/sdd/task-B2-R6-brief.md`（数值/代码按字面使用）

---

## 一、TDD 顺序（红 → 绿）

| 步 | 动作 | 结果 |
|---|---|---|
| Step 1 | `tests/unit/apply.test.js` 默认噪点断言 `0.04`→`0.06`，跑 `npm test -- apply.test.js` | **红**：`expected '0.04' to be '0.06'`（1 failed / 14 passed）——验证 TDD 顺序成立 |
| Step 2 | `defaults.js` `glass: { opacity: 0.62, blur: 24, noise: 0.04 }` → `{ opacity: 0.48, blur: 30, noise: 0.06 }`（RANGES 未动：opacity [0.4,0.95] 覆盖 0.48，blur [8,48]，noise [0,0.12]） | — |
| Step 3 | 重跑 `npm test -- apply.test.js` | **绿**：15 passed |
| Step 4 | `app-main.css` 三预设背景层增强（见下） | — |
| Step 5 | 全量回归 + 基线处理（见下） | 全绿 |
| Step 6 | 提交 | `d1c7166` |

## 二、改动内容

1. `src/config/defaults.js` — `glass.opacity 0.62→0.48`、`blur 24→30`、`noise 0.04→0.06`。
2. `src/app/app-main.css` — 三预设 `--backdrop-bg` alpha 提升 + 停靠点范围铺开：
   - gradient：主光晕 26%→**50%**（停靠点 60%→65%），次光晕 18%→**30%**（停靠点 55%→60%）；
   - geo：光晕 20%→**40%**（停靠点 32%→38%），135° 白色斜线层保留；
   - grid：线 14%→**25%**（两条线性渐变）；
   - grid 预设内 `background-size: 40px 40px`（写在 `.app-main` 上的死属性，背景实际画在 backdrop 元素）按 brief 字面移除；真正的 `.app-main[data-backdrop="grid"] .app-main__backdrop { background-size: 40px 40px; }` 保留。
   - 同步更新了 R3 过时注释（`alpha（≤0.3）` 不再成立），补 R6 说明。
3. `tests/unit/apply.test.js` — 默认噪点断言标题与值 0.04→0.06。

saturate/brightness（1.8 / 1.1·0.92）按 brief 不变；`--glass-*` / `data-glass` / `--glass-enabled` 命名保留。

## 三、验证结果（全绿）

| 项 | 命令 | 结果 |
|---|---|---|
| 单测 | `npm test` | **60 passed**（10 files） |
| 交互 e2e | `npx playwright test --grep-invert "视觉回归"` | **71 passed**（含「背景层」「亚克力两档」「亚克力材质」「背景层预设柔和」「.cust-group count 6」等） |
| 视觉回归 | `npx playwright test tests/e2e/visual-regression.spec.js` | **24 passed**（重跑确认，未带 `--update-snapshots`） |
| 完整 e2e | `npm run test:e2e` | **95 passed**（71 交互 + 24 视觉） |
| 构建 | `npm run build` | **通过**（777ms） |

> 一次交互 e2e 冷启动 flake（app-shell「冷启动应用持久化配置」首次全量跑时 `.app-main` 5s 超时），单跑通过（8.2s），热服重跑 71 全绿——与本次改动无关（未触及挂载逻辑）。

## 四、基线解码比对（关键发现，与 brief 预期有偏差）

brief 预计「背景层更可见 + 着色透明度变化，24 张全变 → `--update-snapshots`」。实测执行 `npx playwright test tests/e2e/visual-regression.spec.js --update-snapshots` 后：**24 张基线文件字节未变**（md5 不变、mtime 未更新，git 无变更）。

原因链（已逐一实测确认）：

1. **差异真实存在且由本次调参引起**。用浏览器解码（Playwright chromium + swiftshader，回避 node 无 PNG 解码库）对 24 张「旧基线 vs 当前渲染」逐像素比对（阈值 sum(3通道 abs) > 30 计 changed）：
   - 暗色主题明显：app-main dark 0.44%–9.96% 像素偏移（meanCh 2.90–4.13，maxCh 31–45）；appearance dark 0.29%–6.25%；motion dark 0.37%–5.18%；components dark 0.12%–1.91%。
   - 浅色主题几乎为 0（maxCh ≤21，meanCh ≤1.6）——accent-300 浅色 wash 叠近白 `--surface-solid`，视觉近同，符合预期。
2. **差异来源仅为背景层预设**。视觉测试在截图前 `removeAttribute('style')` 清掉 applyConfig 内联变量，故 `defaults.js` 的 0.48/30/0.06 **不进快照**；主题 CSS 兜底（`--glass-bg-opacity` 浅 0.72/深 0.62、`--glass-blur` 20/28、`--noise-opacity` 0.04）均未动。已用 `curl` 核验 dev server 服务的 app-main.css 确为新值（50/30/40/25、停靠点 65/60/38）。
3. **无布局位移**。24 张全部 1280×720；差异为广域色彩 wash（meanCh 2–4 的平滑色偏），无局部硬边/位移对；元素尺寸不变（`.app-main` 全屏）。
4. **为何 `--update-snapshots` 是 no-op**：Playwright `toHaveScreenshot` 比对在**通过时跳过重写**（实测：已存在且比对通过的快照，mtime 不变）。比对器为 pixelmatch，默认 `threshold 0.2` → `maxDelta = 35215×0.04 ≈ 1408.6`（YIQ 平方距离，等效单通道约 **37.5 单位**）；本次最大单像素差异 ~15/通道，全部落在阈值内 → 比对判定「匹配」→ 24/24 通过、不重写。
   - 佐证：临时诊断 spec 用 `maxDiffPixelRatio: 1e-6` + 默认 threshold 对「当前渲染 vs 旧基线」仍 **passed**；而喂入已知不同图（motion-partition）则如实 **failed**（报像素差异 0.53）——比对器本身工作正常，只是粗粒度。
5. **结论**：视觉回归 suite 对本次调参「不可分」——旧基线在新渲染下仍通过，`--update-snapshots` 正确产出 no-op。这是 brief 预期（“24 张全变”）与实际行为的偏差，**非未执行该步骤**。基线保持 R4 时代观感。

**对用户可见性的说明**：快照之所以变化微弱，是因为视觉测试清配置后玻璃兜底 0.62/0.72 更不透明，稀释了背景 wash；**真实应用（配置生效 opacity 0.48 + blur 30 + 噪点 0.06 + 背景层增强）下彩色磨砂 wash 明显增强**，用户视觉验收的是真实应用，不受快照阈值影响。unit/e2e 已确认配置链路写入 0.48/30/0.06 正确。

## 五、铁律符合性

- 配置链路 defaults→store→apply：仅改默认值，链路逻辑未动。
- 动画红线：背景层/噪点静态，blur 不动画；改动仅静态 `--backdrop-bg` 值。
- 命名保留：`--glass-*` / `data-glass` / `--glass-enabled` 未改名。
- `.cust-group` count 6：e2e 全绿，未破。
- 测试仅在 Web 环境执行。

## 六、提交

| commit | 内容 |
|---|---|
| `d1c7166` | `feat: 亚克力可见性调参（明显亚克力：着色0.48/模糊30/噪点0.06 + 背景层增强）` — `src/config/defaults.js`、`src/app/app-main.css`、`tests/unit/apply.test.js` |

（本报告 + brief 另作 docs 提交；`tests/e2e/visual-regression.spec.js` 与快照目录未变更，git add 为空操作。）

## 七、Concerns

1. **视觉基线未重生成**（最重要）：差异真实存在但低于 pixelmatch 默认每像素阈值，`--update-snapshots` 为 no-op，基线仍为 R4 观感。若要求基线反映新渲染（明显亚克力），需**强制重生成**——删除快照后 `--update-snapshots`，或临时降低 `expect.toHaveScreenshot.threshold`。此操作在本次执行中曾被权限分类器拦截，需人工授权后再做。
2. 一次冷启动 e2e flake（见上），与本任务无关。
