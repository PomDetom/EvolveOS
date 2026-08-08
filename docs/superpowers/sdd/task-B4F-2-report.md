# Task B4F-2 执行报告 — closeBehavior 配置 + 设置「通用」分区选择器

- **任务**：B4 收尾修复第二个任务。为「主窗关闭行为可配置」（退出应用 / 保留后台）铺配置层 + 设置页 UI。
- **Branch**：worktree-b4-close-sizing
- **提交哈希**：`69c032b9f2bb328121e14b1b61ad36f0c4686345`（评审修正：原报告 6ac9afc 为 amend 前哈希，控制器并入 brief 后为 69c032b）
- **状态**：DONE

## 一、实现内容

按 `task-B4F-2-brief.md` Step 1→7 verbatim 实施，含「控制器裁定」两处主题同步循环收敛修复：

1. **`src/config/defaults.js`**：`DEFAULTS` 末尾追加 `closeBehavior: 'exit'`（主窗关闭：exit=退出应用 / background=保留后台）。
2. **`src/scenes/settings-window/settings-pages.js`**：
   - 顶部加 `CLOSE_BEHAVIORS` 常量（exit/background 两态）。
   - `generalPage()` 主题字段后追加「关闭主窗口时」字段：`.csettings__modes csettings__modes--close` + `data-close-behavior-group`，按钮 class 复用 `.csettings__mode` + `data-close-behavior`，默认按 `cfg.closeBehavior` 高亮 `csettings__mode--active` + `aria-pressed`。
   - `mountSettingsInteractions(root)` 主题三态 handler 之后加接线：`[data-close-behavior-group]` click → `saveConfig({ closeBehavior })` → `applyConfig` → 独立 `[data-close-behavior]` 选择器循环更新高亮/aria-pressed。链路完整（defaults → store → apply），不绕过直接写 CSS 变量。
3. **控制器裁定修复（两处主题循环收敛 `[data-mode]`）**：
   - settings-pages.js 主题三态 click handler：`root.querySelectorAll('.csettings__mode')` → `.csettings__mode[data-mode]`。
   - `src/app/app-main.js` `syncSettingsThemeModes`：`document.querySelectorAll('.csettings__mode')` → `.csettings__mode[data-mode]`。
   - 作用：close-behavior 按钮同用 `.csettings__mode` 类，若主题循环不限定 `[data-mode]`，任何 subscribe（含切换 closeBehavior）会把 close-behavior 按钮 active 高亮误清。close-behavior 高亮用独立 `[data-close-behavior-group]`/`[data-close-behavior]` 管理，互不干扰。
4. **`tests/e2e/app-shell.spec.js`**：追加新用例「通用分区：关闭主窗口时选择器存在且可切换（写 store）」（verbatim）。

## 二、TDD 红 → 绿证据

### 红（实现前，工作树 5174 server，`git stash` 临时回退 3 个源文件、保留测试文件）

```
npx playwright test tests/e2e/app-shell.spec.js -g "关闭主窗口时" --config=playwright.config.b4f2.js
x 1 [chromium] › app-shell.spec.js:535:1 › 通用分区：关闭主窗口时选择器存在且可切换（写 store） (6.2s)
Error: expect(locator).toBeVisible() failed
    Locator: locator('[data-close-behavior-group]')
    Expected: visible
    Error: element(s) not found
1 failed
```

> 首轮红（Step 2）因共享 checkout 旧 dev server 占用 5173（reuseExistingServer 误连），确认 `[data-close-behavior-group]` 不存在；为严谨，实现完成后用 `git stash` 对工作树回退 3 个源文件、保留新用例，在同一工作树 5174 server 上复测，同样红（`[data-close-behavior-group]` not found），随后 `git stash pop` 恢复。

### 绿（实现后，同 server）

```
npx playwright test tests/e2e/app-shell.spec.js -g "关闭主窗口时" --config=playwright.config.b4f2.js
ok 1 [chromium] › app-shell.spec.js:535:1 › 通用分区：关闭主窗口时选择器存在且可切换（写 store） (1.2s)
1 passed (4.1s)
```

全文件（29 用例）零回归通过，含 B2-R9 主题三态同步用例（第 27 个，受 `[data-mode]` 收敛影响的最小回归面）。

## 三、全量回归

| 命令 | 结果 |
|---|---|
| `npm test` | 12 文件 58 用例全绿（含 store/apply/defaults 相关单测） |
| `npx playwright test`（全 e2e，临时配置指向工作树 5174 server） | 104 passed（4.0m），含 12 张视觉基线（app-main/appearance/components/motion 分区，零漂移，未跑 --update-snapshots） |
| `npm run build` | 99 modules transformed，built in 397ms，成功 |

> 注：`npm run test:e2e` 主配置硬编码 baseURL 5173，而共享 checkout 的旧 dev server 占用 5173 且 serve 陈旧代码（`reuseExistingServer: true` 误连）——本任务改用临时 `playwright.config.b4f2.js`（baseURL/webServer 均指向工作树自起的 5174 server）完成全部 e2e；临时配置测试后已删除，不入提交。

## 四、提交

```
6ac9afc feat: 主窗关闭行为可配置（closeBehavior 退出应用/保留后台，通用分区选择器，B4 收尾）

 src/app/app-main.js                          |  4 +++-
 src/config/defaults.js                       |  1 +
 src/scenes/settings-window/settings-pages.js | 33 +++++++++++++++++++++++++++-
 tests/e2e/app-shell.spec.js                  | 19 ++++++++++++++++++
 4 files changed, 55 insertions(+), 2 deletions(-)
```

git add 清单按简报 Step 7 原文（含 app-main.js 控制器裁定修复）。提交后 `git status` 仅剩未跟踪的 `task-B4F-2-brief.md`（简报 Step 7 清单未含，依指令不入本次提交）；`src-tauri/Cargo.toml` 零改动，无行尾噪声混入（提交前 `git diff --stat` 核对）。

## 五、自评

- **越界改动**：无。全部改动（4 文件）均为简报 Step 1-7 verbatim 范围；控制器裁定两处 `[data-mode]` 收敛按用户批准随任务提交。
- **环境遗留**：共享 checkout 旧 dev server（PID 2528，serve 陈旧代码）仍在 5173 上运行，非本任务创建、无法终止（权限限制）。后续任务（B4F-3/4/5）跑 e2e 时需留意 `reuseExistingServer` 会误连该旧 server；建议在 `C:\Repository\ui-design` 根目录重启/清理该 dev server 后再跑全量 e2e。
- **遗漏**：无。close-behavior 的 Rust 侧消费（B4F-3）与 JS 同步 Rust（B4F-4）不在本任务范围，`cfg.closeBehavior` 产出已由本任务用例锁定。
- **视觉基线**：零漂移（12/12 张通过，未运行 --update-snapshots；新字段位于设置「通用」页，视觉基线 SHOTS 未覆盖该页）。
