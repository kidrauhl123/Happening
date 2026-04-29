import type {
  Event,
  EventStore,
  HappeningProvider,
  LiveEventQuery,
  ProviderSyncResult,
  TimelineAtom,
} from "../../core/src/index.js";

export type SportsSnapshot = {
  event: Event;
  timeline?: TimelineAtom[];
};

export type ManualSportsProviderOptions = {
  store: EventStore;
  snapshots: SportsSnapshot[];
};

export class ManualSportsProvider implements HappeningProvider {
  private readonly store: EventStore;
  private readonly snapshots: SportsSnapshot[];

  constructor({ store, snapshots }: ManualSportsProviderOptions) {
    this.store = store;
    this.snapshots = snapshots;
  }

  async sync(): Promise<ProviderSyncResult> {
    await this.store.upsertEvents(this.snapshots.map((snapshot) => snapshot.event));

    let timelinesReplaced = 0;
    for (const snapshot of this.snapshots) {
      if (snapshot.timeline) {
        await this.store.replaceTimeline(snapshot.event.id, snapshot.timeline);
        timelinesReplaced += 1;
      }
    }

    return {
      eventsUpserted: this.snapshots.length,
      timelinesReplaced,
    };
  }

  async listLiveEvents(query: LiveEventQuery = {}): Promise<Event[]> {
    return this.store.listLiveEvents(query);
  }

  async getEvent(eventId: string): Promise<Event | undefined> {
    return this.store.getEvent(eventId);
  }

  async getTimeline(eventId: string): Promise<TimelineAtom[]> {
    return this.store.getTimeline(eventId);
  }
}
