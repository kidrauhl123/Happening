import { describe, expect, it } from "vitest";
import type { Event, TimelineAtom } from "../packages/core/src/index.js";
import { InMemoryEventStore } from "../packages/storage/src/memory-event-store.js";

const event: Event = {
  id: "nba-live-1",
  title: "Lakers vs Warriors",
  category: "sports",
  status: "live",
  sport: "basketball",
  league: "NBA",
  participants: ["Lakers", "Warriors"],
  score: { Lakers: 101, Warriors: 99 },
  clock: "Q4 01:20",
  updatedAt: "2026-04-29T10:00:00.000Z",
};

const timeline: TimelineAtom[] = [
  {
    id: "atom-1",
    eventId: event.id,
    time: "Q4 01:20",
    type: "score",
    text: "Lakers take a two point lead.",
    importance: "high",
  },
];

describe("InMemoryEventStore", () => {
  it("upserts events and filters live events by sport", async () => {
    const store = new InMemoryEventStore();

    await store.upsertEvents([event]);
    await store.upsertEvents([{ ...event, clock: "Q4 00:59", score: { Lakers: 103, Warriors: 99 } }]);

    const events = await store.listLiveEvents({ sport: "basketball" });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ id: event.id, clock: "Q4 00:59", score: { Lakers: 103 } });
  });

  it("stores and replaces event timelines", async () => {
    const store = new InMemoryEventStore();

    await store.upsertEvents([event]);
    await store.replaceTimeline(event.id, timeline);

    const storedTimeline = await store.getTimeline(event.id);

    expect(storedTimeline).toEqual(timeline);
  });

  it("returns undefined for missing events and empty timeline for missing timelines", async () => {
    const store = new InMemoryEventStore();

    await expect(store.getEvent("missing")).resolves.toBeUndefined();
    await expect(store.getTimeline("missing")).resolves.toEqual([]);
  });
});
