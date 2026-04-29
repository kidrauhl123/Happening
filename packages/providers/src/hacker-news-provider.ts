import type { Event, HappeningProvider, LiveEventQuery, TimelineAtom } from "../../core/src/index.js";

type FetchJson = (url: string) => Promise<unknown>;

export type HackerNewsProviderOptions = {
  searchUrl?: string;
  hitsPerPage?: number;
  fetchJson?: FetchJson;
  now?: () => Date;
};

type HackerNewsSearchResponse = {
  hits?: HackerNewsHit[];
};

type HackerNewsHit = {
  objectID?: string;
  title?: string;
  story_title?: string;
  url?: string;
  story_url?: string;
  author?: string;
  points?: number;
  num_comments?: number;
  created_at?: string;
};

const DEFAULT_SEARCH_URL = "https://hn.algolia.com/api/v1/search_by_date";
const DEFAULT_HITS_PER_PAGE = 40;

export class HackerNewsProvider implements HappeningProvider {
  private readonly searchUrl: string;
  private readonly hitsPerPage: number;
  private readonly fetchJson: FetchJson;
  private readonly now: () => Date;

  constructor(options: HackerNewsProviderOptions = {}) {
    this.searchUrl = options.searchUrl ?? DEFAULT_SEARCH_URL;
    this.hitsPerPage = options.hitsPerPage ?? DEFAULT_HITS_PER_PAGE;
    this.fetchJson = options.fetchJson ?? defaultFetchJson;
    this.now = options.now ?? (() => new Date());
  }

  async listLiveEvents(query: LiveEventQuery = {}): Promise<Event[]> {
    if (query.category && query.category !== "tech") return [];
    const response = await this.loadStories();
    return (response.hits ?? [])
      .map((hit) => this.toEvent(hit))
      .filter((event): event is Event => event !== undefined)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }

  async getEvent(eventId: string): Promise<Event | undefined> {
    const events = await this.listLiveEvents({ category: "tech" });
    return events.find((event) => event.id === eventId);
  }

  async getTimeline(eventId: string): Promise<TimelineAtom[]> {
    const event = await this.getEvent(eventId);
    if (!event) return [];
    const points = event.score?.points ?? "unknown";
    const comments = event.score?.comments ?? "unknown";
    return [
      {
        id: `${event.id}-hn-discussion`,
        eventId: event.id,
        time: event.updatedAt,
        type: "observation",
        text: `Hacker News discussion: ${points} points and ${comments} comments for ${event.title}.`,
        importance: typeof event.score?.points === "number" && event.score.points >= 300 ? "high" : "normal",
        source: event.source,
      },
    ];
  }

  private async loadStories(): Promise<HackerNewsSearchResponse> {
    const url = new URL(this.searchUrl);
    url.searchParams.set("tags", "story");
    url.searchParams.set("hitsPerPage", String(this.hitsPerPage));
    return this.fetchJson(url.toString()) as Promise<HackerNewsSearchResponse>;
  }

  private toEvent(hit: HackerNewsHit): Event | undefined {
    if (!hit.objectID || !hit.created_at) return undefined;
    const title = hit.title ?? hit.story_title;
    if (!title) return undefined;
    const lastSeenAt = this.now().toISOString();
    const sourceUrl = hit.url ?? hit.story_url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`;

    return {
      id: `hackernews-story-${hit.objectID}`,
      title,
      category: "tech",
      status: "recent",
      participants: hit.author ? [hit.author] : undefined,
      score: {
        points: hit.points ?? 0,
        comments: hit.num_comments ?? 0,
      },
      source: {
        providerId: "hackernews:algolia",
        externalId: hit.objectID,
        url: sourceUrl,
        confidence: 0.8,
        lastSeenAt,
      },
      updatedAt: new Date(hit.created_at).toISOString(),
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
    throw new Error(`Hacker News request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}
