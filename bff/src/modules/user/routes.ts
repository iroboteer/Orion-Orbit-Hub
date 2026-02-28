import { FastifyPluginAsync } from "fastify";
import { eq, and, like, or, sql } from "drizzle-orm";
import { users, tenantMembers, userRoles, roles, tenants } from "../../db/schema.js";
import { requirePermission, authenticate } from "../../middleware/auth.js";
import { logAudit } from "../../middleware/audit.js";
import bcrypt from "bcryptjs";

export const userRoutes: FastifyPluginAsync = async (app) => {
  // List tenant users
  app.get("/", { preHandler: requirePermission("user.tenant.read") }, async (request) => {
    const { tenantId } = request.user!;
    const { search, page = "1", pageSize = "20" } = request.query as any;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    
    let query = app.db.select({
      id: users.id, email: users.email, displayName: users.displayName,
      status: users.status, lastLoginAt: users.lastLoginAt, lastLoginIp: users.lastLoginIp,
      createdAt: users.createdAt, idpProvider: users.idpProvider, mfaEnabled: users.mfaEnabled,
    })
    .from(users)
    .innerJoin(tenantMembers, and(eq(tenantMembers.userId, users.id), eq(tenantMembers.tenantId, tenantId!)))
    .limit(parseInt(pageSize)).offset(offset);

    const list = await query;
    const [{ count }] = await app.db.select({ count: sql<number>`count(*)` })
      .from(tenantMembers).where(eq(tenantMembers.tenantId, tenantId!));

    return { users: list, total: Number(count), page: parseInt(page), pageSize: parseInt(pageSize) };
  });

  // Global user search (platform admin)
  app.get("/global", { preHandler: requirePermission("user.global.read") }, async (request) => {
    const { search, page = "1", pageSize = "20" } = request.query as any;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const list = await app.db.select({
      id: users.id, email: users.email, displayName: users.displayName,
      status: users.status, isPlatformAdmin: users.isPlatformAdmin,
      lastLoginAt: users.lastLoginAt, createdAt: users.createdAt,
    }).from(users).limit(parseInt(pageSize)).offset(offset);
    const [{ count }] = await app.db.select({ count: sql<number>`count(*)` }).from(users);
    return { users: list, total: Number(count) };
  });

  // Get user detail
  app.get("/:id", { preHandler: requirePermission("user.tenant.read") }, async (request) => {
    const { id } = request.params as { id: string };
    const [user] = await app.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user) return { error: "Not found" };
    
    const memberOf = await app.db.select({
      tenantId: tenantMembers.tenantId, tenantName: tenants.name, status: tenantMembers.status,
    }).from(tenantMembers).innerJoin(tenants, eq(tenants.id, tenantMembers.tenantId)).where(eq(tenantMembers.userId, id));
    
    const userRolesList = await app.db.select({
      roleId: roles.id, roleName: roles.displayName, permissions: roles.permissions,
    }).from(userRoles).innerJoin(roles, eq(roles.id, userRoles.roleId)).where(eq(userRoles.userId, id));

    const { passwordHash, ...safeUser } = user;
    return { user: safeUser, tenants: memberOf, roles: userRolesList };
  });

  // Invite user to tenant
  app.post("/invite", { preHandler: requirePermission("user.tenant.invite") }, async (request) => {
    const { email, displayName, password, roleId } = request.body as any;
    const { tenantId } = request.user!;

    let [user] = await app.db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      const hash = password ? await bcrypt.hash(password, 10) : null;
      [user] = await app.db.insert(users).values({
        email, displayName: displayName || email.split("@")[0],
        status: "active", passwordHash: hash, idpProvider: "local",
      }).returning();
    }

    await app.db.insert(tenantMembers).values({
      tenantId: tenantId!, userId: user.id, status: "active",
    }).onConflictDoNothing();

    if (roleId) {
      await app.db.insert(userRoles).values({
        userId: user.id, roleId, tenantId: tenantId!, assignedBy: request.user!.id,
      }).onConflictDoNothing();
    }

    await logAudit(request, "user.invite", `user:${user.id}`, { resourceType: "user", after: { email, tenantId } });
    return { user: { id: user.id, email: user.email, displayName: user.displayName } };
  });

  // Update user status
  app.put("/:id/status", { preHandler: requirePermission("user.tenant.remove") }, async (request) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };
    const [updated] = await app.db.update(users).set({ status: status as any, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    await logAudit(request, "user.status_change", `user:${id}`, { resourceType: "user", after: { status } });
    return { user: updated };
  });

  // Assign role
  app.post("/:id/roles", { preHandler: requirePermission("user.tenant.role.assign") }, async (request) => {
    const { id } = request.params as { id: string };
    const { roleId } = request.body as { roleId: string };
    const { tenantId } = request.user!;
    await app.db.insert(userRoles).values({
      userId: id, roleId, tenantId: tenantId!, assignedBy: request.user!.id,
    }).onConflictDoNothing();
    await logAudit(request, "user.role.assign", `user:${id}`, { resourceType: "user", after: { roleId } });
    return { success: true };
  });

  // Remove role
  app.delete("/:id/roles/:roleId", { preHandler: requirePermission("user.tenant.role.assign") }, async (request) => {
    const { id, roleId } = request.params as { id: string; roleId: string };
    await app.db.delete(userRoles).where(and(eq(userRoles.userId, id), eq(userRoles.roleId, roleId)));
    await logAudit(request, "user.role.remove", `user:${id}`, { resourceType: "user", after: { roleId } });
    return { success: true };
  });

  // Force logout user
  app.post("/:id/force-logout", { preHandler: requirePermission("user.global.disable") }, async (request) => {
    const { id } = request.params as { id: string };
    const { userSessions } = await import("../../db/schema.js");
    await app.db.delete(userSessions).where(eq(userSessions.userId, id));
    await logAudit(request, "user.force_logout", `user:${id}`, { resourceType: "user" });
    return { success: true };
  });
};
