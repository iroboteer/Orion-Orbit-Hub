import { FastifyPluginAsync } from "fastify";
import { eq, and } from "drizzle-orm";
import { users, userSessions, tenantMembers, tenants } from "../../db/schema.js";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { authenticate } from "../../middleware/auth.js";
import { logAudit } from "../../middleware/audit.js";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/login", async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };
    
    const [user] = await app.db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || !user.passwordHash) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }
    if (user.status !== "active") {
      return reply.code(403).send({ error: "Account not active", status: user.status });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await app.db.update(users).set({ loginFailCount: (user.loginFailCount || 0) + 1 }).where(eq(users.id, user.id));
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const memberships = await app.db.select({
      tenantId: tenantMembers.tenantId,
      tenantName: tenants.name,
      tenantSlug: tenants.slug,
    })
      .from(tenantMembers)
      .innerJoin(tenants, eq(tenantMembers.tenantId, tenants.id))
      .where(and(eq(tenantMembers.userId, user.id), eq(tenantMembers.status, "active")));

    const defaultTenantId = memberships[0]?.tenantId || null;

    const token = nanoid(64);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await app.db.insert(userSessions).values({
      userId: user.id,
      tenantId: defaultTenantId,
      token,
      ip: request.ip,
      userAgent: request.headers["user-agent"] || null,
      expiresAt,
    });

    await app.db.update(users).set({
      lastLoginAt: new Date(),
      lastLoginIp: request.ip,
      loginFailCount: 0,
    }).where(eq(users.id, user.id));

    // Set cookie - NO Secure flag for non-HTTPS
    reply.setCookie("session_token", token, {
      path: "/",
      httpOnly: true,
      secure: request.headers["x-forwarded-proto"] === "https",
      sameSite: "lax",
      maxAge: 86400,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        isPlatformAdmin: user.isPlatformAdmin,
      },
      tenants: memberships,
      currentTenant: defaultTenantId,
      token,
    };
  });

  app.post("/logout", { preHandler: authenticate }, async (request, reply) => {
    const token = request.cookies.session_token || request.headers.authorization?.replace("Bearer ", "");
    if (token) {
      await app.db.delete(userSessions).where(eq(userSessions.token, token));
    }
    reply.clearCookie("session_token", { path: "/" });
    return { success: true };
  });

  app.get("/me", { preHandler: authenticate }, async (request) => {
    const user = request.user!;
    const memberships = await app.db.select({
      tenantId: tenantMembers.tenantId,
      tenantName: tenants.name,
      tenantSlug: tenants.slug,
    })
      .from(tenantMembers)
      .innerJoin(tenants, eq(tenantMembers.tenantId, tenants.id))
      .where(and(eq(tenantMembers.userId, user.id), eq(tenantMembers.status, "active")));

    return { user, tenants: memberships };
  });

  app.post("/switch-tenant", { preHandler: authenticate }, async (request, reply) => {
    const { tenantId } = request.body as { tenantId: string };
    const token = request.cookies.session_token || request.headers.authorization?.replace("Bearer ", "");
    if (token) {
      await app.db.update(userSessions).set({ tenantId }).where(eq(userSessions.token, token));
    }
    return { success: true, tenantId };
  });

  app.get("/sessions", { preHandler: authenticate }, async (request) => {
    const sessions = await app.db.select({
      id: userSessions.id, ip: userSessions.ip,
      userAgent: userSessions.userAgent, createdAt: userSessions.createdAt,
      expiresAt: userSessions.expiresAt,
    }).from(userSessions).where(eq(userSessions.userId, request.user!.id));
    return { sessions };
  });

  // Change password
  app.post("/change-password", async (request, reply) => {
    if (!request.user) return reply.code(401).send({ error: "Unauthorized" });
    const { currentPassword, newPassword } = request.body as any;
    if (!currentPassword || !newPassword) return reply.code(400).send({ error: "Missing fields" });
    if (newPassword.length < 6) return reply.code(400).send({ error: "Password too short (min 6)" });
    const [user] = await app.db.select().from(users).where(eq(users.id, request.user.id)).limit(1);
    if (!user) return reply.code(404).send({ error: "User not found" });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return reply.code(403).send({ error: "Current password incorrect" });
    const hash = await bcrypt.hash(newPassword, 10);
    await app.db.update(users).set({ passwordHash: hash }).where(eq(users.id, request.user.id));
    return { ok: true };
  });
};

