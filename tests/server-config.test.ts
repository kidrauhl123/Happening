import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import type { Event } from "../packages/core/src/index.js";
import { DEFAULT_ESPN_SOURCES, providerConfigFromEnv, createProviderFromConfig } from "../apps/api/src/config.js";

const tempDirs: string[] = [];

async function tempPath(name: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "happening-config-test-"));
  tempDirs.push(dir);
  return join(dir, name);
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

const event: Event = {
  id: "config-fixture-live",
  title: "Config Fixture Match",
  category: "sports",
  status: "live",
  sport: "basketball",
  league: "Test League",
  participants: ["Home", "Away"],
  score: { Home: 1, Away: 0 },
  clock: "Q1",
  updatedAt: "2026-04-29T11:00:00.000Z",
};

describe("createProviderFromConfig", () => {
  it("creates an ESPN provider for public scoreboard data", async () => {
    const provider = await createProviderFromConfig({ mode: "espn", sport: "basketball", league: "nba" });

    expect(provider.constructor.name).toBe("EspnSportsProvider");
  });

  it("creates a composite ESPN provider from multiple source specs", async () => {
    const provider = await createProviderFromConfig({
      mode: "espn",
      espnSources: [
        { sport: "basketball", league: "nba" },
        { sport: "soccer", league: "eng.1" },
      ],
    });

    expect(provider.constructor.name).toBe("CompositeProvider");
  });

  it("uses a broad default ESPN source set when no single source is specified", async () => {
    const provider = await createProviderFromConfig({ mode: "espn" });

    expect(provider.constructor.name).toBe("CompositeProvider");
    expect(DEFAULT_ESPN_SOURCES).toContainEqual({ sport: "lacrosse", league: "mens-college-lacrosse" });
    expect(DEFAULT_ESPN_SOURCES).toContainEqual({ sport: "volleyball", league: "mens-college-volleyball" });
    expect(DEFAULT_ESPN_SOURCES).toContainEqual({ sport: "golf", league: "lpga" });
    expect(DEFAULT_ESPN_SOURCES).toContainEqual({ sport: "soccer", league: "uefa.europa" });
  });

  it("covers major non-US soccer regions and international tournaments by default", () => {
    expect(DEFAULT_ESPN_SOURCES).toEqual(
      expect.arrayContaining([
        { sport: "soccer", league: "bra.1" },
        { sport: "soccer", league: "arg.1" },
        { sport: "soccer", league: "jpn.1" },
        { sport: "soccer", league: "chn.1" },
        { sport: "soccer", league: "aus.1" },
        { sport: "soccer", league: "ind.1" },
        { sport: "soccer", league: "tha.1" },
        { sport: "soccer", league: "idn.1" },
        { sport: "soccer", league: "conmebol.libertadores" },
        { sport: "soccer", league: "afc.champions" },
        { sport: "soccer", league: "caf.champions" },
      ]),
    );
  });

  it("adds real non-sports providers to world mode", async () => {
    const provider = await createProviderFromConfig({ mode: "world" });

    expect(provider.constructor.name).toBe("CompositeProvider");
    expect((provider as { providers?: unknown[] }).providers?.map((child) => child?.constructor?.name)).toContain("HackerNewsProvider");
    expect((provider as { providers?: unknown[] }).providers?.map((child) => child?.constructor?.name)).toContain("UsgsEarthquakeProvider");
  });

  it("parses an ESPN dates window from env for completed schedules", () => {
    const config = providerConfigFromEnv({
      HAPPENING_PROVIDER_MODE: "espn",
      HAPPENING_INCLUDE_NON_LIVE: "true",
      HAPPENING_ESPN_DATES: "20260401-20260429",
      HAPPENING_ESPN_LIMIT: "300",
    });

    expect(config).toMatchObject({
      mode: "espn",
      includeNonLive: true,
      espnDates: "20260401-20260429",
      espnLimit: 300,
    });
  });

  it("creates the default mock provider", async () => {
    const provider = await createProviderFromConfig({ mode: "mock" });

    const events = await provider.listLiveEvents({ sport: "basketball" });

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].sport).toBe("basketball");
  });

  it("creates a fixture provider backed by SQLite storage", async () => {
    const databasePath = await tempPath("happening.db");
    const fixturePath = await tempPath("sports-fixture.json");
    await writeFile(fixturePath, JSON.stringify({ snapshots: [{ event, timeline: [] }] }), "utf8");

    const provider = await createProviderFromConfig({ mode: "fixture", databasePath, fixturePath });

    await expect(provider.listLiveEvents({ sport: "basketball" })).resolves.toEqual([event]);
  });
});
