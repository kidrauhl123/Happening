export function renderDashboardHtml(): string {
  return `<!doctype html>
<html lang="zh-CN">
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
      input, select, button { border-radius: 12px; border: 1px solid #2d3a58; background: #0b1220; color: #e5edf7; padding: 10px 12px; }
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
      <h1>Happening 实况面板</h1>
      <p>这里展示 Happening 当前从各个数据源掌握的比赛、比分、阶段、时间线和来源。</p>
      <section class="toolbar">
        <label>项目过滤 <select id="sport"><option value="">全部项目</option></select></label>
        <button id="refresh">刷新</button>
        <span class="pill">接口：/api/events/live</span>
      </section>
      <section id="events"><p>加载中…</p></section>
    </main>
    <script>
      const eventsEl = document.querySelector('#events');
      const sportEl = document.querySelector('#sport');
      const refreshEl = document.querySelector('#refresh');

      function escapeHtml(value) {
        return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
      }

      function renderSource(source) {
        if (!source) return '<span class="pill source">来源：未知</span>';
        const bits = [source.providerId, source.externalId, source.url, source.confidence != null ? '置信度 ' + source.confidence : null, source.lastSeenAt]
          .filter(Boolean)
          .map(escapeHtml);
        return '<span class="pill source">来源：' + bits.join(' · ') + '</span>';
      }

      async function loadTimeline(eventId) {
        const target = document.querySelector('[data-timeline="' + eventId + '"]');
        if (!target || target.dataset.loaded) return;
        const response = await fetch('/api/events/' + encodeURIComponent(eventId) + '/timeline');
        const body = await response.json();
        target.dataset.loaded = 'true';
        target.innerHTML = (body.timeline || []).map(atom =>
          '<div class="atom"><strong>' + escapeHtml(atom.time) + '</strong> [' + escapeHtml(atom.type) + '] ' + escapeHtml(atom.text) + '<div class="meta">' + renderSource(atom.source) + '</div></div>'
        ).join('') || '<p>暂无时间线。</p>';
      }

      async function loadSportOptions() {
        try {
          const response = await fetch('/api/sports');
          const body = await response.json();
          const options = body.sports || [];
          sportEl.innerHTML = '<option value="">全部项目</option>' + options.map(option =>
            '<option value="' + escapeHtml(option.value) + '">' + escapeHtml(option.label) + '（' + escapeHtml(option.value) + '）</option>'
          ).join('');
        } catch (error) {
          console.warn('Failed to load sport options', error);
        }
      }

      async function refresh() {
        eventsEl.innerHTML = '<p>加载中…</p>';
        const sport = sportEl.value.trim();
        const url = '/api/events/live' + (sport ? '?sport=' + encodeURIComponent(sport) : '');
        try {
          const response = await fetch(url);
          const body = await response.json();
          const events = body.events || [];
          eventsEl.innerHTML = events.map(event => {
            const score = event.score ? Object.entries(event.score).map(([k, v]) => escapeHtml(k) + ': ' + escapeHtml(v)).join(' · ') : '暂无比分';
            return '<article class="card"><h2>' + escapeHtml(event.title) + '</h2><div class="score">' + score + '</div><div class="meta"><span class="pill">状态：' + escapeHtml(event.status) + '</span><span class="pill">项目：' + escapeHtml(event.sport || '未知') + '</span><span class="pill">联赛：' + escapeHtml(event.league || '未知') + '</span><span class="pill">阶段：' + escapeHtml(event.clock || '暂无') + '</span>' + renderSource(event.source) + '</div><details onclick="loadTimeline(&quot;' + escapeHtml(event.id) + '&quot;)"><summary>时间线</summary><div class="timeline" data-timeline="' + escapeHtml(event.id) + '">加载时间线…</div></details><details><summary>原始 JSON</summary><pre>' + escapeHtml(JSON.stringify(event, null, 2)) + '</pre></details></article>';
          }).join('') || '<p>没有匹配这个过滤条件的赛事。你可以清空项目过滤，查看全部。</p>';
        } catch (error) {
          eventsEl.innerHTML = '<p class="error">加载失败：' + escapeHtml(error.message || error) + '</p>';
        }
      }

      refreshEl.addEventListener('click', refresh);
      sportEl.addEventListener('change', refresh);
      loadSportOptions().then(refresh);
      window.loadTimeline = loadTimeline;
    </script>
  </body>
</html>`;
}
