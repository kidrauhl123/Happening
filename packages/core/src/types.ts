export type EventCategory = "sports" | "earthquake" | "news" | "markets" | "tech" | "weather" | "space" | "other";
export type EventStatus = "scheduled" | "live" | "recent" | "ended" | "unknown";
export type TimelineAtomType = "score" | "status" | "highlight" | "commentary" | "observation";
export type TimelineImportance = "low" | "normal" | "high";

export type SourceMetadata = {
  providerId: string;
  externalId?: string;
  url?: string;
  priority?: number;
  confidence?: number;
  firstSeenAt?: string;
  lastSeenAt: string;
};

export type Event = {
  id: string;
  title: string;
  category: EventCategory;
  status: EventStatus;
  sport?: string;
  league?: string;
  participants?: string[];
  score?: Record<string, number | string>;
  clock?: string;
  startsAt?: string;
  region?: string;
  magnitude?: number;
  coordinates?: { longitude: number; latitude: number; depthKm?: number };
  source?: SourceMetadata;
  updatedAt: string;
};

export type TimelineAtom = {
  id: string;
  eventId: string;
  time: string;
  type: TimelineAtomType;
  text: string;
  importance: TimelineImportance;
  source?: SourceMetadata;
};

export type LiveEventQuery = {
  category?: EventCategory;
  sport?: string;
};

export type ProviderSyncResult = {
  eventsUpserted: number;
  timelinesReplaced: number;
};

export type SyncStatusValue = "success" | "error";

export type ProviderSyncStatus = ProviderSyncResult & {
  providerId: string;
  status: SyncStatusValue;
  startedAt: string;
  finishedAt: string;
  error?: string;
};

export interface HappeningProvider {
  listLiveEvents(query?: LiveEventQuery): Promise<Event[]>;
  getEvent(eventId: string): Promise<Event | undefined>;
  getTimeline(eventId: string): Promise<TimelineAtom[]>;
}

export interface EventStore extends HappeningProvider {
  upsertEvents(events: Event[]): Promise<void>;
  replaceTimeline(eventId: string, timeline: TimelineAtom[]): Promise<void>;
}
