import { describe, expect, it } from "vitest";
import { createApp } from "../apps/api/src/app.js";
import type { Event, HappeningProvider } from "../packages/core/src/index.js";
import { MockSportsProvider } from "../packages/providers/src/mock-sports-provider.js";

describe("Happening API", () => {
  const app = createApp({ provider: new MockSportsProvider() });

  it("responds to health checks", async () => {
    const response = await app.request("/health");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, service: "happening-api" });
  });

  it("lists configured sport filter options", async () => {
    const response = await app.request("/api/sports");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      sports: [
        { value: "basketball", label: "篮球" },
        { value: "football", label: "橄榄球" },
        { value: "baseball", label: "棒球" },
        { value: "hockey", label: "冰球" },
        { value: "soccer", label: "足球" },
        { value: "racing", label: "赛车/F1" },
        { value: "tennis", label: "网球" },
        { value: "golf", label: "高尔夫" },
        { value: "mma", label: "格斗/UFC" },
        { value: "volleyball", label: "排球" },
        { value: "lacrosse", label: "长曲棍球" },
        { value: "snooker", label: "斯诺克" },
      ],
    });
  });

  it("lists live events and supports sport filtering", async () => {
    const response = await app.request("/api/events/live?sport=basketball");

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.events.length).toBeGreaterThan(0);
    expect(body.events.every((event: { sport?: string; status: string }) => event.sport === "basketball" && event.status === "live")).toBe(true);
  });

  it("lists generalized world happenings grouped by activity section", async () => {
    const response = await app.request("/api/happenings");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      sections: {
        live: expect.any(Array),
        recent: expect.any(Array),
        upcoming: expect.any(Array),
      },
    });
  });

  it("applies sport filters after aggregation so non-sport world events do not leak into sport views", async () => {
    const mixedEvents: Event[] = [
      { id: "earthquake-1", title: "M 2.2 - Hawaii", category: "earthquake", status: "recent", updatedAt: "2026-04-30T00:00:00.000Z" },
      { id: "snooker-1", title: "World Championship: Shaun Murphy vs John Higgins", category: "sports", sport: "snooker", status: "scheduled", updatedAt: "2026-04-30T00:00:00.000Z" },
      { id: "soccer-1", title: "Barcelona SC vs Universidad Católica", category: "sports", sport: "soccer", status: "live", updatedAt: "2026-04-30T00:00:00.000Z" },
    ];
    const mixedProvider: HappeningProvider = {
      listLiveEvents: async () => mixedEvents,
      getEvent: async () => undefined,
      getTimeline: async () => [],
    };
    const filteredApp = createApp({ provider: mixedProvider });

    const response = await filteredApp.request("/api/happenings?sport=snooker");

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.events).toHaveLength(1);
    expect(body.events[0]).toMatchObject({ id: "snooker-1", sport: "snooker" });
    expect(body.sections).toMatchObject({ live: [], recent: [], upcoming: [expect.objectContaining({ id: "snooker-1" })] });
  });

  it("returns event details and timeline", async () => {
    const listResponse = await app.request("/api/events/live?sport=basketball");
    const { events } = await listResponse.json();
    const eventId = events[0].id;

    const detailResponse = await app.request(`/api/events/${eventId}`);
    const timelineResponse = await app.request(`/api/events/${eventId}/timeline`);

    expect(detailResponse.status).toBe(200);
    await expect(detailResponse.json()).resolves.toMatchObject({ event: { id: eventId } });
    expect(timelineResponse.status).toBe(200);
    const timelineBody = await timelineResponse.json();
    expect(timelineBody.timeline.length).toBeGreaterThan(0);
    expect(timelineBody.timeline.every((atom: { eventId: string }) => atom.eventId === eventId)).toBe(true);
  });

  it("returns 404 for unknown events", async () => {
    const response = await app.request("/api/events/missing-event");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: "event_not_found" });
  });

  it("streams live events as server-sent events", async () => {
    const response = await app.request("/api/stream/events?sport=basketball&once=true");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    const text = await response.text();
    expect(text).toContain("event: snapshot");
    expect(text).toContain("data:");
    expect(text).toContain("basketball");
  });
});
