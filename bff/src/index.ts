import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import formbody from "@fastify/formbody";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./db/schema.js";
import { authRoutes } from "./modules/auth/routes.js";
import { tenantRoutes } from "./modules/tenant/routes.js";
import { userRoutes } from "./modules/user/routes.js";
import { roleRoutes } from "./modules/role/routes.js";
import { auditRoutes } from "./modules/audit/routes.js";
import { approvalRoutes } from "./modules/approval/routes.js";
import { gatewayRoutes } from "./modules/gateway/routes.js";
import { sessionRoutes } from "./modules/session/routes.js";
import { chatRoutes } from "./modules/chat/routes.js";
import { cronRoutes } from "./modules/cron/routes.js";
import { configRoutes } from "./modules/config/routes.js";
import { alertRoutes } from "./modules/alert/routes.js";
import { agentRoutes } from "./modules/agent/routes.js";
import { skillRoutes } from "./modules/skill/routes.js";
import { nodeRoutes } from "./modules/node/routes.js";
import { exportRoutes } from "./modules/export/routes.js";
import { tokenRoutes } from "./modules/token/routes.js";
import { orgRoutes } from "./modules/org/routes.js";

const PORT = parseInt(process.env.PORT || "4100");
const DATABASE_URL = process.env.DATABASE_URL || "postgres://control:control@localhost:5432/control_ui";

const sql = postgres(DATABASE_URL);
const db = drizzle(sql, { schema });
const app = Fastify({ logger: { level: "info" }, trustProxy: true });

await app.register(cors, { origin: ["https://x.robotai.cloud", "https://y.robotai.cloud", "http://localhost:3100"], credentials: true });
await app.register(cookie, { secret: process.env.COOKIE_SECRET || "change-me-in-production-32chars!!" });
await app.register(formbody);
await app.register(rateLimit, { max: 500, timeWindow: "1 minute" });
await app.register(websocket);

app.decorate("db", db);
app.decorate("sql", sql);

app.get("/api/v1/health", async () => ({ status: "ok", time: new Date().toISOString() }));

await app.register(authRoutes, { prefix: "/api/v1/auth" });
await app.register(tenantRoutes, { prefix: "/api/v1/tenants" });
await app.register(userRoutes, { prefix: "/api/v1/users" });
await app.register(roleRoutes, { prefix: "/api/v1/roles" });
await app.register(auditRoutes, { prefix: "/api/v1/audit" });
await app.register(approvalRoutes, { prefix: "/api/v1/approvals" });
await app.register(gatewayRoutes, { prefix: "/api/v1/gateway" });
await app.register(sessionRoutes, { prefix: "/api/v1/sessions" });
await app.register(chatRoutes, { prefix: "/api/v1/chat" });
await app.register(cronRoutes, { prefix: "/api/v1/crons" });
await app.register(configRoutes, { prefix: "/api/v1/config" });
await app.register(alertRoutes, { prefix: "/api/v1/alerts" });
await app.register(agentRoutes, { prefix: "/api/v1/agents" });
await app.register(skillRoutes, { prefix: "/api/v1/skills" });
await app.register(nodeRoutes, { prefix: "/api/v1/nodes" });
await app.register(exportRoutes, { prefix: "/api/v1/exports" });
await app.register(tokenRoutes, { prefix: "/api/v1/tokens" });
await app.register(orgRoutes, { prefix: "/api/v1/org" });

// Security headers
app.addHook("onSend", async (request: any, reply: any) => {
  reply.header("X-Content-Type-Options", "nosniff");
  reply.header("X-Frame-Options", "DENY");
  reply.header("X-XSS-Protection", "1; mode=block");
  reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
});

// WebSocket routes
app.get("/ws/logs", { websocket: true }, (socket: any, req: any) => {
  socket.send(JSON.stringify({ type: "connected", message: "Log stream connected" }));
  const iv = setInterval(() => {
    socket.send(JSON.stringify({ type: "log", level: "info", timestamp: new Date().toISOString(), message: "[heartbeat] System running normally" }));
  }, 5000);
  socket.on("close", () => clearInterval(iv));
});

app.get("/ws/chat", { websocket: true }, (socket: any, req: any) => {
  socket.send(JSON.stringify({ type: "connected", message: "Chat stream connected" }));
  socket.on("message", (msg: any) => {
    try {
      const data = JSON.parse(msg.toString());
      socket.send(JSON.stringify({ type: "response", content: "Echo: " + data.message, done: true }));
    } catch {}
  });
});

try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`🚀 BFF running on port ${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

declare module "fastify" {
  interface FastifyInstance {
    db: typeof db;
    sql: typeof sql;
  }
}

