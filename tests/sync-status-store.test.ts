import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { SQLiteEventStore } from "../packages/storage/src/index.js";

const tempDirs: string[] = [];

async function tempDbPath(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "happening-sync-status-test-"));
  tempDirs.push(dir);
  return join(dir, "happening.db");
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("SQLiteEventStore sync status", () => {
  it("records and reads provider sync success status", async () => {
    const store = new SQLiteEventStore({ path: await tempDbPath() });
    const finishedAt = "2026-04-29T12:00:00.000Z";

    await store.recordSyncStatus({
      providerId: "fixture:sports",
      status: "success",
      startedAt: "2026-04-29T11:59:59.000Z",
      finishedAt,
      eventsUpserted: 2,
      timelinesReplaced: 2,
    });

    await expect(store.getSyncStatus("fixture:sports")).resolves.toEqual({
      providerId: "fixture:sports",
      status: "success",
      startedAt: "2026-04-29T11:59:59.000Z",
      finishedAt,
      eventsUpserted: 2,
      timelinesReplaced: 2,
    });
    store.close();
  });

  it("records sync errors and persists them after reopening", async () => {
    const databasePath = await tempDbPath();
    const store = new SQLiteEventStore({ path: databasePath });

    await store.recordSyncStatus({
      providerId: "fixture:sports",
      status: "error",
      startedAt: "2026-04-29T12:10:00.000Z",
      finishedAt: "2026-04-29T12:10:01.000Z",
      eventsUpserted: 0,
      timelinesReplaced: 0,
      error: "fixture missing",
    });
    store.close();

    const reopened = new SQLiteEventStore({ path: databasePath });
    await expect(reopened.getSyncStatus("fixture:sports")).resolves.toMatchObject({
      providerId: "fixture:sports",
      status: "error",
      error: "fixture missing",
    });
    reopened.close();
  });
});
