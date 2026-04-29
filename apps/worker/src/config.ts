import { FixtureSportsProvider } from "../../../packages/providers/src/index.js";
import { SQLiteEventStore } from "../../../packages/storage/src/index.js";
import type { SyncStatusStore, SyncableProvider } from "./sync-worker.js";

export type WorkerConfig = {
  providerId: string;
  databasePath: string;
  fixturePath: string;
  intervalMs: number;
  once: boolean;
};

export type WorkerRuntime = {
  provider: SyncableProvider;
  statusStore: SyncStatusStore;
  close(): void;
};

export function workerConfigFromEnv(env: NodeJS.ProcessEnv = process.env): WorkerConfig {
  return {
    providerId: env.HAPPENING_PROVIDER_ID ?? "fixture:sports",
    databasePath: env.HAPPENING_DB_PATH ?? "./data/happening.db",
    fixturePath: env.HAPPENING_FIXTURE_PATH ?? "./data/sports-fixture.json",
    intervalMs: Number.parseInt(env.HAPPENING_SYNC_INTERVAL_MS ?? "30000", 10),
    once: env.HAPPENING_WORKER_ONCE === "true",
  };
}

export async function createWorkerRuntime(config: WorkerConfig): Promise<WorkerRuntime> {
  const store = new SQLiteEventStore({ path: config.databasePath });
  const provider = await FixtureSportsProvider.fromFile({ filePath: config.fixturePath, store });
  return {
    provider,
    statusStore: store,
    close: () => store.close(),
  };
}
