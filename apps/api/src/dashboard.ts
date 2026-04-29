export function renderDashboardHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Happening Dashboard</title>
    <style>
      :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      body { margin: 0; background: #070b14; color: #e5edf7; }
      main { max-width: 1120px; margin: 0 auto; padding: 32px 20px 48px; }
      h1 { margin: 0 0 8px; font-size: 32px; letter-spacing: -0.04em; }
      p { color: #94a3b8; }
      .toolbar, .card { border: 1px solid #1f2a44; background: linear-gradient(180deg, #101827, #0b1220); border-radius: 18px; box-shadow: 0 20px 60px #0006; }
      .toolbar { display: flex; gap: 12px; align-items: center; padding: 14px; margin: 24px 0; }
      input, button { border-radius: 12px; border: 1px solid #2d3a58; background: #0b1220; color: #e5edf7; padding: 10px 12px; }
      button { cursor: pointer; background: #2563eb; border-color: #3b82f6; font-weight: 700; }
      #events { display: grid; gap: 14px; }
      .card { padding: 18px; }
      .meta { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }
      .pill { border: 1px solid #2d3a58; border-radius: 999px; padding: 4px 9px; color: #cbd5e1; background: #111827; font-size: 12px; }
      .score { font-size: 24px; font-weight: 800; color: #f8fafc; }
      details { margin-top: 12px; }
      pre { white-space: pre-wrap; word-break: break-word; background: #050816; border-radius: 12px; padding: 12px; color: #bfdbfe; }
      .timeline { margin-top: 12px; display: grid; gap: 8px; }
      .atom { border-left: 3px solid #38bdf8; padding-left: 10px; color: #dbeafe; }
      .error { color: #fecaca; }
    </style>
  </head>
  <body>
    <main>
      <h1>Happening Dashboard</h1>
      <p>Minimal frontend for seeing the live events, timelines, and source metadata currently known by Happening.</p>
      <section class="toolbar">
        <label>Sport <input id="sport" value="basketball" placeholder="basketball / football / f1" /></label>
        <button id="refresh">Refresh</button>
        <span class="pill">API: /api/events/live</span>
      </section>
      <section id="events"><p>Loading…</p></section>
    </main>
    <script>
      const eventsEl = document.querySelector('#events');
      const sportEl = document.querySelector('#sport');
      const refreshEl = document.querySelector('#refresh');

      function escapeHtml(value) {
        return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
      }

      function renderSource(source) {
        if (!source) return '<span class="pill source">source: unknown</span>';
        const bits = [source.providerId, source.externalId, source.url, source.confidence != null ? 'confidence ' + source.confidence : null, source.lastSeenAt]
          .filter(Boolean)
          .map(escapeHtml);
        return '<span class="pill source">source: ' + bits.join(' · ') + '</span>';
      }

      async function loadTimeline(eventId) {
        const target = document.querySelector('[data-timeline="' + eventId + '"]');
        if (!target || target.dataset.loaded) return;
        const response = await fetch('/api/events/' + encodeURIComponent(eventId) + '/timeline');
        const body = await response.json();
        target.dataset.loaded = 'true';
        target.innerHTML = (body.timeline || []).map(atom =>
          '<div class="atom"><strong>' + escapeHtml(atom.time) + '</strong> [' + escapeHtml(atom.type) + '] ' + escapeHtml(atom.text) + '<div class="meta">' + renderSource(atom.source) + '</div></div>'
        ).join('') || '<p>No timeline atoms yet.</p>';
      }

      async function refresh() {
        eventsEl.innerHTML = '<p>Loading…</p>';
        const sport = sportEl.value.trim();
        const url = '/api/events/live' + (sport ? '?sport=' + encodeURIComponent(sport) : '');
        try {
          const response = await fetch(url);
          const body = await response.json();
          const events = body.events || [];
          eventsEl.innerHTML = events.map(event => {
            const score = event.score ? Object.entries(event.score).map(([k, v]) => escapeHtml(k) + ': ' + escapeHtml(v)).join(' · ') : 'No score yet';
            return '<article class="card"><h2>' + escapeHtml(event.title) + '</h2><div class="score">' + score + '</div><div class="meta"><span class="pill">' + escapeHtml(event.status) + '</span><span class="pill">' + escapeHtml(event.sport || 'unknown sport') + '</span><span class="pill">' + escapeHtml(event.league || 'unknown league') + '</span><span class="pill">' + escapeHtml(event.clock || 'no clock') + '</span>' + renderSource(event.source) + '</div><details onclick="loadTimeline(\'' + escapeHtml(event.id) + '\')"><summary>timeline</summary><div class="timeline" data-timeline="' + escapeHtml(event.id) + '">Loading timeline…</div></details><details><summary>raw event</summary><pre>' + escapeHtml(JSON.stringify(event, null, 2)) + '</pre></details></article>';
          }).join('') || '<p>No live events match this filter.</p>';
        } catch (error) {
          eventsEl.innerHTML = '<p class="error">Failed to load events: ' + escapeHtml(error.message || error) + '</p>';
        }
      }

      refreshEl.addEventListener('click', refresh);
      refresh();
      window.loadTimeline = loadTimeline;
    </script>
  </body>
</html>`;
}
