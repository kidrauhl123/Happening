import { Hono } from "hono";
import type { HappeningProvider, LiveEventQuery } from "../../../packages/core/src/index.js";
import { renderDashboardHtml } from "./dashboard.js";

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

export function createApp({ provider }: AppDependencies): Hono {
  const app = new Hono();

  app.get("/", (c) => c.html(renderDashboardHtml()));

  app.get("/health", (c) => c.json({ ok: true, service: "happening-api" }));

  app.get("/api/events/live", async (c) => {
    const events = await provider.listLiveEvents(liveEventQueryFromUrl(c.req.url));
    return c.json({ events });
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
    const events = await provider.listLiveEvents(query);
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
