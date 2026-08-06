# B1 最终评审修复报告（b1-final fix wave）— 应用壳分支合并前

日期：2026-08-06 ｜ 分支：`feature/b1-product` ｜ 基：`153db42`（docs: B1 最终整体审查包）
裁决：**Ready to merge: With fixes（2 Important）** —— 本波修复闭环，四项回归全绿。

## 修复项

### I1（Important）— 动效分区 store 订阅在手机路径无界泄漏
- **改动**：
  - `src/demo/motion-lab.js`：`mountMotionLab` 末段 `subscribe(...)` 捕获退订函数并 `return unsub`（镜像 `renderCustomizerGroups` 契约 —— 调用方重建 container 前释放）。
  - `src/app/app-main.js`：`mountMotionPartition(part, onMounted)` 增可选回调，挂载后把退订函数上抛；`activateMobileSettings` 手机路径经回调记入新句柄 `mobileMotionUnsub`（含异步导入期间防御性 `mobileMotionUnsub?.()` 先释放旧订阅）；`renderStack()` 重建 DOM 前释放 `mobileMotionUnsub`（与 `mobileCustUnsub` 同机制）。另加 `!part.isConnected` 守卫 —— 手机重建后旧容器已脱离 DOM，异步导入 resolve 时不挂载，从源头杜绝「closure 持有已脱离 DOM 的 cards」的跨容器竞态泄漏。
- **覆盖测试**：
  - 单测 `tests/unit/motion-lab.test.js`（新增，镜像 `customizer.test.js` 模式）：① 返回值为函数；② 释放旧订阅后旧容器不再随 store 同步（弹性滑杆停留 0.6）、新容器正常跟随（0.8）。
  - e2e `tests/e2e/mobile-nav.spec.js`（新增）：手机视口设置→动效 两次进出，重建后分区重挂载仍渲染 5 卡（守护重建→重挂流程 + isConnected 守卫不误杀合法挂载）。
- **RED**：临时 stash `motion-lab.js` 修复后跑单测 → `2 failed`（`TypeError: unsubOld is not a function` + `typeof unsub` 非 function）。
- **GREEN**：恢复修复 → `2 passed`；e2e 新增用例随全量通过。

### I2（Important）— 动态分区 import 无 .catch，chunk 失败永久空分区
- **改动**：`src/app/app-main.js` `mountComponentsPartition` / `mountMotionPartition` 均追加 `.catch(() => { 标志 = false; toast('分区内容加载失败', { variant: 'danger' }); })`。失败重置桌面惰性挂载标志（`componentsMounted`/`motionMounted`），后续再次激活设置分区可重试；`import { toast }` 接入既有全局 toast。三个桌面标志声明上移至分区函数前（消除 `let` TDZ 引用隐患，纯排版调整）。
- **覆盖测试**：`.catch` 路径在本地 e2e 不可触达（chunk 恒本地加载成功），按任务允许做代码审查级断言 —— 标志复位逻辑在 catch 内可见（`componentsMounted = false` / `motionMounted = false`）；手机路径本就按容器空态重挂（无标志），失败后下次 activateMobileSettings 自动重试。构建产物确认两个展示 chunk 正常生成（见回归表）。

## 全量回归（四项全绿）

| 套件 | 结果 |
|---|---|
| `npm test`（单测） | **54 passed**（52 基线 + 2 新增 motion-lab） |
| `npm run test:e2e`（浏览器交互） | **82 passed**（81 基线 + 1 新增 mobile-nav 重入） |
| `npm run test:visual`（视觉基线） | **18 passed，基线文件零变化**（`git status` snapshots 无 PNG 变更） |
| `npm run build` | 通过（639ms；motion-lab / component-showcase-full / clipboard-float / float-strip chunk 正常分包） |

## 变更文件

- `src/demo/motion-lab.js` — I1：`mountMotionLab` 返回退订函数
- `src/app/app-main.js` — I1：`mobileMotionUnsub` 句柄 + `onMounted` 上抛 + `isConnected` 守卫；I2：分区 import `.catch` + 标志复位 + toast
- `tests/unit/motion-lab.test.js` — I1 单测（新增）
- `tests/e2e/mobile-nav.spec.js` — I1 手机重入 e2e（新增）
- `docs/superpowers/sdd/b1-final-fix-report.md` — 本报告

## 自查发现

1. **`onMounted?.(mountMotionLab(part))` 会短路参数求值**：首次实现把 `mountMotionLab(part)` 写在可选调用的参数位 —— 桌面路径 `onMounted` 为 undefined，可选调用短路导致 `mountMotionLab` 根本没执行，桌面动效分区空挂。改为先 `const unsub = mountMotionLab(part)` 再 `onMounted?.(unsub)`。被 app-shell「设置分区包含组件/动效」+ motion-lab 三用例 RED 捕获（`[data-partition="motion"]` 空容器超时）。
2. **`isConnected` 守卫的挂载时机关联**：守卫只在「import resolve 后容器已脱离 DOM」（手机重建竞态）时拦截，合法挂载（桌面常驻分区 / 手机当前栈页分区均为 connected）不受影响 —— 由 app-shell 桌面分区用例 + mobile-nav 重入用例双路径覆盖确认。
3. **手机路径失败自动重试**：I2 catch 在手机路径无标志可复位（`motionMounted` 复位为 no-op），但容器空态检查天然使下次激活重试 —— 与桌面标志复位殊途同归。
4. **退订契约无破坏**：`mountMotionLab` 返回类型由 `undefined` → `function`，调用点 `mountMotionPartition`（桌面丢弃 + 手机 sink）均不依赖原返回值；`renderCustomizerGroups` 先例已确立同契约。
5. **TOCTOU 竞态收敛**：renderStack 重建（释放旧订阅）→ 异步 import resolve（isConnected 守卫拦截旧容器）→ 新容器 sink 记录 —— 任意时序下活跃订阅至多 1 个，无界增长被根除。

## 问题与关注点

1. **（观察）** I2 的 `.catch` 在手机路径失败时会重复弹 toast：容器空态使每次 renderStack 重触发 import，若 chunk 持续失败则每次进入设置→动效再弹一次。鉴于 chunk 加载失败是异常低频路径且桌面路径有标志复位节流，未额外做「同会话只提示一次」节流；如需可仿 store `storageErrorReported` 模式（session 级 flag）。
2. **（观察）** `isConnected` 在桌面动态 import 慢网络下的竞态：用户切走再切回同一桌面分区，`motionMounted` 已 true 故不重挂；原容器仍 connected，import resolve 后正常挂载 —— 无回归。

## 未做事项（按任务约束）

- 未修改 `docs/superpowers/sdd/progress-b1.md`（控制器维护，工作区既有修改未提交）。
- 未 merge。
