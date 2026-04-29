import type { HappeningProvider } from "../../../packages/core/src/index.js";
import { CompositeProvider, EspnSportsProvider, FixtureSportsProvider, MockSportsProvider } from "../../../packages/providers/src/index.js";
import { SQLiteEventStore } from "../../../packages/storage/src/index.js";

export type ProviderMode = "mock" | "fixture" | "espn";

export type EspnSourceConfig = {
  sport: string;
  league: string;
};

export const DEFAULT_ESPN_SOURCES: EspnSourceConfig[] = [
  { sport: "basketball", league: "nba" },
  { sport: "basketball", league: "wnba" },
  { sport: "basketball", league: "mens-college-basketball" },
  { sport: "basketball", league: "womens-college-basketball" },
  { sport: "football", league: "nfl" },
  { sport: "football", league: "college-football" },
  { sport: "baseball", league: "mlb" },
  { sport: "hockey", league: "nhl" },
  { sport: "soccer", league: "eng.1" },
  { sport: "soccer", league: "esp.1" },
  { sport: "soccer", league: "ita.1" },
  { sport: "soccer", league: "ger.1" },
  { sport: "soccer", league: "fra.1" },
  { sport: "soccer", league: "uefa.champions" },
  { sport: "soccer", league: "usa.1" },
  { sport: "soccer", league: "mex.1" },
  { sport: "racing", league: "f1" },
  { sport: "tennis", league: "atp" },
  { sport: "tennis", league: "wta" },
  { sport: "golf", league: "pga" },
  { sport: "mma", league: "ufc" },
];

export type ProviderConfig = {
  mode?: ProviderMode;
  databasePath?: string;
  fixturePath?: string;
  sport?: string;
  league?: string;
  includeNonLive?: boolean;
  espnSources?: EspnSourceConfig[];
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
    const sources = config.espnSources ?? (config.sport || config.league ? [{ sport: config.sport ?? "basketball", league: config.league ?? "nba" }] : DEFAULT_ESPN_SOURCES);
    const providers = sources.map(
      (source) =>
        new EspnSportsProvider({
          sport: source.sport,
          league: source.league,
          includeNonLive: config.includeNonLive ?? false,
        }),
    );
    return providers.length === 1 ? providers[0] : new CompositeProvider(providers);
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
    espnSources: parseEspnSources(env.HAPPENING_ESPN_SOURCES),
  };
}

function parseEspnSources(value: string | undefined): EspnSourceConfig[] | undefined {
  if (!value) return undefined;
  const sources = value
    .split(",")
    .map((source) => source.trim())
    .filter(Boolean)
    .map((source) => {
      const [sport, league] = source.split(":");
      if (!sport || !league) {
        throw new Error(`Invalid HAPPENING_ESPN_SOURCES entry: ${source}`);
      }
      return { sport, league };
    });
  return sources.length > 0 ? sources : undefined;
}
