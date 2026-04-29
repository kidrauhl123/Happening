import { describe, expect, it } from "vitest";
import { UsgsEarthquakeProvider } from "../packages/providers/src/index.js";

const feed = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: "us7000abcd",
      properties: {
        mag: 4.6,
        place: "75 km E of Hualien City, Taiwan",
        time: Date.parse("2026-04-29T12:40:00.000Z"),
        updated: Date.parse("2026-04-29T12:43:00.000Z"),
        url: "https://earthquake.usgs.gov/earthquakes/eventpage/us7000abcd",
        title: "M 4.6 - 75 km E of Hualien City, Taiwan",
      },
      geometry: {
        type: "Point",
        coordinates: [122.2, 24.1, 10],
      },
    },
  ],
};

describe("UsgsEarthquakeProvider", () => {
  it("maps recent USGS earthquakes into recent world happenings", async () => {
    const provider = new UsgsEarthquakeProvider({
      feedUrl: "https://earthquake.usgs.gov/feed.geojson",
      fetchJson: async () => feed,
      now: () => new Date("2026-04-29T12:45:00.000Z"),
    });

    const events = await provider.listLiveEvents({ category: "earthquake" });

    expect(events).toEqual([
      expect.objectContaining({
        id: "usgs-earthquake-us7000abcd",
        title: "M 4.6 - 75 km E of Hualien City, Taiwan",
        category: "earthquake",
        status: "recent",
        region: "75 km E of Hualien City, Taiwan",
        magnitude: 4.6,
        coordinates: { longitude: 122.2, latitude: 24.1, depthKm: 10 },
        updatedAt: "2026-04-29T12:40:00.000Z",
        source: expect.objectContaining({
          providerId: "usgs:earthquake",
          externalId: "us7000abcd",
          url: "https://earthquake.usgs.gov/earthquakes/eventpage/us7000abcd",
          lastSeenAt: "2026-04-29T12:45:00.000Z",
        }),
      }),
    ]);
  });

  it("returns a timeline atom describing the earthquake observation", async () => {
    const provider = new UsgsEarthquakeProvider({
      fetchJson: async () => feed,
      now: () => new Date("2026-04-29T12:45:00.000Z"),
    });

    const timeline = await provider.getTimeline("usgs-earthquake-us7000abcd");

    expect(timeline).toEqual([
      expect.objectContaining({
        id: "usgs-earthquake-us7000abcd-observed",
        eventId: "usgs-earthquake-us7000abcd",
        time: "2026-04-29T12:40:00.000Z",
        type: "observation",
        importance: "normal",
        text: "USGS recorded M 4.6 earthquake near 75 km E of Hualien City, Taiwan.",
      }),
    ]);
  });
});
