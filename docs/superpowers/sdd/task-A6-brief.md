# Task A6: 手机形态（底部横滑 + 全屏页面栈）

**Files:**
- Modify: `src/app/app-main.js/.css`（≤900px 媒体查询）
- Create: `tests/e2e/mobile-nav.spec.js`

**Interfaces:**
- ≤900px：应用壳切换手机形态 — 双窗隐藏，底部横滑应用栏（NavigationWheel horizontal + anchorRatio 0.382，icon 横排）
- 全屏页面栈：点击应用 → 目录页推入（`.app-main__stack-page`，slide 左进 240ms `--ease-spring`）→ 点击目录项 → 详情页推入；左上返回按钮/边缘右滑回退
- 设置：标题栏 ⚙ → 设置页推入（同页面栈）
- 上下滑动逻辑全部横向化（底部栏横滑 + 目录横滑）
- `mobile-nav.spec.js` 用例（viewport 390×844）：底部栏可见 + 横滑 / 点击应用 → 目录页 / 点击目录项 → 详情页 / 返回回退 / 设置推入

- [ ] **Step 1-3**: TDD → 手机形态实现 → 绿
- [ ] **Step 4**: 全量回归（桌面形态不受影响）+ build
- [ ] **Step 5: 提交** `feat: 手机形态（底部横滑 + 页面栈）`

---
