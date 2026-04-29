import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { MockSportsProvider } from "../../../packages/providers/src/mock-sports-provider.js";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const app = createApp({ provider: new MockSportsProvider() });

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Happening API listening on http://localhost:${info.port}`);
});
