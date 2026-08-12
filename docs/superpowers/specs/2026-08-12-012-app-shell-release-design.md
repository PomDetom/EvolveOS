# 0.1.2 应用壳发布设计（应用清单重整 + 关于页远端信息 + 入口排序/隐藏）

- **日期**: 2026-08-12
- **前置**: 0.1.1 发版基线（main `c60f0a3`）；dev 已含并行治理迁移 + 记忆文件单源化 + docs 结构优化；远端已配置（`origin https://github.com/PomDetom/EvolveOS.git`）
- **来源**: 用户发版计划四问逐项澄清（去重口径/设置条目形态/管理 UI/作用范围/关于页信息）
- **目标**: ① 应用清单重整（去 6 增 6 + 设置条目）② 设置页关于分区接入远端信息 ③ 入口可排序/可隐藏（导航管理）④ 0.1.2 发版前置

---

## 1. 核心决策（用户选定）

| 决策 | 选型 |
|---|---|
| 记账重复 | `wallet`(记账, order3) 与 `ledger`(记账, order8) 两个重复项**一并删除**；`账本` 为**全新占位**（与删除的记账无关） |
| 设置条目 | 壳**内置特殊模块**（非 app 目录），左窗点选 = 触发设置模式（等同标题栏 ⚙） |
| 管理 UI | 设置页新增「导航」分区（列表 + 显示开关 + 上移/下移）+ 概览页提供管理入口 |
| 作用范围 | home（概览）**也可排序/隐藏**；护栏 = 至少保留 1 个可见入口；⚙ 标题栏恒可用作恢复路径 |
| 关于页 | 开源仓库按钮接真实 URL + 关于卡显示仓库地址 |

## 2. 应用清单

### 2.1 去除（删除 `src/apps/<id>/` 目录）

`clipboard`(剪贴板)、`wallet`(记账)、`ledger`(记账)、`search`(搜索)、`help`(帮助)、`info`(关于)。

### 2.2 保留

`key`(密码)、`token-tool`(TokenTool)。

### 2.3 新增占位（6 个新应用；连同保留 2 个共 8 个 app 目录，order 唯一 1-8）

全部复用既有 47 图标（不需要新图标），模块形态与既有占位同型：

```js
import { placeholderPage } from '../../scenes/placeholder-page.js';
export const module = {
  id: '<id>', name: '<name>', icon: '<icon>', order: <n>,
  dir: [
    { id: 'all', name: '全部', icon: 'list' },
    { id: 'archived', name: '归档', icon: 'folder' },
  ],
  render: (ctx) => placeholderPage(ctx),
};
```

| id | name | icon | order |
|---|---|---|---|
| `memo` | 智能备忘 | `edit` | 3 |
| `sync` | 远端同步 | `refresh` | 4 |
| `notes` | 牛马笔记 | `list` | 5 |
| `knowledge` | 知识库 | `globe` | 6 |
| `assistant` | 小助理 | `sparkles` | 7 |
| `account` | 账本 | `wallet` | 8 |

保留应用 order 顺延：`key`→1、`token-tool`→2（原 key 2 / token-tool 7，重整归位）。

### 2.4 设置条目（壳内置特殊模块）

`app-main.js` 增加内置模块（同 home 层级，非 app 目录）：
```js
const settingsModule = { id: 'settings', name: '设置', icon: 'settings', order: 9, dir: [], special: 'settings' };
```
- 左窗选中 `settings` → `setSettingsMode()`（等同 ⚙：右窗切设置目录 + 内容区设置页）；设置模式激活时左窗高亮停在「设置」；再次点选/退出 = 退出设置模式。
- 概览快捷卡点击 `settings` 同样触发设置模式。
- `MODULES` 组装：`[homeModule, ...APPS, settingsModule]`（home order0 / settings order9 不参与 app 目录 order 唯一性约束）。

## 3. 关于页配置（`settings-pages.js` `aboutPage()`）

- 「开源仓库」按钮（现为占位 toast `settings-pages.js:281`）→ `window.open('https://github.com/PomDetom/EvolveOS.git')`，删除占位 toast 逻辑。
- 关于卡补一行仓库地址文本 `github.com/PomDetom/EvolveOS`。
- 版本号保持动态 `__APP_VERSION__`（不变）。

## 4. 入口排序/隐藏（导航管理）

### 4.1 配置链路（三件套）

- `defaults.js` DEFAULTS 加：`nav: { order: [], hidden: [] }`
  - `order`：用户排序的 id 数组（空 = 各 module 的 `order` 字段）
  - `hidden`：隐藏的 id 数组
- `store.js`：走既有 `saveConfig`（`ui-design-config` localStorage）+ `subscribe` 通知，无需改动。
- `apply.js`：**不改**——`nav` 是功能性配置（非样式参数，不产生 CSS 变量），在代码注释说明「非样式参数不入 apply」即可，不违反配置链路。

### 4.2 壳响应式（`app-main.js` 主要实现点）

- `MODULES` 常量 → `resolveModules(cfg)`：
  - 过滤 `hidden`；按 `nav.order` 排序——在 order 列表中的 id 按其列表位置排（rank = index），未列入的按 `1000 + module.order` 排（用户排序项优先，其余自然跟随）。
- 新增 `rebuildNav()`：订阅 nav 变更时 re-mount 左窗轮（`destroy()` 旧轮防 ResizeObserver 泄漏）+ 手机 dock + 重渲概览快捷卡；**设置页内容与当前模式不重渲**（不打断用户操作，退出设置后新排序/隐藏生效）。
- home/设置两个内置模块行为不变（home 落地面 / settings 触发设置模式）。

### 4.3 设置「导航」分区（`APP_SECTIONS` index 1，通用之后）

- 新增 `{ id: 'nav', name: '导航', icon: 'layout' }`（`APP_SECTIONS` 10 → **11** 项）。
- 内容：列出全部入口（home + 8 应用 + 设置），每项 = 名称 + 显示开关（eye，隐藏/显示）+ 上移/下移按钮。
- 变更经 `saveConfig({ nav: { order, hidden } })` 持久化。
- **护栏**：至少保留 1 个可见入口（最后一个可见项的隐藏开关禁用）。
- 恢复路径：⚙ 标题栏恒可用 → 即使全隐藏也能经设置恢复。

### 4.4 概览页管理入口

概览页新增「管理入口」卡 → 跳设置「导航」分区（`setSettingsSection('nav')`）。

## 5. 连带更新

| 文件 | 改什么 |
|---|---|
| `src/apps/{clipboard,wallet,ledger,search,help,info}/` | 删除目录 |
| `src/apps/{key,token-tool}/index.js` | order 顺延（2→1、7→2） |
| `src/apps/{memo,sync,notes,knowledge,assistant,account}/index.js` | 新建占位（§2.3） |
| `src/app/app-main.js` | `settingsModule` 内置 + `resolveModules` + `rebuildNav` + 设置选中态映射 |
| `src/config/defaults.js` | `nav: { order: [], hidden: [] }` |
| `src/scenes/settings-window/settings-pages.js` | APP_SECTIONS 加 nav 分区 + aboutPage 接远端 + 导航管理 UI + 概览管理入口接线 |
| `tests/e2e/app-shell.spec.js` | `[data-id="clipboard"]` → 存活应用（如 `key`/`memo`）；设置分区计数 10→11；`data-page="clipboard"` 断言改存活应用 |
| `tests/e2e/mobile-nav.spec.js` | `[data-id="clipboard"]` → 存活应用 |
| `tests/e2e/customizer.spec.js` | 外观分区 `nth(1)` → `nth(2)`（导航插入 index 1 后） |
| `tests/e2e/visual-regression.spec.js` | 设置右窗计数 10→11；SHOTS 分区序号偏移（appearance 1→2、components 8→9、motion 9→10）；**app-main 基线重生成**（模块集 8→10） |
| `tests/unit/apps.test.js` | 无需改（8 个 app 目录 ≥6、id/order 唯一 1-8 成立）；如断言集变化可补 |

## 6. 验证与验收

- **应用集**：左窗 = home › key › token-tool › memo › sync › notes › knowledge › assistant › account › settings（默认序，10 项）；被删 6 应用不再出现。
- **设置条目**：点左窗/概览的「设置」= 进入设置模式（右窗 11 分区 + 设置页），左窗高亮「设置」；再点退出。
- **关于页**：开源仓库按钮打开真实远端 URL；关于卡显示仓库地址；版本号动态。
- **排序/隐藏**：导航分区改排序/隐藏 → 左窗/概览快捷卡/手机 dock 同步生效（退出设置后可见）；至少保留 1 可见；重启后配置持久化。
- **回归**：单测全量（含 apps.test.js order 唯一）+ 受影响 e2e（app-shell/mobile-nav/customizer/visual-regression）+ build；app-main 视觉基线重生成并确认由本次改动引起。
- **0.1.2 发版**：dev 全量回归绿 → `npm run release -- minor`（bump + CHANGELOG + 门禁）→ dev→main `--no-ff` → tag `v0.1.2`。

## 7. 非目标

- 不给被删应用迁移数据/占位保留（直接删除目录）。
- 不做导航轮内直接拖拽排序/右键隐藏（复杂度高，与轮滚动冲突；管理走设置分区）。
- 不做多端同步排序（远端同步应用是独立占位，不联动本排序配置）。
- 不新增图标（全部复用既有 47 图标 + a1 自持机制，本次无新图标需求）。

## 8. 与既有规格关系

- 沿用：并行治理（worktree/分支/回归单点化）、应用接入契约（`docs/integration/app-integration.md`）、配置链路三件套、图标 a1 自持。
- 本规格新增：应用清单重整、设置内置模块、导航管理（`nav` 配置 + 导航分区 + 概览入口）。
