import { FastifyPluginAsync } from "fastify";
import { eq, and, gte, lte, like, desc, sql } from "drizzle-orm";
import { auditLogs, users } from "../../db/schema.js";
import { requirePermission } from "../../middleware/auth.js";

export const auditRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", { preHandler: requirePermission("audit.read") }, async (request) => {
    const { tenantId } = request.user!;
    const { action, userId, from, to, page = "1", pageSize = "50" } = request.query as any;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    
    const conditions: any[] = [];
    if (tenantId && !request.user!.isPlatformAdmin) conditions.push(eq(auditLogs.tenantId, tenantId));
    if (action) conditions.push(like(auditLogs.action, `%${action}%`));
    if (userId) conditions.push(eq(auditLogs.userId, userId));
    if (from) conditions.push(gte(auditLogs.createdAt, new Date(from)));
    if (to) conditions.push(lte(auditLogs.createdAt, new Date(to)));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const logs = await app.db.select({
      id: auditLogs.id, action: auditLogs.action, resource: auditLogs.resource,
      resourceType: auditLogs.resourceType, result: auditLogs.result,
      ip: auditLogs.ip, createdAt: auditLogs.createdAt,
      userEmail: users.email, userDisplayName: users.displayName,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.userId))
    .where(where)
    .orderBy(desc(auditLogs.createdAt))
    .limit(parseInt(pageSize)).offset(offset);

    const [{ count }] = await app.db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(where);
    return { logs, total: Number(count), page: parseInt(page) };
  });

  app.get("/:id", { preHandler: requirePermission("audit.read") }, async (request) => {
    const { id } = request.params as { id: string };
    const [log] = await app.db.select().from(auditLogs).where(eq(auditLogs.id, id)).limit(1);
    return { log };
  });
};
