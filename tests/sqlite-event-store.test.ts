import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import type { Event, TimelineAtom } from "../packages/core/src/index.js";
import { SQLiteEventStore } from "../packages/storage/src/sqlite-event-store.js";

const tempDirs: string[] = [];

async function tempDbPath(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "happening-sqlite-test-"));
  tempDirs.push(dir);
  return join(dir, "happening.db");
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

const basketballEvent: Event = {
  id: "nba-lal-gsw-live",
  title: "Lakers vs Warriors",
  category: "sports",
  status: "live",
  sport: "basketball",
  league: "NBA",
  participants: ["Lakers", "Warriors"],
  score: { Lakers: 103, Warriors: 99 },
  clock: "Q4 00:59",
  updatedAt: "2026-04-29T10:00:00.000Z",
};

const footballEvent: Event = {
  id: "epl-ars-mci-live",
  title: "Arsenal vs Manchester City",
  category: "sports",
  status: "live",
  sport: "football",
  league: "Premier League",
  participants: ["Arsenal", "Manchester City"],
  score: { Arsenal: 1, "Manchester City": 1 },
  clock: "67'",
  updatedAt: "2026-04-29T10:01:00.000Z",
};

const timeline: TimelineAtom[] = [
  {
    id: "atom-2",
    eventId: basketballEvent.id,
    time: "Q4 00:59",
    type: "score",
    text: "Lakers extend the lead.",
    importance: "high",
  },
  {
    id: "atom-1",
    eventId: basketballEvent.id,
    time: "Q4 01:20",
    type: "status",
    text: "Warriors call timeout.",
    importance: "normal",
  },
];

describe("SQLiteEventStore", () => {
  it("upserts events and reads them back after reopening the database file", async () => {
    const databasePath = await tempDbPath();
    const store = new SQLiteEventStore({ path: databasePath });

    await store.upsertEvents([basketballEvent]);
    store.close();

    const reopened = new SQLiteEventStore({ path: databasePath });
    const event = await reopened.getEvent(basketballEvent.id);
    reopened.close();

    expect(event).toEqual(basketballEvent);
  });

  it("replaces timelines and preserves event-specific ordering", async () => {
    const store = new SQLiteEventStore({ path: await tempDbPath() });

    await store.upsertEvents([basketballEvent]);
    await store.replaceTimeline(basketballEvent.id, timeline);
    await store.replaceTimeline(basketballEvent.id, [timeline[1]]);

    const storedTimeline = await store.getTimeline(basketballEvent.id);
    store.close();

    expect(storedTimeline).toEqual([timeline[1]]);
  });

  it("filters live events by sport and category", async () => {
    const store = new SQLiteEventStore({ path: await tempDbPath() });

    await store.upsertEvents([
      basketballEvent,
      footballEvent,
      { ...basketballEvent, id: "nba-ended", status: "ended" },
    ]);

    const basketball = await store.listLiveEvents({ category: "sports", sport: "basketball" });
    store.close();

    expect(basketball).toEqual([basketballEvent]);
  });
});
