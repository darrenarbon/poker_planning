# Teamdeck

A toolkit for agile teams, made up of several apps that share one login and
one set of user settings:

| App                     | UI path     | Status      |
| ----------------------- | ----------- | ----------- |
| Planning Poker          | `/poker`    | Live        |
| Sprint Capacity Planner | `/capacity` | Placeholder |
| Skills Matrix           | `/skills`   | Placeholder |

## Layout

This is a [pnpm](https://pnpm.io) workspace:

```
packages/
  ui/    @teamdeck/ui   React + Vite front end
  api/   @teamdeck/api  Express + Socket.IO API
supabase/           local database config, migrations and seed data
```

Both packages follow the same pattern: code shared by every app (login,
settings, Jira, the navbar…) lives at the top of `src/`, and each app keeps
its own code in `src/apps/<app>/`:

```
packages/ui/src/
  apps/
    index.ts            the list of apps shown on the homepage and navbar
    planningPoker/      features, hooks, routes… for planning poker
    sprintCapacity/     placeholder page
    skillsMatrix/       placeholder page
  components/ features/ hooks/ …   shared

packages/api/src/
  apps/
    planningPoker/      controllers, repositories, routes, services, sockets
  controllers/ repositories/ routes/ …   shared (auth, settings, Jira)
```

To add an app: create `packages/ui/src/apps/<app>/`, register it in
`packages/ui/src/apps/index.ts` and add its routes in `App.tsx`; for its API,
create `packages/api/src/apps/<app>/` and mount its router in
`packages/api/src/routes/index.ts`.

## Getting started

Needs Node 22+, pnpm 9 (`corepack enable` picks the right version) and, for
the local database, Docker.

```bash
pnpm install
```

```bash
pnpm dev
```

`pnpm dev` runs the UI and API together; `pnpm dev:ui` and `pnpm dev:api`
run one each. Copy `packages/api/.env.example` to `packages/api/.env` first.

## Local database

The Supabase CLI is installed as a dev dependency, so there's nothing else
to install beyond Docker.

```bash
pnpm db:start
```

This starts Supabase in Docker, applies `supabase/migrations` and loads
`supabase/seed.sql` (a `demo-room` room with a few tickets). Then point the
API at it in `packages/api/.env`:

```
SUPABASE_URL=http://127.0.0.1:55421
SUPABASE_KEY=<SERVICE_ROLE_KEY from `pnpm db:status`>
```

The ports (5542x) are moved off Supabase's defaults so this project can run
alongside other local Supabase projects. Studio is at http://127.0.0.1:55423.

| Command                    | What it does                                  |
| -------------------------- | --------------------------------------------- |
| `pnpm db:start`            | Start the local database                      |
| `pnpm db:stop`             | Stop it (data is kept)                        |
| `pnpm db:status`           | Show URLs and keys                            |
| `pnpm db:reset`            | Rebuild from the migrations and seed data     |
| `pnpm db:migration <name>` | Create a new file in `supabase/migrations`    |

## Checks

```bash
pnpm typecheck && pnpm lint && pnpm test
```

## Deploying

Both packages deploy to Vercel. Each Vercel project's **Root Directory** must
point at its package (`packages/ui` or `packages/api`); Vercel detects pnpm
from `pnpm-lock.yaml`.
