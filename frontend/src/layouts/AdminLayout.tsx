import { useI18n } from "@/i18n";
import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Layout, Menu, Avatar, Dropdown, Select, Badge, Typography } from "antd";
import {
  DashboardOutlined, TeamOutlined, UserOutlined, MessageOutlined,
  FileTextOutlined, ClockCircleOutlined, SettingOutlined, AuditOutlined,
  CheckCircleOutlined, AlertOutlined, AppstoreOutlined, CloudServerOutlined,
  ApiOutlined, SafetyCertificateOutlined, RobotOutlined, KeyOutlined, ExportOutlined, ApartmentOutlined, BankOutlined, LogoutOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/stores/auth";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: "chat", icon: <MessageOutlined />, label: "受控聊天台" },
  { key: "dashboard", icon: <DashboardOutlined />, label: "仪表盘" },
  {
    key: "agent-group", icon: <RobotOutlined />, label: "Agent 中心",
    children: [
      { key: "agents", icon: <RobotOutlined />, label: "Agent 管理" },
      { key: "sessions", icon: <MessageOutlined />, label: "会话管理" },
      { key: "skills", icon: <AppstoreOutlined />, label: "技能插件" },
      { key: "nodes", icon: <ApiOutlined />, label: "设备管理" },
    ],
  },
  {
    key: "ops-group", icon: <CloudServerOutlined />, label: "运营监控",
    children: [
      { key: "logs", icon: <FileTextOutlined />, label: "日志" },
      { key: "crons", icon: <ClockCircleOutlined />, label: "定时任务" },
      { key: "gateway", icon: <ApiOutlined />, label: "网关" },
    ],
  },
  {
    key: "tenant-group", icon: <TeamOutlined />, label: "租户管理",
    children: [
      { key: "tenant/users", icon: <UserOutlined />, label: "用户管理" },
      { key: "tenant/roles", icon: <SafetyCertificateOutlined />, label: "角色权限" },
      { key: "org", icon: <ApartmentOutlined />, label: "组织架构" },
    ],
  },
  {
    key: "platform", icon: <SafetyCertificateOutlined />, label: "平台管理",
    children: [
      { key: "platform/tenants", icon: <BankOutlined />, label: "租户管理" },
      { key: "tokens", icon: <KeyOutlined />, label: "API Token" },
    ],
  },
  {
    key: "gov-group", icon: <AuditOutlined />, label: "治理审计",
    children: [
      { key: "config", icon: <SettingOutlined />, label: "配置中心" },
      { key: "approvals", icon: <CheckCircleOutlined />, label: "审批中心" },
      { key: "audit", icon: <AuditOutlined />, label: "审计日志" },
      { key: "alerts", icon: <AlertOutlined />, label: "告警中心" },
      { key: "exports", icon: <ExportOutlined />, label: "数据导出" },
    ],
  },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, tenants, currentTenant, switchTenant, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const currentKey = location.pathname.replace(/^\//, "") || "dashboard";

  const userMenu = {
    items: [
      { key: "profile", icon: <UserOutlined />, label: "个人中心", onClick: () => navigate("/profile") },
      { type: "divider" as const },
      { key: "logout", icon: <LogoutOutlined />, label: "退出登录", danger: true, onClick: () => { logout(); navigate("/login"); } },
    ],
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible collapsed={collapsed} onCollapse={setCollapsed}
        theme="dark" width={240}
        trigger={null}
        style={{ overflow: "auto", position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 100 }}
      >
        <div style={{ padding: "20px 16px 12px", textAlign: "center" }}>
          <div style={{ fontSize: collapsed ? 20 : 24, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
            {collapsed ? "🪐" : "🪐 Orion Orbit"}
          </div>
          {!collapsed && <Text style={{ color: "#ffffff60", fontSize: 12 }}>Orbit Hub</Text>}
        </div>
        <Menu
          theme="dark" mode="inline"
          selectedKeys={[currentKey]}
          defaultOpenKeys={["agent-group", "ops-group"]}
          items={menuItems}
          onClick={({ key }) => navigate(`/${key}`)}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: "margin-left 0.2s" }}>
        <Header style={{
          background: "#fff", padding: "0 24px", display: "flex",
          alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid #f0f0f0", position: "sticky", top: 0, zIndex: 99,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              onClick: () => setCollapsed(!collapsed),
              style: { fontSize: 18, cursor: "pointer" },
            })}
            {tenants.length > 0 && (
              <Select
                value={currentTenant}
                onChange={switchTenant}
                style={{ width: 200 }}
                options={tenants.map(t => ({ value: t.tenantId, label: t.tenantName }))}
                placeholder="选择租户"
              />
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            
            <Select value={useI18n.getState().locale} onChange={(v) => { useI18n.getState().setLocale(v); window.location.reload(); }} style={{ width: 90 }} size="small" options={[{ value: "zh-CN", label: "中文" }, { value: "en-US", label: "English" }]} />
            <Badge count={0}>
              <AlertOutlined style={{ fontSize: 18 }} />
            </Badge>
            <Dropdown menu={userMenu} placement="bottomRight">
              <div style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar style={{ backgroundColor: "#4945ff" }}>
                  {user?.displayName?.[0] || user?.email?.[0] || "U"}
                </Avatar>
                <Text>{user?.displayName || user?.email}</Text>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: 24, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
