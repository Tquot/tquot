import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";
import type { TripRequest, ParserQuestion } from "./schema";
import type { ParserSearchResult } from "./search-orchestrator";

const SESSION_TTL_SECONDS = 86400;

// ─────────────────────────────────────────────────────────────
// Tipo de sesión
// ─────────────────────────────────────────────────────────────

export interface ParserSession {
  id: string;
  agentId: string | null;
  rawInputs: string[];
  partialData: TripRequest | null;
  pendingQuestions: ParserQuestion[];
  status: "extracting" | "awaiting_answers" | "ready" | "error";
  searchResults?: ParserSearchResult;
  humanReviewRequired?: boolean;
  humanReviewReason?: string;
  questionRounds: number;
  turns: Array<{
    role: "agent" | "parser";
    content: string | object;
    timestamp: number;
  }>;
  createdAt: number;
  updatedAt: number;
}

// ─────────────────────────────────────────────────────────────
// Interfaz pública del store
// ─────────────────────────────────────────────────────────────

export interface SessionStore {
  create(agentId: string | null): Promise<ParserSession>;
  load(id: string): Promise<ParserSession | null>;
  save(session: ParserSession): Promise<void>;
  delete(id: string): Promise<void>;
}

function createParserSession(agentId: string | null): ParserSession {
  const now = Date.now();

  return {
    id: randomUUID(),
    agentId,
    rawInputs: [],
    partialData: null,
    pendingQuestions: [],
    status: "extracting",
    questionRounds: 0,
    turns: [],
    createdAt: now,
    updatedAt: now,
  };
}

// ─────────────────────────────────────────────────────────────
// Implementación in-memory (default para desarrollo)
// ─────────────────────────────────────────────────────────────

class InMemorySessionStore implements SessionStore {
  private sessions = new Map<string, ParserSession>();
  private ttlMs = 1000 * 60 * 60 * 24; // 24h

  async create(agentId: string | null): Promise<ParserSession> {
    const session = createParserSession(agentId);
    this.sessions.set(session.id, session);
    this.purgeExpired();
    return session;
  }

  async load(id: string): Promise<ParserSession | null> {
    this.purgeExpired();
    return this.sessions.get(id) ?? null;
  }

  async save(session: ParserSession): Promise<void> {
    session.updatedAt = Date.now();
    this.sessions.set(session.id, session);
  }

  async delete(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  private purgeExpired() {
    const cutoff = Date.now() - this.ttlMs;
    for (const [id, session] of this.sessions) {
      if (session.updatedAt < cutoff) this.sessions.delete(id);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Implementación Redis para producción
// ─────────────────────────────────────────────────────────────

class RedisSessionStore implements SessionStore {
  private redis = Redis.fromEnv();

  async create(agentId: string | null): Promise<ParserSession> {
    const session = createParserSession(agentId);
    await this.save(session);
    return session;
  }

  async load(id: string): Promise<ParserSession | null> {
    const stored = await this.redis.get<ParserSession | string>(this.key(id));

    if (!stored) {
      return null;
    }

    if (typeof stored === "string") {
      try {
        return JSON.parse(stored) as ParserSession;
      } catch {
        return null;
      }
    }

    return stored;
  }

  async save(session: ParserSession): Promise<void> {
    session.updatedAt = Date.now();
    await this.redis.set(this.key(session.id), JSON.stringify(session), {
      ex: SESSION_TTL_SECONDS,
    });
  }

  async delete(id: string): Promise<void> {
    await this.redis.del(this.key(id));
  }

  private key(id: string) {
    return `tquot:parser:session:${id}`;
  }
}

// ─────────────────────────────────────────────────────────────
// Singleton: selecciona backend según env var
// ─────────────────────────────────────────────────────────────

let storeInstance: SessionStore | null = null;

export function getSessionStore(): SessionStore {
  if (storeInstance) return storeInstance;

  const backend = process.env.SESSION_STORE ?? "memory";
  storeInstance = backend === "redis" ? new RedisSessionStore() : new InMemorySessionStore();
  return storeInstance;
}
