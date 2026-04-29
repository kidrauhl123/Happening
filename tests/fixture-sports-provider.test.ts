import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import type { Event, TimelineAtom } from "../packages/core/src/index.js";
import { FixtureSportsProvider } from "../packages/providers/src/fixture-sports-provider.js";
import { InMemoryEventStore } from "../packages/storage/src/index.js";

const tempDirs: string[] = [];

async function tempFixturePath(payload: unknown): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "happening-fixture-test-"));
  tempDirs.push(dir);
  const filePath = join(dir, "sports-fixture.json");
  await writeFile(filePath, JSON.stringify(payload), "utf8");
  return filePath;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

const event: Event = {
  id: "fixture-tennis-live",
  title: "Alcaraz vs Sinner",
  category: "sports",
  status: "live",
  sport: "tennis",
  league: "ATP",
  participants: ["Alcaraz", "Sinner"],
  score: { Alcaraz: "6 3", Sinner: "4 2" },
  clock: "Set 2",
  updatedAt: "2026-04-29T10:30:00.000Z",
};

const timeline: TimelineAtom[] = [
  {
    id: "fixture-tennis-live-001",
    eventId: event.id,
    time: "Set 2 Game 6",
    type: "highlight",
    text: "Alcaraz breaks serve.",
    importance: "high",
  },
];

describe("FixtureSportsProvider", () => {
  it("loads snapshots from a JSON fixture and syncs them into the store", async () => {
    const fixturePath = await tempFixturePath({ snapshots: [{ event, timeline }] });
    const store = new InMemoryEventStore();
    const provider = await FixtureSportsProvider.fromFile({ filePath: fixturePath, store });

    const result = await provider.sync();

    expect(result).toEqual({ eventsUpserted: 1, timelinesReplaced: 1 });
    await expect(provider.listLiveEvents({ sport: "tennis" })).resolves.toEqual([event]);
    await expect(provider.getTimeline(event.id)).resolves.toEqual(timeline);
  });

  it("rejects invalid fixture files", async () => {
    const fixturePath = await tempFixturePath({ snapshots: "not-array" });
    const store = new InMemoryEventStore();

    await expect(FixtureSportsProvider.fromFile({ filePath: fixturePath, store })).rejects.toThrow("Fixture snapshots must be an array");
  });
});
