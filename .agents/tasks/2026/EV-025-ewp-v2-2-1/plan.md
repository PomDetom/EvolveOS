# EV-025 EWP v2.2.1 Policy Correctness & Artifact Semantics

## Goal

修正 Policy 输入事实的语义分类，并把 review/human attestation 收敛为基于 subject snapshot 的 trailing decision artifact；本任务不新增 workflow state、task lifecycle、orchestration 层或长期 persisted state。

## Scope

- `scripts/agent/`：artifact semantics、Policy 输入、gate registry、subject artifact、status/trailer 与验证工具。
- `scripts/boundary-check.js`、`scripts/merge-to-dev*.js`：边界、merge readiness、review/attestation trailing 规则。
- `.agents/`、`AGENTS.md`、`docs/AGENTS.md`：task/Note、规则语义和历史兼容边界。
- `tests/unit/`、`vitest.config.js`：真实 Git fixture 与 v2.2.1 contract tests。

## Implementation order

1. 建立 EV-025、proposed Note 和 v2.2.1 事实边界。
2. 将 permission 判断从 automated gate 中分离，并统一 subject-head attestation/review 数据模型。
3. 新增 artifact semantics，按 subject/governance/decision/sidecar 分类 changed paths；Policy 仅从 subject/governance 推导风险。
4. 收紧 trailing artifact 白名单：仅当前 task 的 `review.md` 与 `attestations/*.json`；task/plan/Note/代码变更使旧 judgment stale。
5. 收缩 docs/AGENTS.md 的职责，补充 merge trailer integrated 识别，迁移 `tauri → native` 并保持 `ui` legacy alias 的相同边界。
6. 执行真实 Git fixture、全量受影响测试、build、docs/Note/task/boundary 检查和独立 semantic review。

## Implementation result

- P0：`permission-check` 已替换为自动化 capability schema check，gate registry 不再包含 MANUAL gate。
- Artifact semantics：Policy 已区分 subject/governance/decision/sidecar，sidecar 不升级 app-local 风险，policy hash 排除 trailing sidecar 的路径变化。
- Freshness：review 与 human attestation 绑定 subject head/fingerprint；subject 后仅允许当前 task 的 `review.md` 与 `attestations/*.json`。
- Routing/status：`tauri` 新任务生成 `native/*`，`ui/*` 按 framework 边界检查，集成状态由 Git trailers 读取，不写入 lifecycle state。
- Verification：定向 27/27、全量 247/247 单测、production build、boundary/docs/Note/task/permission checks 均通过。

## Policy semantics

| Artifact role | Examples | Risk input | Freshness role |
| --- | --- | --- | --- |
| subject | `src/**`, `src-tauri/**`, `scripts/**`, configs | drives checks/task/review | subject snapshot |
| governance | `AGENTS.md`, `.agents/skills/**`, protocol/README | drives workflow-policy risk | current policy |
| decision | `.agents/notes/**` | validates decision requirement | stale when changed after judgment |
| sidecar | task/plan/review/attestation files | does not upgrade business risk | trailing artifact validation |

## Risks / open questions

- 旧 v2.2 merge 工具仍可能读取 `baseSha`，新 task 保留兼容字段但 canonical provenance 使用 `createdFromSha`。
- 历史 `ui/*` 与 EWP task 只能作为只读兼容，不能成为新任务默认写入路径。
- docs/AGENTS.md 的质量护栏保留，但具体 gate/review 路由必须归 Change Policy。
