# Repository-native Agent Development Protocol v2

**Status:** implemented

**Class:** process

## Resolution

The v2 repository-native workflow is implemented on `chore/ewp-v2`: Git HEAD/diff/merge-base are authoritative, tasks are recovery manifests, verification evidence is worktree-local under `.git/evolve-agent/`, and merge readiness uses live facts instead of persisted FSM state.

The original proposal remains under `.agents/notes/proposed/` for design history. This Note records that the direction was adopted and implemented.

## Evidence

- `npm test -- --configLoader runner --maxWorkers=1`
- `npm run build`
- `npm run test:e2e -- --grep shell`
- `npm run check:boundary`
