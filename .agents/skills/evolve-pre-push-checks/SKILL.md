# evolve-pre-push-checks

Use `npm run agent:scope`, `npm run agent:checks`, and `npm run agent:verify` against the real Git diff. Choose the narrowest sufficient gates for the changed paths. Automatic evidence belongs in `.git/evolve-agent/evidence/`; it must not be copied into task.json.

Docs, mechanical, visual-only, and config changes do not need a universal full test run. Tauri OS integration changes additionally need real Windows evidence.
