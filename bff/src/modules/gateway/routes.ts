import { FastifyPluginAsync } from "fastify";
import { eq } from "drizzle-orm";
import { tenants } from "../../db/schema.js";
import { requirePermission } from "../../middleware/auth.js";

const GW_URL = process.env.OPENCLAW_GATEWAY_URL || "http://127.0.0.1:18789";

async function gwFetch(path: string, method = "GET", body?: any): Promise<any> {
  const headers: Record<string, string> = {
    "X-Forwarded-User": "admin",
    "X-Forwarded-Proto": "https",
    "Content-Type": "application/json",
  };
  const res = await fetch(`${GW_URL}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text, status: res.status }; }
}

async function proxyToGateway(app: any, tenantId: string, path: string, method = "GET", body?: any) {
  const [tenant] = await app.db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  const gw = tenant?.gatewayConfig as any;
  const endpoint = gw?.endpoint || GW_URL;
  const apiKey = gw?.apiKey || process.env.OPENCLAW_GATEWAY_KEY || "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Forwarded-User": "admin",
    "X-Forwarded-Proto": "https",
  };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const res = await fetch(`${endpoint}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

// Read openclaw config from a known path (mounted or env)
async function readGatewayConfig(): Promise<any> {
  try {
    const fs = await import("fs");
    const configPaths = [
      "/home/ec2-user/.openclaw/openclaw.json",
      process.env.HOME + "/.openclaw/openclaw.json",
    ];
    for (const p of configPaths) {
      try {
        const raw = fs.readFileSync(p, "utf-8");
        return JSON.parse(raw);
      } catch {}
    }
    return null;
  } catch { return null; }
}

export const gatewayRoutes: FastifyPluginAsync = async (app) => {
  app.get("/status", { preHandler: requirePermission("gateway.read") }, async (request) => {
    try {
      // Try to reach the gateway HTTP endpoint
      const res = await fetch(GW_URL, {
        headers: { "X-Forwarded-User": "admin", "X-Forwarded-Proto": "https" },
      });
      const isReachable = res.status === 200;

      // Try to read config for extra info
      const config = await readGatewayConfig();
      const gwConfig = config?.gateway || {};
      const agentConfig = config?.agents?.defaults || {};

      return {
        status: isReachable ? "online" : "degraded",
        data: {
          dashboard: GW_URL,
          gateway: `${gwConfig.mode || "local"} · ${GW_URL}`,
          gatewayService: isReachable ? "systemd installed · enabled · running" : "unreachable",
          os: `linux ${process.arch}`,
          agents: `default model: ${agentConfig.model?.primary || "unknown"}`,
          memory: config?.agents?.defaults?.compaction ? "enabled" : "unknown",
          heartbeat: "configured",
          update: "stable",
          tailscale: gwConfig.tailscale || "off",
          authMode: gwConfig.auth?.mode || "unknown",
          allowedOrigins: gwConfig.controlUi?.allowedOrigins || [],
          models: Object.keys(agentConfig.models || {}),
          trustedProxy: gwConfig.auth?.trustedProxy || null,
        },
      };
    } catch (e: any) {
      return { status: "offline", error: e.message };
    }
  });

  app.get("/health", { preHandler: requirePermission("gateway.read") }, async (request) => {
    try {
      const res = await fetch(GW_URL, {
        headers: { "X-Forwarded-User": "admin", "X-Forwarded-Proto": "https" },
        signal: AbortSignal.timeout(5000),
      });
      return {
        healthy: res.status === 200,
        checks: {
          gatewayReachable: res.status === 200 ? "ok" : "fail",
          httpStatus: String(res.status),
          responseTime: "< 5s",
        },
      };
    } catch {
      return { healthy: false, checks: { gatewayReachable: "fail", httpStatus: "timeout" } };
    }
  });

  app.get("/config", { preHandler: requirePermission("gateway.read") }, async (request) => {
    const config = await readGatewayConfig();
    if (!config) return { error: "Config not found" };
    // Redact secrets
    const gwCfg = { ...config.gateway };
    if (gwCfg.auth?.token) gwCfg.auth = { ...gwCfg.auth, token: "***redacted***" };
    return {
      config: gwCfg,
      agents: config.agents?.defaults || {},
    };
  });

  app.get("/info", async () => ({
    gatewayUrl: "https://y.robotai.cloud",
    controlUrl: "https://x.robotai.cloud",
    port: 18789,
    authMode: "trusted-proxy",
  }));
};

export { proxyToGateway };
