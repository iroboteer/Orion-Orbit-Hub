import { FastifyPluginAsync } from "fastify";
import { eq, and, desc, sql } from "drizzle-orm";
import { alerts } from "../../db/schema.js";
import { requirePermission } from "../../middleware/auth.js";
import { logAudit } from "../../middleware/audit.js";

export const alertRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", { preHandler: requirePermission("alert.read") }, async (request) => {
    const { tenantId } = request.user!;
    const { status, severity, page = "1", pageSize = "20" } = request.query as any;
    const conditions: any[] = [];
    if (tenantId) conditions.push(eq(alerts.tenantId, tenantId));
    if (status) conditions.push(eq(alerts.status, status));
    if (severity) conditions.push(eq(alerts.severity, severity));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await app.db.select().from(alerts).where(where)
      .orderBy(desc(alerts.createdAt))
      .limit(parseInt(pageSize)).offset((parseInt(page) - 1) * parseInt(pageSize));
    const [{ count }] = await app.db.select({ count: sql<number>`count(*)` }).from(alerts).where(where);
    return { alerts: list, total: Number(count) };
  });

  app.post("/:id/ack", { preHandler: requirePermission("alert.manage") }, async (request) => {
    const { id } = request.params as { id: string };
    const [updated] = await app.db.update(alerts).set({
      status: "acked", ackedBy: request.user!.id, ackedAt: new Date(),
    }).where(eq(alerts.id, id)).returning();
    await logAudit(request, "alert.ack", `alert:${id}`, { resourceType: "alert" });
    return { alert: updated };
  });

  app.post("/:id/resolve", { preHandler: requirePermission("alert.manage") }, async (request) => {
    const { id } = request.params as { id: string };
    const [updated] = await app.db.update(alerts).set({
      status: "resolved", resolvedAt: new Date(),
    }).where(eq(alerts.id, id)).returning();
    await logAudit(request, "alert.resolve", `alert:${id}`, { resourceType: "alert" });
    return { alert: updated };
  });
};
