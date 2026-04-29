# Happening

Happening 是一个**实况信息聚合工具**。

它的目标很简单：

> 搜寻正在发生的事件，整理成统一格式，通过 API 提供给其他软件使用。

第一阶段重点做**体育赛事实况**，例如比分、比赛时间、阶段、关键事件和实时播报。

---

## 核心功能

Happening 只做几件事：

1. 搜寻正在进行或即将开始的事件
2. 聚合不同来源的实况信息
3. 标准化比赛状态、比分、时间和关键节点
4. 维护实时事件时间线
5. 通过 API / SSE / Webhook 暴露给外部应用

它不做完整资讯 App，也不做社交、推荐流、评论区、视频播放或复杂前端。

---

## 优先方向

第一版先聚焦体育：

- 篮球：NBA、国际赛事
- 足球：主流联赛和杯赛
- 网球：ATP / WTA
- F1：排位、正赛、事故、进站、排名变化

先把“事实层”做好：谁在比赛、比分多少、进行到哪、刚刚发生了什么。

AI 可以后续用于摘要，但不作为事实来源。

---

## 数据模型

### Event

表示一个正在发生或即将发生的事件。

```ts
type Event = {
  id: string;
  title: string;
  category: "sports" | "news" | "other";
  status: "scheduled" | "live" | "ended" | "unknown";
  sport?: string;
  league?: string;
  participants?: string[];
  score?: Record<string, number | string>;
  clock?: string;
  updatedAt: string;
};
```

### TimelineAtom

表示一条最小实况更新。

```ts
type TimelineAtom = {
  id: string;
  eventId: string;
  time: string;
  type: "score" | "status" | "highlight" | "commentary";
  text: string;
  importance: "low" | "normal" | "high";
};
```

---

## API 草案

### 获取正在进行的事件

```http
GET /api/events/live
GET /api/events/live?category=sports
GET /api/events/live?sport=basketball
```

### 获取单个事件

```http
GET /api/events/:eventId
```

### 获取事件时间线

```http
GET /api/events/:eventId/timeline
```

### 订阅实时更新

```http
GET /api/stream/events
GET /api/stream/events?eventId=xxx
```

### Webhook

```http
POST /api/webhooks
```

用于把高价值实况推送给其他系统。

---

## 推荐项目结构

```text
Happening/
  apps/
    api/          # HTTP API 服务
    worker/       # 实况抓取与更新任务

  packages/
    core/         # 通用类型和标准化逻辑
    providers/    # 数据源适配器
    storage/      # 数据存储
    sdk-js/       # 给外部 JS/TS 应用使用的 SDK

  docs/           # API 和架构文档
  data/           # 本地开发数据
```

---

## 技术选型倾向

- TypeScript
- Node.js
- Fastify 或 Hono
- SQLite
- Server-Sent Events
- Vitest

第一版以本地可运行、容易接入、容易扩展为主，不做复杂分布式系统。

---

## MVP

第一版只需要做到：

1. 启动一个 API 服务
2. 提供健康检查接口
3. 接入一个 mock 体育数据源
4. 返回正在进行的比赛列表
5. 返回单场比赛详情和时间线
6. 通过 SSE 推送实时更新
7. 为后续真实数据源适配留下 Provider 接口

当前仓库已经完成这个 mock MVP 的第一版，并新增了 storage 层与真实数据源适配器骨架：

```bash
npm install
npm test
npm run typecheck
npm run dev
```

可验证接口：

```http
GET http://localhost:3000/
GET http://localhost:3000/health
GET http://localhost:3000/api/events/live?sport=basketball
GET http://localhost:3000/api/events/nba-lal-gsw-live
GET http://localhost:3000/api/events/nba-lal-gsw-live/timeline
GET http://localhost:3000/api/stream/events?sport=basketball
```

根路径 `/` 是最简陋的内置前端 dashboard，可以看到当前掌握的 live events、比分/阶段、timeline 和 source metadata。

ESPN 真实 scoreboard 模式（不需要 API key）：

```bash
HAPPENING_PROVIDER_MODE=espn \
HAPPENING_SPORT=basketball \
HAPPENING_LEAGUE=nba \
npm run dev
```

如果当前没有正在直播的比赛，可以打开调试开关，把 ESPN scoreboard 中已结束/未开始的比赛也展示出来，方便验证真实数据源链路：

```bash
HAPPENING_PROVIDER_MODE=espn \
HAPPENING_SPORT=basketball \
HAPPENING_LEAGUE=nba \
HAPPENING_INCLUDE_NON_LIVE=true \
npm run dev
```

然后打开：

```text
http://localhost:3000/
```

持久化 / fixture 模式：

先用 worker 同步 fixture 到 SQLite：

```bash
HAPPENING_DB_PATH=./data/happening.db \
HAPPENING_FIXTURE_PATH=./data/sports-fixture.json \
npm run worker:once
```

持续同步模式：

```bash
HAPPENING_DB_PATH=./data/happening.db \
HAPPENING_FIXTURE_PATH=./data/sports-fixture.json \
HAPPENING_SYNC_INTERVAL_MS=30000 \
npm run worker
```

再启动 API 读取同一个 SQLite store：

```bash
HAPPENING_PROVIDER_MODE=fixture \
HAPPENING_DB_PATH=./data/happening.db \
HAPPENING_FIXTURE_PATH=./data/sports-fixture.json \
npm run dev
```

worker 每次同步会在 SQLite 的 `provider_sync_status` 表里记录：

- providerId
- success / error
- startedAt / finishedAt
- eventsUpserted / timelinesReplaced
- error message

fixture JSON 形状：

```json
{
  "snapshots": [
    {
      "event": {
        "id": "nba-lal-gsw-live",
        "title": "Los Angeles Lakers vs Golden State Warriors",
        "category": "sports",
        "status": "live",
        "sport": "basketball",
        "updatedAt": "2026-04-29T10:00:00.000Z"
      },
      "timeline": []
    }
  ]
}
```

完整开发规划已保存到：

```text
docs/plans/2026-04-29-happening-development-roadmap.md
```

测试覆盖：

- `MockSportsProvider` 返回标准化体育事件和时间线
- `InMemoryEventStore` 支持事件 upsert、实况过滤、详情读取和时间线替换
- `SQLiteEventStore` 支持本地持久化、重启后读取、实况过滤、时间线替换和 provider sync status 记录
- `SourceMetadata` 支持 providerId、externalId、url、priority、confidence、firstSeenAt、lastSeenAt，用于事实溯源
- `SyncWorker` 支持执行 provider sync、记录 success/error 状态，并可通过 `npm run worker` / `npm run worker:once` 运行
- 内置 `/` dashboard 支持查看 live events、timeline、raw JSON 和 source metadata
- `ManualSportsProvider` 支持把手工/真实来源快照同步进 store，并从 store 提供读取
- `FixtureSportsProvider` 支持从 JSON fixture 加载标准化快照并同步进 store
- `EspnSportsProvider` 支持读取 ESPN 公开 scoreboard API，并映射成 Happening 标准 Event / TimelineAtom / SourceMetadata
- API server 支持默认 mock 模式、fixture + SQLite 模式和 ESPN scoreboard 模式
- API 健康检查
- 实况事件列表和 sport 过滤
- 单场事件详情
- 单场时间线
- 未知事件 404
- SSE snapshot 输出

当前模块边界：

- `packages/core`：事实模型、Provider 接口、Store 接口、同步结果类型
- `packages/storage`：提供 `InMemoryEventStore` 和 `SQLiteEventStore`；SQLite 实现使用 Node 内置 `node:sqlite`
- `packages/providers`：`MockSportsProvider` 用于 API demo；`ManualSportsProvider` 作为真实数据源适配器骨架；`FixtureSportsProvider` 作为本地 JSON 数据源入口，可把外部抓取结果标准化后写入 store
- `apps/api`：只依赖 `HappeningProvider`，支持 mock mode 与 fixture + SQLite mode，因此可以无缝切换 mock provider、manual provider 或后续真实 provider；根路径 `/` 提供最小 dashboard
- `apps/worker`：定时执行 provider sync，把同步结果和错误写入 `provider_sync_status`，用于持续刷新事实库

---

## 设计原则

- API first
- 本地优先
- 事实可追溯
- 数据源可替换
- 不做大而全产品
- 先服务其他软件，再考虑自己的 UI
