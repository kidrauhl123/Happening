import { describe, expect, it } from "vitest";
import { HackerNewsProvider } from "../packages/providers/src/index.js";

const hnResponse = {
  hits: [
    {
      objectID: "44123456",
      title: "SQLite on the edge gets faster",
      url: "https://example.com/sqlite-edge",
      author: "pguyot",
      points: 428,
      num_comments: 97,
      created_at: "2026-04-29T13:10:00.000Z",
    },
  ],
};

describe("HackerNewsProvider", () => {
  it("maps recent Hacker News stories into tech happenings", async () => {
    const requestedUrls: string[] = [];
    const provider = new HackerNewsProvider({
      hitsPerPage: 25,
      fetchJson: async (url) => {
        requestedUrls.push(url);
        return hnResponse;
      },
      now: () => new Date("2026-04-29T13:20:00.000Z"),
    });

    const events = await provider.listLiveEvents({ category: "tech" });

    expect(requestedUrls[0]).toContain("tags=story");
    expect(requestedUrls[0]).toContain("hitsPerPage=25");
    expect(events).toEqual([
      expect.objectContaining({
        id: "hackernews-story-44123456",
        title: "SQLite on the edge gets faster",
        category: "tech",
        status: "recent",
        participants: ["pguyot"],
        score: { points: 428, comments: 97 },
        updatedAt: "2026-04-29T13:10:00.000Z",
        source: expect.objectContaining({
          providerId: "hackernews:algolia",
          externalId: "44123456",
          url: "https://example.com/sqlite-edge",
          lastSeenAt: "2026-04-29T13:20:00.000Z",
        }),
      }),
    ]);
  });

  it("returns a timeline atom for a Hacker News story", async () => {
    const provider = new HackerNewsProvider({
      fetchJson: async () => hnResponse,
      now: () => new Date("2026-04-29T13:20:00.000Z"),
    });

    const timeline = await provider.getTimeline("hackernews-story-44123456");

    expect(timeline).toEqual([
      expect.objectContaining({
        id: "hackernews-story-44123456-hn-discussion",
        eventId: "hackernews-story-44123456",
        time: "2026-04-29T13:10:00.000Z",
        type: "observation",
        importance: "high",
        text: "Hacker News discussion: 428 points and 97 comments for SQLite on the edge gets faster.",
      }),
    ]);
  });

  it("does not return stories for non-tech category queries", async () => {
    const provider = new HackerNewsProvider({ fetchJson: async () => hnResponse });

    await expect(provider.listLiveEvents({ category: "earthquake" })).resolves.toEqual([]);
  });
});
