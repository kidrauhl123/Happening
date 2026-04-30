import type { Event, HappeningProvider, LiveEventQuery, TimelineAtom } from "../../core/src/index.js";

type FetchText = (url: string) => Promise<string>;

export type SnookerOrgProviderOptions = {
  liveScoresUrl?: string;
  fetchText?: FetchText;
  now?: () => Date;
};

const DEFAULT_LIVE_SCORES_URL = "https://www.snooker.org/res/index.asp?event=2214";

export class SnookerOrgProvider implements HappeningProvider {
  private readonly liveScoresUrl: string;
  private readonly fetchText: FetchText;
  private readonly now: () => Date;

  constructor(options: SnookerOrgProviderOptions = {}) {
    this.liveScoresUrl = options.liveScoresUrl ?? DEFAULT_LIVE_SCORES_URL;
    this.fetchText = options.fetchText ?? defaultFetchText;
    this.now = options.now ?? (() => new Date());
  }

  async listLiveEvents(query: LiveEventQuery = {}): Promise<Event[]> {
    if (query.category && query.category !== "sports") return [];
    if (query.sport && query.sport !== "snooker") return [];

    const html = await this.fetchText(this.liveScoresUrl);
    return this.parseLiveScores(html);
  }

  async getEvent(eventId: string): Promise<Event | undefined> {
    const events = await this.listLiveEvents({ sport: "snooker" });
    return events.find((event) => event.id === eventId);
  }

  async getTimeline(eventId: string): Promise<TimelineAtom[]> {
    const event = await this.getEvent(eventId);
    if (!event) return [];
    const [playerOne, playerTwo] = event.participants ?? ["Player one", "Player two"];
    const scoreOne = event.score?.[playerOne] ?? "?";
    const scoreTwo = event.score?.[playerTwo] ?? "?";
    const leader = typeof scoreOne === "number" && typeof scoreTwo === "number" && scoreOne !== scoreTwo ? (scoreOne > scoreTwo ? playerOne : playerTwo) : undefined;
    const trailing = leader === playerOne ? playerTwo : playerOne;
    const scoreText = leader
      ? `World Championship quarterfinal live: ${leader} leads ${trailing} ${Math.max(Number(scoreOne), Number(scoreTwo))}-${Math.min(Number(scoreOne), Number(scoreTwo))} in a best-of-${event.score?.bestOf ?? "?"} match.`
      : `World Championship quarterfinal live: ${playerOne} and ${playerTwo} are level at ${scoreOne}-${scoreTwo}.`;

    return [
      {
        id: `${event.id}-score`,
        eventId: event.id,
        time: event.updatedAt,
        type: "score",
        text: scoreText,
        importance: "high",
        source: event.source,
      },
    ];
  }

  private parseLiveScores(html: string): Event[] {
    const events: Event[] = [];
    const now = this.now();
    const nowIso = now.toISOString();
    const pageEventId = matchFirst(this.liveScoresUrl, /[?&]event=(\d+)/i);
    const pageEventName = stripTags(decodeHtml(matchFirst(html, /<h1[^>]*>[\s\S]*?<span\s+class=["']name["'][^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/h1>/i) ?? "")).trim();
    const sections = html.split(/<thead\b/i).slice(1);

    for (const section of sections) {
      const eventId = matchFirst(section, /<a\s+name=["']event(\d+)["']/i) ?? pageEventId;
      const rawEventTitle = matchFirst(section, /<a\s+class=["']title["'][^>]*>([\s\S]*?)<\/a>/i);
      const eventName = stripTags(decodeHtml(rawEventTitle ?? pageEventName)).replace(/\s*\([^)]*\)\s*$/, "").trim();
      if (!eventId || !eventName) continue;

      const roundFromHeader = stripTags(decodeHtml(matchFirst(section, /<span\s+class=["']round["'][^>]*>([\s\S]*?)<\/span>/i) ?? "")).trim();
      const bestOfFromHeader = parseNumber(matchFirst(section, /Best of\s+(\d+)/i));
      const body = section.split(/<thead\b/i)[0];
      const rows = body.match(/<tr\b[^>]*\boneonone\b[^>]*>[\s\S]*?<\/tr>/gi) ?? body.match(/<tr\b[^>]*\bunfinished\b[^>]*>[\s\S]*?<\/tr>/gi) ?? [];

      for (const row of rows) {
        const rowRound = stripTags(decodeHtml(matchFirst(row, /<td\s+class=["']round["'][^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i) ?? "")).trim();
        const round = rowRound || roundFromHeader || "Round";
        const bestOf = parseNumber(matchFirst(row, /Best of\s+(\d+)\s+frames/i)) ?? bestOfFromHeader;
        const players = [...row.matchAll(/<td\s+class=["']player[^"']*["'][^>]*>[\s\S]*?<a[^>]*title=["']([^"']+)["'][^>]*>/gi)].map((match) => decodeHtml(match[1]).trim());
        const rawScores = [...row.matchAll(/<td\s+class=["'][^"']*(?:first-score|last-score|\bscore\b)[^"']*["'][^>]*>([\s\S]*?)<\/td>/gi)]
          .map((match) => parseNumber(stripTags(decodeHtml(match[1]))))
          .filter((score): score is number => score !== undefined);
        if (players.length < 2) continue;

        const startsAt = parseSnookerOrgDate(matchFirst(row, /<span\s+class=["']scheduled["'][^>]*>([^<]+)<\/span>/i));
        const hasNumericScore = rawScores.length > 0;
        const scores = [rawScores[0] ?? 0, rawScores[1] ?? 0];
        if (!hasNumericScore && !startsAt) continue;

        const detailsUrl = matchFirst(row, /<a\s+class=["']scores["'][^>]*href=["']([^"']+)["']/i);
        const externalId = `${eventId}-${slugify(round) || "round"}-${slugify(players[0])}-${slugify(players[1])}`;
        const status = rowStatus(row, startsAt, hasNumericScore, now);
        const clockParts = [round];
        if (startsAt && status === "live") clockParts.push(`session started ${formatUtcMinute(startsAt)}`);
        if (startsAt && status === "scheduled") clockParts.push(`starts ${formatUtcMinute(startsAt)}`);
        if (bestOf) clockParts.push(`best of ${bestOf} frames`);

        events.push({
          id: `snooker-org-${externalId}`,
          title: `${eventName} ${round}: ${players[0]} vs ${players[1]}`,
          category: "sports",
          sport: "snooker",
          league: "World Snooker Tour",
          status,
          participants: [players[0], players[1]],
          score: {
            [players[0]]: scores[0],
            [players[1]]: scores[1],
            ...(bestOf ? { bestOf } : {}),
          },
          clock: clockParts.join(" · "),
          ...(startsAt ? { startsAt: startsAt.toISOString() } : {}),
          source: {
            providerId: "snooker.org:live",
            externalId,
            url: detailsUrl ?? this.liveScoresUrl,
            confidence: 0.75,
            lastSeenAt: nowIso,
          },
          updatedAt: nowIso,
        });
      }
    }

    return events;
  }
}

async function defaultFetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "Happening/0.1 (+https://github.com/kidrauhl123/Happening)",
    },
  });
  if (!response.ok) {
    throw new Error(`snooker.org live scores request failed: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function matchFirst(value: string, pattern: RegExp): string | undefined {
  return pattern.exec(value)?.[1];
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseSnookerOrgDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const normalized = decodeHtml(value).trim().replace(/\s+/g, " ");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function rowStatus(row: string, startsAt: Date | undefined, hasNumericScore: boolean, now: Date): Event["status"] {
  if (/\bunfinished\b|\blatestmod\b/i.test(row)) return "live";
  if (!startsAt) return hasNumericScore ? "recent" : "unknown";
  if (now.getTime() < startsAt.getTime()) return "scheduled";
  const liveWindowMs = 8 * 60 * 60 * 1000;
  if (now.getTime() - startsAt.getTime() <= liveWindowMs) return "live";
  return hasNumericScore ? "recent" : "unknown";
}

function formatUtcMinute(value: Date): string {
  return value.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim();
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&#8209;/g, "‑")
    .replace(/&pound;/g, "£")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
