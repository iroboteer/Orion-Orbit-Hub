import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6399";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 200, 5000),
    });
    redis.on("error", (err) => console.error("[Redis]", err.message));
    redis.connect().catch(() => {});
  }
  return redis;
}

// Chat cache helpers — TTL 1 hour for sessions list, 30 min for messages
const SESSION_TTL = 3600;
const MESSAGES_TTL = 1800;

export async function getCachedSessions(userId: string): Promise<any[] | null> {
  try {
    const data = await getRedis().get(`chat:sessions:${userId}`);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

export async function setCachedSessions(userId: string, sessions: any[]) {
  try { await getRedis().set(`chat:sessions:${userId}`, JSON.stringify(sessions), "EX", SESSION_TTL); } catch {}
}

export async function invalidateSessionsCache(userId: string) {
  try { await getRedis().del(`chat:sessions:${userId}`); } catch {}
}

export async function getCachedMessages(sessionId: string): Promise<any[] | null> {
  try {
    const data = await getRedis().get(`chat:msgs:${sessionId}`);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

export async function setCachedMessages(sessionId: string, msgs: any[]) {
  try { await getRedis().set(`chat:msgs:${sessionId}`, JSON.stringify(msgs), "EX", MESSAGES_TTL); } catch {}
}

export async function invalidateMessagesCache(sessionId: string) {
  try { await getRedis().del(`chat:msgs:${sessionId}`); } catch {}
}
