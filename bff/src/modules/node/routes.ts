import { FastifyPluginAsync } from "fastify";
import { requirePermission } from "../../middleware/auth.js";
import { proxyToGateway } from "../gateway/routes.js";

export const nodeRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", { preHandler: requirePermission("gateway.read") }, async (request) => {
    try { const d = await proxyToGateway(app, request.user!.tenantId!, "/api/nodes"); return { nodes: d?.nodes || [] }; }
    catch { return { nodes: [] }; }
  });
  app.get("/pending", { preHandler: requirePermission("node.manage") }, async (request) => {
    try { const d = await proxyToGateway(app, request.user!.tenantId!, "/api/nodes/pending"); return { pending: d?.pending || [] }; }
    catch { return { pending: [] }; }
  });
  app.post("/:nodeId/approve", { preHandler: requirePermission("node.manage") }, async (request) => {
    const { nodeId } = request.params as any;
    try { return await proxyToGateway(app, request.user!.tenantId!, "/api/nodes/" + nodeId + "/approve", "POST"); }
    catch (e: any) { return { error: e.message }; }
  });
  app.post("/:nodeId/reject", { preHandler: requirePermission("node.manage") }, async (request) => {
    const { nodeId } = request.params as any;
    try { return await proxyToGateway(app, request.user!.tenantId!, "/api/nodes/" + nodeId + "/reject", "POST"); }
    catch (e: any) { return { error: e.message }; }
  });
  app.delete("/:nodeId", { preHandler: requirePermission("node.manage") }, async (request) => {
    const { nodeId } = request.params as any;
    try { return await proxyToGateway(app, request.user!.tenantId!, "/api/nodes/" + nodeId, "DELETE"); }
    catch (e: any) { return { error: e.message }; }
  });
  app.post("/:nodeId/notify", { preHandler: requirePermission("node.manage") }, async (request) => {
    const { nodeId } = request.params as any;
    try { return await proxyToGateway(app, request.user!.tenantId!, "/api/nodes/" + nodeId + "/notify", "POST", request.body); }
    catch (e: any) { return { error: e.message }; }
  });
  app.get("/:nodeId/camera", { preHandler: requirePermission("node.manage") }, async (request) => {
    const { nodeId } = request.params as any;
    try { return await proxyToGateway(app, request.user!.tenantId!, "/api/nodes/" + nodeId + "/camera"); }
    catch (e: any) { return { error: e.message }; }
  });
  app.get("/:nodeId/location", { preHandler: requirePermission("node.manage") }, async (request) => {
    const { nodeId } = request.params as any;
    try { return await proxyToGateway(app, request.user!.tenantId!, "/api/nodes/" + nodeId + "/location"); }
    catch (e: any) { return { error: e.message }; }
  });
};
