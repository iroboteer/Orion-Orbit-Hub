import { FastifyPluginAsync } from "fastify";
import { requirePermission } from "../../middleware/auth.js";
import { proxyToGateway } from "../gateway/routes.js";

export const skillRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", { preHandler: requirePermission("gateway.read") }, async (request) => {
    try {
      const data = await proxyToGateway(app, request.user!.tenantId!, "/api/skills");
      return { skills: data?.skills || [] };
    } catch { return { skills: [] }; }
  });
  app.post("/install", { preHandler: requirePermission("skill.manage") }, async (request) => {
    try { return await proxyToGateway(app, request.user!.tenantId!, "/api/skills/install", "POST", request.body); }
    catch (e: any) { return { error: e.message }; }
  });
  app.post("/:skillId/enable", { preHandler: requirePermission("skill.manage") }, async (request) => {
    const { skillId } = request.params as any;
    try { return await proxyToGateway(app, request.user!.tenantId!, "/api/skills/" + skillId + "/enable", "POST"); }
    catch (e: any) { return { error: e.message }; }
  });
  app.post("/:skillId/disable", { preHandler: requirePermission("skill.manage") }, async (request) => {
    const { skillId } = request.params as any;
    try { return await proxyToGateway(app, request.user!.tenantId!, "/api/skills/" + skillId + "/disable", "POST"); }
    catch (e: any) { return { error: e.message }; }
  });
  app.delete("/:skillId", { preHandler: requirePermission("skill.manage") }, async (request) => {
    const { skillId } = request.params as any;
    try { return await proxyToGateway(app, request.user!.tenantId!, "/api/skills/" + skillId, "DELETE"); }
    catch (e: any) { return { error: e.message }; }
  });
};
