import { createWorkerRuntime, workerConfigFromEnv } from "./config.js";
import { SyncWorker } from "./sync-worker.js";

const config = workerConfigFromEnv();
const runtime = await createWorkerRuntime(config);
const worker = new SyncWorker({
  providerId: config.providerId,
  provider: runtime.provider,
  statusStore: runtime.statusStore,
});

async function runAndLog(): Promise<void> {
  const result = await worker.runOnce();
  console.log(
    `Synced ${config.providerId}: events=${result.eventsUpserted} timelines=${result.timelinesReplaced}`,
  );
}

if (config.once) {
  try {
    await runAndLog();
  } finally {
    runtime.close();
  }
} else {
  await runAndLog();
  const interval = setInterval(() => {
    runAndLog().catch((error: unknown) => {
      console.error(error);
    });
  }, config.intervalMs);

  process.on("SIGINT", () => {
    clearInterval(interval);
    runtime.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    clearInterval(interval);
    runtime.close();
    process.exit(0);
  });
}
