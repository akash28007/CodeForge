# CodeForge — Milestone Tracker

- [x] 1. Environment setup (this scaffold)
- [x] 2. Project scaffolding (wire up modules, routing, Tailwind)
- [x] 3. Authentication (JWT + bcrypt, guards)
- [x] 4. Database & Prisma (schema, migrations)
- [x] 5. Problem management (CRUD, admin-only writes)
- [x] 6. Submission pipeline (queue + status polling)
- [x] 7. Docker execution (sandboxed compile/run, see security notes below)
- [x] 8. Leaderboard
- [x] 9. Testing (unit + e2e) and CI/CD pipeline
- [~] 10. Deployment — client→Vercel, Postgres→Neon, Redis→Upstash, API+judge→Oracle
      Cloud VM, HTTPS→Caddy. **Render was ruled out**: its web services give no Docker
      daemon, and the judge shells out to the real `docker` CLI. Code and configuration
      are ready and verified; the remaining steps are account signups only the owner can
      do. See [`DEPLOYMENT.md`](DEPLOYMENT.md).
- [ ] 11. Documentation, README and resume bullets

## Security notes for Milestone 7 (do not skip)

All submitted code is untrusted. The executor must enforce:
- ephemeral, single-use container per submission
- CPU + memory limits from the problem's `timeLimit`/`memoryLimit`
- wall-clock timeout enforced from *outside* the container as a backstop
- no network access inside the container
- read-only root filesystem, small writable tmp mount, disk quota
- non-root user, dropped capabilities, seccomp/AppArmor profile
- capped queue concurrency so a burst of submissions can't exhaust the host
