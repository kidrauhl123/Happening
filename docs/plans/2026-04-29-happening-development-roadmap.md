# Happening Development Roadmap Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Turn Happening from a mock sports live-events API into a locally persistent, provider-driven live event facts service.

**Architecture:** Keep `apps/api` depending only on `HappeningProvider`. Put canonical models and interfaces in `packages/core`, persistence implementations in `packages/storage`, and data-source adapters in `packages/providers`. The next milestone adds a persistent `SQLiteEventStore`, a fixture/manual provider loader that mirrors the shape of real data-source adapters, and a server bootstrap that can run either mock mode or persisted fixture-backed mode.

**Tech Stack:** TypeScript, Node.js 24, Hono, Vitest, Node built-in `node:sqlite`, Server-Sent Events.

---

## Product Direction

Happening is the facts layer for "what is happening right now". The first vertical is sports live events. It should not become a news/social/video app. It should provide normalized facts and timelines to other software through API, SSE, and later webhooks/SDKs.

## Milestones

### Milestone 0 — Done

- Mock Hono API
- Core `Event` / `TimelineAtom` types
- `HappeningProvider` abstraction
- `MockSportsProvider`
- API tests and README verification

### Milestone 1 — Done

- `EventStore` interface
- `InMemoryEventStore`
- `ManualSportsProvider` sync skeleton
- Provider/store tests

### Milestone 2 — Current

- Persistent `SQLiteEventStore`
- JSON fixture ingestion provider path
- Server bootstrap switch between mock and persisted fixture mode
- README updated with local persistence instructions

### Milestone 3 — Current

- Worker app to periodically sync providers — implemented with `apps/worker`
- Sync status persistence — implemented with `provider_sync_status`
- Provider error reporting through worker status — implemented
- Source metadata and attribution fields — implemented as `SourceMetadata` on `Event` and `TimelineAtom`
- Minimal frontend/dashboard — implemented at API root `/` so the user can see known live events, timelines, raw JSON, and sources
- Webhook registration/delivery — next

### Milestone 4 — Current

- Real sports data provider adapter — first pass implemented with `EspnSportsProvider` using ESPN public scoreboard API
- Multi-source provider aggregation — implemented with `CompositeProvider` and `HAPPENING_ESPN_SOURCES` for multiple ESPN scoreboards
- JS SDK
- Small admin/debug UI
- Deployment packaging

---

## Task 1: Add SQLiteEventStore tests

**Objective:** Specify persistent event and timeline storage behavior before implementation.

**Files:**
- Create: `tests/sqlite-event-store.test.ts`
- Modify: none

**Step 1: Write failing test**

Test cases:
- `upserts events and reads them back after reopening the database file`
- `replaces timelines and preserves event-specific ordering`
- `filters live events by sport and category`

Use a temporary database path under `os.tmpdir()`.

**Step 2: Run test to verify failure**

Run:

```bash
export PATH=/Users/zuiyou/.nvm/versions/node/v24.15.0/bin:$PATH
npm test -- tests/sqlite-event-store.test.ts
```

Expected: FAIL — module `packages/storage/src/sqlite-event-store.js` missing.

**Step 3: Implement minimal code**

Create `packages/storage/src/sqlite-event-store.ts` using Node built-in `node:sqlite` `DatabaseSync`.

Schema:

```sql
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  sport TEXT,
  league TEXT,
  participants_json TEXT,
  score_json TEXT,
  clock TEXT,
  updated_at TEXT NOT NULL,
  event_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS timeline_atoms (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  atom_order INTEGER NOT NULL,
  time TEXT NOT NULL,
  type TEXT NOT NULL,
  text TEXT NOT NULL,
  importance TEXT NOT NULL,
  atom_json TEXT NOT NULL
);
```

Expose:
- constructor `{ path?: string }`
- `close()`
- `upsertEvents`
- `replaceTimeline`
- `listLiveEvents`
- `getEvent`
- `getTimeline`

**Step 4: Run test to verify pass**

Run same test file. Expected: PASS.

---

## Task 2: Export storage implementations

**Objective:** Make `SQLiteEventStore` available through package storage barrel.

**Files:**
- Modify: `packages/storage/src/index.ts`
- Test: covered by `tests/sqlite-event-store.test.ts`

**Steps:**
1. Export `SQLiteEventStore`.
2. Run storage tests.
3. Run typecheck.

---

## Task 3: Add fixture loading provider tests

**Objective:** Specify a simple file-backed provider source path for local/manual real-source experiments.

**Files:**
- Create: `tests/fixture-sports-provider.test.ts`
- Create fixture inside test temp directory, not repo data.

**Behavior:**
- JSON file shape: `{ "snapshots": [{ "event": Event, "timeline": TimelineAtom[] }] }`
- `FixtureSportsProvider.fromFile({ filePath, store })` reads JSON, validates top-level shape minimally, and delegates to `ManualSportsProvider` behavior.
- `sync()` writes events/timelines into store.

**Run:**

```bash
npm test -- tests/fixture-sports-provider.test.ts
```

Expected RED: missing module.

---

## Task 4: Implement FixtureSportsProvider

**Objective:** Add the first provider adapter path that resembles a real source adapter but uses local JSON fixtures.

**Files:**
- Create: `packages/providers/src/fixture-sports-provider.ts`
- Modify: `packages/providers/src/index.ts`

**Implementation:**
- Read file via `node:fs/promises`.
- Parse JSON.
- Confirm `snapshots` is an array.
- Construct `ManualSportsProvider` with parsed snapshots.
- Inherit/delegate `sync`, `listLiveEvents`, `getEvent`, `getTimeline`.

**Verification:**
- Run fixture provider test.
- Run all provider tests.

---

## Task 5: Add server bootstrap mode tests

**Objective:** Verify the API can be created from environment-style config with mock or fixture/sqlite mode.

**Files:**
- Create: `tests/server-config.test.ts`
- Create: `apps/api/src/config.ts`

**Behavior:**
- `createProviderFromConfig({ mode: "mock" })` returns a provider serving mock basketball events.
- `createProviderFromConfig({ mode: "fixture", databasePath, fixturePath })` loads fixture data into SQLite store and returns provider serving persisted events.

**Run:**

```bash
npm test -- tests/server-config.test.ts
```

Expected RED: missing config module.

---

## Task 6: Implement server bootstrap config

**Objective:** Allow `npm run dev` to run mock mode by default and fixture/sqlite mode when env vars are set.

**Files:**
- Create: `apps/api/src/config.ts`
- Modify: `apps/api/src/server.ts`

**Environment:**
- `HAPPENING_PROVIDER_MODE=mock|fixture`
- `HAPPENING_DB_PATH=./data/happening.db`
- `HAPPENING_FIXTURE_PATH=./data/sports-fixture.json`

**Verification:**
- Unit test server config.
- Start server in mock mode and hit `/health`.
- Start server in fixture mode with temp data and hit `/api/events/live`.

---

## Task 7: Documentation and final verification

**Objective:** Keep README as the current development log and user-facing entry point.

**Files:**
- Modify: `README.md`

**Add:**
- Current architecture diagram in text
- SQLite persistence usage
- Fixture provider usage
- Current roadmap checklist

**Final verification:**

```bash
export PATH=/Users/zuiyou/.nvm/versions/node/v24.15.0/bin:$PATH
npm test
npm run typecheck
git diff --check
git status --short
```

**Commit:**

```bash
git add docs/plans README.md apps packages tests
git commit -m "feat: add persistent store and fixture provider"
git push
```
