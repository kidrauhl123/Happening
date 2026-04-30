import { Hono } from "hono";
import type { Event, HappeningProvider, LiveEventQuery } from "../../../packages/core/src/index.js";
import { renderDashboardHtml } from "./dashboard.js";
import { SPORT_OPTIONS } from "./sports.js";

export type AppDependencies = {
  provider: HappeningProvider;
};

function liveEventQueryFromUrl(url: string): LiveEventQuery {
  const searchParams = new URL(url).searchParams;
  return {
    category: searchParams.get("category") as LiveEventQuery["category"] | undefined,
    sport: searchParams.get("sport") ?? undefined,
  };
}

function filterEvents(events: Event[], query: LiveEventQuery): Event[] {
  return events.filter((event) => {
    if (query.category && event.category !== query.category) return false;
    if (query.sport && event.sport !== query.sport) return false;
    return true;
  });
}

function groupHappenings(events: Event[]): { live: Event[]; recent: Event[]; upcoming: Event[] } {
  return {
    live: events.filter((event) => event.status === "live"),
    recent: events.filter((event) => event.status === "recent" || event.status === "ended"),
    upcoming: events.filter((event) => event.status === "scheduled"),
  };
}

export function createApp({ provider }: AppDependencies): Hono {
  const app = new Hono();

  app.get("/", (c) => c.html(renderDashboardHtml()));

  app.get("/health", (c) => c.json({ ok: true, service: "happening-api" }));

  app.get("/api/sports", (c) => c.json({ sports: SPORT_OPTIONS }));

  app.get("/api/events/live", async (c) => {
    const query = liveEventQueryFromUrl(c.req.url);
    const events = filterEvents(await provider.listLiveEvents(query), query);
    return c.json({ events });
  });

  app.get("/api/happenings", async (c) => {
    const query = liveEventQueryFromUrl(c.req.url);
    const events = filterEvents(await provider.listLiveEvents(query), query);
    return c.json({ events, sections: groupHappenings(events) });
  });

  app.get("/api/events/:eventId", async (c) => {
    const event = await provider.getEvent(c.req.param("eventId"));
    if (!event) {
      return c.json({ error: "event_not_found" }, 404);
    }
    return c.json({ event });
  });

  app.get("/api/events/:eventId/timeline", async (c) => {
    const eventId = c.req.param("eventId");
    const event = await provider.getEvent(eventId);
    if (!event) {
      return c.json({ error: "event_not_found" }, 404);
    }
    const timeline = await provider.getTimeline(eventId);
    return c.json({ timeline });
  });

  app.get("/api/stream/events", async (c) => {
    const query = liveEventQueryFromUrl(c.req.url);
    const events = filterEvents(await provider.listLiveEvents(query), query);
    const payload = `event: snapshot\ndata: ${JSON.stringify({ events })}\n\n`;
    return new Response(payload, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache",
        connection: "keep-alive",
      },
    });
  });

  return app;
}
