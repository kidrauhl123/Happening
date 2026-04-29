import { describe, expect, it } from "vitest";
import type { Event, TimelineAtom } from "../packages/core/src/index.js";
import { createApp } from "../apps/api/src/app.js";

const event: Event = {
  id: "api-source-live",
  title: "API Source Match",
  category: "sports",
  status: "live",
  sport: "basketball",
  updatedAt: "2026-04-29T13:10:00.000Z",
  source: {
    providerId: "fixture:sports",
    externalId: "api-game-1",
    url: "https://example.test/api-game-1",
    priority: 5,
    confidence: 0.95,
    lastSeenAt: "2026-04-29T13:10:00.000Z",
  },
};

const atom: TimelineAtom = {
  id: "api-source-live-001",
  eventId: event.id,
  time: "Q1",
  type: "status",
  text: "API exposes source metadata.",
  importance: "normal",
  source: {
    providerId: "fixture:sports",
    externalId: "api-play-1",
    lastSeenAt: "2026-04-29T13:10:00.000Z",
  },
};

describe("source metadata API", () => {
  const app = createApp({
    provider: {
      listLiveEvents: async () => [event],
      getEvent: async () => event,
      getTimeline: async () => [atom],
    },
  });

  it("exposes event and timeline source metadata", async () => {
    const eventsResponse = await app.request("/api/events/live?sport=basketball");
    const detailResponse = await app.request(`/api/events/${event.id}`);
    const timelineResponse = await app.request(`/api/events/${event.id}/timeline`);

    await expect(eventsResponse.json()).resolves.toMatchObject({
      events: [{ id: event.id, source: { providerId: "fixture:sports", externalId: "api-game-1" } }],
    });
    await expect(detailResponse.json()).resolves.toMatchObject({
      event: { id: event.id, source: { url: "https://example.test/api-game-1" } },
    });
    await expect(timelineResponse.json()).resolves.toMatchObject({
      timeline: [{ id: atom.id, source: { externalId: "api-play-1" } }],
    });
  });
});
