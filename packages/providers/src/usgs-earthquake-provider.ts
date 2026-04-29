import type { Event, HappeningProvider, LiveEventQuery, TimelineAtom } from "../../core/src/index.js";

type FetchJson = (url: string) => Promise<unknown>;

export type UsgsEarthquakeProviderOptions = {
  feedUrl?: string;
  fetchJson?: FetchJson;
  now?: () => Date;
};

type UsgsFeed = {
  features?: UsgsFeature[];
};

type UsgsFeature = {
  id?: string;
  properties?: {
    mag?: number;
    place?: string;
    time?: number;
    updated?: number;
    url?: string;
    title?: string;
  };
  geometry?: {
    coordinates?: [number, number, number?];
  };
};

const DEFAULT_FEED_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";

export class UsgsEarthquakeProvider implements HappeningProvider {
  private readonly feedUrl: string;
  private readonly fetchJson: FetchJson;
  private readonly now: () => Date;

  constructor(options: UsgsEarthquakeProviderOptions = {}) {
    this.feedUrl = options.feedUrl ?? DEFAULT_FEED_URL;
    this.fetchJson = options.fetchJson ?? defaultFetchJson;
    this.now = options.now ?? (() => new Date());
  }

  async listLiveEvents(query: LiveEventQuery = {}): Promise<Event[]> {
    if (query.category && query.category !== "earthquake") return [];
    const feed = await this.loadFeed();
    return (feed.features ?? [])
      .map((feature) => this.toEvent(feature))
      .filter((event): event is Event => event !== undefined)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }

  async getEvent(eventId: string): Promise<Event | undefined> {
    const events = await this.listLiveEvents({ category: "earthquake" });
    return events.find((event) => event.id === eventId);
  }

  async getTimeline(eventId: string): Promise<TimelineAtom[]> {
    const event = await this.getEvent(eventId);
    if (!event) return [];
    return [
      {
        id: `${event.id}-observed`,
        eventId: event.id,
        time: event.updatedAt,
        type: "observation",
        text: `USGS recorded M ${event.magnitude ?? "unknown"} earthquake near ${event.region ?? event.title}.`,
        importance: (event.magnitude ?? 0) >= 5 ? "high" : "normal",
        source: event.source,
      },
    ];
  }

  private async loadFeed(): Promise<UsgsFeed> {
    return this.fetchJson(this.feedUrl) as Promise<UsgsFeed>;
  }

  private toEvent(feature: UsgsFeature): Event | undefined {
    if (!feature.id || typeof feature.properties?.time !== "number") return undefined;
    const properties = feature.properties;
    const observedAt = properties.time as number;
    const [longitude, latitude, depthKm] = feature.geometry?.coordinates ?? [];
    const lastSeenAt = this.now().toISOString();
    const title = properties.title ?? `M ${properties.mag ?? "unknown"} earthquake near ${properties.place ?? "unknown location"}`;

    return {
      id: `usgs-earthquake-${feature.id}`,
      title,
      category: "earthquake",
      status: "recent",
      region: properties.place,
      magnitude: properties.mag,
      coordinates: typeof longitude === "number" && typeof latitude === "number" ? { longitude, latitude, depthKm } : undefined,
      source: {
        providerId: "usgs:earthquake",
        externalId: feature.id,
        url: properties.url,
        confidence: 0.9,
        lastSeenAt,
      },
      updatedAt: new Date(observedAt).toISOString(),
    };
  }
}

async function defaultFetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      accept: "application/geo+json, application/json",
      "user-agent": "Happening/0.1 (+https://github.com/kidrauhl123/Happening)",
    },
  });
  if (!response.ok) {
    throw new Error(`USGS earthquake request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}
