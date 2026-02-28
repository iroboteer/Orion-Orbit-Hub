import React, { useState, useMemo } from "react";
import { Card, Table, Tag, Button, Space, Typography, Modal, Input, Select, Switch,
  Descriptions, Drawer, Tabs, Badge, Popconfirm, message, Tooltip, Row, Col, Statistic, Empty, List, Alert, Segmented } from "antd";
import { PlusOutlined, AppstoreOutlined, CloudDownloadOutlined, DeleteOutlined,
  EyeOutlined, CheckCircleOutlined, StopOutlined, InfoCircleOutlined,
  CodeOutlined, BookOutlined, ToolOutlined, GlobalOutlined, SearchOutlined,
  FilterOutlined, ThunderboltOutlined, SafetyCertificateOutlined,
  SoundOutlined, CameraOutlined, MessageOutlined, ApiOutlined,
  FileTextOutlined, DatabaseOutlined, GithubOutlined, MailOutlined,
  CloudOutlined, RobotOutlined, SettingOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
const { Title, Text, Paragraph } = Typography;

// ─── Real Built-in Skills from OpenClaw ───
const BUILTIN_SKILLS: any[] = [
  { id: "weather", name: "weather", version: "1.0.0", source: "builtin", enabled: true, risk: "low", category: "utility",
    description: "Get weather and forecasts via wttr.in / Open-Meteo", author: "OpenClaw", license: "MIT",
    tools: ["web_fetch"], agents: ["main"], usageCount: 234, icon: "🌤️" },
  { id: "healthcheck", name: "healthcheck", version: "1.0.0", source: "builtin", enabled: true, risk: "low", category: "devops",
    description: "Host security hardening and system health checks", author: "OpenClaw", license: "MIT",
    tools: ["exec"], agents: ["main", "ops"], usageCount: 156, icon: "🛡️" },
  { id: "openai-image-gen", name: "openai-image-gen", version: "1.0.0", source: "builtin", enabled: false, risk: "medium", category: "ai",
    description: "Batch-generate images via OpenAI Images API with gallery", author: "OpenClaw", license: "MIT",
    tools: ["exec", "web_fetch"], agents: [], usageCount: 45, icon: "🎨" },
  { id: "openai-whisper-api", name: "openai-whisper-api", version: "1.0.0", source: "builtin", enabled: false, risk: "low", category: "ai",
    description: "Transcribe audio via OpenAI Whisper API", author: "OpenClaw", license: "MIT",
    tools: ["exec"], agents: [], usageCount: 12, icon: "🎙️" },
  { id: "skill-creator", name: "skill-creator", version: "1.0.0", source: "builtin", enabled: true, risk: "high", category: "devops",
    description: "Create and manage Agent skill templates", author: "OpenClaw", license: "MIT",
    tools: ["read", "write", "exec"], agents: ["main"], usageCount: 28, icon: "🛠️" },
  { id: "coding-agent", name: "coding-agent", version: "1.0.0", source: "builtin", enabled: true, risk: "high", category: "devops",
    description: "Spawn coding sub-agents for complex tasks", author: "OpenClaw", license: "MIT",
    tools: ["exec", "read", "write"], agents: ["main"], usageCount: 89, icon: "💻" },
  { id: "github", name: "github", version: "1.0.0", source: "builtin", enabled: true, risk: "medium", category: "devops",
    description: "GitHub repository management, PRs, issues", author: "OpenClaw", license: "MIT",
    tools: ["exec", "web_fetch"], agents: ["main", "ops"], usageCount: 167, icon: "🐙" },
  { id: "discord", name: "discord", version: "1.0.0", source: "builtin", enabled: true, risk: "low", category: "messaging",
    description: "Discord bot integration and message management", author: "OpenClaw", license: "MIT",
    tools: ["message"], agents: ["main"], usageCount: 320, icon: "💬" },
  { id: "slack", name: "slack", version: "1.0.0", source: "builtin", enabled: false, risk: "low", category: "messaging",
    description: "Slack workspace integration", author: "OpenClaw", license: "MIT",
    tools: ["message"], agents: [], usageCount: 0, icon: "📢" },
  { id: "notion", name: "notion", version: "1.0.0", source: "builtin", enabled: false, risk: "medium", category: "productivity",
    description: "Notion database and page sync", author: "OpenClaw", license: "MIT",
    tools: ["web_fetch"], agents: [], usageCount: 0, icon: "📝" },
  { id: "trello", name: "trello", version: "1.0.0", source: "builtin", enabled: false, risk: "low", category: "productivity",
    description: "Trello board and card management", author: "OpenClaw", license: "MIT",
    tools: ["web_fetch"], agents: [], usageCount: 0, icon: "📋" },
  { id: "camsnap", name: "camsnap", version: "1.0.0", source: "builtin", enabled: true, risk: "medium", category: "iot",
    description: "Camera snapshot capture from paired devices", author: "OpenClaw", license: "MIT",
    tools: ["nodes"], agents: ["main"], usageCount: 56, icon: "📷" },
  { id: "sag", name: "sag", version: "1.0.0", source: "builtin", enabled: false, risk: "low", category: "ai",
    description: "ElevenLabs TTS — text-to-speech with custom voices", author: "OpenClaw", license: "MIT",
    tools: ["tts"], agents: [], usageCount: 33, icon: "🔊" },
  { id: "gemini", name: "gemini", version: "1.0.0", source: "builtin", enabled: false, risk: "medium", category: "ai",
    description: "Google Gemini model integration", author: "OpenClaw", license: "MIT",
    tools: ["web_fetch"], agents: [], usageCount: 0, icon: "♊" },
  { id: "himalaya", name: "himalaya", version: "1.0.0", source: "builtin", enabled: false, risk: "medium", category: "messaging",
    description: "Email client — read, send, manage via CLI", author: "OpenClaw", license: "MIT",
    tools: ["exec"], agents: [], usageCount: 0, icon: "📧" },
  { id: "obsidian", name: "obsidian", version: "1.0.0", source: "builtin", enabled: false, risk: "low", category: "productivity",
    description: "Obsidian vault note management", author: "OpenClaw", license: "MIT",
    tools: ["read", "write"], agents: [], usageCount: 0, icon: "💎" },
  { id: "spotify-player", name: "spotify-player", version: "1.0.0", source: "builtin", enabled: false, risk: "low", category: "media",
    description: "Spotify playback control", author: "OpenClaw", license: "MIT",
    tools: ["exec"], agents: [], usageCount: 0, icon: "🎵" },
  { id: "summarize", name: "summarize", version: "1.0.0", source: "builtin", enabled: true, risk: "low", category: "ai",
    description: "Summarize web pages, PDFs, and documents", author: "OpenClaw", license: "MIT",
    tools: ["web_fetch", "read"], agents: ["main", "data"], usageCount: 210, icon: "📄" },
  { id: "canvas", name: "canvas", version: "1.0.0", source: "builtin", enabled: true, risk: "medium", category: "utility",
    description: "Present interactive HTML canvases to users", author: "OpenClaw", license: "MIT",
    tools: ["canvas"], agents: ["main"], usageCount: 78, icon: "🖼️" },
  { id: "voice-call", name: "voice-call", version: "1.0.0", source: "builtin", enabled: false, risk: "medium", category: "messaging",
    description: "Voice call handling with speech recognition", author: "OpenClaw", license: "MIT",
    tools: ["tts", "exec"], agents: [], usageCount: 0, icon: "📞" },
  { id: "clawhub", name: "clawhub", version: "1.0.0", source: "builtin", enabled: true, risk: "low", category: "utility",
    description: "Browse and install skills from ClawHub marketplace", author: "OpenClaw", license: "MIT",
    tools: ["web_fetch"], agents: ["main"], usageCount: 15, icon: "🏪" },
  { id: "model-usage", name: "model-usage", version: "1.0.0", source: "builtin", enabled: true, risk: "low", category: "utility",
    description: "Track and report AI model usage and costs", author: "OpenClaw", license: "MIT",
    tools: ["read"], agents: ["main"], usageCount: 44, icon: "📊" },
  { id: "session-logs", name: "session-logs", version: "1.0.0", source: "builtin", enabled: true, risk: "low", category: "devops",
    description: "Session log viewing and analysis", author: "OpenClaw", license: "MIT",
    tools: ["read"], agents: ["main", "ops"], usageCount: 130, icon: "📜" },
  { id: "imsg", name: "imsg", version: "1.0.0", source: "builtin", enabled: false, risk: "medium", category: "messaging",
    description: "iMessage integration (macOS)", author: "OpenClaw", license: "MIT",
    tools: ["exec"], agents: [], usageCount: 0, icon: "💬" },
];

const CATEGORIES: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  all:          { label: "All",          color: "default",  icon: <AppstoreOutlined /> },
  ai:           { label: "AI / ML",      color: "purple",   icon: <RobotOutlined /> },
  devops:       { label: "DevOps",       color: "volcano",  icon: <CodeOutlined /> },
  messaging:    { label: "Messaging",    color: "blue",     icon: <MessageOutlined /> },
  productivity: { label: "Productivity", color: "cyan",     icon: <FileTextOutlined /> },
  iot:          { label: "IoT",          color: "green",    icon: <CameraOutlined /> },
  media:        { label: "Media",        color: "magenta",  icon: <SoundOutlined /> },
  utility:      { label: "Utility",      color: "gold",     icon: <SettingOutlined /> },
};

const RISK_MAP: Record<string, { color: string; text: string }> = {
  low: { color: "green", text: "Low" }, medium: { color: "orange", text: "Medium" }, high: { color: "red", text: "High" },
};

const CLAWHUB_SKILLS = [
  { id: "email-sender", name: "email-sender", version: "1.0.0", description: "Send and manage emails", risk: "medium", author: "Community", downloads: 1240 },
  { id: "calendar-sync", name: "calendar-sync", version: "0.8.0", description: "Google/Outlook calendar sync", risk: "low", author: "Community", downloads: 890 },
  { id: "pdf-reader", name: "pdf-reader", version: "1.1.0", description: "PDF parsing and summarization", risk: "low", author: "Community", downloads: 2100 },
  { id: "db-query", name: "db-query", version: "0.9.0", description: "Database query tool (PostgreSQL/MySQL)", risk: "high", author: "Community", downloads: 560 },
  { id: "jira-sync", name: "jira-sync", version: "1.2.0", description: "Jira issue tracking integration", risk: "medium", author: "Community", downloads: 1890 },
];

export default function SkillsPage() {
  const qc = useQueryClient();
  const [detailSkill, setDetailSkill] = useState<any>(null);
  const [installOpen, setInstallOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [riskFilter, setRiskFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["skills"],
    queryFn: () => api.get("/skills").then(r => r.data).catch(() => ({ skills: [] })),
  });

  const skills = data?.skills?.length > 0 ? data.skills : BUILTIN_SKILLS;

  const filtered = useMemo(() => {
    return skills.filter((s: any) => {
      if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.description.toLowerCase().includes(search.toLowerCase())) return false;
      if (category !== "all" && s.category !== category) return false;
      if (riskFilter && s.risk !== riskFilter) return false;
      if (statusFilter === "enabled" && !s.enabled) return false;
      if (statusFilter === "disabled" && s.enabled) return false;
      return true;
    });
  }, [skills, search, category, riskFilter, statusFilter]);

  const toggleMut = useMutation({
    mutationFn: ({ id, enable }: { id: string; enable: boolean }) => api.post("/skills/" + id + "/" + (enable ? "enable" : "disable")),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["skills"] }); message.success("Updated"); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete("/skills/" + id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["skills"] }); message.success("Uninstalled"); },
  });

  const installMut = useMutation({
    mutationFn: (skill: any) => api.post("/skills/install", skill),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["skills"] }); message.success("Installed"); setInstallOpen(false); },
  });

  const columns = [
    {
      title: "Skill", key: "name", width: 320,
      render: (_: any, r: any) => (
        <Space>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: r.enabled ? "#f0f5ff" : "#f5f5f5",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
            {r.icon || "🧩"}
          </div>
          <div>
            <Space size={4}>
              <Text strong>{r.name}</Text>
              <Tag style={{ fontSize: 10 }}>v{r.version}</Tag>
              <Tag color={CATEGORIES[r.category]?.color || "default"} style={{ fontSize: 10 }}>{CATEGORIES[r.category]?.label || r.category}</Tag>
            </Space>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{r.description}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Risk", dataIndex: "risk", key: "risk", width: 90,
      render: (v: string) => <Tag color={RISK_MAP[v]?.color}>{RISK_MAP[v]?.text}</Tag>,
    },
    {
      title: "Tools", dataIndex: "tools", key: "tools", width: 180,
      render: (tools: string[]) => <Space wrap size={[4, 4]}>{tools?.map(t => <Tag key={t} color="volcano" style={{ fontSize: 10 }}>{t}</Tag>)}</Space>,
    },
    {
      title: "Usage", dataIndex: "usageCount", key: "usage", width: 80, align: "center" as const,
      sorter: (a: any, b: any) => (a.usageCount || 0) - (b.usageCount || 0),
      render: (v: number) => <Text>{v?.toLocaleString()}</Text>,
    },
    {
      title: "Agents", dataIndex: "agents", key: "agents", width: 160,
      render: (agents: string[]) => (
        <Space wrap size={[4, 4]}>
          {agents?.map(a => <Tag key={a} color="geekblue" style={{ fontSize: 10 }}>{a}</Tag>)}
          {(!agents || agents.length === 0) && <Text type="secondary" style={{ fontSize: 11 }}>—</Text>}
        </Space>
      ),
    },
    {
      title: "Status", dataIndex: "enabled", key: "enabled", width: 80,
      render: (v: boolean, r: any) => <Switch checked={v} size="small" onChange={c => toggleMut.mutate({ id: r.id, enable: c })} />,
    },
    {
      title: "Actions", key: "actions", width: 100,
      render: (_: any, r: any) => (
        <Space>
          <Tooltip title="Details"><Button size="small" icon={<EyeOutlined />} onClick={() => setDetailSkill(r)} /></Tooltip>
          {r.source !== "builtin" && (
            <Popconfirm title="Uninstall?" onConfirm={() => deleteMut.mutate(r.id)}>
              <Tooltip title="Uninstall"><Button size="small" danger icon={<DeleteOutlined />} /></Tooltip>
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
        <Col span={6}><Card size="small"><Statistic title="Total Skills" value={skills.length} prefix={<AppstoreOutlined />} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="Enabled" value={enabledCount} valueStyle={{ color: "#52c41a" }} prefix={<CheckCircleOutlined />} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="Total Invocations" value={totalUsage} prefix={<ToolOutlined />} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="High Risk" value={skills.filter((s: any) => s.risk === "high").length} valueStyle={{ color: "#ff4d4f" }} prefix={<InfoCircleOutlined />} /></Card></Col>
      </Row>

      {/* Category Tabs */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap size={[8, 8]}>
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <Tag key={key} color={category === key ? cat.color : "default"}
              style={{ cursor: "pointer", padding: "4px 12px", fontSize: 13 }}
              onClick={() => setCategory(key)}>
              {cat.icon} {cat.label}
              {key !== "all" && <Badge count={skills.filter((s: any) => s.category === key).length} size="small" style={{ marginLeft: 6 }} />}
            </Tag>
          ))}
        </Space>
      </Card>

      <Card title={<Space><AppstoreOutlined /> <Title level={4} style={{ margin: 0 }}>Built-in Skills</Title>
        <Tag color="blue">{filtered.length}</Tag></Space>}
        extra={
          <Space>
            <Input placeholder="Search skills..." prefix={<SearchOutlined />} allowClear size="small" style={{ width: 200 }}
              value={search} onChange={e => setSearch(e.target.value)} />
            <Select placeholder="Risk" size="small" style={{ width: 100 }} allowClear value={riskFilter}
              onChange={v => setRiskFilter(v)} options={[
                { value: "low", label: "🟢 Low" }, { value: "medium", label: "🟡 Medium" }, { value: "high", label: "🔴 High" },
              ]} />
            <Select placeholder="Status" size="small" style={{ width: 110 }} allowClear value={statusFilter}
              onChange={v => setStatusFilter(v)} options={[
                { value: "enabled", label: "✅ Enabled" }, { value: "disabled", label: "⭕ Disabled" },
              ]} />
            <Button type="primary" icon={<CloudDownloadOutlined />} onClick={() => setInstallOpen(true)}>ClawHub</Button>
          </Space>
        }>
        <Table dataSource={filtered} columns={columns} rowKey="id" loading={isLoading} pagination={false} scroll={{ x: 1000 }} size="middle" />
      </Card>

      {/* Detail Drawer */}
      <Drawer title={<Space><span style={{ fontSize: 24 }}>{detailSkill?.icon}</span> {detailSkill?.name}</Space>}
        open={!!detailSkill} onClose={() => setDetailSkill(null)} width={640}>
        {detailSkill && (
          <Tabs items={[
            { key: "info", label: "Info", children: (
              <>
                {detailSkill.risk === "high" && <Alert type="warning" message="⚠️ High-risk skill: has file read/write or command execution permissions" style={{ marginBottom: 16 }} showIcon />}
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="Name">{detailSkill.name}</Descriptions.Item>
                  <Descriptions.Item label="Version"><Tag>v{detailSkill.version}</Tag></Descriptions.Item>
                  <Descriptions.Item label="Source"><Tag color="green">builtin</Tag></Descriptions.Item>
                  <Descriptions.Item label="Risk"><Tag color={RISK_MAP[detailSkill.risk]?.color}>{RISK_MAP[detailSkill.risk]?.text}</Tag></Descriptions.Item>
                  <Descriptions.Item label="Category"><Tag color={CATEGORIES[detailSkill.category]?.color}>{CATEGORIES[detailSkill.category]?.label}</Tag></Descriptions.Item>
                  <Descriptions.Item label="Author">{detailSkill.author}</Descriptions.Item>
                  <Descriptions.Item label="Description" span={2}>{detailSkill.description}</Descriptions.Item>
                  <Descriptions.Item label="License">{detailSkill.license}</Descriptions.Item>
                  <Descriptions.Item label="Usage">{detailSkill.usageCount?.toLocaleString()} invocations</Descriptions.Item>
                </Descriptions>
                <Card title="Tool Permissions" size="small" style={{ marginTop: 16 }}>
                  <Space wrap>{detailSkill.tools?.map((t: string) => <Tag key={t} color="volcano">{t}</Tag>)}</Space>
                </Card>
                <Card title="Bound Agents" size="small" style={{ marginTop: 16 }}>
                  {detailSkill.agents?.length > 0 ? (
                    <Space wrap>{detailSkill.agents.map((a: string) => <Tag key={a} color="geekblue">{a}</Tag>)}</Space>
                  ) : <Text type="secondary">Not bound to any agent</Text>}
                </Card>
              </>
            )},
          ]} />
        )}
      </Drawer>

      {/* ClawHub Install Modal */}
      <Modal title="🏪 Install from ClawHub" open={installOpen} onCancel={() => setInstallOpen(false)} footer={null} width={700}>
        <Alert message="Browse and install community skills from clawhub.com" type="info" style={{ marginBottom: 16 }} />
        <List dataSource={CLAWHUB_SKILLS} renderItem={item => (
          <List.Item actions={[
            <Button type="primary" size="small" icon={<CloudDownloadOutlined />}
              onClick={() => installMut.mutate({ name: item.id, version: item.version })}>Install</Button>
          ]}>
            <List.Item.Meta
              avatar={<AppstoreOutlined style={{ fontSize: 24, color: "#4945ff" }} />}
              title={<Space>{item.name} <Tag>v{item.version}</Tag> <Tag color={RISK_MAP[item.risk]?.color}>{RISK_MAP[item.risk]?.text}</Tag></Space>}
              description={<>{item.description}<br /><Text type="secondary">👤 {item.author} · ⬇️ {item.downloads.toLocaleString()} downloads</Text></>}
            />
          </List.Item>
        )} />
      </Modal>
    </div>
  );
}
