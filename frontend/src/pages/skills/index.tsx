import React, { useState } from "react";
import { Card, Table, Tag, Button, Space, Typography, Modal, Form, Input, Select, Switch,
  Descriptions, Drawer, Tabs, Badge, Popconfirm, message, Tooltip, Row, Col, Statistic, Empty, List, Alert } from "antd";
import { PlusOutlined, AppstoreOutlined, CloudDownloadOutlined, DeleteOutlined,
  EyeOutlined, CheckCircleOutlined, StopOutlined, InfoCircleOutlined,
  CodeOutlined, BookOutlined, ToolOutlined, GlobalOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
const { Title, Text, Paragraph } = Typography;

const DEMO_SKILLS = [
  {
    id: "weather", name: "weather", version: "1.0.0", source: "builtin", enabled: true,
    risk: "low", description: "通过 wttr.in 或 Open-Meteo 获取天气信息和预报",
    author: "OpenClaw", license: "MIT", tools: ["web_fetch"],
    agents: ["agent-main", "agent-ops"], installDate: "2026-02-15T10:00:00Z",
    usageCount: 234, lastUsed: new Date(Date.now() - 3600000).toISOString(),
    readme: "# Weather Skill\n\n获取当前天气和预报。支持全球任意城市。\n\n## 使用方式\n用户问天气时自动触发。\n\n## 支持功能\n- 当前天气\n- 7天预报\n- 多城市比较",
  },
  {
    id: "web-search", name: "web-search", version: "1.2.0", source: "builtin", enabled: true,
    risk: "medium", description: "通过 Brave Search API 搜索网页内容",
    author: "OpenClaw", license: "MIT", tools: ["web_search", "web_fetch"],
    agents: ["agent-main", "agent-ops", "agent-data"], installDate: "2026-02-15T10:00:00Z",
    usageCount: 892, lastUsed: new Date(Date.now() - 600000).toISOString(),
    readme: "# Web Search Skill\n\n搜索引擎集成。使用 Brave Search API。\n\n## 功能\n- 网页搜索\n- 新闻搜索\n- 内容摘取",
  },
  {
    id: "healthcheck", name: "healthcheck", version: "1.1.0", source: "builtin", enabled: true,
    risk: "low", description: "主机安全检查和系统健康状态监控",
    author: "OpenClaw", license: "MIT", tools: ["exec"],
    agents: ["agent-ops"], installDate: "2026-02-16T08:00:00Z",
    usageCount: 156, lastUsed: new Date(Date.now() - 7200000).toISOString(),
    readme: "# Healthcheck Skill\n\n系统健康检查。包括：\n- SSH 安全\n- 防火墙状态\n- 系统更新\n- 磁盘空间\n- 服务状态",
  },
  {
    id: "openai-image-gen", name: "openai-image-gen", version: "1.0.0", source: "builtin", enabled: false,
    risk: "medium", description: "通过 OpenAI Images API 生成图片",
    author: "OpenClaw", license: "MIT", tools: ["exec", "web_fetch"],
    agents: ["agent-data"], installDate: "2026-02-20T14:00:00Z",
    usageCount: 45, lastUsed: new Date(Date.now() - 86400000).toISOString(),
    readme: "# OpenAI Image Gen\n\n批量生成图片并创建画廊页面。",
  },
  {
    id: "openai-whisper-api", name: "openai-whisper-api", version: "1.0.0", source: "builtin", enabled: false,
    risk: "low", description: "通过 OpenAI Whisper API 转录音频",
    author: "OpenClaw", license: "MIT", tools: ["exec"],
    agents: [], installDate: "2026-02-20T14:00:00Z",
    usageCount: 12, lastUsed: new Date(Date.now() - 172800000).toISOString(),
    readme: "# Whisper Transcription\n\n语音转文字。支持多种语言。",
  },
  {
    id: "skill-creator", name: "skill-creator", version: "1.0.0", source: "builtin", enabled: true,
    risk: "high", description: "创建和管理 Agent 技能模板",
    author: "OpenClaw", license: "MIT", tools: ["read", "write", "exec"],
    agents: ["agent-main"], installDate: "2026-02-15T10:00:00Z",
    usageCount: 28, lastUsed: new Date(Date.now() - 43200000).toISOString(),
    readme: "# Skill Creator\n\n用于创建新的 Agent 技能。\n\n⚠️ 高风险：可以读写文件和执行命令。",
  },
  {
    id: "db-query", name: "db-query", version: "0.9.0", source: "clawhub", enabled: false,
    risk: "high", description: "数据库查询工具（PostgreSQL/MySQL）",
    author: "Community", license: "Apache-2.0", tools: ["exec"],
    agents: [], installDate: "2026-02-25T16:00:00Z",
    usageCount: 0, lastUsed: null,
    readme: "# Database Query\n\n安全的数据库查询工具。支持只读模式。\n\n⚠️ 需要谨慎配置权限。",
  },
  {
    id: "github-integration", name: "github-integration", version: "1.3.0", source: "clawhub", enabled: true,
    risk: "medium", description: "GitHub 仓库管理、PR 审查、Issue 管理",
    author: "Community", license: "MIT", tools: ["web_fetch", "exec"],
    agents: ["agent-main", "agent-ops"], installDate: "2026-02-22T09:00:00Z",
    usageCount: 167, lastUsed: new Date(Date.now() - 1800000).toISOString(),
    readme: "# GitHub Integration\n\n完整的 GitHub 集成。\n\n## 功能\n- 仓库浏览\n- PR 创建和审查\n- Issue 管理\n- Actions 监控",
  },
];

const RISK_MAP: Record<string, { color: string; text: string }> = {
  low: { color: "green", text: "低风险" },
  medium: { color: "orange", text: "中风险" },
  high: { color: "red", text: "高风险" },
};

const SOURCE_MAP: Record<string, { color: string; icon: React.ReactNode }> = {
  builtin: { color: "green", icon: <CheckCircleOutlined /> },
  clawhub: { color: "blue", icon: <GlobalOutlined /> },
  custom: { color: "purple", icon: <CodeOutlined /> },
};

const CLAWHUB_SKILLS = [
  { id: "email-sender", name: "email-sender", version: "1.0.0", description: "邮件发送和管理", risk: "medium", author: "Community", downloads: 1240 },
  { id: "calendar-sync", name: "calendar-sync", version: "0.8.0", description: "Google/Outlook 日历同步", risk: "low", author: "Community", downloads: 890 },
  { id: "pdf-reader", name: "pdf-reader", version: "1.1.0", description: "PDF 文件解析与摘要", risk: "low", author: "Community", downloads: 2100 },
  { id: "slack-bot", name: "slack-bot", version: "2.0.0", description: "Slack 消息和工作流", risk: "medium", author: "Community", downloads: 3400 },
  { id: "notion-sync", name: "notion-sync", version: "1.0.0", description: "Notion 数据库和页面同步", risk: "medium", author: "Community", downloads: 1670 },
];

export default function SkillsPage() {
  const qc = useQueryClient();
  const [detailSkill, setDetailSkill] = useState<any>(null);
  const [installOpen, setInstallOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["skills"],
    queryFn: () => api.get("/skills").then(r => r.data).catch(() => ({ skills: [] })),
  });

  const skills = data?.skills?.length > 0 ? data.skills : DEMO_SKILLS;

  const toggleMut = useMutation({
    mutationFn: ({ id, enable }: { id: string; enable: boolean }) =>
      api.post("/skills/" + id + "/" + (enable ? "enable" : "disable")),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["skills"] }); message.success("状态已更新"); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete("/skills/" + id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["skills"] }); message.success("已卸载"); },
  });

  const installMut = useMutation({
    mutationFn: (skill: any) => api.post("/skills/install", skill),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["skills"] }); message.success("安装成功"); setInstallOpen(false); },
  });

  const columns = [
    {
      title: "技能", key: "name", width: 280,
      render: (_: any, r: any) => (
        <Space>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: r.enabled ? "#f0f5ff" : "#f5f5f5",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AppstoreOutlined style={{ fontSize: 20, color: r.enabled ? "#4945ff" : "#999" }} />
          </div>
          <div>
            <Text strong>{r.name}</Text> <Tag color="default" style={{ fontSize: 10 }}>v{r.version}</Tag>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{r.description}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "来源", dataIndex: "source", key: "source", width: 100,
      render: (v: string) => { const s = SOURCE_MAP[v]; return <Tag color={s?.color} icon={s?.icon}>{v}</Tag>; },
    },
    {
      title: "风险", dataIndex: "risk", key: "risk", width: 90,
      render: (v: string) => { const r = RISK_MAP[v]; return <Tag color={r?.color}>{r?.text}</Tag>; },
    },
    {
      title: "使用次数", dataIndex: "usageCount", key: "usage", width: 90, align: "center" as const,
      render: (v: number) => <Text>{v?.toLocaleString()}</Text>,
    },
    {
      title: "关联 Agent", dataIndex: "agents", key: "agents", width: 200,
      render: (agents: string[]) => (
        <Space wrap size={[4, 4]}>
          {agents?.map(a => <Tag key={a} color="geekblue">{a}</Tag>)}
          {(!agents || agents.length === 0) && <Text type="secondary">未关联</Text>}
        </Space>
      ),
    },
    {
      title: "状态", dataIndex: "enabled", key: "enabled", width: 80,
      render: (v: boolean, r: any) => (
        <Switch checked={v} size="small" onChange={checked => toggleMut.mutate({ id: r.id, enable: checked })} />
      ),
    },
    {
      title: "操作", key: "actions", width: 120,
      render: (_: any, r: any) => (
        <Space>
          <Tooltip title="详情"><Button size="small" icon={<EyeOutlined />} onClick={() => setDetailSkill(r)} /></Tooltip>
          {r.source !== "builtin" && (
            <Popconfirm title="确认卸载此技能？" onConfirm={() => deleteMut.mutate(r.id)}>
              <Tooltip title="卸载"><Button size="small" danger icon={<DeleteOutlined />} /></Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const enabledCount = skills.filter((s: any) => s.enabled).length;
  const totalUsage = skills.reduce((s: number, sk: any) => s + (sk.usageCount || 0), 0);

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="技能总数" value={skills.length} prefix={<AppstoreOutlined />} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="已启用" value={enabledCount} valueStyle={{ color: "#52c41a" }} prefix={<CheckCircleOutlined />} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="总调用次数" value={totalUsage} prefix={<ToolOutlined />} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="高风险技能" value={skills.filter((s: any) => s.risk === "high").length} valueStyle={{ color: "#ff4d4f" }} prefix={<InfoCircleOutlined />} /></Card></Col>
      </Row>

      <Card title={<Title level={4} style={{ margin: 0 }}>🧩 技能插件管理</Title>}
        extra={<Button type="primary" icon={<CloudDownloadOutlined />} onClick={() => setInstallOpen(true)}>安装技能</Button>}>
        <Table dataSource={skills} columns={columns} rowKey="id" loading={isLoading} pagination={false} scroll={{ x: 1000 }} />
      </Card>

      {/* Skill Detail Drawer */}
      <Drawer title={detailSkill?.name} open={!!detailSkill} onClose={() => setDetailSkill(null)} width={640}>
        {detailSkill && (
          <Tabs items={[
            { key: "info", label: "基本信息", children: (
              <>
                {detailSkill.risk === "high" && <Alert type="warning" message="⚠️ 高风险技能：此技能拥有文件读写或命令执行权限" style={{ marginBottom: 16 }} showIcon />}
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="名称">{detailSkill.name}</Descriptions.Item>
                  <Descriptions.Item label="版本"><Tag>v{detailSkill.version}</Tag></Descriptions.Item>
                  <Descriptions.Item label="来源"><Tag color={SOURCE_MAP[detailSkill.source]?.color}>{detailSkill.source}</Tag></Descriptions.Item>
                  <Descriptions.Item label="风险"><Tag color={RISK_MAP[detailSkill.risk]?.color}>{RISK_MAP[detailSkill.risk]?.text}</Tag></Descriptions.Item>
                  <Descriptions.Item label="作者">{detailSkill.author}</Descriptions.Item>
                  <Descriptions.Item label="许可证">{detailSkill.license}</Descriptions.Item>
                  <Descriptions.Item label="描述" span={2}>{detailSkill.description}</Descriptions.Item>
                  <Descriptions.Item label="安装时间">{new Date(detailSkill.installDate).toLocaleString("zh-CN")}</Descriptions.Item>
                  <Descriptions.Item label="使用次数">{detailSkill.usageCount?.toLocaleString()}</Descriptions.Item>
                  <Descriptions.Item label="最后使用">{detailSkill.lastUsed ? new Date(detailSkill.lastUsed).toLocaleString("zh-CN") : "从未"}</Descriptions.Item>
                  <Descriptions.Item label="状态">{detailSkill.enabled ? <Tag color="green">已启用</Tag> : <Tag>已禁用</Tag>}</Descriptions.Item>
                </Descriptions>
                <Card title="工具权限" size="small" style={{ marginTop: 16 }}>
                  <Space wrap>{detailSkill.tools?.map((t: string) => <Tag key={t} color="volcano">{t}</Tag>)}</Space>
                </Card>
                <Card title="关联 Agent" size="small" style={{ marginTop: 16 }}>
                  <Space wrap>{detailSkill.agents?.map((a: string) => <Tag key={a} color="geekblue">{a}</Tag>)}</Space>
                  {detailSkill.agents?.length === 0 && <Empty description="未关联任何 Agent" />}
                </Card>
              </>
            )},
            { key: "readme", label: "文档", children: (
              <div style={{ background: "#f6f8fa", borderRadius: 8, padding: 16 }}>
                <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{detailSkill.readme}</pre>
              </div>
            )},
          ]} />
        )}
      </Drawer>

      {/* Install from ClawHub */}
      <Modal title="🏪 从 ClawHub 安装技能" open={installOpen} onCancel={() => setInstallOpen(false)} footer={null} width={700}>
        <Alert message="从 clawhub.com 浏览和安装社区技能" type="info" style={{ marginBottom: 16 }} />
        <List dataSource={CLAWHUB_SKILLS} renderItem={item => (
          <List.Item actions={[
            <Button type="primary" size="small" icon={<CloudDownloadOutlined />}
              onClick={() => installMut.mutate({ name: item.id, version: item.version })}>安装</Button>
          ]}>
            <List.Item.Meta
              avatar={<AppstoreOutlined style={{ fontSize: 24, color: "#4945ff" }} />}
              title={<Space>{item.name} <Tag>v{item.version}</Tag> <Tag color={RISK_MAP[item.risk]?.color}>{RISK_MAP[item.risk]?.text}</Tag></Space>}
              description={<>{item.description}<br /><Text type="secondary">👤 {item.author} · ⬇️ {item.downloads.toLocaleString()} 次下载</Text></>}
            />
          </List.Item>
        )} />
      </Modal>
    </div>
  );
}
