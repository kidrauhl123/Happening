import { describe, expect, it } from "vitest";
import { MockSportsProvider } from "../packages/providers/src/mock-sports-provider.js";

describe("MockSportsProvider", () => {
  it("returns live sports events with normalized event fields", async () => {
    const provider = new MockSportsProvider();

    const events = await provider.listLiveEvents({ sport: "basketball" });

    expect(events.length).toBeGreaterThan(0);
    expect(events.every((event) => event.category === "sports")).toBe(true);
    expect(events.every((event) => event.status === "live")).toBe(true);
    expect(events.every((event) => event.sport === "basketball")).toBe(true);
    expect(events[0]).toMatchObject({
      id: expect.any(String),
      title: expect.any(String),
      league: expect.any(String),
      clock: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it("returns a single event and its timeline atoms", async () => {
    const provider = new MockSportsProvider();
    const [event] = await provider.listLiveEvents({ sport: "basketball" });

    const detail = await provider.getEvent(event.id);
    const timeline = await provider.getTimeline(event.id);

    expect(detail?.id).toBe(event.id);
    expect(timeline.length).toBeGreaterThan(0);
    expect(timeline.every((atom) => atom.eventId === event.id)).toBe(true);
    expect(timeline[0]).toMatchObject({
      id: expect.any(String),
      eventId: event.id,
      time: expect.any(String),
      type: expect.stringMatching(/score|status|highlight|commentary/),
      text: expect.any(String),
      importance: expect.stringMatching(/low|normal|high/),
    });
  });
});
