import { DatabaseSync } from "node:sqlite";
import type { Event, EventStore, LiveEventQuery, TimelineAtom } from "../../core/src/index.js";

export type SQLiteEventStoreOptions = {
  path?: string;
};

type EventRow = {
  event_json: string;
};

type TimelineAtomRow = {
  atom_json: string;
};

export class SQLiteEventStore implements EventStore {
  private readonly database: DatabaseSync;

  constructor(options: SQLiteEventStoreOptions = {}) {
    this.database = new DatabaseSync(options.path ?? ":memory:");
    this.initialize();
  }

  close(): void {
    this.database.close();
  }

  async upsertEvents(events: Event[]): Promise<void> {
    const statement = this.database.prepare(`
      INSERT INTO events (
        id,
        title,
        category,
        status,
        sport,
        league,
        participants_json,
        score_json,
        clock,
        updated_at,
        event_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        category = excluded.category,
        status = excluded.status,
        sport = excluded.sport,
        league = excluded.league,
        participants_json = excluded.participants_json,
        score_json = excluded.score_json,
        clock = excluded.clock,
        updated_at = excluded.updated_at,
        event_json = excluded.event_json
    `);

    this.database.exec("BEGIN");
    try {
      for (const event of events) {
        statement.run(
          event.id,
          event.title,
          event.category,
          event.status,
          event.sport ?? null,
          event.league ?? null,
          JSON.stringify(event.participants ?? null),
          JSON.stringify(event.score ?? null),
          event.clock ?? null,
          event.updatedAt,
          JSON.stringify(event),
        );
      }
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  async replaceTimeline(eventId: string, timeline: TimelineAtom[]): Promise<void> {
    const deleteStatement = this.database.prepare("DELETE FROM timeline_atoms WHERE event_id = ?");
    const insertStatement = this.database.prepare(`
      INSERT INTO timeline_atoms (
        id,
        event_id,
        atom_order,
        time,
        type,
        text,
        importance,
        atom_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.database.exec("BEGIN");
    try {
      deleteStatement.run(eventId);
      timeline.forEach((atom, index) => {
        insertStatement.run(
          atom.id,
          atom.eventId,
          index,
          atom.time,
          atom.type,
          atom.text,
          atom.importance,
          JSON.stringify(atom),
        );
      });
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  async listLiveEvents(query: LiveEventQuery = {}): Promise<Event[]> {
    const clauses = ["status = 'live'"];
    const params: string[] = [];

    if (query.category) {
      clauses.push("category = ?");
      params.push(query.category);
    }

    if (query.sport) {
      clauses.push("sport = ?");
      params.push(query.sport);
    }

    const rows = this.database
      .prepare(`SELECT event_json FROM events WHERE ${clauses.join(" AND ")} ORDER BY updated_at DESC, id ASC`)
      .all(...params) as EventRow[];

    return rows.map((row) => JSON.parse(row.event_json) as Event);
  }

  async getEvent(eventId: string): Promise<Event | undefined> {
    const row = this.database.prepare("SELECT event_json FROM events WHERE id = ?").get(eventId) as EventRow | undefined;
    return row ? (JSON.parse(row.event_json) as Event) : undefined;
  }

  async getTimeline(eventId: string): Promise<TimelineAtom[]> {
    const rows = this.database
      .prepare("SELECT atom_json FROM timeline_atoms WHERE event_id = ? ORDER BY atom_order ASC")
      .all(eventId) as TimelineAtomRow[];
    return rows.map((row) => JSON.parse(row.atom_json) as TimelineAtom);
  }

  private initialize(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        status TEXT NOT NULL,
        sport TEXT,
        league TEXT,
        participants_json TEXT,
        score_json TEXT,
        clock TEXT,
        updated_at TEXT NOT NULL,
        event_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS timeline_atoms (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        atom_order INTEGER NOT NULL,
        time TEXT NOT NULL,
        type TEXT NOT NULL,
        text TEXT NOT NULL,
        importance TEXT NOT NULL,
        atom_json TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS events_live_sport_idx ON events(status, category, sport);
      CREATE INDEX IF NOT EXISTS timeline_atoms_event_order_idx ON timeline_atoms(event_id, atom_order);
    `);
  }
}
