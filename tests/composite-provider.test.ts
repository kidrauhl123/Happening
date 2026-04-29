import { describe, expect, it } from "vitest";
import type { Event, HappeningProvider, LiveEventQuery, TimelineAtom } from "../packages/core/src/index.js";
import { CompositeProvider } from "../packages/providers/src/index.js";

function event(overrides: Partial<Event>): Event {
  return {
    id: "event-1",
    title: "Event 1",
    category: "sports",
    status: "live",
    sport: "basketball",
    updatedAt: "2026-04-29T12:00:00.000Z",
    ...overrides,
  };
}

function provider(events: Event[], timelines: Record<string, TimelineAtom[]> = {}): HappeningProvider {
  return {
    async listLiveEvents(query: LiveEventQuery = {}) {
      return events.filter((item) => {
        if (query.category && item.category !== query.category) return false;
        if (query.sport && item.sport !== query.sport) return false;
        return item.status === "live" || item.status === "scheduled" || item.status === "ended";
      });
    },
    async getEvent(eventId: string) {
      return events.find((item) => item.id === eventId);
    },
    async getTimeline(eventId: string) {
      return timelines[eventId] ?? [];
    },
  };
}

describe("CompositeProvider", () => {
  it("aggregates events from multiple providers", async () => {
    const composite = new CompositeProvider([
      provider([event({ id: "nba-1", sport: "basketball", league: "nba" })]),
      provider([event({ id: "epl-1", sport: "soccer", league: "eng.1" })]),
    ]);

    const events = await composite.listLiveEvents();

    expect(events.map((item) => item.id)).toEqual(["nba-1", "epl-1"]);
  });

  it("filters aggregated events by sport", async () => {
    const composite = new CompositeProvider([
      provider([event({ id: "nba-1", sport: "basketball" })]),
      provider([event({ id: "epl-1", sport: "soccer" })]),
    ]);

    const events = await composite.listLiveEvents({ sport: "soccer" });

    expect(events.map((item) => item.id)).toEqual(["epl-1"]);
  });

  it("finds event detail and timeline from whichever provider owns the event", async () => {
    const timeline: TimelineAtom = {
      id: "epl-1-status",
      eventId: "epl-1",
      time: "Final",
      type: "status",
      text: "Match finished",
      importance: "normal",
    };
    const composite = new CompositeProvider([
      provider([event({ id: "nba-1", sport: "basketball" })]),
      provider([event({ id: "epl-1", sport: "soccer" })], { "epl-1": [timeline] }),
    ]);

    await expect(composite.getEvent("epl-1")).resolves.toEqual(expect.objectContaining({ id: "epl-1" }));
    await expect(composite.getTimeline("epl-1")).resolves.toEqual([timeline]);
  });
});
