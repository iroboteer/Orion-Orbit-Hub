import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Button, Card, Typography, message, Space, Select, Divider } from "antd";
import { UserOutlined, LockOutlined, GlobalOutlined } from "@ant-design/icons";
import { useAuth } from "@/stores/auth";
import { useI18n } from "@/i18n";

const { Title, Text, Paragraph } = Typography;

const i18nLogin: Record<string, Record<string, string>> = {
  "en-US": {
    headline: "Command Your AI Agents",
    subhead: "One control plane for all your AI agents, skills, and nodes.",
    email: "Email",
    password: "Password",
    signIn: "Sign In",
    sso: "Enterprise SSO",
    ssoSub: "Azure AD · Okta · Keycloak · Google Workspace",
    feat1: "Multi-Agent Orchestration",
    feat2: "Real-time Session Control",
    feat3: "Enterprise RBAC & Audit",
    copyright: "Secure. Audited. Enterprise-ready.",
  },
  "zh-CN": {
    headline: "掌控你的 AI Agent",
    subhead: "统一管控所有 AI Agent、技能插件和边缘节点",
    email: "邮箱",
    password: "密码",
    signIn: "登 录",
    sso: "企业单点登录",
    ssoSub: "Azure AD · Okta · Keycloak · Google Workspace",
    feat1: "多 Agent 编排调度",
    feat2: "实时会话监控",
    feat3: "企业级权限与审计",
    copyright: "安全 · 可审计 · 企业级",
  },
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { locale, setLocale } = useI18n();
  const [loading, setLoading] = useState(false);
  const t = i18nLogin[locale] || i18nLogin["en-US"];

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      navigate("/");
    } catch (err: any) {
      message.error(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
      position: "relative", overflow: "hidden",
    }}>
      {/* Animated background dots */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.06, backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      {/* Language switcher */}
      <div style={{ position: "absolute", top: 20, right: 24 }}>
        <Select value={locale} onChange={(v) => { setLocale(v); }} size="small"
          style={{ width: 110 }} bordered={false}
          dropdownStyle={{ borderRadius: 8 }}
          options={[{ value: "en-US", label: "🌐 English" }, { value: "zh-CN", label: "🇨🇳 中文" }]}
          suffixIcon={<GlobalOutlined style={{ color: "#ffffff80" }} />}
        />
      </div>

      <div style={{ display: "flex", gap: 80, alignItems: "center", maxWidth: 960, width: "100%", padding: "0 40px" }}>
        {/* Left: Branding */}
        <div style={{ flex: 1, color: "#fff", display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: "linear-gradient(135deg, #667eea, #764ba2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, boxShadow: "0 4px 20px rgba(102,126,234,0.4)",
              }}>⬡</div>
              <Text style={{ color: "#ffffff90", fontSize: 18, fontWeight: 500, letterSpacing: 2 }}>NEXUSCORE</Text>
            </div>
            <Title level={1} style={{ color: "#fff", margin: 0, fontSize: 42, fontWeight: 700, lineHeight: 1.2 }}>
              {t.headline}
            </Title>
            <Paragraph style={{ color: "#ffffff80", fontSize: 18, marginTop: 12, lineHeight: 1.6 }}>
              {t.subhead}
            </Paragraph>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
            {[
              { icon: "🤖", text: t.feat1 },
              { icon: "⚡", text: t.feat2 },
              { icon: "🛡️", text: t.feat3 },
            ].map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                }}>{f.icon}</div>
                <Text style={{ color: "#ffffffcc", fontSize: 15 }}>{f.text}</Text>
              </div>
            ))}
          </div>

          <Text style={{ color: "#ffffff40", fontSize: 13, marginTop: 16 }}>{t.copyright}</Text>
        </div>

        {/* Right: Login Card */}
        <Card style={{
          width: 400, borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.97)",
        }}>
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <div style={{ textAlign: "center" }}>
              <Title level={3} style={{ margin: 0 }}>{t.signIn}</Title>
            </div>
            <Form layout="vertical" onFinish={onFinish} autoComplete="off" size="large">
              <Form.Item name="email" rules={[{ required: true, message: t.email }]}>
                <Input prefix={<UserOutlined />} placeholder={t.email} style={{ borderRadius: 10, height: 46 }} />
              </Form.Item>
              <Form.Item name="password" rules={[{ required: true, message: t.password }]}>
                <Input.Password prefix={<LockOutlined />} placeholder={t.password} style={{ borderRadius: 10, height: 46 }} />
              </Form.Item>
              <Form.Item style={{ marginBottom: 8 }}>
                <Button type="primary" htmlType="submit" block loading={loading}
                  style={{
                    height: 48, borderRadius: 10, fontSize: 16, fontWeight: 600,
                    background: "linear-gradient(135deg, #667eea, #764ba2)",
                    border: "none",
                  }}>
                  {t.signIn}
                </Button>
              </Form.Item>
            </Form>
            <Divider style={{ margin: "0", fontSize: 12, color: "#999" }}>{t.sso}</Divider>
            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              {["Microsoft", "Okta", "Keycloak", "Google"].map(p => (
                <Button key={p} size="small" style={{ borderRadius: 8, fontSize: 12, color: "#666" }}>{p}</Button>
              ))}
            </div>
          </Space>
        </Card>
      </div>
    </div>
  );
}
