import { FastifyPluginAsync } from "fastify";
import { requirePermission } from "../../middleware/auth.js";
import { logAudit } from "../../middleware/audit.js";

const GW_URL = process.env.OPENCLAW_GATEWAY_URL || "http://127.0.0.1:18789";

export const chatRoutes: FastifyPluginAsync = async (app) => {
  // Send message via OpenAI-compatible chat completions
  app.post("/send", { preHandler: requirePermission("chat.send") }, async (request) => {
    const { sessionKey, message, agent, model } = request.body as any;
    await logAudit(request, "chat.send", `session:${sessionKey}`, { resourceType: "session", metadata: { messageLength: message?.length } });
    try {
      const agentId = agent?.replace("agent-", "") || "main";
      const res = await fetch(`${GW_URL}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-User": request.user?.email || "admin",
          "X-Forwarded-Proto": "https",
          "X-OpenClaw-Agent-Id": agentId,
        },
        body: JSON.stringify({
          model: `openclaw:${agentId}`,
          messages: [{ role: "user", content: message }],
          max_tokens: 4096,
        }),
      });
      const data = await res.json() as any;
      const reply = data.choices?.[0]?.message?.content || data.error?.message || "无响应";
      return { response: reply, usage: data.usage, model: data.model };
    } catch (e: any) {
      return { error: e.message };
    }
  });

  // Inject system message (simulated - gateway doesn't support direct inject via REST)
  app.post("/inject", { preHandler: requirePermission("chat.send") }, async (request) => {
    const { sessionKey, message, role } = request.body as any;
    await logAudit(request, "chat.inject", `session:${sessionKey}`, { resourceType: "session" });
    return { ok: true, injected: { role: role || "system", content: message } };
  });

  // Abort (simulated)
  app.post("/abort", { preHandler: requirePermission("chat.send") }, async (request) => {
    const { sessionKey } = request.body as any;
    await logAudit(request, "chat.abort", `session:${sessionKey}`, { resourceType: "session" });
    return { ok: true };
  });
};
