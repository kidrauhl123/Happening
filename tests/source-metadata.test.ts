import { describe, expect, it } from "vitest";
import type { Event, TimelineAtom } from "../packages/core/src/index.js";
import { InMemoryEventStore, SQLiteEventStore } from "../packages/storage/src/index.js";

const event: Event = {
  id: "source-live",
  title: "Source Metadata Match",
  category: "sports",
  status: "live",
  sport: "basketball",
  updatedAt: "2026-04-29T13:00:00.000Z",
  source: {
    providerId: "fixture:sports",
    externalId: "game-123",
    url: "https://example.test/game-123",
    priority: 10,
    confidence: 0.9,
    firstSeenAt: "2026-04-29T12:59:00.000Z",
    lastSeenAt: "2026-04-29T13:00:00.000Z",
  },
};

const atom: TimelineAtom = {
  id: "source-live-001",
  eventId: event.id,
  time: "Q1 09:00",
  type: "status",
  text: "Source metadata atom.",
  importance: "normal",
  source: {
    providerId: "fixture:sports",
    externalId: "play-456",
    priority: 10,
    confidence: 0.8,
    firstSeenAt: "2026-04-29T13:00:00.000Z",
    lastSeenAt: "2026-04-29T13:00:00.000Z",
  },
};

describe("source metadata", () => {
  it("round trips source metadata through the in-memory store", async () => {
    const store = new InMemoryEventStore();

    await store.upsertEvents([event]);
    await store.replaceTimeline(event.id, [atom]);

    await expect(store.getEvent(event.id)).resolves.toEqual(event);
    await expect(store.getTimeline(event.id)).resolves.toEqual([atom]);
  });

  it("round trips source metadata through SQLite storage", async () => {
    const store = new SQLiteEventStore();

    await store.upsertEvents([event]);
    await store.replaceTimeline(event.id, [atom]);

    await expect(store.getEvent(event.id)).resolves.toEqual(event);
    await expect(store.getTimeline(event.id)).resolves.toEqual([atom]);
    store.close();
  });
});
