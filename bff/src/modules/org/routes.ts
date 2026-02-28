import { FastifyPluginAsync } from "fastify";
import { eq, and, desc } from "drizzle-orm";
import { departments, departmentMembers, teams, teamMembers, users } from "../../db/schema.js";
import { requirePermission } from "../../middleware/auth.js";

export const orgRoutes: FastifyPluginAsync = async (app) => {
  // === Departments ===
  app.get("/departments", { preHandler: requirePermission("user.read") }, async (request) => {
    const list = await app.db.select().from(departments)
      .where(eq(departments.tenantId, request.user!.tenantId!))
      .orderBy(departments.sortOrder);
    return { departments: list };
  });

  app.post("/departments", { preHandler: requirePermission("user.manage") }, async (request) => {
    const { name, parentId, leaderId, sortOrder } = request.body as any;
    const [dept] = await app.db.insert(departments).values({
      tenantId: request.user!.tenantId!, name, parentId, leaderId, sortOrder: sortOrder || 0,
    }).returning();
    return { department: dept };
  });

  app.put("/departments/:id", { preHandler: requirePermission("user.manage") }, async (request) => {
    const { id } = request.params as any;
    const { name, parentId, leaderId, sortOrder } = request.body as any;
    const [dept] = await app.db.update(departments).set({ name, parentId, leaderId, sortOrder })
      .where(and(eq(departments.id, id), eq(departments.tenantId, request.user!.tenantId!))).returning();
    return { department: dept };
  });

  app.delete("/departments/:id", { preHandler: requirePermission("user.manage") }, async (request) => {
    const { id } = request.params as any;
    await app.db.delete(departmentMembers).where(eq(departmentMembers.departmentId, id));
    await app.db.delete(departments).where(and(eq(departments.id, id), eq(departments.tenantId, request.user!.tenantId!)));
    return { ok: true };
  });

  app.post("/departments/:id/members", { preHandler: requirePermission("user.manage") }, async (request) => {
    const { id } = request.params as any;
    const { userId } = request.body as any;
    const [m] = await app.db.insert(departmentMembers).values({ departmentId: id, userId }).returning();
    return { member: m };
  });

  app.get("/departments/:id/members", { preHandler: requirePermission("user.read") }, async (request) => {
    const { id } = request.params as any;
    const list = await app.db.select({ id: departmentMembers.id, userId: departmentMembers.userId, email: users.email, displayName: users.displayName })
      .from(departmentMembers).leftJoin(users, eq(departmentMembers.userId, users.id))
      .where(eq(departmentMembers.departmentId, id));
    return { members: list };
  });

  // === Teams ===
  app.get("/teams", { preHandler: requirePermission("user.read") }, async (request) => {
    const list = await app.db.select().from(teams)
      .where(eq(teams.tenantId, request.user!.tenantId!))
      .orderBy(desc(teams.createdAt));
    return { teams: list };
  });

  app.post("/teams", { preHandler: requirePermission("user.manage") }, async (request) => {
    const { name, description } = request.body as any;
    const [team] = await app.db.insert(teams).values({
      tenantId: request.user!.tenantId!, name, description,
    }).returning();
    return { team };
  });

  app.put("/teams/:id", { preHandler: requirePermission("user.manage") }, async (request) => {
    const { id } = request.params as any;
    const { name, description } = request.body as any;
    const [team] = await app.db.update(teams).set({ name, description })
      .where(and(eq(teams.id, id), eq(teams.tenantId, request.user!.tenantId!))).returning();
    return { team };
  });

  app.delete("/teams/:id", { preHandler: requirePermission("user.manage") }, async (request) => {
    const { id } = request.params as any;
    await app.db.delete(teamMembers).where(eq(teamMembers.teamId, id));
    await app.db.delete(teams).where(and(eq(teams.id, id), eq(teams.tenantId, request.user!.tenantId!)));
    return { ok: true };
  });

  app.get("/teams/:id/members", { preHandler: requirePermission("user.read") }, async (request) => {
    const { id } = request.params as any;
    const list = await app.db.select({ id: teamMembers.id, userId: teamMembers.userId, role: teamMembers.role, email: users.email, displayName: users.displayName })
      .from(teamMembers).leftJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, id));
    return { members: list };
  });

  app.post("/teams/:id/members", { preHandler: requirePermission("user.manage") }, async (request) => {
    const { id } = request.params as any;
    const { userId, role } = request.body as any;
    const [m] = await app.db.insert(teamMembers).values({ teamId: id, userId, role: role || "member" }).returning();
    return { member: m };
  });

  app.delete("/teams/:teamId/members/:memberId", { preHandler: requirePermission("user.manage") }, async (request) => {
    const { memberId } = request.params as any;
    await app.db.delete(teamMembers).where(eq(teamMembers.id, memberId));
    return { ok: true };
  });
};
