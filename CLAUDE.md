# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IdeasLab(아이디어스 랩) - Discord community platform for creators. Full-stack TypeScript monorepo with a Discord bot + tRPC API server and a Next.js web frontend.

## Commands

```bash
# Development
pnpm dev                    # Run all apps in parallel (turbo)
pnpm generate               # Generate Prisma client
pnpm db:migrate:dev         # Run database migrations
pnpm lint                   # Lint all packages
pnpm format                 # Prettier format all files

# Infrastructure
docker compose -f docker-compose.dev.yml up -d   # Start PostgreSQL (TimescaleDB) + Redis
docker compose -f docker-compose.dev.yml down     # Stop services

# Individual apps
pnpm --filter @ideaslab/server dev      # Server only
pnpm --filter @ideaslab/web dev         # Web only
pnpm --filter @ideaslab/db studio       # Prisma Studio

# Build
pnpm build                              # Build all
docker build . -f ./Dockerfile.server -t <tag>  # Production server image
```

## Architecture

**Monorepo** (pnpm workspaces + Turborepo):
- `apps/server` — Discord.js bot + tRPC HTTP server (port 4000). Entry: `src/index.ts`, run with `tsx`.
- `apps/web` — Next.js (Pages Router) frontend. Proxies `/api/*` to server in dev via next.config rewrites.
- `packages/db` — Prisma schema + client. PostgreSQL with TimescaleDB for time-series tables (`VoiceLog`, `MessageLog`).
- `packages/validator` — Shared Zod schemas used by both server and web.
- `packages/eslint-config` — Shared ESLint presets.
- `packages/tsconfig` — Shared TypeScript base configs.

**Communication**: Web ↔ Server via tRPC. Type-safe end-to-end — server defines routers in `apps/server/src/api/router/`, web consumes via `@trpc/react-query`.

**Server structure** (`apps/server/src/`):
- `api/` — tRPC router definitions and middleware (auth, context)
- `bot/base/` — Discord client, command/event/interaction managers
- `bot/commands/` — Slash commands
- `bot/events/` — Discord event handlers
- `bot/interactions/` — Button, modal, menu, context menu handlers
- `service/` — Business logic (gallery, voice-channel, ticket, auth, etc.)
- `config.ts` — Environment config via Zod validation

**Web structure** (`apps/web/src/`):
- `pages/` — Next.js pages (gallery, settings, login, signup, profiles)
- `components/` — React components
- `hooks/` — Custom hooks (useAuth, useForm, useTheme, etc.)
- `utils/trpc.ts` — tRPC client setup

## Key Technologies

- **Runtime**: Node.js >= 22
- **ORM**: Prisma 6 with PostgreSQL + TimescaleDB
- **Cache/Sessions**: Redis (ioredis), iron-session
- **Auth**: JWT + iron-session, hCaptcha for signup
- **Frontend**: Tailwind CSS, Jotai (state), react-hook-form
- **Serialization**: SuperJSON (tRPC transformer)

## Code Style

- Prettier: single quotes, no semicolons, trailing commas, 100 char width, LF line endings
- Path alias: `~/*` maps to `./src/*` in both apps
- Korean language used in UI strings, commit messages, and comments
- ESLint plugins: simple-import-sort, unused-imports

## Environment

Copy `.env.example` to `.env` at root. Key variables: `BOT_TOKEN`, `GUILD_ID`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `IRON_SESSION_PASSWORD`, `WEB_URL`, `COOKIE_DOMAIN`. See also `apps/server/.env.example` and `apps/web/.env.example`.
