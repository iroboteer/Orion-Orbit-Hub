import { FastifyPluginAsync } from "fastify";
import { eq, and, isNull } from "drizzle-orm";
import { roles, userRoles, users } from "../../db/schema.js";
import { requirePermission } from "../../middleware/auth.js";
import { logAudit } from "../../middleware/audit.js";
import { PERMISSIONS } from "../../lib/permissions.js";

export const roleRoutes: FastifyPluginAsync = async (app) => {
  // List all permission points
  app.get("/permissions", { preHandler: requirePermission("role.read") }, async () => {
    return { permissions: Object.entries(PERMISSIONS).map(([key, desc]) => ({ key, description: desc })) };
  });

  // List roles for current tenant
  app.get("/", { preHandler: requirePermission("role.read") }, async (request) => {
    const { tenantId } = request.user!;
    const list = await app.db.select().from(roles).where(
      tenantId ? eq(roles.tenantId, tenantId) : isNull(roles.tenantId)
    );
    return { roles: list };
  });

  // Create role
  app.post("/", { preHandler: requirePermission("role.write") }, async (request) => {
    const { name, displayName, description, permissions: perms } = request.body as any;
    const { tenantId } = request.user!;
    const [role] = await app.db.insert(roles).values({
      tenantId, name, displayName, description, permissions: perms || [],
    }).returning();
    await logAudit(request, "role.create", `role:${role.id}`, { resourceType: "role", after: role });
    return { role };
  });

  // Update role
  app.put("/:id", { preHandler: requirePermission("role.write") }, async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;
    const [before] = await app.db.select().from(roles).where(eq(roles.id, id)).limit(1);
    if (before?.isSystem) return { error: "Cannot edit system roles" };
    const [role] = await app.db.update(roles).set({
      ...body, version: (before?.version || 0) + 1, updatedAt: new Date(),
    }).where(eq(roles.id, id)).returning();
    await logAudit(request, "role.update", `role:${id}`, { resourceType: "role", before, after: role });
    return { role };
  });

  // Delete role
  app.delete("/:id", { preHandler: requirePermission("role.write") }, async (request) => {
    const { id } = request.params as { id: string };
    const [role] = await app.db.select().from(roles).where(eq(roles.id, id)).limit(1);
    if (role?.isSystem) return { error: "Cannot delete system roles" };
    await app.db.delete(userRoles).where(eq(userRoles.roleId, id));
    await app.db.delete(roles).where(eq(roles.id, id));
    await logAudit(request, "role.delete", `role:${id}`, { resourceType: "role" });
    return { success: true };
  });

  // Get role members
  app.get("/:id/members", { preHandler: requirePermission("role.read") }, async (request) => {
    const { id } = request.params as { id: string };
    const members = await app.db.select({
      userId: users.id, email: users.email, displayName: users.displayName,
      assignedAt: userRoles.assignedAt,
    }).from(userRoles).innerJoin(users, eq(users.id, userRoles.userId)).where(eq(userRoles.roleId, id));
    return { members };
  });
};
