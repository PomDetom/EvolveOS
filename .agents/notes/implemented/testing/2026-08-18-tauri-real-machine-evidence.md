# Tauri 真实桌面证据

**Status:** implemented

**Class:** testing

## Problem

Web mock 或浏览器 e2e 不能证明 Tauri 窗口、权限和桌面行为在真实 Windows 环境可用。

## Decision

涉及 `src-tauri/` 的 task 必须选择 Rust、权限、Web 回归和 `desktop-manual` gate；真实桌面验证记录必须存在，pending 或 mock 结果不能进入 ready。

## Alternatives

- 只以浏览器 e2e 作为桌面可用性证据。
- 把真实桌面失败标记为 flake 后继续放行。

## Consequences/Risks

- Tauri task 的验证成本高于纯 Web task。
- 需要在人工记录中保留平台、动作、结果和当前 HEAD。
