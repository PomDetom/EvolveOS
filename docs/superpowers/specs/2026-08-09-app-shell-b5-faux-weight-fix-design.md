# 应用壳 B5 修复 — 普惠体 500 字重补齐（消除伪字重模糊）

- **日期**: 2026-08-09
- **前置**: B5 设计语言统一已合并 main（`0b79e70`）；本修复为 B5 后续发现项（用户目检反馈）
- **来源**: 用户头脑风暴「字体糊糊的是什么情况」→ 确认持续糊（medium 文字）→ 根因定位伪字重合成 → 用户选 A 方案（补齐真实 500 字重）
- **目标**: 消除 Alibaba PuHuiTi 在 medium（500）字重下的伪粗合成模糊，保留设计系统字重层级

## 1. 问题与根因

**症状**：B5-1 字体全局替换后，用户目检发现部分文字持续"糊糊的"（非瞬态、非玻璃背景观感）。

**根因**（代码级证据）：
- `src/styles/fonts.css` 的 `@font-face` **仅两档**：400（55 Regular）+ 700（85 Bold）。
- `src/styles/tokens.css:32-33` 定义 `--font-weight-medium: 500`、`--font-weight-semibold: 600`、`--font-weight-bold: 700`。
- 全应用 **~28 处** CSS 消费 `var(--font-weight-medium)`（按钮/徽标/标签/列表标题/表单 label/标题栏等），覆盖 UI 大半文字。
- `font-synthesis` 未设置（默认开合成）。
- Chromium 字重匹配：请求 500 时无 500 face → 就近匹配 400 face → `font-synthesis-weight` 对 400 字形描边伪粗。**拉丁字母伪粗可容忍；中文密集笔画伪粗 = 描边+填黑 → 发虚发糊**。
- 请求 600（semibold）就近匹配 700 真粗体（|600-700|=100 < |600-400|=200），**不糊**，本次不动。

**范围决策**：只补 500 字重（medium 是唯一糊点）。600 维持就近匹配 700（标题观感不变，避免基线连锁）；400 正文、700 加粗不受影响。

## 2. 修复方案（A：补齐真实 500 字重）

| 文件 | 变更 |
|---|---|
| `src/assets/fonts/AlibabaPuHuiTi-3-65-Medium.woff2`（新增，5.3MB） | 从用户 Downloads `AlibabaPuHuiTi-3-65-Medium/` 复制（55/85 同源官方包） |
| `src/styles/fonts.css` | 新增 `@font-face`：`font-family: 'Alibaba PuHuiTi'; src: url('../assets/fonts/AlibabaPuHuiTi-3-65-Medium.woff2'); font-weight: 500; font-display: swap;`（与 55/85 同结构）+ 文件头注释更新 |
| `tests/unit/font-assets.test.js` | 补 65 文件存在性 + 500 face 断言 |
| `tests/e2e/tokens.spec.js` | 补 500 face 加载断言（`document.fonts.load('500 14px "Alibaba PuHuiTi"')`，沿用 B5-1 显式 load 模式） |

**不动的**：`--font-weight-*` 令牌定义（400/500/600/700 保持——500 现由真 65 提供）；`--font-mono`；themes.css；其余 CSS 消费点（全部经令牌自动继承新 500 face）。

## 3. 验证

- **单测**：`tests/unit/font-assets.test.js` 扩展（65 存在性 + @font-face 500 断言 + tokens 前缀守卫保持）。
- **e2e**：`tests/e2e/tokens.spec.js` 补 500 face 加载断言（`document.fonts.load` 显式加载，B5-1 竞态适配模式沿用）；全量回归绿。
- **视觉基线**：含 medium 文字的分区截图会变（真 65 比伪粗更轻更清晰）→ **先解码比对确认差异仅为字重渲染（非布局/颜色）**，再 `--update-snapshots` 重生成。
- 每任务 TDD + 独立评审 + 全量回归绿（`npm test` + `playwright.config.worktree.js` e2e + `npm run build`）；提交前 build。
- 测试仅 Web 环境；桌面观感由用户目检（Tauri 桌面确认 medium 文字不再糊）。

## 4. 非目标

- 不补 600（semibold）真实字重（现就近 700 不糊，标题观感保持；后续可按需）。
- 不引入 `font-synthesis: none`（避免层级扁平化；500 已有真字重后无需）。
- 不改 `--font-weight-*` 令牌值。
- 不做字体子集化（10.4→15.7MB 仍是计划强制的官方包规格）。

## 5. 交付形态

- Git：新分支 `feature/b5-faux-weight-fix`（自 main `0b79e70` 检出），TDD + 独立评审，全量回归绿后合并 main。
- 留痕：`docs/superpowers/sdd/progress-b5-fix.md`（新建，B5 后续修复账本）。
- 依赖：用户已提供 65 Medium WOFF2（`C:\Users\PomDetom\Downloads\AlibabaPuHuiTi-3-65-Medium\AlibabaPuHuiTi-3-65-Medium.woff2`，5.3MB，已验证存在）。
