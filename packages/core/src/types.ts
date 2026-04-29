export type EventCategory = "sports" | "news" | "other";
export type EventStatus = "scheduled" | "live" | "ended" | "unknown";
export type TimelineAtomType = "score" | "status" | "highlight" | "commentary";
export type TimelineImportance = "low" | "normal" | "high";

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
  updatedAt: string;
};

export type TimelineAtom = {
  id: string;
  eventId: string;
  time: string;
  type: TimelineAtomType;
  text: string;
  importance: TimelineImportance;
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
