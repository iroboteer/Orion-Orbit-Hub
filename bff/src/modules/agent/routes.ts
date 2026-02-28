import { FastifyPluginAsync } from "fastify";
import { requirePermission } from "../../middleware/auth.js";
import { proxyToGateway } from "../gateway/routes.js";

export const agentRoutes: FastifyPluginAsync = async (app) => {
  // List agents
  app.get("/", { preHandler: requirePermission("gateway.read") }, async (request) => {
    try {
      const data = await proxyToGateway(app, request.user!.tenantId!, "/api/agents");
      return { agents: data?.agents || [] };
    } catch {
      return { agents: [] };
    }
  });

  // Get agent detail
  app.get("/:agentId", { preHandler: requirePermission("gateway.read") }, async (request) => {
    const { agentId } = request.params as any;
    try {
      const data = await proxyToGateway(app, request.user!.tenantId!, `/api/agents/${agentId}`);
      return { agent: data };
    } catch (e: any) {
      return { error: e.message };
    }
  });

  // Create agent
  app.post("/", { preHandler: requirePermission("gateway.write") }, async (request) => {
    try {
      const data = await proxyToGateway(app, request.user!.tenantId!, "/api/agents", "POST", request.body);
      return data;
    } catch (e: any) {
      return { error: e.message };
    }
  });

  // Update agent
  app.put("/:agentId", { preHandler: requirePermission("gateway.write") }, async (request) => {
    const { agentId } = request.params as any;
    try {
      const data = await proxyToGateway(app, request.user!.tenantId!, `/api/agents/${agentId}`, "PUT", request.body);
      return data;
    } catch (e: any) {
      return { error: e.message };
    }
  });

  // Delete agent
  app.delete("/:agentId", { preHandler: requirePermission("gateway.write") }, async (request) => {
    const { agentId } = request.params as any;
    try {
      const data = await proxyToGateway(app, request.user!.tenantId!, `/api/agents/${agentId}`, "DELETE");
      return data;
    } catch (e: any) {
      return { error: e.message };
    }
  });

  // Start/Stop agent
  app.post("/:agentId/:action", { preHandler: requirePermission("gateway.write") }, async (request) => {
    const { agentId, action } = request.params as any;
    if (!["start", "stop", "restart"].includes(action)) return { error: "Invalid action" };
    try {
      const data = await proxyToGateway(app, request.user!.tenantId!, `/api/agents/${agentId}/${action}`, "POST");
      return data;
    } catch (e: any) {
      return { error: e.message };
    }
  });

  // Agent sessions
  app.get("/:agentId/sessions", { preHandler: requirePermission("session.read") }, async (request) => {
    const { agentId } = request.params as any;
    try {
      const data = await proxyToGateway(app, request.user!.tenantId!, `/api/agents/${agentId}/sessions`);
      return data;
    } catch {
      return { sessions: [] };
    }
  });
};
