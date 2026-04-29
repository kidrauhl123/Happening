import { describe, expect, it } from "vitest";
import type { ProviderSyncResult, ProviderSyncStatus } from "../packages/core/src/index.js";
import { SyncWorker } from "../apps/worker/src/sync-worker.js";

class RecordingStatusStore {
  statuses: ProviderSyncStatus[] = [];

  async recordSyncStatus(status: ProviderSyncStatus): Promise<void> {
    this.statuses.push(status);
  }
}

describe("SyncWorker", () => {
  it("runs provider sync once and records success status", async () => {
    const statusStore = new RecordingStatusStore();
    const result: ProviderSyncResult = { eventsUpserted: 3, timelinesReplaced: 2 };
    const worker = new SyncWorker({
      providerId: "fixture:sports",
      provider: { sync: async () => result },
      statusStore,
      now: (() => {
        const values = ["2026-04-29T12:00:00.000Z", "2026-04-29T12:00:01.000Z"];
        return () => values.shift() ?? "2026-04-29T12:00:01.000Z";
      })(),
    });

    await expect(worker.runOnce()).resolves.toEqual(result);

    expect(statusStore.statuses).toEqual([
      {
        providerId: "fixture:sports",
        status: "success",
        startedAt: "2026-04-29T12:00:00.000Z",
        finishedAt: "2026-04-29T12:00:01.000Z",
        eventsUpserted: 3,
        timelinesReplaced: 2,
      },
    ]);
  });

  it("records error status and rethrows sync failures", async () => {
    const statusStore = new RecordingStatusStore();
    const worker = new SyncWorker({
      providerId: "fixture:sports",
      provider: {
        sync: async () => {
          throw new Error("fixture missing");
        },
      },
      statusStore,
      now: (() => {
        const values = ["2026-04-29T12:10:00.000Z", "2026-04-29T12:10:01.000Z"];
        return () => values.shift() ?? "2026-04-29T12:10:01.000Z";
      })(),
    });

    await expect(worker.runOnce()).rejects.toThrow("fixture missing");
    expect(statusStore.statuses).toEqual([
      {
        providerId: "fixture:sports",
        status: "error",
        startedAt: "2026-04-29T12:10:00.000Z",
        finishedAt: "2026-04-29T12:10:01.000Z",
        eventsUpserted: 0,
        timelinesReplaced: 0,
        error: "fixture missing",
      },
    ]);
  });
});
