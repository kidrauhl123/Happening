import type { ProviderSyncResult, ProviderSyncStatus } from "../../../packages/core/src/index.js";

export type SyncableProvider = {
  sync(): Promise<ProviderSyncResult>;
};

export type SyncStatusStore = {
  recordSyncStatus(status: ProviderSyncStatus): Promise<void>;
};

export type SyncWorkerOptions = {
  providerId: string;
  provider: SyncableProvider;
  statusStore: SyncStatusStore;
  now?: () => string;
};

export class SyncWorker {
  private readonly providerId: string;
  private readonly provider: SyncableProvider;
  private readonly statusStore: SyncStatusStore;
  private readonly now: () => string;

  constructor({ providerId, provider, statusStore, now = () => new Date().toISOString() }: SyncWorkerOptions) {
    this.providerId = providerId;
    this.provider = provider;
    this.statusStore = statusStore;
    this.now = now;
  }

  async runOnce(): Promise<ProviderSyncResult> {
    const startedAt = this.now();

    try {
      const result = await this.provider.sync();
      await this.statusStore.recordSyncStatus({
        providerId: this.providerId,
        status: "success",
        startedAt,
        finishedAt: this.now(),
        eventsUpserted: result.eventsUpserted,
        timelinesReplaced: result.timelinesReplaced,
      });
      return result;
    } catch (error) {
      await this.statusStore.recordSyncStatus({
        providerId: this.providerId,
        status: "error",
        startedAt,
        finishedAt: this.now(),
        eventsUpserted: 0,
        timelinesReplaced: 0,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
