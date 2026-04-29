import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import type { Event } from "../packages/core/src/index.js";
import { createProviderFromConfig } from "../apps/api/src/config.js";

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
