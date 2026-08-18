## [0.2.0] - 2026-08-18

### Added

### Changed

### Fixed

- merge: app/token-tool/dynamic-refresh-frontend 合入 dev
- merge: 同步 dev 到分支（基线同步）
- merge: chore/tokentool-dynamic-refresh 合入 dev
- merge: 同步 dev 到分支（基线同步）
- feat: tokenTool 动态刷新状态机（后端，30s→…→5min 自适应 + 错误 5s 重试）
- feat: tokenTool 前端适配动态刷新（移除静态「刷新间隔(秒)」字段，账户行文案改动态）
- merge: app/notes/card-seven 合入 dev
- feat: 牛马笔记日历 2/3 宽+卡片半宽+七卡非零显示
- merge: app/notes/cards-twocol 合入 dev
- feat: 牛马笔记统计区卡片化两列（当前月左/累计右）+ 去 breakdown
- merge: app/notes/stat-squares 合入 dev
- feat: 牛马笔记去当天遮罩+统计区竖排方块（非零显示）
- merge: app/notes/stats-compact 合入 dev
- feat: 牛马笔记统计区紧凑卡 + 其他月份保色淡化 + 日历头底色
- merge: app/notes/dashboard-layout 合入 dev
- fix: 统计页 Dashboard 布局评审修复（日报/模板页滚动回归 + 灰化格悬浮环泄漏 + 恢复统计页头）
- feat: 牛马笔记统计页 Dashboard 布局（日历全高左栏+汇总竖排右栏+悬浮环+今天圆缩小）
- merge: app/notes/calendar-polish 合入 dev
- fix: 日历周行按月末日定月，消月初盲区 + 灰化格隐藏今天/选中遮罩
- feat: 牛马笔记连续周流日历+正方形格缩小+今天/选中圆形遮罩
- merge: app/notes/calendar-reorder 合入 dev
- fix: 牛马笔记日历窗口 off-by-one（最早记录月可达）+ 顺序持久化健壮性
- feat: 牛马笔记连续日历+回溯窗口+图例简化+编辑器选项拖拽
- merge: app/notes/stats-redesign 合入 dev
- merge: 同步 dev 到分支（基线同步）
- merge: ui/strip-edge-debug 合入 dev
- chore: 移除真机调试读条（.c-strip__debug）+ 同步 spec（轮询触发 / Rust 窗口命令）
- fix: 贴边窗口位置/尺寸读写走 Rust 命令 + pop 健壮性（全局 shim 缺 read 方法）
- fix: 贴边评估触发改后台轮询（系统拖动期间 WindowEvent::Moved 不可靠，onMoved 不兜底真机）
- fix: 贴边收起显示器 bounds 改走 Rust 命令（全局 shim 无 monitor API，真机实测均 undefined）
- chore: 贴边真机诊断改渲染到 strip 内读条（console 不可见，无 DevTools 直读）
- chore: 贴边收起真机诊断日志（API 形态 + monitor/rect/dock/收起/onMoved 各层）
- merge: ui/strip-edge-dock-fix 合入 dev
- fix: 贴边收起 monitor API 修正（win.currentMonitor + core:window:allow-current-monitor）
- merge: ui/strip-edge-collapse 合入 dev
- docs: 贴边收起账本补最终收尾（I1 严格口径 + final fix 波，范围至 d8a477c）
- fix: 贴边判定改严格口径（DOCK_TOLERANCE 0=精确贴齐，≤6px 未溢出不进计时）+ 测试/文档同步
- fix: 收起 hover 间隙守卫 + e2e 移离坐标 + grip 锚定真 (0,3,0) 特异性
- docs: 悬浮窗贴边收起执行留痕（SDD 账本）
- fix: 收起校正 tween 返回 Promise 保时序 + readMotionDur 改读 strip（--strip-dur-collapse 契约生效）
- feat: 悬浮窗贴边收起状态机（先决校正/1s缓收起/hover弹回/收起态挂起 fit）
- fix: 收起态 grip 锚定提特异性到窗口模式（防 .strip-root--window position:static 覆盖）
- feat: 悬浮窗收起 grip 渲染 + 收起态样式（--strip-dur-collapse / data-dock-edge 定向）
- fix: 统计页平滑跳转 label 抖动 + 请假半格暗色对比度 + 统计 e2e 冷启动重试
- feat: 悬浮窗贴边收起所需权限（core:screen:allow-current-monitor + core:window:allow-outer-size）
- docs: 实施计划预扫描修正（getRect ?.() 兼容旧 mock / evaluateDock 降级兜底持久化）
- feat: 悬浮窗贴边收起几何纯函数（边缘/溢出/收起目标/grip 方向，物理像素）
- feat: 牛马笔记统计页紧凑重排+竖向连续日历+请假半格+彩色 breakdown
- docs: 悬浮窗贴边收起实施计划（5 任务 TDD，含完整代码与测试）
- docs: 悬浮窗贴边收起设计规格（先决校正 + 空闲1s缓收起 + 边缘小把手 + hover弹回）
- merge: app/notes/confirm-solid 合入 dev
- fix: 牛马笔记删除/覆盖/导入确认对话框对齐实底材质（body 标记类作用域）
- merge: chore/token-tool-opencode-retry 合入 dev
- merge: 同步 dev 到分支（基线同步）
- merge: docs/design-system-editor-material 合入 dev
- fix: opencode 余额查询请求增加退避重试（瞬时故障重试、cookie 失效不重试）
- docs: 设计系统文档固化表单编辑器实底材质规则（§5.4 + 常见坑）
- merge: app/notes/editor-style-fix 合入 dev
- fix: 牛马笔记写日报/模板编辑器对齐 key/token-tool 实底材质
- docs: 牛马笔记执行留痕账本（6 任务 TDD + 最终评审 + 修复波 + 合并记录）
- merge: app/notes/notes-app 合入 dev
- merge: 同步 dev 到分支（基线同步）
- docs: 牛马笔记计划对齐导出文件名格式（spec §3.4 YYYYMMDD）
- fix: 牛马笔记 日报编辑器日期预填+改日期去重+内置示例模板+导入日期校验
- feat: 牛马笔记 JSON 导出/导入（备份恢复，校验+覆盖确认）
- feat: 牛马笔记统计页（当月/累计统计卡 + 出勤配色日历 + 出差角标 + 月联动）
- feat: 牛马笔记模板页（CRUD）+ 写日报从模板一键填入
- feat: 牛马笔记日报页（列表+编辑器+覆盖确认+删除，模块三目录接线）
- feat: 牛马笔记统计/日历网格/导出导入校验
- feat: 牛马笔记数据层（枚举/权重/localStorage CRUD/时间工具）
- merge: ui/strip-ui-m10 合入 dev
- fix: 悬浮窗去阴影改淡灰边框 + 跳转余量页联动主菜单
- docs: 牛马笔记应用实施计划（7 任务 TDD，含完整代码与测试）
- docs: 牛马笔记应用设计规格（升级 notes 占位 + 纯浏览器 localStorage 数据层）
- merge: ui/strip-ui-m9 合入 dev
- fix: 悬浮窗实底阴影落窗可见 + 跳转余量页唤回最小化主窗
- merge: ui/strip-ui-m8 合入 dev
- fix: 悬浮窗 idle 上下内边距放大至8px
- merge: ui/strip-ui-clip 合入 dev
- fix: 悬浮窗右缘裁切（字体加载/宽度漂移后重贴窗口）
- merge: ui/strip-ui-m4 合入 dev
- fix: 悬浮窗 idle 薄条上下内边距翻倍至4px
- merge: ui/strip-ui-m2 合入 dev
- fix: 悬浮窗 idle 薄条上下内边距调至2px
- merge: ui/strip-ui-margin 合入 dev
- fix: 悬浮窗 idle 薄条上下内边距翻倍至1px
- merge: ui/strip-ui-overlay 合入 dev
- feat: 悬浮窗控制块浮出覆盖（idle 薄条 + hover 重贴合）
- merge: ui/strip-ui-bold 合入 dev
- fix: 悬浮窗上下内边距缩至0.5px（横竖同步）+ 余额加粗
- merge: ui/strip-ui-thin 合入 dev
- fix: 悬浮窗上下内边距再缩半至1px
- merge: ui/strip-ui-noline 合入 dev
- fix: 悬浮窗账户名不省略 + 上下内边距再缩半
- merge: ui/strip-ui-gap 合入 dev
- fix: 悬浮窗名称列缩至72px + 时间右对齐 + 上下内边距缩半
- merge: ui/settings-focus-fix 合入 dev
- fix: 标题栏 ⚙ 进入设置模式左窗设置项未滚动聚焦（仅高亮不滚到锚线）
- merge: tokenTool 账户弹窗窄窗适配 合入 dev
- fix: tokenTool 新增账户弹窗窄窗高度适配（同步 key 编辑器 max-height + body 滚动）
- merge: ui/strip-ui-font-fix 合入 dev
- fix: 悬浮窗字体收敛（名称14px加粗/余额12px）+ 名称列放宽 96px 防截断
- merge: ui/startup-opt 合入 dev
- merge: 同步 dev 到分支（基线同步）
- fix: app-shell Tauri mock 补 __TAURI__.event，修复 FloatBall/保留后台预存断测
- feat: 启动优化 — 主窗 hidden-until-ready（消除白屏与位置跳变）+ 应用页懒渲染
- merge: ui/strip-ui-fix2（悬浮窗改进：跳转解最小化/实底阴影/竖排边距/按钮方阵/间距字体/倒计时/刷新定时器）
- feat: 悬浮窗改进（跳转解最小化/实底阴影/竖排边距/按钮方阵/间距字体/倒计时/刷新时间定时器）
- merge: ui/strip-ui-fix 合入 dev
- feat: 悬浮窗改进（结构化排版/尺寸自适应/刷新时间/整窗拖动/跳转唤起）
- merge: 密码管理器生成预览 + 条目弹窗高度适配 合入 dev
- fix: 密码管理器生成随机密码无法预览 + 创建条目弹窗超高不可滚动被裁（隐藏覆盖/高度适配）
- merge: ui/strip-ui-opt 合入 dev
- merge: 同步 dev 到分支（基线同步）
- merge: tokenTool 账户弹窗表单样式修复 合入 dev
- fix: tokenTool 账户弹窗补表单样式（.tt__form/.tt__field/.tt__field-label 缺失致不匹配整体UI，镜像 key 编辑器）
- feat: 悬浮窗 UI 优化（OpenCode 三窗口展示 + 竖排每行 + 实底/无背景材质 + 跳转 TokenTool）
- chore: .gitattributes 强制 eol=lf（实测 text=auto 单独在 autocrlf=true 下仍复发）
- chore: 添加 .gitattributes 统一行尾策略（根治 CRLF/LF 幻影改动）
- docs: 进度账本标记托盘/窗口状态任务已合入 dev
- merge: 系统托盘唤回主窗 + 主窗几何记忆 合入 dev
- merge: 同步 dev 到分支（基线同步）
- merge: app/key/pwm-ui-fixes（密码管理器编辑器实底材质 + 路径选择按钮）
- feat: 密码管理器编辑器对话框实底材质 + 路径选择按钮（锁定屏/导出/导入）
- docs: 进度账本记录托盘/窗口状态任务提交哈希与合并受阻说明
- merge: chore/pwm-vault-path（密码管理器默认路径 exe 目录 + 写文件自动建父目录 + pick_vault_path 选择对话框）
- feat: 系统托盘唤回主窗 + 主窗口尺寸/位置跨启动记忆
- feat: 密码管理器默认路径改 exe 目录 + 写文件自动建父目录 + pick_vault_path 原生选择对话框
- merge: chore/merge-to-dev-msgfix 合入 dev
- fix: merge-to-dev --message 支持空格形式；parseArgs 抽独立 utils 供单测（shebang CLI 与纯逻辑分离）
- merge: docs/branch-workflow 合入 dev
- merge: 同步 dev 到分支（基线同步）
- merge: merge-to-dev 修复（支持 worktree 分支）
- fix: merge-to-dev 支持 worktree 分支（git -C 操作 + check:boundary 显式分支名），避免误 checkout 被占用分支
- docs: 合并入 dev 统一走 merge-to-dev（基线同步 + 祖先验证删分支，禁手工 git branch -d）
- merge: merge-to-dev 脚本（dev 合并统一入口）
- chore: merge-to-dev 脚本（合并入 dev 统一入口：基线同步 + check:boundary + --no-ff + 祖先验证删分支）
- merge: 主 checkout 常驻 dev 工作流规则（禁直接改 dev，分支测试通过后合入）
- docs: 主 checkout 常驻 dev，禁直接改 dev，改动经分支测试通过后合入
- merge: TokenTool 拆分余量/账户管理页 + 悬浮条接入真实余额
- merge: app/key/password-manager（密码管理器前端应用：升级 key 占位为三目录）
- docs: 密码管理器执行留痕账本（progress-key-app）
- test: 密码管理器 app-shell/mobile-nav 断言更新（三目录/空态）
- fix: 密码管理器对话框遮罩关闭 + data-key-id 转义 + 标签切换保留搜索（评审修复）
- feat: 密码管理器 mount 交互（解锁/CRUD/生成/复制/导出导入/锁定）+ mock e2e
- feat: 密码管理器 key.css 局部样式（锁定屏/工具栏/列表/数据/设置）
- feat: 密码管理器 module 契约 + 页面渲染骨架（升级 key 占位为三目录）
- feat: 密码管理器 key-utils 纯函数 + 单测（过滤/标签/排序/转义）
- docs: 密码管理器后端执行留痕账本
- merge: chore/pwm-backend（密码管理器 Rust 后端：pwm-core 移植 + 13 命令）
- chore: 密码管理器 Rust 警告清扫（未用 re-export/VaultLocked/unlocked_state 助手）
- feat: 注册密码管理器 13 命令 + PwmState 状态（lib.rs 接线）
- feat: 密码管理器命令层（13 命令 + PwmState 会话 + 单测）
- feat: 移植 pwm-core 密码学库为 src-tauri/src/pwm 子模块（Argon2id + AES-256-GCM）
- feat: TokenTool 拆分余量/账户管理页 + 悬浮条接入真实余额
- docs: 密码管理器实施计划（chore 后端移植 + app 前端应用）
- docs: 密码管理器规格补 current_vault_path 命令（数据管理页需显示保险库路径）
- docs: 密码管理器应用设计规格（升级 key 占位 + 复用 pwm-core 后端）
- merge: 发版需征询意见规则
- docs: AGENTS.md 工作流红线补「发版前必先征询用户意见」
- merge: hotfix v0.1.3 同步回 dev

## [0.1.3] - 2026-08-12

### Fixed
- 设置模式滚轮回当前激活模块未退出设置：主菜单滚到「设置」后滚回已选中应用，右侧停在设置页（`onLeftSelect` 的 `id===moduleId` 守卫挡住 onChange 路径；点击路径有 `exitSettingsMode` 兜底故「再次点击才变化」）。修复：设置模式下选择任何模块（含滚动回当前激活）都强制 `setModule` 退出设置。

## [0.1.2] - 2026-08-12

### Added

### Changed

### Fixed

- merge: 0.1.2 应用壳发布（应用清单重整 + 设置内置 + 关于远端 + 入口排序/隐藏 + e2e/基线连带 + 修复波）
- fix: 导航轮监听器重挂不累积 + 空导航冷启动不崩 + 导航分区排序/隐藏 e2e
- fix: e2e 连带（分区索引 +1 + 视觉 SHOTS 偏移 + 新入口用例）+ app-main 基线重生成 + 接入指南补丁
- fix: 导航分区全隐藏 crash 兜底（ensureActiveModule 回退 settings + 各路径空页守卫）+ 评审 Minor 修复
- feat: 设置「导航」分区（入口排序/隐藏管理）+ 概览管理入口 + e2e 11 分区计数
- feat: 入口导航配置链路（nav {order,hidden} + resolveNav 纯函数 + 壳 rebuildNav 响应式）
- feat: 关于分区接真实远端仓库（地址行 + 开源按钮打开仓库）
- fix: 手机 dock 点「设置」触发设置模式（等同标题栏 ⚙，已在设置页弹回）
- feat: 设置内置模块（左窗点选=触发设置模式，等同标题栏 ⚙）
- fix: token-tool 契约测试 order 断言同步（order 7→2，Task 1 归位）
- feat: 应用清单重整（去剪贴板/记账×2/搜索/帮助/关于，增 6 占位 + key/token-tool order 归位）
- docs: 0.1.2 应用壳发布实施计划
- merge: 0.1.2 应用壳发布设计规格
- docs: 0.1.2 应用壳发布设计规格（应用清单重整 + 关于页远端信息 + 入口排序/隐藏）
- merge: docs/ 结构优化（integration/handoffs 文件夹收纳）
- docs: docs/ 结构优化（integration/handoffs 文件夹收纳散落文档，根只留 AGENTS/CLAUDE）+ 活跃引用更新
- merge: 记忆文件单源化重构
- docs: 记忆文件单源化重构（AGENTS.md 单源 + CLAUDE.md @AGENTS.md 壳，四层；去 B 编号/历史引用/跨文件重复）
- chore: 视觉基线 app-main 重生成（ledger 应用入壳，8→9 模块）+ 迁移执行留痕账本
- merge: 记账演示应用（并行治理验收：新增应用碰零共享 + worktree 生命周期闭环）
- feat: 记账演示应用（并行治理验收：新增应用碰零共享）
- merge: 并行分支治理迁移（边界门禁 + 图标自持 + e2e 动态化 + 治理文档）
- docs: 治理口径同步（worktree 并行 + 分支前缀/生命周期/回归单点化 + 图标自持），AGENTS.md 双文件同步
- fix: e2e 模块计数动态化 + 位置断言改 data-id（新增应用不破 spec）
- feat: icon() 第四参应用级自持图标（a1，查找顺序 应用级→全局→monitor，配单测）
- feat: 边界门禁前缀全集（docs/chore/hotfix/base）+ 未知分支名 fail（配单测）
- docs: 并行分支治理迁移实施计划
- merge: 并行分支治理设计规格
- docs: 并行分支治理设计规格（worktree 并行 + 分支规范全集 + 回归单点化 + 入口抗变化）

# Changelog

## [0.1.1] - 2026-08-11

### Added
- 发版流程与版本治理：`npm run set-version`（同步 package.json / Cargo.toml / tauri.conf.json）、`npm run release`（半自动发版：bump + CHANGELOG + 门禁 + 提交）
- CHANGELOG.md（Keep a Changelog 风格）
- 设置「关于」页版本号动态读 package.json（Vite `define.__APP_VERSION__`，不再漂移）

### Changed
- 固化分支策略：feature（`ui/*`、`app/<id>/*`）→ dev → main（`--no-ff`）；main 只收 dev 合入 + hotfix；docs 也走 dev
- 里程碑 tag 约定 `ui/vX.Y.Z` → `vX.Y.Z`；首次基线 `v0.1.0`

### Fixed
- （无）

## [0.1.0] - 2026-08-11

### Added
- tokenTool 应用：DeepSeek 官方余额 / OpenCode Go 三窗口用量监测（复用 Tauri Rust 后端 + EvolveOS 组件，桌面优先/浏览器优雅降级）
- 应用壳 `mod.mount` 挂载钩子（应用交互接线契约）
- 发版流程与版本治理（`set-version` / `release` 脚本 + 本文件）

### Changed
- 应用壳模块计数 7→8（tokenTool 接入）
- 设计语言措辞「克制的玻璃质感」→「亚克力质感」
- 编辑器对话框材质改实底不透明（与主页面一致）

### Fixed
- tokenTool 新增账户选 OpenCode 不带出 workspace/cookie 字段
- tokenTool 编辑对话框表单值转义（防属性突破自 XSS）
- tokenTool 空状态「添加账户」CTA 失灵
