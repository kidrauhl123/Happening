import { describe, expect, it } from "vitest";
import { SnookerOrgProvider } from "../packages/providers/src/index.js";

const liveHtml = `<!doctype html>
<html>
<body>
<thead id="first" class="tourMain">
  <tr class="event"><th colspan="12"><a name="event2214"></a><a class="title" href="/res/index.asp?event=2214">World Championship (18&nbsp;Apr&nbsp;-&nbsp;4&nbsp;May&nbsp;2026)</a></th></tr>
</thead>
<tbody>
<tr class="gradeA even unfinished oneonone round13 latestmod" valign="top">
  <td class="round" rowspan="1"><a href="/res/index.asp?event=2214#r13" title="Quarterfinals; Loser receives &pound;50,000">QF</a>&nbsp;<span class="roundinfo">(<span title="Best of 25 frames">25</span>)</span></td>
  <td class="nationality"><img src="/res/scorekeeper/gfx/flags/icondrawer/16/China.png" alt="China" title="China" /></td>
  <td class="player"><a href="/res/index.asp?player=202" class="chn" title="Ding Junhui">Ding Junhui</a> <span class="seeding" title="Event seeding: 8">[8]</span></td>
  <td class="score first-score" title="Last modified: Today&nbsp;15:01">5</td>
  <td class="status">-</td>
  <td class="last-score" title="Last modified: Today&nbsp;15:01">3</td>
  <td class="nationality"><img src="/res/scorekeeper/gfx/flags/icondrawer/16/England.png" alt="England" title="England" /></td>
  <td class="player"><a href="/res/index.asp?player=12" class="eng" title="Judd Trump">Judd Trump</a> <span class="seeding" title="Event seeding: 4">[4]</span></td>
  <td class="scheduled editcell" rowspan="1"><a class="scores" href="https://www.wst.tv/match-centre/fd4c0c8a-0917-42e0-90b6-260bd52f6238" target="_blank" title="Frame details">details</a></td>
</tr>
</tbody>
</body>
</html>`;

const eventPageHtml = `<!doctype html>
<html>
<body>
<h1><span class="name">Halo World Championship</span></h1>
<thead>
  <tr><th colspan="11"><a name="r14"></a><span class="round">Semifinals</span><div class="roundinfo">(<span title="Best of 33 frames">Best of 33</span>)</div></th></tr>
</thead>
<tr class="gradeA even multiple oneonone round14 latestmod firstinround" valign="top">
  <td class="number"></td>
  <td class="nationality"><img title="England" /></td>
  <td class="player"><a href="/res/index.asp?player=97" title="Shaun Murphy">Shaun Murphy</a> <span class="seeding">[8]</span></td>
  <td class="score first-score" colspan="1"></td><td class="score-delim">v</td><td class="last-score"></td>
  <td class="nationality"><img title="Scotland" /></td>
  <td class="player"><a href="/res/index.asp?player=237" title="John Higgins">John Higgins</a> <span class="seeding">[5]</span></td>
  <td class="scheduled editcell" rowspan="2"><span class="scheduled" data-localtime-format="ddd dd MMM HH:mm">2026-04-30 12:00:00Z</span><br /><span class="session" data-localtime-format="ddd dd MMM HH:mm">2026-05-01 09:00:00Z</span></td>
</tr>
<thead>
  <tr><th colspan="11"><a name="r13"></a><span class="round">Quarterfinals</span><div class="roundinfo">(<span title="Best of 25 frames">Best of 25</span>)</div></th></tr>
</thead>
<tr class="gradeA even oneonone round13" valign="top">
  <td class="number"></td>
  <td class="nationality"><img title="Scotland" /></td>
  <td class="player"><a href="/res/index.asp?player=237" title="John Higgins">John Higgins</a></td>
  <td class="score first-score" title="Last modified: Today&nbsp;00:01">13</td><td class="score-delim">-</td><td class="last-score" title="Last modified: Today&nbsp;00:01">10</td>
  <td class="nationality"><img title="Australia" /></td>
  <td class="player"><a href="/res/index.asp?player=154" title="Neil Robertson">Neil Robertson</a></td>
  <td class="scheduled"><a class="scores" href="https://www.wst.tv/match-centre/c2d1eda3-f98a-4465-ba07-90b84de95cad" target="_blank" title="Frame details">details</a></td>
</tr>
</body>
</html>`;

describe("SnookerOrgProvider", () => {
  it("maps snooker.org ongoing World Championship matches into live happenings", async () => {
    const provider = new SnookerOrgProvider({
      liveScoresUrl: "https://www.snooker.org/res/index.asp?template=21&season=2025",
      fetchText: async () => liveHtml,
      now: () => new Date("2026-04-29T16:30:00.000Z"),
    });

    const events = await provider.listLiveEvents({ sport: "snooker" });

    expect(events).toEqual([
      expect.objectContaining({
        id: "snooker-org-2214-qf-ding-junhui-judd-trump",
        title: "World Championship QF: Ding Junhui vs Judd Trump",
        category: "sports",
        sport: "snooker",
        league: "World Snooker Tour",
        status: "live",
        participants: ["Ding Junhui", "Judd Trump"],
        score: { "Ding Junhui": 5, "Judd Trump": 3, bestOf: 25 },
        clock: "QF · best of 25 frames",
        updatedAt: "2026-04-29T16:30:00.000Z",
        source: expect.objectContaining({
          providerId: "snooker.org:live",
          externalId: "2214-qf-ding-junhui-judd-trump",
          url: "https://www.wst.tv/match-centre/fd4c0c8a-0917-42e0-90b6-260bd52f6238",
        }),
      }),
    ]);
  });

  it("returns live snooker events for sports category queries", async () => {
    const provider = new SnookerOrgProvider({ fetchText: async () => liveHtml });

    const events = await provider.listLiveEvents({ category: "sports" });

    expect(events).toHaveLength(1);
    expect(events[0].sport).toBe("snooker");
  });

  it("maps snooker.org event pages into upcoming, live-window, and recent happenings", async () => {
    const provider = new SnookerOrgProvider({
      liveScoresUrl: "https://www.snooker.org/res/index.asp?event=2214",
      fetchText: async () => eventPageHtml,
      now: () => new Date("2026-04-30T12:30:00.000Z"),
    });

    const events = await provider.listLiveEvents({ sport: "snooker" });

    expect(events).toEqual([
      expect.objectContaining({
        id: "snooker-org-2214-semifinals-shaun-murphy-john-higgins",
        title: "Halo World Championship Semifinals: Shaun Murphy vs John Higgins",
        status: "live",
        score: { "Shaun Murphy": 0, "John Higgins": 0, bestOf: 33 },
        clock: "Semifinals · session started 2026-04-30 12:00 UTC · best of 33 frames",
        startsAt: "2026-04-30T12:00:00.000Z",
      }),
      expect.objectContaining({
        id: "snooker-org-2214-quarterfinals-john-higgins-neil-robertson",
        title: "Halo World Championship Quarterfinals: John Higgins vs Neil Robertson",
        status: "recent",
        score: { "John Higgins": 13, "Neil Robertson": 10, bestOf: 25 },
      }),
    ]);
  });

  it("returns a timeline atom describing the live frame score", async () => {
    const provider = new SnookerOrgProvider({
      fetchText: async () => liveHtml,
      now: () => new Date("2026-04-29T16:30:00.000Z"),
    });

    const timeline = await provider.getTimeline("snooker-org-2214-qf-ding-junhui-judd-trump");

    expect(timeline).toEqual([
      expect.objectContaining({
        id: "snooker-org-2214-qf-ding-junhui-judd-trump-score",
        eventId: "snooker-org-2214-qf-ding-junhui-judd-trump",
        time: "2026-04-29T16:30:00.000Z",
        type: "score",
        importance: "high",
        text: "World Championship quarterfinal live: Ding Junhui leads Judd Trump 5-3 in a best-of-25 match.",
      }),
    ]);
  });
});
