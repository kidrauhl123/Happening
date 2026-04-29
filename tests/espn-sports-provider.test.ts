import { describe, expect, it } from "vitest";
import { EspnSportsProvider } from "../packages/providers/src/index.js";

const scoreboard = {
  events: [
    {
      id: "401869408",
      name: "Philadelphia 76ers at Boston Celtics",
      shortName: "PHI @ BOS",
      date: "2026-04-28T23:00Z",
      links: [{ href: "https://www.espn.com/nba/game/_/gameId/401869408" }],
      status: {
        displayClock: "5:22",
        period: 3,
        type: {
          state: "in",
          description: "In Progress",
          detail: "3rd Quarter - 5:22",
        },
      },
      competitions: [
        {
          competitors: [
            {
              homeAway: "home",
              team: { displayName: "Boston Celtics" },
              score: "97",
            },
            {
              homeAway: "away",
              team: { displayName: "Philadelphia 76ers" },
              score: "92",
            },
          ],
        },
      ],
    },
  ],
};

describe("EspnSportsProvider", () => {
  it("maps ESPN scoreboard events into Happening live events with source metadata", async () => {
    const provider = new EspnSportsProvider({
      sport: "basketball",
      league: "nba",
      fetchJson: async () => scoreboard,
      now: () => new Date("2026-04-29T11:00:00.000Z"),
    });

    const events = await provider.listLiveEvents({ sport: "basketball" });

    expect(events).toEqual([
      expect.objectContaining({
        id: "espn-basketball-nba-401869408",
        title: "Philadelphia 76ers at Boston Celtics",
        category: "sports",
        status: "live",
        sport: "basketball",
        league: "nba",
        participants: ["Boston Celtics", "Philadelphia 76ers"],
        score: {
          "Boston Celtics": 97,
          "Philadelphia 76ers": 92,
        },
        clock: "3rd Quarter - 5:22",
        source: expect.objectContaining({
          providerId: "espn:basketball:nba",
          externalId: "401869408",
          url: "https://www.espn.com/nba/game/_/gameId/401869408",
          lastSeenAt: "2026-04-29T11:00:00.000Z",
        }),
      }),
    ]);
  });

  it("returns timeline atoms derived from scoreboard status", async () => {
    const provider = new EspnSportsProvider({
      sport: "basketball",
      league: "nba",
      fetchJson: async () => scoreboard,
      now: () => new Date("2026-04-29T11:00:00.000Z"),
    });

    const timeline = await provider.getTimeline("espn-basketball-nba-401869408");

    expect(timeline).toEqual([
      expect.objectContaining({
        id: "espn-basketball-nba-401869408-status",
        eventId: "espn-basketball-nba-401869408",
        time: "3rd Quarter - 5:22",
        type: "status",
        text: "Philadelphia 76ers at Boston Celtics: 3rd Quarter - 5:22",
        importance: "normal",
      }),
    ]);
  });

  it("can include non-live scoreboard events for debugging real feeds", async () => {
    const provider = new EspnSportsProvider({
      sport: "basketball",
      league: "nba",
      includeNonLive: true,
      fetchJson: async () => ({
        events: [
          {
            ...scoreboard.events[0],
            status: { type: { state: "post", completed: true, detail: "Final" } },
          },
        ],
      }),
      now: () => new Date("2026-04-29T11:00:00.000Z"),
    });

    const events = await provider.listLiveEvents({ sport: "basketball" });

    expect(events).toEqual([expect.objectContaining({ status: "ended", clock: "Final" })]);
  });
});
