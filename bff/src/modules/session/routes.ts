import { FastifyPluginAsync } from "fastify";
import { requirePermission } from "../../middleware/auth.js";
import { proxyToGateway } from "../gateway/routes.js";

export const sessionRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", { preHandler: requirePermission("session.read") }, async (request) => {
    try {
      const data = await proxyToGateway(app, request.user!.tenantId!, "/api/sessions");
      return data;
    } catch {
      return { sessions: [], error: "Gateway unreachable" };
    }
  });

  app.get("/:key", { preHandler: requirePermission("session.read") }, async (request) => {
    const { key } = request.params as { key: string };
    try {
      const data = await proxyToGateway(app, request.user!.tenantId!, `/api/sessions/${key}`);
      return data;
    } catch {
      return { error: "Gateway unreachable" };
    }
  });

  app.get("/:key/history", { preHandler: requirePermission("session.read") }, async (request) => {
    const { key } = request.params as { key: string };
    const { limit = "50" } = request.query as any;
    try {
      const data = await proxyToGateway(app, request.user!.tenantId!, `/api/sessions/${key}/history?limit=${limit}`);
      return data;
    } catch {
      return { messages: [], error: "Gateway unreachable" };
    }
  });
};
