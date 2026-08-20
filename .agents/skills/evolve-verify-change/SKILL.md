# evolve-verify-change

## Trigger

实现已完成，task 状态为 `verifying`。

## Inputs

task.json、当前 HEAD、`agent:scope` 输出和对应 gate registry。

## Outputs

绑定 base/head SHA 的自动化 evidence；手工 gate 保持 pending 并明确需要的人工记录。

## Stop conditions

task 缺失、scope 越界、gate 未注册、命令失败、证据 head SHA 过期或试图用 mock 替代 Tauri 桌面证据时停止。

## Source of truth

`scripts/agent/change-scope.js`、`select-gates.js`、`verify.js`、task.json 和 Git SHA。

## Procedure

1. 运行 `npm run agent:scope -- --task <id> --base dev --head HEAD`，确认输出的 change snapshot。
2. 运行 `npm run agent:checks -- --task <id>` 和 `npm run agent:verify -- --task <id> --dry-run`，确认两者基于同一组 changed paths 路由门禁。
3. 运行正式 verify；摘要写入 evidence，不写完整日志。
4. 确认证据同时绑定当前 baseSha、headSha、changedPathsHash 和 changeFingerprint 后，将 task 交给 review Skill。
