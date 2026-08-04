# CodeForge

A production-style Online Judge: secure C++ execution, auth, PostgreSQL, Docker, REST APIs.

## Structure

- `client/` — React + TypeScript + Tailwind (Vite)
- `server/` — NestJS + TypeScript + Prisma
- `docker/executor/` — sandboxed Docker image used to compile/run submitted C++ code
- `docs/` — project docs, milestone tracker

## Local setup

```bash
# 1. Install dependencies
cd server && npm install
cd ../client && npm install

# 2. Configure environment
cp server/.env.example server/.env
# edit server/.env with your local Postgres/Redis URLs

# 3. Start infra (Postgres + Redis) with Docker
docker compose up -d

# 4. Run Prisma migrations
cd server && npx prisma migrate dev --name init

# 5. Start dev servers
cd server && npm run start:dev
cd client && npm run dev
```

See `docs/MILESTONES.md` for the build order — build one milestone at a time, don't skip ahead.
