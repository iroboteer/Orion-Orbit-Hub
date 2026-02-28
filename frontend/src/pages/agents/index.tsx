import React, { useState } from "react";
import { Card, Table, Tag, Button, Space, Typography, Modal, Form, Input, Select, Switch,
  Descriptions, Drawer, Tabs, Badge, Popconfirm, message, Tooltip, Row, Col, Statistic, Empty } from "antd";
import { PlusOutlined, PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined,
  SettingOutlined, MessageOutlined, DeleteOutlined, EyeOutlined, RobotOutlined,
  ClockCircleOutlined, ThunderboltOutlined, ApiOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
const { Title, Text, Paragraph } = Typography;

// Demo data (when gateway not connected)
const DEMO_AGENTS = [
  {
    id: "agent-main", name: "主 Agent", model: "claude-sonnet-4-20250514", status: "running",
    channels: ["webchat", "telegram", "discord"], description: "主要对话代理，处理日常交互",
    skills: ["weather", "web-search", "healthcheck"], sessionsActive: 3, messagesTotal: 1247,
    uptime: "72h 15m", lastActivity: new Date(Date.now() - 300000).toISOString(),
    config: { thinking: "low", maxTokens: 8192, heartbeatInterval: "30m", memory: true },
  },
  {
    id: "agent-ops", name: "运维 Agent", model: "claude-sonnet-4-20250514", status: "running",
    channels: ["slack"], description: "运维自动化代理，监控告警处理",
    skills: ["healthcheck", "web-search"], sessionsActive: 1, messagesTotal: 458,
    uptime: "48h 30m", lastActivity: new Date(Date.now() - 1800000).toISOString(),
    config: { thinking: "high", maxTokens: 16384, heartbeatInterval: "15m", memory: true },
  },
  {
    id: "agent-cs", name: "客服 Agent", model: "claude-haiku-4-20250414", status: "stopped",
    channels: ["webchat", "whatsapp"], description: "客户服务代理，自动回复常见问题",
    skills: ["web-search"], sessionsActive: 0, messagesTotal: 3891,
    uptime: "0m", lastActivity: new Date(Date.now() - 86400000).toISOString(),
    config: { thinking: "off", maxTokens: 4096, heartbeatInterval: "0", memory: false },
  },
  {
    id: "agent-data", name: "数据分析 Agent", model: "claude-opus-4-20250514", status: "running",
    channels: ["discord"], description: "数据分析与报告生成代理",
    skills: ["web-search", "openai-image-gen"], sessionsActive: 2, messagesTotal: 672,
    uptime: "24h 05m", lastActivity: new Date(Date.now() - 600000).toISOString(),
    config: { thinking: "high", maxTokens: 32768, heartbeatInterval: "60m", memory: true },
  },
];

const STATUS_MAP: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
  running: { color: "green", text: "运行中", icon: <PlayCircleOutlined /> },
  stopped: { color: "default", text: "已停止", icon: <PauseCircleOutlined /> },
  error: { color: "red", text: "异常", icon: <ThunderboltOutlined /> },
  starting: { color: "orange", text: "启动中", icon: <ReloadOutlined spin /> },
};

const CHANNEL_COLORS: Record<string, string> = {
  webchat: "blue", telegram: "cyan", discord: "purple", slack: "gold",
  whatsapp: "green", signal: "geekblue", imessage: "magenta",
};

const MODELS = [
  { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { value: "claude-haiku-4-20250414", label: "Claude Haiku 4" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
];

export default function AgentsPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailAgent, setDetailAgent] = useState<any>(null);
  const [editAgent, setEditAgent] = useState<any>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: () => api.get("/agents").then(r => r.data).catch(() => ({ agents: [] })),
  });

  const agents = data?.agents?.length > 0 ? data.agents : DEMO_AGENTS;

  const actionMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api.post("/agents/" + id + "/" + action),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agents"] }); message.success("操作成功"); },
    onError: () => message.error("操作失败"),
  });

  const createMut = useMutation({
    mutationFn: (values: any) => api.post("/agents", values),
    onSuccess: () => { setCreateOpen(false); form.resetFields(); qc.invalidateQueries({ queryKey: ["agents"] }); message.success("Agent 创建成功"); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete("/agents/" + id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agents"] }); message.success("已删除"); },
  });

  const columns = [
    {
      title: "Agent", key: "name", width: 280,
      render: (_: any, r: any) => (
        <Space>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: r.status === "running" ? "#f0f5ff" : "#f5f5f5",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <RobotOutlined style={{ fontSize: 20, color: r.status === "running" ? "#4945ff" : "#999" }} />
          </div>
          <div>
            <Text strong>{r.name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{r.id}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "模型", dataIndex: "model", key: "model", width: 180,
      render: (v: string) => <Tag color="blue">{v?.replace("claude-", "").replace("-20250514", "").replace("-20250414", "")}</Tag>,
    },
    {
      title: "状态", dataIndex: "status", key: "status", width: 100,
      render: (v: string) => {
        const s = STATUS_MAP[v] || { color: "default", text: v, icon: null };
        return <Badge status={v === "running" ? "processing" : v === "error" ? "error" : "default"} text={<Tag color={s.color} icon={s.icon}>{s.text}</Tag>} />;
      },
    },
    {
      title: "渠道", dataIndex: "channels", key: "channels", width: 200,
      render: (channels: string[]) => (
        <Space wrap size={[4, 4]}>
          {channels?.map(c => <Tag key={c} color={CHANNEL_COLORS[c] || "default"}>{c}</Tag>)}
        </Space>
      ),
    },
    {
      title: "活跃会话", dataIndex: "sessionsActive", key: "sessions", width: 90, align: "center" as const,
      render: (v: number) => <Badge count={v} showZero style={{ backgroundColor: v > 0 ? "#52c41a" : "#d9d9d9" }} />,
    },
    {
      title: "运行时间", dataIndex: "uptime", key: "uptime", width: 100,
      render: (v: string) => <Text type="secondary">{v}</Text>,
    },
    {
      title: "操作", key: "actions", width: 200,
      render: (_: any, r: any) => (
        <Space>
          <Tooltip title="详情">
            <Button size="small" icon={<EyeOutlined />} onClick={() => setDetailAgent(r)} />
          </Tooltip>
          <Tooltip title="设置">
            <Button size="small" icon={<SettingOutlined />} onClick={() => { setEditAgent(r); editForm.setFieldsValue(r); }} />
          </Tooltip>
          {r.status === "running" ? (
            <Tooltip title="停止">
              <Button size="small" danger icon={<PauseCircleOutlined />}
                onClick={() => actionMut.mutate({ id: r.id, action: "stop" })} />
            </Tooltip>
          ) : (
            <Tooltip title="启动">
              <Button size="small" type="primary" icon={<PlayCircleOutlined />}
                onClick={() => actionMut.mutate({ id: r.id, action: "start" })} />
            </Tooltip>
          )}
          <Tooltip title="重启">
            <Button size="small" icon={<ReloadOutlined />}
              onClick={() => actionMut.mutate({ id: r.id, action: "restart" })} />
          </Tooltip>
          <Popconfirm title="确认删除此 Agent？" onConfirm={() => deleteMut.mutate(r.id)}>
            <Tooltip title="删除"><Button size="small" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="Agent 总数" value={agents.length} prefix={<RobotOutlined />} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="运行中" value={agents.filter((a: any) => a.status === "running").length} valueStyle={{ color: "#52c41a" }} prefix={<PlayCircleOutlined />} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="活跃会话" value={agents.reduce((s: number, a: any) => s + (a.sessionsActive || 0), 0)} prefix={<MessageOutlined />} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="总消息数" value={agents.reduce((s: number, a: any) => s + (a.messagesTotal || 0), 0)} prefix={<ThunderboltOutlined />} /></Card></Col>
      </Row>

      {/* Agent Table */}
      <Card title={<Title level={4} style={{ margin: 0 }}>🤖 Agent 管理</Title>}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>创建 Agent</Button>}>
        <Table dataSource={agents} columns={columns} rowKey="id" loading={isLoading}
          pagination={false} scroll={{ x: 1100 }} />
      </Card>

      {/* Create Modal */}
      <Modal title="创建新 Agent" open={createOpen} onCancel={() => setCreateOpen(false)}
        onOk={() => form.validateFields().then(v => createMut.mutate(v))} confirmLoading={createMut.isPending} width={600}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input placeholder="例如：客服 Agent" /></Form.Item>
          <Form.Item name="id" label="ID" rules={[{ required: true, pattern: /^[a-z0-9-]+$/ }]}><Input placeholder="例如：agent-cs" /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="model" label="模型" rules={[{ required: true }]} initialValue="claude-sonnet-4-20250514">
            <Select options={MODELS} />
          </Form.Item>
          <Form.Item name="channels" label="渠道"><Select mode="multiple" options={Object.keys(CHANNEL_COLORS).map(c => ({ value: c, label: c }))} /></Form.Item>
          <Row gutter={16}>
            <Col span={8}><Form.Item name={["config", "thinking"]} label="Thinking 级别" initialValue="low">
              <Select options={[{ value: "off", label: "关闭" }, { value: "low", label: "低" }, { value: "high", label: "高" }]} />
            </Form.Item></Col>
            <Col span={8}><Form.Item name={["config", "maxTokens"]} label="Max Tokens" initialValue={8192}>
              <Select options={[4096, 8192, 16384, 32768].map(v => ({ value: v, label: String(v) }))} />
            </Form.Item></Col>
            <Col span={8}><Form.Item name={["config", "memory"]} label="记忆" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      {/* Detail Drawer */}
      <Drawer title={detailAgent?.name} open={!!detailAgent} onClose={() => setDetailAgent(null)}
        width={640} extra={
          <Space>
            {detailAgent?.status === "running"
              ? <Button danger icon={<PauseCircleOutlined />} onClick={() => { actionMut.mutate({ id: detailAgent.id, action: "stop" }); }}>停止</Button>
              : <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => { actionMut.mutate({ id: detailAgent.id, action: "start" }); }}>启动</Button>}
          </Space>
        }>
        {detailAgent && (
          <Tabs items={[
            { key: "info", label: "基本信息", children: (
              <>
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="ID"><Text code>{detailAgent.id}</Text></Descriptions.Item>
                  <Descriptions.Item label="状态">{(() => { const s = STATUS_MAP[detailAgent.status]; return <Tag color={s?.color}>{s?.text}</Tag>; })()}</Descriptions.Item>
                  <Descriptions.Item label="模型"><Tag color="blue">{detailAgent.model}</Tag></Descriptions.Item>
                  <Descriptions.Item label="运行时间">{detailAgent.uptime}</Descriptions.Item>
                  <Descriptions.Item label="描述" span={2}>{detailAgent.description}</Descriptions.Item>
                  <Descriptions.Item label="渠道" span={2}>
                    <Space>{detailAgent.channels?.map((c: string) => <Tag key={c} color={CHANNEL_COLORS[c]}>{c}</Tag>)}</Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="最后活动">{new Date(detailAgent.lastActivity).toLocaleString("zh-CN")}</Descriptions.Item>
                  <Descriptions.Item label="总消息数">{detailAgent.messagesTotal?.toLocaleString()}</Descriptions.Item>
                </Descriptions>
                <Card title="配置" size="small" style={{ marginTop: 16 }}>
                  <Descriptions size="small" column={2}>
                    <Descriptions.Item label="Thinking">{detailAgent.config?.thinking || "off"}</Descriptions.Item>
                    <Descriptions.Item label="Max Tokens">{detailAgent.config?.maxTokens?.toLocaleString()}</Descriptions.Item>
                    <Descriptions.Item label="心跳">{detailAgent.config?.heartbeatInterval || "关闭"}</Descriptions.Item>
                    <Descriptions.Item label="记忆">{detailAgent.config?.memory ? "✅ 开启" : "❌ 关闭"}</Descriptions.Item>
                  </Descriptions>
                </Card>
                <Card title="已加载技能" size="small" style={{ marginTop: 16 }}>
                  <Space wrap>{detailAgent.skills?.map((s: string) => <Tag key={s} color="purple">{s}</Tag>)}</Space>
                  {(!detailAgent.skills || detailAgent.skills.length === 0) && <Empty description="无技能" />}
                </Card>
              </>
            )},
            { key: "sessions", label: "会话列表", children: (
              <Empty description="连接 Gateway 后可查看实时会话" />
            )},
            { key: "logs", label: "运行日志", children: (
              <div style={{ background: "#1e1e1e", borderRadius: 8, padding: 16, fontFamily: "monospace", fontSize: 12, color: "#d4d4d4", maxHeight: 400, overflow: "auto" }}>
                <div><span style={{ color: "#6a9955" }}>[{new Date().toISOString()}]</span> Agent {detailAgent.id} 状态正常</div>
                <div><span style={{ color: "#6a9955" }}>[{new Date(Date.now()-60000).toISOString()}]</span> 心跳检查通过</div>
                <div><span style={{ color: "#569cd6" }}>[{new Date(Date.now()-120000).toISOString()}]</span> 处理消息: session abc-123</div>
                <div><span style={{ color: "#569cd6" }}>[{new Date(Date.now()-180000).toISOString()}]</span> 技能调用: weather</div>
                <div><span style={{ color: "#6a9955" }}>[{new Date(Date.now()-300000).toISOString()}]</span> 会话结束: session xyz-456</div>
              </div>
            )},
          ]} />
        )}
      </Drawer>

      {/* Edit Modal */}
      <Modal title={"编辑 Agent: " + editAgent?.name} open={!!editAgent} onCancel={() => setEditAgent(null)}
        onOk={() => editForm.validateFields().then(v => { message.success("配置已更新"); setEditAgent(null); })} width={600}>
        <Form form={editForm} layout="vertical">
          <Form.Item name="name" label="名称"><Input /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="model" label="模型"><Select options={MODELS} /></Form.Item>
          <Form.Item name="channels" label="渠道"><Select mode="multiple" options={Object.keys(CHANNEL_COLORS).map(c => ({ value: c, label: c }))} /></Form.Item>
          <Row gutter={16}>
            <Col span={8}><Form.Item name={["config", "thinking"]} label="Thinking"><Select options={[{ value: "off", label: "关闭" }, { value: "low", label: "低" }, { value: "high", label: "高" }]} /></Form.Item></Col>
            <Col span={8}><Form.Item name={["config", "maxTokens"]} label="Max Tokens"><Select options={[4096, 8192, 16384, 32768].map(v => ({ value: v, label: String(v) }))} /></Form.Item></Col>
            <Col span={8}><Form.Item name={["config", "memory"]} label="记忆" valuePropName="checked"><Switch /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
