import React from "react";
import { Card, Descriptions, Tag, Typography, Statistic, Row, Col, Spin, Badge, Space, Button, Divider, Alert, Tooltip } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, LinkOutlined,
  CloudServerOutlined, ApiOutlined, SafetyCertificateOutlined, DatabaseOutlined,
  ClockCircleOutlined, RobotOutlined, GlobalOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
const { Title, Text, Paragraph } = Typography;

export default function GatewayPage() {
  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ["gateway-status"],
    queryFn: () => api.get("/gateway/status").then(r => r.data),
    refetchInterval: 15000,
  });
  const { data: health } = useQuery({
    queryKey: ["gateway-health"],
    queryFn: () => api.get("/gateway/health").then(r => r.data),
    refetchInterval: 15000,
  });
  const { data: config } = useQuery({
    queryKey: ["gateway-config"],
    queryFn: () => api.get("/gateway/config").then(r => r.data),
  });
  const { data: info } = useQuery({
    queryKey: ["gateway-info"],
    queryFn: () => api.get("/gateway/info").then(r => r.data),
  });

  const isOnline = status?.status === "online";
  const gwData = status?.data || {};
  const checks = health?.checks || {};

  return (
    <div>
      {/* Status Summary */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="网关状态" value={isOnline ? "在线" : "离线"}
              prefix={isOnline ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
              valueStyle={{ color: isOnline ? "#52c41a" : "#ff4d4f" }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="健康检查" value={health?.healthy ? "正常" : "异常"}
              prefix={health?.healthy ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
              valueStyle={{ color: health?.healthy ? "#52c41a" : "#ff4d4f" }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="认证模式" value={info?.authMode || "trusted-proxy"}
              prefix={<SafetyCertificateOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="端口" value={info?.port || 18789}
              prefix={<ApiOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* Main Info */}
      <Card title={<Space><Title level={4} style={{ margin: 0 }}>🌐 网关管理</Title>
        <Badge status={isOnline ? "processing" : "error"} text={isOnline ? "运行中" : "已停止"} /></Space>}
        extra={<Button icon={<ReloadOutlined />} onClick={() => refetch()}>刷新</Button>}
        loading={isLoading}>

        {/* Connection URLs */}
        <Card title="🔗 连接信息" size="small" type="inner" style={{ marginBottom: 16 }}>
          <Descriptions column={2} size="small">
            <Descriptions.Item label="网关控制台">
              <a href={info?.gatewayUrl || "https://y.robotai.cloud"} target="_blank" rel="noreferrer">
                <Space><LinkOutlined />{info?.gatewayUrl || "https://y.robotai.cloud"}</Space>
              </a>
            </Descriptions.Item>
            <Descriptions.Item label="管理后台">
              <a href={info?.controlUrl || "https://x.robotai.cloud"} target="_blank" rel="noreferrer">
                <Space><LinkOutlined />{info?.controlUrl || "https://x.robotai.cloud"}</Space>
              </a>
            </Descriptions.Item>
            <Descriptions.Item label="本地 Dashboard">
              <Text code>{gwData.dashboard || "http://127.0.0.1:18789"}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="WebSocket">
              <Text code>ws://127.0.0.1:18789</Text>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Gateway Details */}
        <Card title="📊 网关状态" size="small" type="inner" style={{ marginBottom: 16 }}>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label={<Space><CloudServerOutlined />网关</Space>}>
              <Text>{gwData.gateway || "-"}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Space><CloudServerOutlined />服务</Space>}>
              {gwData.gatewayService?.includes("running") ? (
                <Tag color="green" icon={<CheckCircleOutlined />}>运行中</Tag>
              ) : (
                <Tag color="red" icon={<CloseCircleOutlined />}>已停止</Tag>
              )}
              <Text type="secondary" style={{ marginLeft: 8 }}>{gwData.gatewayService}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Space><DatabaseOutlined />操作系统</Space>}>
              <Text>{gwData.os || "-"}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Space><RobotOutlined />Agent</Space>}>
              <Text>{gwData.agents || "-"}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Space><DatabaseOutlined />Memory</Space>}>
              <Text>{gwData.memory || "-"}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Space><ClockCircleOutlined />心跳</Space>}>
              <Text>{gwData.heartbeat || "-"}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<Space><GlobalOutlined />Tailscale</Space>}>
              <Tag color={gwData.tailscale === "off" ? "default" : "blue"}>{gwData.tailscale || "-"}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={<Space><ReloadOutlined />更新</Space>}>
              <Text>{gwData.update || "-"}</Text>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Health Checks */}
        <Card title="🏥 健康检查" size="small" type="inner" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            {Object.entries(checks).map(([key, val]) => (
              <Col span={8} key={key}>
                <Card size="small" style={{ textAlign: "center" }}>
                  <Badge status={val === "ok" ? "success" : val === "fail" ? "error" : "warning"} />
                  <Text style={{ marginLeft: 8 }}>{key}</Text>
                  <div><Tag color={val === "ok" ? "green" : val === "fail" ? "red" : "orange"}>{String(val)}</Tag></div>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>

        {/* Gateway Config */}
        {config?.config && (
          <Card title="⚙️ 网关配置" size="small" type="inner">
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="运行模式"><Tag color="blue">{config.config.mode || "local"}</Tag></Descriptions.Item>
              <Descriptions.Item label="认证模式"><Tag color="purple">{config.config.auth?.mode || "-"}</Tag></Descriptions.Item>
              {config.config.controlUi?.allowedOrigins && (
                <Descriptions.Item label="允许来源" span={2}>
                  <Space wrap>
                    {config.config.controlUi.allowedOrigins.map((o: string) => <Tag key={o} color="cyan">{o}</Tag>)}
                  </Space>
                </Descriptions.Item>
              )}
              {config.config.auth?.trustedProxy && (
                <>
                  <Descriptions.Item label="用户头"><Text code>{config.config.auth.trustedProxy.userHeader}</Text></Descriptions.Item>
                  <Descriptions.Item label="必需头">
                    <Space>{config.config.auth.trustedProxy.requiredHeaders?.map((h: string) => <Tag key={h}>{h}</Tag>)}</Space>
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>
            {config.agents && (
              <>
                <Divider orientation="left" style={{ marginTop: 16 }}>Agent 默认配置</Divider>
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="默认模型">
                    <Tag color="blue">{config.agents.model?.primary || "-"}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="可用模型">
                    <Space wrap>
                      {Object.keys(config.agents.models || {}).map(m => <Tag key={m}>{m}</Tag>)}
                    </Space>
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}
          </Card>
        )}
      </Card>
    </div>
  );
}
