import type { Event, EventStatus, HappeningProvider, LiveEventQuery, TimelineAtom } from "../../core/src/index.js";

type EspnFetchJson = (url: string) => Promise<unknown>;

export type EspnSportsProviderOptions = {
  sport: string;
  league: string;
  includeNonLive?: boolean;
  fetchJson?: EspnFetchJson;
  now?: () => Date;
};

type EspnScoreboard = {
  events?: EspnEvent[];
};

type EspnEvent = {
  id?: string;
  name?: string;
  shortName?: string;
  date?: string;
  links?: { href?: string }[];
  status?: {
    displayClock?: string;
    period?: number;
    type?: {
      state?: string;
      completed?: boolean;
      description?: string;
      detail?: string;
      shortDetail?: string;
    };
  };
  competitions?: {
    competitors?: {
      team?: { displayName?: string; shortDisplayName?: string; name?: string };
      score?: string;
    }[];
  }[];
};

export class EspnSportsProvider implements HappeningProvider {
  private readonly sport: string;
  private readonly league: string;
  private readonly fetchJson: EspnFetchJson;
  private readonly now: () => Date;
  private readonly includeNonLive: boolean;

  constructor(options: EspnSportsProviderOptions) {
    this.sport = options.sport;
    this.league = options.league;
    this.fetchJson = options.fetchJson ?? defaultFetchJson;
    this.now = options.now ?? (() => new Date());
    this.includeNonLive = options.includeNonLive ?? false;
  }

  async listLiveEvents(query: LiveEventQuery = {}): Promise<Event[]> {
    if (query.category && query.category !== "sports") return [];
    if (query.sport && query.sport !== this.sport) return [];

    const scoreboard = await this.loadScoreboard();
    return (scoreboard.events ?? [])
      .map((event) => this.toHappeningEvent(event))
      .filter((event): event is Event => event !== undefined)
      .filter((event) => this.includeNonLive || event.status === "live");
  }

  async getEvent(eventId: string): Promise<Event | undefined> {
    const events = await this.loadScoreboard();
    return events.events?.map((event) => this.toHappeningEvent(event)).find((event) => event?.id === eventId);
  }

  async getTimeline(eventId: string): Promise<TimelineAtom[]> {
    const event = await this.getEvent(eventId);
    if (!event) return [];

    const time = event.clock ?? event.updatedAt;
    return [
      {
        id: `${event.id}-status`,
        eventId: event.id,
        time,
        type: "status",
        text: `${event.title}: ${time}`,
        importance: event.status === "live" ? "normal" : "low",
        source: event.source,
      },
    ];
  }

  private async loadScoreboard(): Promise<EspnScoreboard> {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${encodeURIComponent(this.sport)}/${encodeURIComponent(this.league)}/scoreboard`;
    return this.fetchJson(url) as Promise<EspnScoreboard>;
  }

  private toHappeningEvent(event: EspnEvent): Event | undefined {
    if (!event.id) return undefined;

    const competitors = event.competitions?.[0]?.competitors ?? [];
    const participants = competitors
      .map((competitor) => competitor.team?.displayName ?? competitor.team?.shortDisplayName ?? competitor.team?.name)
      .filter((participant): participant is string => Boolean(participant));
    const score = Object.fromEntries(
      competitors
        .map((competitor) => {
          const name = competitor.team?.displayName ?? competitor.team?.shortDisplayName ?? competitor.team?.name;
          if (!name) return undefined;
          const numericScore = Number(competitor.score);
          return [name, Number.isFinite(numericScore) ? numericScore : (competitor.score ?? "")];
        })
        .filter((entry): entry is [string, number | string] => Boolean(entry)),
    );
    const clock = event.status?.type?.detail ?? event.status?.type?.shortDetail ?? event.status?.displayClock;
    const lastSeenAt = this.now().toISOString();

    return {
      id: `espn-${this.sport}-${this.league}-${event.id}`,
      title: event.name ?? event.shortName ?? event.id,
      category: "sports",
      status: espnStatusToHappeningStatus(event.status?.type?.state, event.status?.type?.completed),
      sport: this.sport,
      league: this.league,
      participants,
      score,
      clock,
      source: {
        providerId: `espn:${this.sport}:${this.league}`,
        externalId: event.id,
        url: event.links?.find((link) => link.href)?.href,
        confidence: 0.8,
        lastSeenAt,
      },
      updatedAt: event.date ?? lastSeenAt,
    };
  }
}

async function defaultFetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "Happening/0.1 (+https://github.com/kidrauhl123/Happening)",
    },
  });

  if (!response.ok) {
    throw new Error(`ESPN scoreboard request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function espnStatusToHappeningStatus(state: string | undefined, completed: boolean | undefined): EventStatus {
  if (state === "in") return "live";
  if (state === "pre") return "scheduled";
  if (state === "post" || completed) return "ended";
  return "unknown";
}
