import { FastifyPluginAsync } from "fastify";
import { eq, isNull } from "drizzle-orm";
import { tenants } from "../../db/schema.js";
import { requirePermission } from "../../middleware/auth.js";
import { logAudit } from "../../middleware/audit.js";

export const tenantRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", { preHandler: requirePermission("tenant.read") }, async (request) => {
    const list = await app.db.select().from(tenants).where(isNull(tenants.deletedAt));
    return { tenants: list };
  });

  app.get("/:id", { preHandler: requirePermission("tenant.read") }, async (request) => {
    const { id } = request.params as { id: string };
    const [tenant] = await app.db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    if (!tenant) return { error: "Not found" };
    return { tenant };
  });

  app.post("/", { preHandler: requirePermission("tenant.write") }, async (request) => {
    const body = request.body as any;
    const [tenant] = await app.db.insert(tenants).values({
      slug: body.slug, name: body.name,
      contactEmail: body.contactEmail, contactName: body.contactName,
      notes: body.notes, quotas: body.quotas || {},
      policies: body.policies || {}, gatewayConfig: body.gatewayConfig || {},
    }).returning();
    await logAudit(request, "tenant.create", `tenant:${tenant.id}`, { resourceType: "tenant", after: tenant });
    return { tenant };
  });

  app.put("/:id", { preHandler: requirePermission("tenant.write") }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const [before] = await app.db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    const [tenant] = await app.db.update(tenants).set({
      ...body, updatedAt: new Date(),
    }).where(eq(tenants.id, id)).returning();
    await logAudit(request, "tenant.update", `tenant:${id}`, { resourceType: "tenant", before, after: tenant });
    return { tenant };
  });

  app.post("/:id/freeze", { preHandler: requirePermission("tenant.freeze") }, async (request) => {
    const { id } = request.params as { id: string };
    const [tenant] = await app.db.update(tenants).set({ status: "frozen", updatedAt: new Date() }).where(eq(tenants.id, id)).returning();
    await logAudit(request, "tenant.freeze", `tenant:${id}`, { resourceType: "tenant" });
    return { tenant };
  });

  app.post("/:id/unfreeze", { preHandler: requirePermission("tenant.freeze") }, async (request) => {
    const { id } = request.params as { id: string };
    const [tenant] = await app.db.update(tenants).set({ status: "active", updatedAt: new Date() }).where(eq(tenants.id, id)).returning();
    await logAudit(request, "tenant.unfreeze", `tenant:${id}`, { resourceType: "tenant" });
    return { tenant };
  });

  app.delete("/:id", { preHandler: requirePermission("tenant.delete") }, async (request) => {
    const { id } = request.params as { id: string };
    await app.db.update(tenants).set({ status: "deleted", deletedAt: new Date() }).where(eq(tenants.id, id));
    await logAudit(request, "tenant.delete", `tenant:${id}`, { resourceType: "tenant" });
    return { success: true };
  });
};
