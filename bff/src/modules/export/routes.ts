import { FastifyPluginAsync } from "fastify";
import { eq, and, desc } from "drizzle-orm";
import { exportTasks, users } from "../../db/schema.js";
import { requirePermission } from "../../middleware/auth.js";
import { randomUUID } from "crypto";

export const exportRoutes: FastifyPluginAsync = async (app) => {
  // List exports
  app.get("/", { preHandler: requirePermission("audit.read") }, async (request) => {
    const list = await app.db.select({
      id: exportTasks.id, type: exportTasks.type, status: exportTasks.status,
      filters: exportTasks.filters, fileUrl: exportTasks.fileUrl, fileSize: exportTasks.fileSize,
      createdAt: exportTasks.createdAt, completedAt: exportTasks.completedAt,
      userEmail: users.email,
    }).from(exportTasks)
      .leftJoin(users, eq(exportTasks.userId, users.id))
      .where(eq(exportTasks.tenantId, request.user!.tenantId!))
      .orderBy(desc(exportTasks.createdAt)).limit(50);
    return { exports: list };
  });

  // Create export
  app.post("/", { preHandler: requirePermission("audit.read") }, async (request) => {
    const { type, filters } = request.body as any;
    const [task] = await app.db.insert(exportTasks).values({
      tenantId: request.user!.tenantId!,
      userId: request.user!.id,
      type, filters: filters || {},
      status: "processing",
    }).returning();
    // Simulate async processing
    setTimeout(async () => {
      await app.db.update(exportTasks).set({
        status: "completed", fileUrl: `/exports/${task.id}.csv`,
        fileSize: Math.floor(Math.random() * 500000) + 10000,
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 86400000),
      }).where(eq(exportTasks.id, task.id));
    }, 3000);
    return { export: task };
  });

  // Delete export
  app.delete("/:id", { preHandler: requirePermission("audit.read") }, async (request) => {
    const { id } = request.params as any;
    await app.db.delete(exportTasks).where(and(eq(exportTasks.id, id), eq(exportTasks.tenantId, request.user!.tenantId!)));
    return { ok: true };
  });
};
