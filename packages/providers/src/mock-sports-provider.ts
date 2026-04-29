import type { Event, HappeningProvider, LiveEventQuery, TimelineAtom } from "../../core/src/index.js";

const UPDATED_AT = "2026-04-29T10:00:00.000Z";

const EVENTS: Event[] = [
  {
    id: "nba-lal-gsw-live",
    title: "Los Angeles Lakers vs Golden State Warriors",
    category: "sports",
    status: "live",
    sport: "basketball",
    league: "NBA",
    participants: ["Los Angeles Lakers", "Golden State Warriors"],
    score: {
      "Los Angeles Lakers": 88,
      "Golden State Warriors": 84,
    },
    clock: "Q4 08:12",
    updatedAt: UPDATED_AT,
  },
  {
    id: "epl-ars-mci-live",
    title: "Arsenal vs Manchester City",
    category: "sports",
    status: "live",
    sport: "football",
    league: "Premier League",
    participants: ["Arsenal", "Manchester City"],
    score: {
      Arsenal: 1,
      "Manchester City": 1,
    },
    clock: "67'",
    updatedAt: UPDATED_AT,
  },
  {
    id: "f1-monaco-gp-live",
    title: "Monaco Grand Prix",
    category: "sports",
    status: "live",
    sport: "f1",
    league: "Formula 1",
    participants: ["VER", "NOR", "LEC"],
    score: {
      P1: "VER",
      P2: "NOR",
      P3: "LEC",
    },
    clock: "Lap 42/78",
    updatedAt: UPDATED_AT,
  },
];

const TIMELINES: Record<string, TimelineAtom[]> = {
  "nba-lal-gsw-live": [
    {
      id: "nba-lal-gsw-live-001",
      eventId: "nba-lal-gsw-live",
      time: "Q4 08:12",
      type: "score",
      text: "Lakers lead 88-84 after a transition three.",
      importance: "high",
    },
    {
      id: "nba-lal-gsw-live-002",
      eventId: "nba-lal-gsw-live",
      time: "Q4 09:01",
      type: "highlight",
      text: "Warriors cut the deficit to one possession.",
      importance: "normal",
    },
  ],
  "epl-ars-mci-live": [
    {
      id: "epl-ars-mci-live-001",
      eventId: "epl-ars-mci-live",
      time: "67'",
      type: "status",
      text: "Both sides are pushing for a late winner.",
      importance: "normal",
    },
  ],
  "f1-monaco-gp-live": [
    {
      id: "f1-monaco-gp-live-001",
      eventId: "f1-monaco-gp-live",
      time: "Lap 42/78",
      type: "commentary",
      text: "The leading group is holding position after the pit cycle.",
      importance: "normal",
    },
  ],
};

export class MockSportsProvider implements HappeningProvider {
  async listLiveEvents(query: LiveEventQuery = {}): Promise<Event[]> {
    return EVENTS.filter((event) => {
      if (query.category && event.category !== query.category) return false;
      if (query.sport && event.sport !== query.sport) return false;
      return event.status === "live";
    });
  }

  async getEvent(eventId: string): Promise<Event | undefined> {
    return EVENTS.find((event) => event.id === eventId);
  }

  async getTimeline(eventId: string): Promise<TimelineAtom[]> {
    return TIMELINES[eventId] ?? [];
  }
}
