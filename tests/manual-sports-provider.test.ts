import { describe, expect, it } from "vitest";
import type { Event, TimelineAtom } from "../packages/core/src/index.js";
import { ManualSportsProvider } from "../packages/providers/src/manual-sports-provider.js";
import { InMemoryEventStore } from "../packages/storage/src/index.js";

const event: Event = {
  id: "manual-f1-live",
  title: "Manual Monaco GP",
  category: "sports",
  status: "live",
  sport: "f1",
  league: "Formula 1",
  participants: ["VER", "LEC"],
  score: { P1: "VER", P2: "LEC" },
  clock: "Lap 10/78",
  updatedAt: "2026-04-29T10:10:00.000Z",
};

const timeline: TimelineAtom[] = [
  {
    id: "manual-f1-live-001",
    eventId: event.id,
    time: "Lap 10/78",
    type: "status",
    text: "Race is green after an early safety car.",
    importance: "normal",
  },
];

describe("ManualSportsProvider", () => {
  it("syncs source snapshots into an event store", async () => {
    const store = new InMemoryEventStore();
    const provider = new ManualSportsProvider({ store, snapshots: [{ event, timeline }] });

    const result = await provider.sync();
    const events = await store.listLiveEvents({ sport: "f1" });

    expect(result).toEqual({ eventsUpserted: 1, timelinesReplaced: 1 });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ id: event.id, sport: "f1" });
    await expect(store.getTimeline(event.id)).resolves.toEqual(timeline);
  });

  it("serves provider reads from the synced store", async () => {
    const store = new InMemoryEventStore();
    const provider = new ManualSportsProvider({ store, snapshots: [{ event, timeline }] });

    await provider.sync();

    await expect(provider.getEvent(event.id)).resolves.toMatchObject({ id: event.id });
    await expect(provider.getTimeline(event.id)).resolves.toEqual(timeline);
    await expect(provider.listLiveEvents({ sport: "f1" })).resolves.toHaveLength(1);
  });
});
