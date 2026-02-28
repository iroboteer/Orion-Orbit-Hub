import { FastifyPluginAsync } from "fastify";
import { eq, and, desc, sql } from "drizzle-orm";
import { approvals, users } from "../../db/schema.js";
import { requirePermission } from "../../middleware/auth.js";
import { logAudit } from "../../middleware/audit.js";

export const approvalRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", { preHandler: requirePermission("approval.read") }, async (request) => {
    const { tenantId } = request.user!;
    const { status, type, page = "1", pageSize = "20" } = request.query as any;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    const conditions: any[] = [eq(approvals.tenantId, tenantId!)];
    if (status) conditions.push(eq(approvals.status, status));
    if (type) conditions.push(eq(approvals.type, type));

    const list = await app.db.select({
      id: approvals.id, type: approvals.type, title: approvals.title,
      status: approvals.status, requiredApprovers: approvals.requiredApprovers,
      approvedBy: approvals.approvedBy, createdAt: approvals.createdAt,
      expiresAt: approvals.expiresAt,
      requesterEmail: users.email, requesterName: users.displayName,
    })
    .from(approvals)
    .leftJoin(users, eq(users.id, approvals.requesterId))
    .where(and(...conditions))
    .orderBy(desc(approvals.createdAt))
    .limit(parseInt(pageSize)).offset(offset);

    const [{ count }] = await app.db.select({ count: sql<number>`count(*)` })
      .from(approvals).where(and(...conditions));

    return { approvals: list, total: Number(count) };
  });

  // Create approval request
  app.post("/", { preHandler: requirePermission("approval.create") }, async (request) => {
    const { type, title, description, payload, diff, requiredApprovers, expiresAt } = request.body as any;
    const { tenantId } = request.user!;

    const [approval] = await app.db.insert(approvals).values({
      tenantId: tenantId!, type, title, description,
      requesterId: request.user!.id,
      payload: payload || {}, diff: diff || {},
      requiredApprovers: requiredApprovers || 1,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    }).returning();

    await logAudit(request, "approval.create", `approval:${approval.id}`, { resourceType: "approval", after: approval });
    return { approval };
  });

  // Approve
  app.post("/:id/approve", { preHandler: requirePermission("approval.approve") }, async (request) => {
    const { id } = request.params as { id: string };
    const { note } = request.body as { note?: string };

    const [current] = await app.db.select().from(approvals).where(eq(approvals.id, id)).limit(1);
    if (!current || current.status !== "pending") return { error: "Invalid approval" };

    const newApprovedBy = [...(current.approvedBy as any[] || []), {
      userId: request.user!.id, at: new Date().toISOString(), note,
    }];

    const isFullyApproved = newApprovedBy.length >= (current.requiredApprovers || 1);

    const [updated] = await app.db.update(approvals).set({
      approvedBy: newApprovedBy,
      status: isFullyApproved ? "approved" : "pending",
      resolvedAt: isFullyApproved ? new Date() : null,
    }).where(eq(approvals.id, id)).returning();

    await logAudit(request, "approval.approve", `approval:${id}`, { resourceType: "approval", after: updated });

    // TODO: if fully approved, execute the approved action via BFF
    return { approval: updated };
  });

  // Reject
  app.post("/:id/reject", { preHandler: requirePermission("approval.approve") }, async (request) => {
    const { id } = request.params as { id: string };
    const { reason } = request.body as { reason?: string };

    const [updated] = await app.db.update(approvals).set({
      status: "rejected",
      rejectedBy: { userId: request.user!.id, at: new Date().toISOString(), reason },
      resolvedAt: new Date(),
    }).where(eq(approvals.id, id)).returning();

    await logAudit(request, "approval.reject", `approval:${id}`, { resourceType: "approval" });
    return { approval: updated };
  });

  // Get detail
  app.get("/:id", { preHandler: requirePermission("approval.read") }, async (request) => {
    const { id } = request.params as { id: string };
    const [approval] = await app.db.select().from(approvals).where(eq(approvals.id, id)).limit(1);
    return { approval };
  });
};
