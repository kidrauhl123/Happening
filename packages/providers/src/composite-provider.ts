import type { Event, HappeningProvider, LiveEventQuery, TimelineAtom } from "../../core/src/index.js";

export class CompositeProvider implements HappeningProvider {
  private readonly providers: HappeningProvider[];

  constructor(providers: HappeningProvider[]) {
    this.providers = providers;
  }

  async listLiveEvents(query: LiveEventQuery = {}): Promise<Event[]> {
    const eventGroups = await Promise.all(this.providers.map((provider) => provider.listLiveEvents(query)));
    return eventGroups.flat();
  }

  async getEvent(eventId: string): Promise<Event | undefined> {
    for (const provider of this.providers) {
      const event = await provider.getEvent(eventId);
      if (event) return event;
    }
    return undefined;
  }

  async getTimeline(eventId: string): Promise<TimelineAtom[]> {
    for (const provider of this.providers) {
      const event = await provider.getEvent(eventId);
      if (event) return provider.getTimeline(eventId);
    }
    return [];
  }
}
