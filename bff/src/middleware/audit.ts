import { FastifyRequest } from "fastify";
import { auditLogs } from "../db/schema.js";
import { nanoid } from "nanoid";

export async function logAudit(
  request: FastifyRequest,
  action: string,
  resource: string,
  opts: {
    resourceType?: string;
    before?: any;
    after?: any;
    result?: "success" | "failure" | "denied";
    metadata?: Record<string, any>;
  } = {}
) {
  const db = request.server.db;
  const user = request.user;

  await db.insert(auditLogs).values({
    tenantId: user?.tenantId || null,
    userId: user?.id || null,
    action,
    resource,
    resourceType: opts.resourceType,
    result: opts.result || "success",
    requestId: nanoid(16),
    ip: request.ip,
    userAgent: request.headers["user-agent"] || null,
    before: opts.before,
    after: opts.after,
    metadata: opts.metadata || {},
  });
}
