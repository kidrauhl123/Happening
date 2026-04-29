import { describe, expect, it } from "vitest";
import { createApp } from "../apps/api/src/app.js";
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
