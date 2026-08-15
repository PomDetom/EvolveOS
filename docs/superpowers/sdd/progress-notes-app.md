# SDD 账本 — plan: docs/superpowers/plans/2026-08-15-notes-app.md

> 执行留痕（唯一权威进度来源）。每任务：计划 / 工作内容 / 提交哈希 / 评审结论。
> 分支：`app/notes/notes-app`（自 dev `1e3f832` 检出）。设计规格：`docs/superpowers/specs/2026-08-15-notes-app-design.md`。
>
> 计划与规格已提交在 dev（规格 `8b6613e`，计划 `1e3f832`，文件名对齐 `f543f98`）。本分支按其 verbatim 执行；Task 3/4 对计划代码的必要修复见下（均记录在评审）。

## Global Constraints（执行期恒约束）

- 分支 `app/notes/notes-app`（worktree `C:/Repository/evolveos-notes-app`，仓库根同级）；`check:boundary` 预期「应用改动，边界通过」。
- 边界红线：只改 `src/apps/notes/*` + `tests/unit/notes.test.js` + `tests/e2e/notes.spec.js` + docs；禁碰框架目录/组件/icon.js/package.json。
- e2e 用 worktree 配置：`npx playwright test --config=playwright.config.worktree.js`（端口 5174 新鲜 server）。
- 提交前 `npm run build`；逻辑改动 TDD（红→绿→提交）；提交中文前缀 `feat:`/`fix:`。
- 令牌驱动（无硬编码色/间距/圆角）；圆角配 `--radius-scale`；图标只用现有 PATHS 键；动画只用 transform/opacity。
- 牛马日浮点权重：正常/加班=1、半天请假=0.5、全天请假/休息日=0；出差日=所在地非青岛。

## Task 1: 数据层（枚举/权重/localStorage CRUD/时间工具）

**计划**: 见 plan Task 1。创建 `notes-utils.js`（ATTENDANCE/PHASE/LOCATION 枚举 + workDayFraction + reports/templates CRUD + todayISO/monthRange/fmtDate/escapeHtml）+ `tests/unit/notes.test.js` 4 describe。

**工作内容**: verbatim 实现 + 测试。RED（模块不存在 import 错）→ GREEN 9/9；全量单测 26 文件/155 测试绿。worktree 需自装 node_modules（npm install 无新依赖）；lockfile 版本偏移（0.1.0→0.1.3）已还原未提交。

**提交**: `d4c44a8 feat: 牛马笔记数据层（枚举/权重/localStorage CRUD/时间工具）`

**评审**: ✅ Approved（sonnet；spec 合规，无 Critical/Important）。Minor（deferred，均 plan-mandated）：upsertTemplate 未知 id 静默 no-op；templateSeq 模块级可变；测试覆盖缺口；超宽行。

## Task 2: 统计/日历/序列化

**计划**: 见 plan Task 2。追加 `calcStats`/`buildMonthGrid`/`serializeExport`/`parseImport` + 3 describe。

**工作内容**: 追加实现 + 测试（135 行/0 删除）。RED 6 failed → GREEN 15/15；全量 26 文件/164 测试绿。⚠️ workDayFraction 权重无法从 diff 核验 → 控制器裁决：Task 1 评审已核验 + GREEN `2.5/1.5` 断言反向印证，非缺口。

**提交**: `22f7c8c feat: 牛马笔记统计/日历网格/导出导入校验`

**评审**: ✅ Approved（sonnet）。Minor（deferred）：DATE_RE 接受不可能日期（2026-02-30，→ 最终评审升级必修）；测试覆盖缺口；buildMonthGrid 0 基月份。

## Task 3: 模块契约 + 日报页（列表+编辑器+覆盖确认+删除）

**计划**: 见 plan Task 3。index.js module 契约（id notes/name 牛马笔记/icon clipboard/order 5/dir 日报·模板·统计）+ notes.js（reportPage + openReportEditor + mount）+ notes.css + 2 单测 describe + `tests/e2e/notes.spec.js` 2 条。

**工作内容**: 实施者 **DONE_WITH_CONCERNS**：发现并修复 6 处计划代码 bug（均在 5 文件边界内）：
1. CSS `pointer-events:none` 拦 Playwright `.check()` → 移除。
2. `renderTextarea` 组件无 data 属性 → 本地 `renderEditorTextarea` 包裹注入 `data-notes-ed`。
3. 「写日报」误开编辑态（today 已有记录时跳过覆盖确认）→ `openEditor(date, asNew)`：写入口恒开新编辑器，行点击编辑。
4. 双 dialog 严格模式 → e2e 确认点击 `.last()`。
5. e2e 末计数 1→2（seed 方案下总数恒 2）。
6. `openReportEditor` keydown 监听泄漏 → `close()` 摘除。

unit 18/18 + 全量 164；e2e 2/2；build 绿。

**提交**: `cb6e5d1 feat: 牛马笔记日报页（列表+编辑器+覆盖确认+删除，模块三目录接线）`

**评审**: ✅ Approved（sonnet；6 处修复逐一核验正确、最小、无新问题）。Minor（deferred）：mask 背景点击死代码（框架同模式）；data-date 未转义；CSS 硬编码 px；编辑改日期残留重复（→ 最终评审升级必修）；textarea 原样渲染（自 XSS 仅本地）。**carry-forward → T4**：模板编辑器同用 `renderTextarea` 查 `data-notes-tpl` 会失效，需同款包裹。

## Task 4: 模板页 + 编辑器模板填入

**计划**: 见 plan Task 4。替换 templatePage/mountTemplatePage 占位为真实模板页（CRUD）+ 编辑器一键填入 + CSS + e2e 1 条。

**工作内容**: 实现 + carry-forward 修正 `renderTemplateTextarea`（注入 `data-notes-tpl`）。e2e 偏差：`.c-empty` 限定 `.notes__template-list .c-empty`（壳有 4 个 `.c-empty` 触严格模式，语义中性）。unit 164；e2e 3/3；build 绿。

**提交**: `74d2bb6 feat: 牛马笔记模板页（CRUD）+ 写日报从模板一键填入`

**评审**: ✅ Approved（sonnet；carry-forward 修正已验证命中全部查询）。Minor（deferred）：gap:2px 硬编码；两个 textarea 包裹 3 行重复；模板名必填校验缺 e2e 断言。

## Task 5: 统计页（统计卡+日历+出差角标+月联动）

**计划**: 见 plan Task 5。替换 statsPage/mountStatsPage 占位为真实统计页（当月/累计卡 + 出勤配色日历 + 角标 + 图例 + 日格点击开编辑器 + `bindIO` 空占位留给 T6）+ 删 `pageStub` + CSS + e2e 1 条。

**工作内容**: verbatim 实现。unit 164；e2e 4/4；build 绿。命名风险全验：日格点击开对应日期编辑器、range 正确、角标仅非青岛、pageStub 全删无残留、bindIO 空占位符合 T6 延迟。

**提交**: `51698c7 feat: 牛马笔记统计页（当月/累计统计卡 + 出勤配色日历 + 出差角标 + 月联动）`

**评审**: ✅ Approved（sonnet）。Minor（deferred）：CSS 硬编码 px；**月切换/当月·累计差分未测**（→ 最终评审纳入修复波）；空白格 hover 边框；图例「出差（西安）」硬编码；`.notes__cal-week--head` 死修饰类。

## Task 6: 导出/导入

**计划**: 见 plan Task 6。替换 bindIO 空占位为真实导出（Blob 下载）/导入（文件选择→parseImport→覆盖确认→全量替换）。

**工作内容**: verbatim 实现 + e2e 2 条（导出下载回读、导入恢复、非法拒绝）。unit 164；e2e 6/6；build 绿。

**提交**: `ef1a018 feat: 牛马笔记 JSON 导出/导入（备份恢复，校验+覆盖确认）`

**评审**: ✅ Approved（sonnet；确认前不落库、input append 后 click、非法零对话框）。Minor（deferred）：取消选择器残留隐藏 input；version/filename 未断言；「数据不动」间接断言。

## 最终全分支评审（opus，`1e3f832..ef1a018`）

**验证证据（控制器已跑）**: unit 26 文件/164 测试、e2e notes 6+smoke 1=7/7、build、check:boundary 全绿。

**裁决: Ready with fixes** — 4 Important + 13 Minor，无 Critical：
- **I1** 新编辑器日期空（违 spec §4.1「默认今天」）— `openReportEditor` 的 `date` 参数未透传。
- **I2** 编辑改日期残留旧记录（静默重复计数）。
- **I3** 缺 spec §3.3 内置示例模板（2~3 条可删至空）。
- **I4** `parseImport` DATE_RE 放行不可能日期（2026-02-30）。
- M7 导出文件名 `牛马笔记-YYYY-MM-DD.json` 偏离 spec §3.4 `YYYYMMDD`。
- M5 缺月切换/当月·累计差分 e2e。

**修复波（单子代理一次全修）**: `cc6a737 fix: 牛马笔记 日报编辑器日期预填+改日期去重+内置示例模板+导入日期校验`（4 文件 +160/-7）：
- I1：`editorFormHtml` 第三参 `e.date ?? date ?? todayISO()` 透传；「无日期拒绝」e2e 先 `.fill('')`。
- I2：保存后 `isEdit && existing.date !== v.date` 时 `deleteReport(existing.date)` + e2e。
- I3：`ensureSeedTemplates()`（key 为 null 才播种，存 `[]` 不覆盖 → 可删至空语义），`notesPage` 入口调用；单测 + e2e（模板 describe 改为从 3 条种子开始 + 删至空重载仍空）。
- I4：`isRealDate` round-trip 校验 + 单测（拒 2026-02-30、收 2026-08-15）。
- M7：`todayISO().replace(/-/g,'')`；e2e 断言 `suggestedFilename()`。
- M5：新 e2e（本月 1 条 + 上月 1 条 → 当月 1 天 vs 累计 2 天 → 月切换联动）。

unit 168/168；e2e 10/10；build 绿。

**Re-review 裁决（sonnet，`ef1a018..cc6a737`）**: 6 条全部 ADDRESSED，无新 Critical/Important 破坏。新增 Minor（非阻断）：isRealDate 拒 0000-0099 年（保守）；ensureSeedTemplates render 写 localStorage（幂等无害）；M7 e2e 午夜跨天 flake 可能。

**Out-of-scope 已处理**: 计划文档 2 处旧文件名引用已对齐 spec §3.4（`f543f98`）。

## Rulings（控制器裁定）

- **Ruling I3**：内置示例模板 spec §3.3 明确要求（用户已批规格）→ 实现 `ensureSeedTemplates()`，而非 defer。
- **Ruling M7**：导出文件名以 spec §3.4 `牛马笔记-YYYYMMDD.json`（无连字符）为准，计划偏离规格 → 修。
- **Ruling M5**：月切换 e2e 纳入修复波（最终评审点名最高价值补测）。
- **Ruling ⚠️ workDayFraction 核验**：Task 2 评审无法从 diff 看权重 → 以 Task 1 评审核验 + GREEN 断言反证为准。
- **Ruling 其余 Minor（M1-M4、M6、M8-M13 + 各任务 deferred）**：按最终评审三审「acceptable to ship」放行，不修。

## 合并记录

- `npm run merge-to-dev -- app/notes/notes-app`：基线同步（dev docs 提交并入分支）→ check:boundary ✓ → `--no-ff` 合并 → 祖先验证 → 删分支 + 移除 worktree。
- 合并提交：`59dc081 merge: app/notes/notes-app 合入 dev`（前置 `f5944df` 基线同步）。
- 合并后 dev 复核：unit 全量 ✓、build ✓、notes+smoke e2e 10/10 ✓。
- 会话期间主 checkout 6 个 ui 未提交文件（strip-ui-m10）由后台 ui 代理自行提交 `92b59b4` 并合入 dev `7d87bab` —— 与本任务无关、未丢失、已安全落库。
