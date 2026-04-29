import { readFile } from "node:fs/promises";
import type { EventStore } from "../../core/src/index.js";
import { ManualSportsProvider, type SportsSnapshot } from "./manual-sports-provider.js";

export type FixtureSportsProviderOptions = {
  filePath: string;
  store: EventStore;
};

type FixturePayload = {
  snapshots: SportsSnapshot[];
};

export class FixtureSportsProvider extends ManualSportsProvider {
  static async fromFile({ filePath, store }: FixtureSportsProviderOptions): Promise<FixtureSportsProvider> {
    const text = await readFile(filePath, "utf8");
    const payload = JSON.parse(text) as Partial<FixturePayload>;

    if (!Array.isArray(payload.snapshots)) {
      throw new Error("Fixture snapshots must be an array");
    }

    return new FixtureSportsProvider({ store, snapshots: payload.snapshots });
  }
}
