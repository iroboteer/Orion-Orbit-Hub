import { FastifyPluginAsync } from "fastify";
import { eq, and, desc } from "drizzle-orm";
import { apiTokens, users } from "../../db/schema.js";
import { requirePermission } from "../../middleware/auth.js";
import { createHash, randomBytes } from "crypto";

export const tokenRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", { preHandler: requirePermission("token.read") }, async (request) => {
    const list = await app.db.select({
      id: apiTokens.id, name: apiTokens.name, permissions: apiTokens.permissions,
      expiresAt: apiTokens.expiresAt, lastUsedAt: apiTokens.lastUsedAt,
      createdAt: apiTokens.createdAt, userEmail: users.email,
    }).from(apiTokens)
      .leftJoin(users, eq(apiTokens.userId, users.id))
      .where(eq(apiTokens.tenantId, request.user!.tenantId!))
      .orderBy(desc(apiTokens.createdAt));
    return { tokens: list };
  });

  app.post("/", { preHandler: requirePermission("token.manage") }, async (request) => {
    const { name, permissions, expiresInDays } = request.body as any;
    const rawToken = "oct_" + randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 86400000) : null;
    const [token] = await app.db.insert(apiTokens).values({
      tenantId: request.user!.tenantId!, userId: request.user!.id,
      name, tokenHash, permissions: permissions || [], expiresAt,
    }).returning();
    return { token: { ...token, rawToken } }; // Only show rawToken once
  });

  app.delete("/:id", { preHandler: requirePermission("token.manage") }, async (request) => {
    const { id } = request.params as any;
    await app.db.delete(apiTokens).where(and(eq(apiTokens.id, id), eq(apiTokens.tenantId, request.user!.tenantId!)));
    return { ok: true };
  });
};
