# evolve-worktree

Use this operation when a change needs an isolated branch/worktree or recovery manifest.

1. Inspect the current branch and clean state.
2. Use `npm run agent:start -- --title ... --kind ... --paths ...` from `dev`.
3. Keep branch names in the boundary topology: `app/<id>/<slug>`, `ui/<slug>`, `docs/<slug>`, `chore/<slug>`, or `hotfix/<slug>`.
4. Do not create baseline, activity, or lifecycle-state records. A task is optional.
