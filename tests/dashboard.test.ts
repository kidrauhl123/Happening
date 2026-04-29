import { describe, expect, it } from "vitest";
import { createApp } from "../apps/api/src/app.js";
import { MockSportsProvider } from "../packages/providers/src/index.js";

describe("Happening dashboard", () => {
  it("serves a minimal dashboard that can show live events, timelines, and source metadata", async () => {
    const app = createApp({ provider: new MockSportsProvider() });

    const response = await app.request("/");
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain("Happening 世界动态雷达");
    expect(html).toContain("/api/happenings");
    expect(html).toContain("时间线");
    expect(html).toContain("来源");
    expect(html).toContain("项目过滤");
    expect(html).toContain("正在发生");
    expect(html).toContain("刚刚发生");
    expect(html).toContain("即将发生");
    expect(html).toContain("世界动态雷达");
    expect(html).toContain("/api/happenings");
    expect(html).toContain("<select id=\"sport\"");
    expect(html).toContain("全部项目");
  });

  it("serves dashboard JavaScript that parses in browsers", async () => {
    const app = createApp({ provider: new MockSportsProvider() });

    const response = await app.request("/");
    const html = await response.text();
    const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];

    expect(script).toBeDefined();
    expect(() => new Function(script as string)).not.toThrow();
  });
});
