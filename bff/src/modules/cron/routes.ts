import { FastifyPluginAsync } from "fastify";
import { requirePermission } from "../../middleware/auth.js";
import { logAudit } from "../../middleware/audit.js";
import { proxyToGateway } from "../gateway/routes.js";

export const cronRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", { preHandler: requirePermission("cron.read") }, async (request) => {
    try {
      return await proxyToGateway(app, request.user!.tenantId!, "/api/crons");
    } catch { return { crons: [] }; }
  });

  app.post("/", { preHandler: requirePermission("cron.create") }, async (request) => {
    const body = request.body as any;
    await logAudit(request, "cron.create", `cron:new`, { resourceType: "cron", after: body });
    // In production this would go through approval first
    try {
      return await proxyToGateway(app, request.user!.tenantId!, "/api/crons", "POST", body);
    } catch (e: any) { return { error: e.message }; }
  });

  app.post("/:id/run", { preHandler: requirePermission("cron.run") }, async (request) => {
    const { id } = request.params as { id: string };
    await logAudit(request, "cron.manual_run", `cron:${id}`, { resourceType: "cron" });
    try {
      return await proxyToGateway(app, request.user!.tenantId!, `/api/crons/${id}/run`, "POST");
    } catch (e: any) { return { error: e.message }; }
  });

  app.post("/:id/toggle", { preHandler: requirePermission("cron.enable") }, async (request) => {
    const { id } = request.params as { id: string };
    const { enabled } = request.body as { enabled: boolean };
    await logAudit(request, enabled ? "cron.enable" : "cron.disable", `cron:${id}`, { resourceType: "cron" });
    try {
      return await proxyToGateway(app, request.user!.tenantId!, `/api/crons/${id}/toggle`, "POST", { enabled });
    } catch (e: any) { return { error: e.message }; }
  });
};
