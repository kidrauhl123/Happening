import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { createProviderFromConfig, providerConfigFromEnv } from "./config.js";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const provider = await createProviderFromConfig(providerConfigFromEnv());
const app = createApp({ provider });

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Happening API listening on http://localhost:${info.port}`);
});
