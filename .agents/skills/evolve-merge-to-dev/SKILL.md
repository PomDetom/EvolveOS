# evolve-merge-to-dev

Run `npm run merge-to-dev -- <branch> --no-cleanup` from the main checkout on `dev` when checking merge readiness. The gate uses live branch/head/diff/boundary/evidence/Note/review facts and the Change Policy result. It never reads a persistent task lifecycle state. Resolve stale HEAD, policy or evidence by running the selected checks again.
