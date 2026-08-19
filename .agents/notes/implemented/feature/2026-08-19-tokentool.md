# TokenTool 悬浮窗多账户展示修复

**Status:** implemented

**Class:** feature

## Problem

历史 `app/token-tool/float-multi-account` 分支修改了 `src/app` 与 `src/components`，超出 `app/*` 边界；本任务将其重新归类为 `ui/*`，仅保留产品代码和 E2E 测试迁移。

## Decision

窗口模式下超过两个账户时，为悬浮条增加 `c-strip-tk--many` 标记并纵向堆叠账户 chip，避免固定 320px 窗口裁切后续账户。验证范围限定为浏览器/Web-only。

## Alternatives

- 直接合并原 `app/*` 分支会违反边界规则，因此重新从 `dev` 启动 `ui/*` 任务并迁移三个目标文件。

## Consequences/Risks

- 不改变账户数据来源、持久化协议或 Tauri 启动方式；不执行桌面端验证。
