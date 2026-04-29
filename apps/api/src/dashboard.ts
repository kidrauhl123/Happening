export function renderDashboardHtml(): string {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Happening 世界动态雷达</title>
    <style>
      :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      body { margin: 0; background: #070b14; color: #e5edf7; }
      main { max-width: 1280px; margin: 0 auto; padding: 32px 20px 48px; }
      h1 { margin: 0 0 8px; font-size: 34px; letter-spacing: -0.04em; }
      h2 { margin: 0 0 12px; }
      p { color: #94a3b8; }
      .toolbar, .card, .column { border: 1px solid #1f2a44; background: linear-gradient(180deg, #101827, #0b1220); border-radius: 18px; box-shadow: 0 20px 60px #0006; }
      .toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; padding: 14px; margin: 24px 0; }
      input, select, button { border-radius: 12px; border: 1px solid #2d3a58; background: #0b1220; color: #e5edf7; padding: 10px 12px; }
      button { cursor: pointer; background: #2563eb; border-color: #3b82f6; font-weight: 700; }
      .columns { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; align-items: start; }
      .column { padding: 16px; min-height: 180px; }
      .items { display: grid; gap: 12px; }
      .card { padding: 14px; }
      .card h3 { margin: 0 0 8px; font-size: 17px; }
      .meta { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }
      .pill { border: 1px solid #2d3a58; border-radius: 999px; padding: 4px 9px; color: #cbd5e1; background: #111827; font-size: 12px; }
      .score { font-size: 18px; font-weight: 800; color: #f8fafc; }
      details { margin-top: 10px; }
      pre { white-space: pre-wrap; word-break: break-word; background: #050816; border-radius: 12px; padding: 12px; color: #bfdbfe; }
      .timeline { margin-top: 12px; display: grid; gap: 8px; }
      .atom { border-left: 3px solid #38bdf8; padding-left: 10px; color: #dbeafe; }
      .error { color: #fecaca; }
      @media (max-width: 920px) { .columns { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <main>
      <h1>🌍 Happening 世界动态雷达</h1>
      <p>这里不只看比赛，而是把世界拆成“正在发生 / 刚刚发生 / 即将发生”：体育、地震、科技、市场、新闻、天气、太空都可以继续接进来。</p>
      <section class="toolbar">
        <label>项目过滤 <select id="sport"><option value="">全部项目</option></select></label>
        <label>板块 <select id="category"><option value="">全部板块</option><option value="sports">体育</option><option value="earthquake">地震</option><option value="tech">科技</option><option value="markets">市场</option><option value="news">新闻</option><option value="weather">天气</option><option value="space">太空</option></select></label>
        <button id="refresh">刷新</button>
        <span class="pill">接口：/api/happenings</span>
      </section>
      <section class="columns">
        <section class="column"><h2>正在发生</h2><div id="live" class="items"><p>加载中…</p></div></section>
        <section class="column"><h2>刚刚发生</h2><div id="recent" class="items"><p>加载中…</p></div></section>
        <section class="column"><h2>即将发生</h2><div id="upcoming" class="items"><p>加载中…</p></div></section>
      </section>
    </main>
    <script>
      const liveEl = document.querySelector('#live');
      const recentEl = document.querySelector('#recent');
      const upcomingEl = document.querySelector('#upcoming');
      const sportEl = document.querySelector('#sport');
      const categoryEl = document.querySelector('#category');
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

      function renderEvent(event) {
        const score = event.score ? Object.entries(event.score).map(([k, v]) => escapeHtml(k) + ': ' + escapeHtml(v)).join(' · ') : '';
        const magnitude = event.magnitude != null ? '<span class="pill">震级：M ' + escapeHtml(event.magnitude) + '</span>' : '';
        const region = event.region ? '<span class="pill">地点：' + escapeHtml(event.region) + '</span>' : '';
        return '<article class="card"><h3>' + escapeHtml(event.title) + '</h3>' + (score ? '<div class="score">' + score + '</div>' : '') + '<div class="meta"><span class="pill">状态：' + escapeHtml(event.status) + '</span><span class="pill">板块：' + escapeHtml(event.category || '未知') + '</span><span class="pill">项目：' + escapeHtml(event.sport || '—') + '</span><span class="pill">联赛：' + escapeHtml(event.league || '—') + '</span><span class="pill">时间：' + escapeHtml(event.clock || event.updatedAt || '暂无') + '</span>' + magnitude + region + renderSource(event.source) + '</div><details onclick="loadTimeline(&quot;' + escapeHtml(event.id) + '&quot;)"><summary>时间线</summary><div class="timeline" data-timeline="' + escapeHtml(event.id) + '">加载时间线…</div></details><details><summary>原始 JSON</summary><pre>' + escapeHtml(JSON.stringify(event, null, 2)) + '</pre></details></article>';
      }

      function renderList(target, events, emptyText) {
        target.innerHTML = (events || []).slice(0, 80).map(renderEvent).join('') || '<p>' + escapeHtml(emptyText) + '</p>';
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
        liveEl.innerHTML = recentEl.innerHTML = upcomingEl.innerHTML = '<p>加载中…</p>';
        const params = new URLSearchParams();
        if (sportEl.value.trim()) params.set('sport', sportEl.value.trim());
        if (categoryEl.value.trim()) params.set('category', categoryEl.value.trim());
        const url = '/api/happenings' + (params.toString() ? '?' + params.toString() : '');
        try {
          const response = await fetch(url);
          const body = await response.json();
          const sections = body.sections || { live: [], recent: body.events || [], upcoming: [] };
          renderList(liveEl, sections.live, '这一刻没有确认的 live 事件，但世界不会停，看看刚刚发生和即将发生。');
          renderList(recentEl, sections.recent, '暂时没有刚刚发生的事件。');
          renderList(upcomingEl, sections.upcoming, '暂时没有即将发生的事件。');
        } catch (error) {
          liveEl.innerHTML = '<p class="error">加载失败：' + escapeHtml(error.message || error) + '</p>';
          recentEl.innerHTML = '';
          upcomingEl.innerHTML = '';
        }
      }

      refreshEl.addEventListener('click', refresh);
      sportEl.addEventListener('change', refresh);
      categoryEl.addEventListener('change', refresh);
      loadSportOptions().then(refresh);
      window.loadTimeline = loadTimeline;
    </script>
  </body>
</html>`;
}
