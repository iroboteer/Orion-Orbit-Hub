import { FastifyPluginAsync } from "fastify";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { requirePermission } from "../../middleware/auth.js";
import { logAudit } from "../../middleware/audit.js";
import { chatSessions, chatMessages } from "../../db/schema.js";
import {
  getCachedSessions, setCachedSessions, invalidateSessionsCache,
  getCachedMessages, setCachedMessages, invalidateMessagesCache,
} from "../../lib/redis.js";

const GW_URL = process.env.OPENCLAW_GATEWAY_URL || "http://127.0.0.1:18789";

export const chatRoutes: FastifyPluginAsync = async (app) => {

  // ─── List sessions ───
  app.get("/sessions", { preHandler: requirePermission("chat.send") }, async (request) => {
    const userId = request.user!.id;
    const tenantId = request.user!.tenantId;

    // Try Redis cache first
    const cached = await getCachedSessions(userId);
    if (cached) return cached;

    // Fallback to PostgreSQL
    const rows = await app.db.select().from(chatSessions)
      .where(and(eq(chatSessions.userId, userId), tenantId ? eq(chatSessions.tenantId, tenantId) : undefined))
      .orderBy(desc(chatSessions.updatedAt));

    const result = rows.map(r => ({
      id: r.id, key: r.key, title: r.title, agent: r.agent, model: r.model,
      status: r.status, taskStatus: r.taskStatus, taskDescription: r.taskDescription,
      taskProgress: r.taskProgress, pinned: r.pinned, messageCount: r.messageCount,
      totalTokens: r.totalTokens, lastMessage: r.lastMessage, lastTime: r.lastMessageAt?.toISOString(),
      createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
    }));

    await setCachedSessions(userId, result);
    return result;
  });

  // ─── Get session messages ───
  app.get("/sessions/:sessionId/messages", { preHandler: requirePermission("chat.send") }, async (request) => {
    const { sessionId } = request.params as any;

    // Try Redis cache
    const cached = await getCachedMessages(sessionId);
    if (cached) return cached;

    // Fallback to PostgreSQL
    const rows = await app.db.select().from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(asc(chatMessages.createdAt));

    const result = rows.map(r => ({
      id: r.id, role: r.role, content: r.content, model: r.model,
      tokens: { input: r.tokensInput, output: r.tokensOutput },
      toolCalls: r.toolCalls, thinking: r.thinking, starred: r.starred,
      time: r.createdAt.toISOString(), metadata: r.metadata,
    }));

    await setCachedMessages(sessionId, result);
    return result;
  });

  // ─── Create session ───
  app.post("/sessions", { preHandler: requirePermission("chat.send") }, async (request) => {
    const { key, title, agent, model } = request.body as any;
    const userId = request.user!.id;
    const tenantId = request.user!.tenantId;

    const [row] = await app.db.insert(chatSessions).values({
      key: key || `chat-${Date.now()}`,
      title: title || "New Chat",
      agent: agent || "agent-main",
      model: model || "claude-opus-4",
      userId,
      tenantId,
    }).returning();

    await invalidateSessionsCache(userId);
    return { id: row.id, key: row.key, title: row.title, agent: row.agent, model: row.model, status: row.status };
  });

  // ─── Update session (title, pin, status, task) ───
  app.patch("/sessions/:sessionId", { preHandler: requirePermission("chat.send") }, async (request) => {
    const { sessionId } = request.params as any;
    const body = request.body as any;
    const updates: any = { updatedAt: new Date() };

    if (body.title !== undefined) updates.title = body.title;
    if (body.pinned !== undefined) updates.pinned = body.pinned;
    if (body.status !== undefined) updates.status = body.status;
    if (body.agent !== undefined) updates.agent = body.agent;
    if (body.model !== undefined) updates.model = body.model;
    if (body.taskStatus !== undefined) updates.taskStatus = body.taskStatus;
    if (body.taskDescription !== undefined) updates.taskDescription = body.taskDescription;
    if (body.taskProgress !== undefined) updates.taskProgress = body.taskProgress;

    await app.db.update(chatSessions).set(updates).where(eq(chatSessions.id, sessionId));
    await invalidateSessionsCache(request.user!.id);
    return { ok: true };
  });

  // ─── Delete session ───
  app.delete("/sessions/:sessionId", { preHandler: requirePermission("chat.send") }, async (request) => {
    const { sessionId } = request.params as any;
    await app.db.delete(chatSessions).where(eq(chatSessions.id, sessionId));
    await invalidateSessionsCache(request.user!.id);
    await invalidateMessagesCache(sessionId);
    await logAudit(request, "chat.session.delete", sessionId, { resourceType: "chat_session" });
    return { ok: true };
  });

  // ─── Send message (with persistence) ───
  app.post("/send", { preHandler: requirePermission("chat.send") }, async (request) => {
    const { sessionKey, message, agent, model, sessionId: clientSessionId } = request.body as any;
    const userId = request.user!.id;
    const tenantId = request.user!.tenantId;

    // Find or create session
    let sessionId = clientSessionId;
    let sessionRow: any;

    if (sessionId) {
      [sessionRow] = await app.db.select().from(chatSessions).where(eq(chatSessions.id, sessionId)).limit(1);
    }

    if (!sessionRow && sessionKey) {
      [sessionRow] = await app.db.select().from(chatSessions)
        .where(and(eq(chatSessions.key, sessionKey), eq(chatSessions.userId, userId)))
        .limit(1);
    }

    if (!sessionRow) {
      const title = message.length > 30 ? message.slice(0, 30) + "…" : message;
      [sessionRow] = await app.db.insert(chatSessions).values({
        key: sessionKey || `chat-${Date.now()}`,
        title,
        agent: agent || "agent-main",
        model: model || "claude-opus-4",
        userId,
        tenantId,
        taskStatus: "running",
      }).returning();
    }

    sessionId = sessionRow.id;

    // Save user message to PostgreSQL
    const [userMsg] = await app.db.insert(chatMessages).values({
      sessionId,
      role: "user",
      content: message,
    }).returning();

    // Update session task status to running
    await app.db.update(chatSessions).set({
      taskStatus: "running",
      updatedAt: new Date(),
    }).where(eq(chatSessions.id, sessionId));

    // Call OpenClaw Gateway
    const agentId = (agent || "main").replace("agent-", "");
    let response = "";
    let usage: any = {};
    let taskStatus = "success";

    try {
      const res = await fetch(`${GW_URL}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-User": request.user?.email || "admin",
          "X-Forwarded-Proto": "https",
        },
        body: JSON.stringify({
          model: `openclaw:${agentId}`,
          messages: [{ role: "user", content: message }],
          max_tokens: 4096,
        }),
      });
      const data = await res.json() as any;
      response = data.choices?.[0]?.message?.content || data.error?.message || "No response";
      usage = data.usage || {};
    } catch (e: any) {
      response = `❌ Error: ${e.message}`;
      taskStatus = "failed";
    }

    // Save assistant message to PostgreSQL
    const [assistantMsg] = await app.db.insert(chatMessages).values({
      sessionId,
      role: "assistant",
      content: response,
      model: model || "claude-opus-4",
      tokensInput: usage.prompt_tokens || message.length,
      tokensOutput: usage.completion_tokens || response.length,
    }).returning();

    // Update session metadata
    const tokensDelta = (usage.prompt_tokens || message.length) + (usage.completion_tokens || response.length);
    await app.db.update(chatSessions).set({
      lastMessage: response.slice(0, 200),
      lastMessageAt: new Date(),
      messageCount: sql`${chatSessions.messageCount} + 2`,
      totalTokens: sql`${chatSessions.totalTokens} + ${tokensDelta}`,
      taskStatus,
      updatedAt: new Date(),
    }).where(eq(chatSessions.id, sessionId));

    // Invalidate caches
    await invalidateSessionsCache(userId);
    await invalidateMessagesCache(sessionId);

    await logAudit(request, "chat.send", sessionId, { resourceType: "chat_session", metadata: { messageLength: message.length } });

    return {
      sessionId,
      sessionKey: sessionRow.key,
      response,
      usage,
      model: model || "claude-opus-4",
      userMessage: { id: userMsg.id, role: "user", content: message, time: userMsg.createdAt.toISOString() },
      assistantMessage: {
        id: assistantMsg.id, role: "assistant", content: response, time: assistantMsg.createdAt.toISOString(),
        model: model || "claude-opus-4", tokens: { input: usage.prompt_tokens || message.length, output: usage.completion_tokens || response.length },
      },
      taskStatus,
    };
  });

  // ─── Star/unstar message ───
  app.patch("/messages/:messageId/star", { preHandler: requirePermission("chat.send") }, async (request) => {
    const { messageId } = request.params as any;
    const { starred } = request.body as any;
    await app.db.update(chatMessages).set({ starred: !!starred }).where(eq(chatMessages.id, messageId));
    return { ok: true };
  });

  // ─── Inject system message ───
  app.post("/inject", { preHandler: requirePermission("chat.send") }, async (request) => {
    const { sessionId, sessionKey, message, role } = request.body as any;
    const userId = request.user!.id;

    let sid = sessionId;
    if (!sid && sessionKey) {
      const [row] = await app.db.select().from(chatSessions)
        .where(and(eq(chatSessions.key, sessionKey), eq(chatSessions.userId, userId)))
        .limit(1);
      sid = row?.id;
    }
    if (!sid) return { error: "Session not found" };

    const [msg] = await app.db.insert(chatMessages).values({
      sessionId: sid, role: role || "system", content: message,
    }).returning();

    await invalidateMessagesCache(sid);
    await logAudit(request, "chat.inject", sid, { resourceType: "chat_session" });
    return { ok: true, message: { id: msg.id, role: msg.role, content: msg.content, time: msg.createdAt.toISOString() } };
  });

  // ─── Abort ───
  app.post("/abort", { preHandler: requirePermission("chat.send") }, async (request) => {
    const { sessionId, sessionKey } = request.body as any;
    const userId = request.user!.id;

    let sid = sessionId;
    if (!sid && sessionKey) {
      const [row] = await app.db.select().from(chatSessions)
        .where(and(eq(chatSessions.key, sessionKey), eq(chatSessions.userId, userId)))
        .limit(1);
      sid = row?.id;
    }
    if (sid) {
      await app.db.update(chatSessions).set({ taskStatus: "cancelled", updatedAt: new Date() }).where(eq(chatSessions.id, sid));
      await invalidateSessionsCache(userId);
    }
    return { ok: true };
  });

  // ─── Clear session messages ───
  app.delete("/sessions/:sessionId/messages", { preHandler: requirePermission("chat.send") }, async (request) => {
    const { sessionId } = request.params as any;
    await app.db.delete(chatMessages).where(eq(chatMessages.sessionId, sessionId));
    await app.db.update(chatSessions).set({ messageCount: 0, totalTokens: 0, lastMessage: null, updatedAt: new Date() }).where(eq(chatSessions.id, sessionId));
    await invalidateMessagesCache(sessionId);
    await invalidateSessionsCache(request.user!.id);
    return { ok: true };
  });
};
