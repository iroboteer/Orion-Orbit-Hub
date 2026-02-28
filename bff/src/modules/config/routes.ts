import { FastifyPluginAsync } from "fastify";
import { eq, and, desc, sql } from "drizzle-orm";
import { configSnapshots, approvals } from "../../db/schema.js";
import { requirePermission } from "../../middleware/auth.js";
import { logAudit } from "../../middleware/audit.js";

export const configRoutes: FastifyPluginAsync = async (app) => {
  // Get current config
  app.get("/current", { preHandler: requirePermission("config.read") }, async (request) => {
    const { tenantId } = request.user!;
    const [latest] = await app.db.select().from(configSnapshots)
      .where(eq(configSnapshots.tenantId, tenantId!))
      .orderBy(desc(configSnapshots.version)).limit(1);
    return { config: latest || null };
  });

  // List config versions
  app.get("/versions", { preHandler: requirePermission("config.read") }, async (request) => {
    const { tenantId } = request.user!;
    const versions = await app.db.select().from(configSnapshots)
      .where(eq(configSnapshots.tenantId, tenantId!))
      .orderBy(desc(configSnapshots.version)).limit(20);
    return { versions };
  });

  // Create draft (submit for approval)
  app.post("/draft", { preHandler: requirePermission("config.draft") }, async (request) => {
    const { config, note } = request.body as any;
    const { tenantId } = request.user!;

    // Get current version
    const [current] = await app.db.select().from(configSnapshots)
      .where(eq(configSnapshots.tenantId, tenantId!))
      .orderBy(desc(configSnapshots.version)).limit(1);

    // Create approval
    const [approval] = await app.db.insert(approvals).values({
      tenantId: tenantId!, type: "config.change",
      title: `配置变更 v${(current?.version || 0) + 1}`,
      description: note || "",
      requesterId: request.user!.id,
      payload: { config },
      diff: { before: current?.config, after: config },
    }).returning();

    await logAudit(request, "config.draft", `config:draft`, { resourceType: "config", after: { config } });
    return { approval };
  });

  // Apply config (after approval)
  app.post("/apply", { preHandler: requirePermission("config.apply") }, async (request) => {
    const { approvalId } = request.body as { approvalId: string };
    const { tenantId } = request.user!;

    const [approval] = await app.db.select().from(approvals).where(eq(approvals.id, approvalId)).limit(1);
    if (!approval || approval.status !== "approved") return { error: "Approval not approved" };

    const [current] = await app.db.select().from(configSnapshots)
      .where(eq(configSnapshots.tenantId, tenantId!))
      .orderBy(desc(configSnapshots.version)).limit(1);

    const [snapshot] = await app.db.insert(configSnapshots).values({
      tenantId: tenantId!,
      version: (current?.version || 0) + 1,
      config: (approval.payload as any).config,
      appliedBy: request.user!.id,
      approvalId,
    }).returning();

    await app.db.update(approvals).set({ executedAt: new Date() }).where(eq(approvals.id, approvalId));
    await logAudit(request, "config.apply", `config:v${snapshot.version}`, { resourceType: "config", after: snapshot });
    return { config: snapshot };
  });

  // Rollback
  app.post("/rollback/:version", { preHandler: requirePermission("config.rollback") }, async (request) => {
    const { version } = request.params as { version: string };
    const { tenantId } = request.user!;

    const [target] = await app.db.select().from(configSnapshots)
      .where(and(eq(configSnapshots.tenantId, tenantId!), eq(configSnapshots.version, parseInt(version)))).limit(1);
    if (!target) return { error: "Version not found" };

    const [current] = await app.db.select().from(configSnapshots)
      .where(eq(configSnapshots.tenantId, tenantId!))
      .orderBy(desc(configSnapshots.version)).limit(1);

    const [snapshot] = await app.db.insert(configSnapshots).values({
      tenantId: tenantId!, version: (current?.version || 0) + 1,
      config: target.config, appliedBy: request.user!.id,
      note: `Rollback to v${version}`,
    }).returning();

    await logAudit(request, "config.rollback", `config:v${snapshot.version}`, { resourceType: "config" });
    return { config: snapshot };
  });
};
