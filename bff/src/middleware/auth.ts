import { FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import { userSessions, users, userRoles, roles } from "../db/schema.js";
import type { Permission } from "../lib/permissions.js";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  isPlatformAdmin: boolean;
  tenantId: string | null;
  permissions: string[];
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies.session_token ||
    request.headers.authorization?.replace("Bearer ", "");
  
  if (!token) {
    return reply.code(401).send({ error: "Unauthorized" });
  }

  const db = request.server.db;
  
  // Find session
  const [session] = await db.select()
    .from(userSessions)
    .where(eq(userSessions.token, token))
    .limit(1);

  if (!session || new Date(session.expiresAt) < new Date()) {
    return reply.code(401).send({ error: "Session expired" });
  }

  // Find user
  const [user] = await db.select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user || user.status !== "active") {
    return reply.code(403).send({ error: "Account not active" });
  }

  // Get permissions for current tenant
  let permissions: string[] = [];
  if (user.isPlatformAdmin) {
    permissions = ["*"]; // platform admin has all permissions
  } else if (session.tenantId) {
    const userRolesList = await db.select({ permissions: roles.permissions })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, user.id));
    
    permissions = [...new Set(userRolesList.flatMap(r => r.permissions as string[]))];
  }

  request.user = {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    isPlatformAdmin: user.isPlatformAdmin ?? false,
    tenantId: session.tenantId,
    permissions,
  };
}

export function requirePermission(...perms: Permission[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);
    if (reply.sent) return;
    
    const user = request.user!;
    if (user.permissions.includes("*")) return; // platform admin

    const hasAll = perms.every(p => user.permissions.includes(p));
    if (!hasAll) {
      return reply.code(403).send({ error: "Insufficient permissions", required: perms });
    }
  };
}
