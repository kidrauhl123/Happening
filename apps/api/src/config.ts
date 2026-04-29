import type { HappeningProvider } from "../../../packages/core/src/index.js";
import { EspnSportsProvider, FixtureSportsProvider, MockSportsProvider } from "../../../packages/providers/src/index.js";
import { SQLiteEventStore } from "../../../packages/storage/src/index.js";

export type ProviderMode = "mock" | "fixture" | "espn";

export type ProviderConfig = {
  mode?: ProviderMode;
  databasePath?: string;
  fixturePath?: string;
  sport?: string;
  league?: string;
  includeNonLive?: boolean;
};

export async function createProviderFromConfig(config: ProviderConfig = {}): Promise<HappeningProvider> {
  const mode = config.mode ?? "mock";

  if (mode === "mock") {
    return new MockSportsProvider();
  }

  if (mode === "fixture") {
    if (!config.fixturePath) {
      throw new Error("fixture mode requires fixturePath");
    }

    const store = new SQLiteEventStore({ path: config.databasePath });
    const provider = await FixtureSportsProvider.fromFile({ filePath: config.fixturePath, store });
    await provider.sync();
    return provider;
  }

  if (mode === "espn") {
    return new EspnSportsProvider({
      sport: config.sport ?? "basketball",
      league: config.league ?? "nba",
      includeNonLive: config.includeNonLive ?? false,
    });
  }

  throw new Error(`Unsupported provider mode: ${mode satisfies never}`);
}

export function providerConfigFromEnv(env: NodeJS.ProcessEnv = process.env): ProviderConfig {
  return {
    mode: (env.HAPPENING_PROVIDER_MODE as ProviderMode | undefined) ?? "mock",
    databasePath: env.HAPPENING_DB_PATH,
    fixturePath: env.HAPPENING_FIXTURE_PATH,
    sport: env.HAPPENING_SPORT,
    league: env.HAPPENING_LEAGUE,
    includeNonLive: env.HAPPENING_INCLUDE_NON_LIVE === "true",
  };
}
