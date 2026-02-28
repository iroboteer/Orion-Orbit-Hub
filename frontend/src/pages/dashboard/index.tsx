import React from "react";
import { Card, Row, Col, Statistic, Typography, Tag, Timeline } from "antd";
import {
  TeamOutlined, MessageOutlined, ClockCircleOutlined, AlertOutlined,
  CheckCircleOutlined, CloudServerOutlined, ApiOutlined, AppstoreOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/stores/auth";

const { Title, Text } = Typography;

export default function DashboardPage() {
  const { user } = useAuth();

  const stats = [
    { title: "活跃会话", value: 12, icon: <MessageOutlined />, color: "#4945ff" },
    { title: "在线渠道", value: 5, icon: <ApiOutlined />, color: "#06b6d4" },
    { title: "定时任务", value: 8, icon: <ClockCircleOutlined />, color: "#8b5cf6" },
    { title: "待处理审批", value: 3, icon: <CheckCircleOutlined />, color: "#f97316" },
    { title: "租户用户", value: 24, icon: <TeamOutlined />, color: "#10b981" },
    { title: "网关实例", value: 2, icon: <CloudServerOutlined />, color: "#ef4444" },
    { title: "已安装技能", value: 15, icon: <AppstoreOutlined />, color: "#ec4899" },
    { title: "活跃告警", value: 1, icon: <AlertOutlined />, color: "#eab308" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          👋 欢迎回来，{user?.displayName || user?.email}
        </Title>
        <Text type="secondary">NexusCore · AI 管控中枢</Text>
      </div>

      <Row gutter={[16, 16]}>
        {stats.map((s, i) => (
          <Col xs={12} sm={8} md={6} key={i}>
            <Card hoverable>
              <Statistic title={s.title} value={s.value}
                prefix={React.cloneElement(s.icon, { style: { color: s.color } })}
                valueStyle={{ color: s.color }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={12}>
          <Card title="🖥 服务状态" size="small">
            {[
              { name: "OpenClaw Gateway", status: "running" },
              { name: "BFF Server", status: "running" },
              { name: "PostgreSQL", status: "running" },
              { name: "Redis", status: "stopped" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
                <Text>{s.name}</Text>
                <Tag color={s.status === "running" ? "green" : "red"}>{s.status === "running" ? "运行中" : "已停止"}</Tag>
              </div>
            ))}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="📋 最近事件" size="small">
            <Timeline items={[
              { color: "green", children: "用户 alice@example.com 登录成功" },
              { color: "blue", children: "Cron任务 daily-report 执行成功" },
              { color: "orange", children: "审批请求: 安装插件 weather-skill" },
              { color: "red", children: "告警: Token消耗达到预算80%" },
              { color: "green", children: "配置变更 v3 已生效" },
            ]} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
