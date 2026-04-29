import type { Event, EventStore, LiveEventQuery, TimelineAtom } from "../../core/src/index.js";

export class InMemoryEventStore implements EventStore {
  private readonly events = new Map<string, Event>();
  private readonly timelines = new Map<string, TimelineAtom[]>();

  async upsertEvents(events: Event[]): Promise<void> {
    for (const event of events) {
      this.events.set(event.id, structuredClone(event));
    }
  }

  async replaceTimeline(eventId: string, timeline: TimelineAtom[]): Promise<void> {
    this.timelines.set(eventId, structuredClone(timeline));
  }

  async listLiveEvents(query: LiveEventQuery = {}): Promise<Event[]> {
    return Array.from(this.events.values())
      .filter((event) => event.status === "live")
      .filter((event) => !query.category || event.category === query.category)
      .filter((event) => !query.sport || event.sport === query.sport)
      .map((event) => structuredClone(event));
  }

  async getEvent(eventId: string): Promise<Event | undefined> {
    const event = this.events.get(eventId);
    return event ? structuredClone(event) : undefined;
  }

  async getTimeline(eventId: string): Promise<TimelineAtom[]> {
    return structuredClone(this.timelines.get(eventId) ?? []);
  }
}
