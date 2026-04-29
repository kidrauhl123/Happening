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

---

## 设计原则

- API first
- 本地优先
- 事实可追溯
- 数据源可替换
- 不做大而全产品
- 先服务其他软件，再考虑自己的 UI
