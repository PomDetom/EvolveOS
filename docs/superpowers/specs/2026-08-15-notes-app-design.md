# 牛马笔记应用设计规格

- **日期**: 2026-08-15
- **前置**: 应用壳已就绪（`src/apps/*` glob 自动发现 + MODULES 契约 + `mod.mount` 挂载钩子，见 `docs/integration/app-integration.md`）；`src/apps/notes/` 现有「牛马笔记」占位应用（id `notes` / order 5 / icon `list` / dir 全部·归档）。图标表 `src/components/icon/icon.js` 无 `calendar`/`chart`，左/右窗导航图标只消费 PATHS 键（壳 `icon(m.icon)` 不带应用自持图标第四参）。
- **来源**: 用户请求「进行牛马笔记应用模块的开发，延用项目当前技术栈」，经头脑风暴逐项澄清确认（见下「核心决策」）。
- **目标**: ① 写日报（结构表单 + 可复用内容模板）② 出勤统计（牛马日/休息日/实习期/正式期/出差日 + 按出勤配色日历）③ 数据 JSON 导出/导入备份。纯浏览器 localStorage 应用，浏览器与桌面 webview 双端可用，零框架改动。
- **仓库**: `C:\Repository\EvolveOS`（dev 为开发分支，main 发版合并点）

## 1. 核心决策（用户选定）

| 决策 | 选型 |
|---|---|
| 存储 | **纯浏览器 localStorage**（框架内首个纯浏览器数据应用）：数据键 `evolveos.notes.reports` / `evolveos.notes.templates`，零依赖。否决 Rust 后端（对个人出勤记录过度设计，浏览器将退化为「需桌面端使用」） |
| 牛马日口径 | **浮点累计**：正常/加班 = 1，请假上午/下午 = **0.5**，全天请假/休息日 = 0 |
| 统计范围 | **日历月份 + 全时间累计**双轨展示 |
| 日历配色 | **按出勤情况配色 + 出差日（所在地非青岛）角标** |
| 实习期/正式期 | **该阶段已记录天数**（含休息/请假；不含无记录日） |
| 日报模板 | 固定结构表单 + **可复用内容模板**（内置示例 + 自存增删改，写日报一键填入） |
| 导入导出 | **JSON 导出/导入**（localStorage 数据绑浏览器本地，提供备份恢复） |
| 出差日 | 所在地非青岛（当前两城枚举：青岛/西安 → 出差日 = 西安） |
| app 结构 | 升级现有 `notes` 占位：`id:'notes'`、`name:'牛马笔记'`、`icon:'clipboard'`、`order:5`；`dir` 改三个功能目录 日报/模板/统计（图标全用现有 PATHS 键） |
| 挂载机制 | 复用 `mod.mount` 钩子（token-tool 已加），**零框架改动** |
| git 分支 | `app/notes/notes-app`（或 app/notes/*）从 dev 检出，独立 worktree |

## 2. 总体架构

```
src/apps/notes/
  index.js         module { id:'notes', name:'牛马笔记', icon:'clipboard', order:5,
                            dir:[{日报,clipboard},{模板,copy},{统计,layout}], render, mount }
  notes.js         页面渲染 + 交互（三目录页 / 编辑器对话框 / 日历 / 导入导出）
  notes-utils.js   纯函数（数据层 CRUD / 统计 / 日历网格 / 模板 CRUD / 序列化 / 校验 / 格式化）
  notes.css        局部样式（notes__* 类名，令牌驱动，动画红线遵守）
tests/unit/notes.test.js      纯函数 + 渲染 + module 契约
tests/e2e/notes.spec.js       浏览器交互全流程
docs/                         本规格 + 实施计划 + 执行留痕账本
```

**数据流**：所有读写走 `notes-utils.js` 纯函数（localStorage 持久化），页面渲染为无状态纯函数（`render(ctx)` → HTML 字符串），交互经 `mount(pageEl, ctx)` 接线；每次左右窗切换重渲染，mount 内先释放上次挂载的监听（按 pageEl 管理）。数据变更后重新渲染当前页即可（不依赖框架状态管理）。

## 3. 数据模型

### 3.1 日报记录（每天一条，date 唯一）

```js
{
  date: 'YYYY-MM-DD',            // 主键，ISO 日期
  primary: '',                   // 主要工作内容（text，可为空串）
  secondary: '',                 // 次要工作内容（text，可为空串）
  attendance: 'normal' | 'overtime' | 'rest' | 'leave-am' | 'leave-pm' | 'leave-full',
  phase: 'intern' | 'regular',   // 工作阶段：实习期 / 正式期
  location: 'qingdao' | 'xian',  // 所在地：青岛 / 西安
  updatedAt: number,             // 时间戳
}
```

- 同一天只允许一条：编辑器保存时若 `date` 已有记录 → 覆盖确认。
- `primary`/`secondary` 允许为空（休息日/请假可能无工作内容可写）；**date + attendance 必填**。

### 3.2 出勤情况枚举与牛马日权重

| 枚举 | 文案 | 牛马日权重 | 日历主色 |
|---|---|---|---|
| `normal` | 正常 | 1 | `--success` 系 |
| `overtime` | 加班 | 1 | `--accent` 系（强调） |
| `rest` | 休息日 | 0 | `--neutral` 灰 |
| `leave-am` | 请假（上午） | 0.5 | `--warning` 琥珀 |
| `leave-pm` | 请假（下午） | 0.5 | `--warning` 琥珀 |
| `leave-full` | 请假（全天） | 0 | `--warning` 琥珀 |

### 3.3 内容模板

```js
{ id: string, name: string, primary: string, secondary: string, createdAt: number, updatedAt: number }
```

- 内置 2~3 条示例模板（如「需求开发 / 联调 / 总结」），可增删改、可删除至空。

### 3.4 存储与序列化

- `evolveos.notes.reports` → 日报记录数组（存储保持插入序；渲染前按 date 降序）。
- `evolveos.notes.templates` → 模板数组。
- 读取容错：JSON 解析失败 / 结构不符 → 空数据（不抛错不阻塞页面）。
- **导出格式**：
  ```js
  { app: 'evolveos.notes', version: 1, exportedAt: number, reports: [...], templates: [...] }
  ```
  - 导出：`download` Blob（`牛马笔记-YYYYMMDD.json`）。
  - 导入：校验 `app/version/数组结构/字段枚举` → 合法则**全量替换**并重渲染 + toast 成功；非法 → toast 错误、数据不动。导入前弹确认（全量覆盖当前数据）。

### 3.5 数据层 API（notes-utils.js，全部纯函数）

```js
loadReports(): Report[]                 saveReports(reports): void
upsertReport(report): Report[]          deleteReport(date): Report[]
loadTemplates(): Template[]             saveTemplates(templates): void
upsertTemplate(tpl): Template[]         deleteTemplate(id): Template[]
workDayFraction(attendance): 0|0.5|1    calcStats(reports, range?): Stats
buildMonthGrid(year, month): (string|null)[][]   // 周一开始，6×7 定网格
monthRange(year, month): { start, end }           // 当月首日/末日（含）
serializeExport(reports, templates): string       // 导出 JSON 串
parseImport(json): { ok, data|error }             // 导入校验
fmtDate(date): '2026年8月15日' 等本地化格式        // 列表/标题/导出文件名
```

`Stats` 形状：`{ workDays, restDays, internDays, regularDays, tripDays, breakdown: { normal, overtime, rest, leaveAm, leavePm, leaveFull } }`（breakdown 为出勤明细，供统计卡与日历图例对齐；range 缺省 = 全量）。

## 4. 页面设计（骨架统一走 §5.1 `app-main__page-head` + `app-main__page-body`）

### 4.1 日报页（dir 日报）

- 顶部：月份选择（‹ 2026年8月 ›，默认当前月）+「写日报」主按钮（`.c-btn--primary`）。
- 列表：当月日报按 date 降序；行 = 日期 + 出勤着色 tag（`.c-tag`）+ 阶段 badge + 地点 badge + `primary` 摘要（截断）。点击行 → 编辑器（编辑）。
- 空状态：`renderEmptyState`（当月无日报）。
- **编辑器（`dialog` 组件）**字段：
  - 日期：`input[type=date]`，默认今天；必填。
  - 出勤情况：单选 segmented（正常 / 加班 / 休息日 / 请假上午 / 请假下午 / 请假全天）。
  - 工作阶段：单选（实习期 / 正式期）。
  - 所在地：单选（青岛 / 西安）。
  - 主要工作内容 / 次要工作内容：`textarea`。
  - **从模板填入**：`popover` 列出全部模板，点击一键填 `primary`/`secondary`（仅当目标字段为空或确认覆盖）。
  - 保存：date + attendance 校验；date 已有记录 → 覆盖确认；成功后关 dialog + 重渲染当前页 + toast。
  - 编辑既有记录时显示「删除」按钮（`.c-btn--danger`）+ 删除确认。

### 4.2 模板页（dir 模板）

- 内容模板增删改列表：行 = 名称 + primary/secondary 预览；「新建模板」「编辑」「删除」。
- 空状态：无模板。

### 4.3 统计页（dir 统计）

- 顶部：月份选择（‹ 2026年8月 ›）——与日历共享同一 month state。
- **统计卡**两组：
  - **当月**：牛马日（浮点，如 `21.5 天`）、休息日、实习期、正式期、出差日 + 出勤明细 breakdown（正常/加班/请假上午/下午/全天/休息日，与日历图例一致）。
  - **累计**：同一组五项累计值。
- **日历**（月视图）：
  - 周一开头，6×7 定网格；本月外日期灰显/空。
  - 每格**按出勤配色**（见 §3.2 主色）；**出差日（location ≠ qingdao）在日期格叠加角标**（`--info` 蓝点）。
  - 今天描边高亮；无记录格弱化。
  - 点击任意日期格 → 打开该日编辑器（新建或编辑该日记录）。
  - ‹ › 月切换 → 统计与日历联动。
- **图例**：日历下方列出各出勤色块 + 出差角标含义。
- **导出 / 导入**按钮组（`.c-btn--secondary`）：导出下载 JSON；导入弹 file 选择 + 全量覆盖确认。

### 4.4 布局与动效红线

- 页面 `data-layout` 沿用壳默认 `center`（限宽居中）；日历网格宽度自适应。
- 仅 `transform`/`opacity` 动画；`backdrop-filter` 不动画；颜色/时长/缓动全走令牌；>6 项同时动画须 stagger；`reduced-motion`/`data-motion=off` 时长与 delay 归零。日历格配色为 paint-only（hover/focus 短暂过渡豁免）。

## 5. 组件与图标复用

- 复用组件：`button`、`input`、`textarea`、`radio`、`popover`、`dialog`、`tag`、`badge`、`empty-state`、`toast`、`icon`。
- 图标全部现有 PATHS 键（**禁改 `src/components/icon/icon.js`、禁手写 SVG**）：日报 `clipboard`、模板 `copy`、统计 `layout`、写日报 `plus`、编辑 `edit`、删除 `trash`、月切换 `chevron-left`/`chevron-right`、导出 `download`、导入 `upload`。
- 页面内部如需日历专用图标（如月份标签装饰），用应用自持 `module.icons`（Lucide 风格 24×24/stroke 1.8/round），查找顺序 应用级 → 全局。**左/右窗导航与概览卡图标仍只用 PATHS 键**（壳不传应用自持图标）。

## 6. 验证与测试

- **单测 `tests/unit/notes.test.js`**：
  - `workDayFraction` 六枚举权重；`calcStats`（当月/累计、牛马日浮点 0.5 累计、实习/正式期计数、出差日=非青岛、breakdown）。
  - `buildMonthGrid`（周一起、定网格、月边界、闰年 2 月）。
  - 数据层 CRUD + localStorage 读写 + 解析容错（坏 JSON → 空）。
  - `serializeExport`/`parseImport`（合法往返、非法结构/枚举拒绝）。
  - `module` 契约字段 + `order` 唯一性仍由 `tests/unit/apps.test.js` 覆盖（升级后自动适用）。
- **e2e `tests/e2e/notes.spec.js`**：
  - 写日报全流程：新建（默认今天）→ 列表出现 → 编辑改内容 → 删除。
  - 模板：内置示例可见 → 一键填入 → 增删改模板 → 编辑器 picker 联动。
  - 覆盖确认（同日期二次保存弹确认）；校验（无日期/无出勤拒绝）。
  - 统计页：当月/累计牛马日（含 0.5）、休息日、实习/正式期、出差角标断言；日历着色（按枚举、周末/空态）；月切换联动统计与日历。
  - 导出下载（`page.waitForEvent('download')`）→ 导入回读全量替换 → 页面数据刷新。
  - reload 持久化（写日报后 reload 仍在）。
  - `app-shell.spec.js` 仅按 id 引用 notes，占位 dir/内容无断言 → **零改动**。
- **流程**：逻辑改动 `npm test`；交互改动 `npx playwright test --config=playwright.config.worktree.js`（端口 5174）；提交前 `npm run build`；合并前 `npm run check:boundary`。
- **边界红线**：只改 `src/apps/notes/*` + 两个测试文件 + docs；不碰框架目录。

## 7. 分支与流程

- 分支：`app/notes/notes-app` 从 dev 检出，独立 worktree（仓库根同级 `evolveos-notes-app`）；主 checkout 留在 dev。
- 流程：TDD（每任务 红→绿→提交）→ 独立评审（规格符合 + 质量）→ `check:boundary` → `merge-to-dev -- app/notes/notes-app` → 删分支。
- 执行留痕：`docs/superpowers/sdd/progress-notes-app.md` 账本（计划/工作/提交哈希/评审结论）。
