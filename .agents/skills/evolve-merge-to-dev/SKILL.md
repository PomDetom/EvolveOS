# evolve-merge-to-dev

Run `npm run merge-to-dev -- <branch> --no-cleanup` from the main checkout on `dev` when reviewing readiness. The gate uses live branch/head/diff/boundary/evidence/Note/review facts. It never reads a `ready` task state. Resolve stale HEAD or stale evidence by running the selected checks again.
