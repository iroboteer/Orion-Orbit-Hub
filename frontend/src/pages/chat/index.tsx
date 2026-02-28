import React, { useState, useRef, useEffect } from "react";
import { Input, Button, Typography, Tag, Space, Select, message as msg, Tooltip, Badge,
  Divider, Switch, Segmented, Popconfirm, Avatar, Spin } from "antd";
import { SendOutlined, StopOutlined, PlusOutlined, DeleteOutlined,
  RobotOutlined, UserOutlined, CopyOutlined, ReloadOutlined,
  FullscreenOutlined, FullscreenExitOutlined, ClearOutlined, ExportOutlined,
  BulbOutlined, ThunderboltOutlined, CodeOutlined,
  MenuOutlined, SearchOutlined, StarOutlined, StarFilled, PushpinOutlined,
  CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined, SyncOutlined,
  ClockCircleOutlined, MinusCircleOutlined } from "@ant-design/icons";
import api from "@/lib/api";
const { Text } = Typography;

interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  time: string;
  model?: string;
  tokens?: { input?: number; output?: number };
  toolCalls?: Array<{ name: string; result?: string }>;
  starred?: boolean;
  thinking?: string;
}

interface Session {
  id: string;
  key: string;
  title: string;
  agent: string;
  model: string;
  status: string;
  taskStatus?: string | null;
  taskDescription?: string | null;
  taskProgress?: number | null;
  pinned?: boolean;
  messageCount: number;
  totalTokens: number;
  lastMessage?: string;
  lastTime?: string;
  createdAt?: string;
}

const AGENTS = [
  { value: "agent-main", label: "🤖 Main Agent" },
  { value: "agent-ops", label: "🔧 Ops Agent" },
  { value: "agent-data", label: "📊 Data Agent" },
  { value: "agent-cs", label: "💬 CS Agent" },
];
const MODELS = [
  { value: "claude-opus-4", label: "Claude Opus 4" },
  { value: "claude-sonnet-4", label: "Claude Sonnet 4" },
  { value: "claude-haiku-4", label: "Claude Haiku 4" },
  { value: "gpt-4o", label: "GPT-4o" },
];

const TASK_STATUS_MAP: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  pending:   { icon: <ClockCircleOutlined />, color: "#faad14", label: "Pending" },
  running:   { icon: <LoadingOutlined spin />, color: "#1890ff", label: "Running" },
  success:   { icon: <CheckCircleOutlined />, color: "#52c41a", label: "Done" },
  failed:    { icon: <CloseCircleOutlined />, color: "#ff4d4f", label: "Failed" },
  cancelled: { icon: <MinusCircleOutlined />, color: "#999",    label: "Cancelled" },
};

export default function ChatPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("agent-main");
  const [selectedModel, setSelectedModel] = useState("claude-opus-4");
  const [thinkingLevel, setThinkingLevel] = useState<string>("low");
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<any>(null);

  // Load sessions from server on mount
  useEffect(() => { fetchSessions(); }, []);
  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const { data } = await api.get("/chat/sessions");
      setSessions(data);
      // Auto-select first session
      if (data.length > 0 && !currentSession) {
        selectSession(data[0]);
      }
    } catch { /* offline fallback: keep empty */ }
    setSessionsLoading(false);
  };

  const selectSession = async (s: Session) => {
    setCurrentSession(s);
    setSelectedAgent(s.agent);
    setSelectedModel(s.model);
    setMsgsLoading(true);
    try {
      const { data } = await api.get(`/chat/sessions/${s.id}/messages`);
      setMessages(data);
    } catch { setMessages([]); }
    setMsgsLoading(false);
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userContent = input;
    const tempUserMsg: Message = { id: "temp-" + Date.now(), role: "user", content: userContent, time: new Date().toISOString() };
    setMessages(prev => [...prev, tempUserMsg]);
    setInput("");
    setLoading(true);

    try {
      const payload: any = { message: userContent, agent: selectedAgent, model: selectedModel };
      if (currentSession) {
        payload.sessionId = currentSession.id;
        payload.sessionKey = currentSession.key;
      }

      const { data } = await api.post("/chat/send", payload);

      // Replace temp message with server message, add assistant
      setMessages(prev => {
        const without = prev.filter(m => m.id !== tempUserMsg.id);
        return [...without, data.userMessage, data.assistantMessage];
      });

      // If new session was created, refresh sessions list
      if (!currentSession || data.sessionId !== currentSession.id) {
        await fetchSessions();
        // Set current to the new/updated session
        const { data: refreshed } = await api.get("/chat/sessions");
        const found = refreshed.find((s: Session) => s.id === data.sessionId);
        if (found) setCurrentSession(found);
        setSessions(refreshed);
      } else {
        // Update current session metadata locally
        setCurrentSession(prev => prev ? {
          ...prev,
          messageCount: prev.messageCount + 2,
          totalTokens: prev.totalTokens + (data.assistantMessage?.tokens?.input || 0) + (data.assistantMessage?.tokens?.output || 0),
          lastMessage: data.response?.slice(0, 200),
          lastTime: new Date().toISOString(),
          taskStatus: data.taskStatus,
        } : prev);
        // Also update in sessions list
        setSessions(prev => prev.map(s => s.id === data.sessionId ? {
          ...s, messageCount: s.messageCount + 2, lastMessage: data.response?.slice(0, 200),
          lastTime: new Date().toISOString(), taskStatus: data.taskStatus,
        } : s));
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { id: "err-" + Date.now(), role: "system", content: "❌ " + (e.response?.data?.error || e.message), time: new Date().toISOString() }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const inject = async (text: string) => {
    if (!currentSession) return;
    try {
      const { data } = await api.post("/chat/inject", { sessionId: currentSession.id, message: text, role: "system" });
      if (data.message) setMessages(prev => [...prev, data.message]);
      msg.success("Injected");
    } catch { msg.error("Failed"); }
  };

  const abort = async () => {
    if (!currentSession) return;
    try { await api.post("/chat/abort", { sessionId: currentSession.id }); setLoading(false); } catch {}
  };

  const newSession = async () => {
    try {
      const { data } = await api.post("/chat/sessions", {
        key: "chat-" + Date.now(), title: "New Chat", agent: selectedAgent, model: selectedModel,
      });
      await fetchSessions();
      const newS: Session = { ...data, status: "active", messageCount: 0, totalTokens: 0 };
      setCurrentSession(newS);
      setMessages([]);
    } catch { msg.error("Failed to create session"); }
  };

  const deleteSession = async (s: Session) => {
    try {
      await api.delete(`/chat/sessions/${s.id}`);
      const rest = sessions.filter(x => x.id !== s.id);
      setSessions(rest);
      if (currentSession?.id === s.id) {
        if (rest.length > 0) { selectSession(rest[0]); }
        else { setCurrentSession(null); setMessages([]); }
      }
    } catch { msg.error("Failed"); }
  };

  const clearMessages = async () => {
    if (!currentSession) return;
    try {
      await api.delete(`/chat/sessions/${currentSession.id}/messages`);
      setMessages([]);
      setCurrentSession(prev => prev ? { ...prev, messageCount: 0, totalTokens: 0, lastMessage: undefined } : prev);
    } catch { msg.error("Failed"); }
  };

  const toggleStar = async (m: Message) => {
    const newVal = !m.starred;
    setMessages(prev => prev.map(x => x.id === m.id ? { ...x, starred: newVal } : x));
    try { await api.patch(`/chat/messages/${m.id}/star`, { starred: newVal }); } catch {}
  };

  const copyMessage = (c: string) => { navigator.clipboard.writeText(c); msg.success("Copied"); };

  const exportChat = () => {
    const text = messages.map(m => "[" + m.role + "] " + new Date(m.time).toLocaleString() + "\n" + m.content).join("\n\n---\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "chat-" + (currentSession?.key || "export") + ".txt"; a.click(); URL.revokeObjectURL(url);
  };

  const togglePin = async (s: Session) => {
    try {
      await api.patch(`/chat/sessions/${s.id}`, { pinned: !s.pinned });
      setSessions(prev => prev.map(x => x.id === s.id ? { ...x, pinned: !x.pinned } : x));
      if (currentSession?.id === s.id) setCurrentSession(prev => prev ? { ...prev, pinned: !prev.pinned } : prev);
    } catch {}
  };

  const filtered = searchText ? messages.filter(m => m.content.toLowerCase().includes(searchText.toLowerCase())) : messages;
  const totalTokens = currentSession?.totalTokens || messages.reduce((s, m) => s + (m.tokens?.input || 0) + (m.tokens?.output || 0), 0);

  const sortedSessions = [...sessions].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return (b.lastTime || b.createdAt || "").localeCompare(a.lastTime || a.createdAt || "");
  });

  return (
    <div style={{ display: "flex", height: fullscreen ? "100vh" : "calc(100vh - 112px)", position: fullscreen ? "fixed" : "relative",
      top: fullscreen ? 0 : "auto", left: fullscreen ? 0 : "auto", right: fullscreen ? 0 : "auto", bottom: fullscreen ? 0 : "auto",
      zIndex: fullscreen ? 1000 : "auto", background: "#fff" }}>

      {sidebarOpen && (
        <div style={{ width: 280, borderRight: "1px solid #f0f0f0", display: "flex", flexDirection: "column", background: "#fafafa" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Space><Text strong style={{ fontSize: 14 }}>💬 Sessions</Text><Tooltip title="Refresh"><SyncOutlined style={{ fontSize: 12, cursor: "pointer", color: "#999" }} onClick={fetchSessions} /></Tooltip></Space>
            <Space>
              <Tooltip title="Search"><Button size="small" type="text" icon={<SearchOutlined />} onClick={() => setSearchOpen(!searchOpen)} /></Tooltip>
              <Tooltip title="New Chat"><Button size="small" type="primary" icon={<PlusOutlined />} onClick={newSession} /></Tooltip>
            </Space>
          </div>
          {searchOpen && <div style={{ padding: "8px 12px" }}><Input placeholder="Search..." size="small" prefix={<SearchOutlined />} allowClear onChange={e => setSearchText(e.target.value)} /></div>}
          <div style={{ flex: 1, overflow: "auto" }}>
            {sessionsLoading ? (
              <div style={{ padding: 40, textAlign: "center" }}><Spin /></div>
            ) : sortedSessions.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center" }}><Text type="secondary">No sessions yet</Text></div>
            ) : sortedSessions.filter(s => !searchText || s.title.includes(searchText) || s.lastMessage?.includes(searchText)).map(s => {
              const ts = s.taskStatus && TASK_STATUS_MAP[s.taskStatus];
              return (
                <div key={s.id} onClick={() => selectSession(s)} style={{ padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid #f5f5f5", background: s.id === currentSession?.id ? "#e6f4ff" : "transparent" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Space size={4}>
                      {s.pinned && <PushpinOutlined style={{ color: "#faad14", fontSize: 11 }} />}
                      <Text strong style={{ fontSize: 13, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block" }}>{s.title}</Text>
                      {ts && <Tooltip title={ts.label}><span style={{ color: ts.color, fontSize: 12 }}>{ts.icon}</span></Tooltip>}
                    </Space>
                    <Space size={4}>
                      <Text type="secondary" style={{ fontSize: 10 }}>{s.lastTime ? new Date(s.lastTime).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : ""}</Text>
                      <PushpinOutlined style={{ fontSize: 10, color: s.pinned ? "#faad14" : "#ccc", cursor: "pointer" }} onClick={e => { e.stopPropagation(); togglePin(s); }} />
                      <DeleteOutlined style={{ fontSize: 11, color: "#ff4d4f", opacity: 0.6 }} onClick={e => { e.stopPropagation(); if (confirm("Delete?")) deleteSession(s); }} />
                    </Space>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 11, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.lastMessage || "No messages"}</Text>
                    <Space size={4}>
                      <Tag color="blue" style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px", margin: 0 }}>{s.agent.replace("agent-", "")}</Tag>
                      {s.messageCount > 0 && <Badge count={s.messageCount} size="small" style={{ fontSize: 9 }} />}
                    </Space>
                  </div>
                  {s.taskProgress != null && s.taskProgress > 0 && s.taskProgress < 100 && (
                    <div style={{ marginTop: 4, height: 3, background: "#f0f0f0", borderRadius: 2 }}>
                      <div style={{ width: s.taskProgress + "%", height: "100%", background: "#1890ff", borderRadius: 2, transition: "width 0.3s" }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "8px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, background: "#fff" }}>
          <Space>
            <Button type="text" icon={<MenuOutlined />} onClick={() => setSidebarOpen(!sidebarOpen)} />
            <div>
              <Space>
                <Text strong>{currentSession?.title || "New Chat"}</Text>
                {currentSession?.taskStatus && TASK_STATUS_MAP[currentSession.taskStatus] && (
                  <Tag color={TASK_STATUS_MAP[currentSession.taskStatus].color} style={{ fontSize: 11 }}>
                    {TASK_STATUS_MAP[currentSession.taskStatus].icon} {TASK_STATUS_MAP[currentSession.taskStatus].label}
                  </Tag>
                )}
              </Space>
              <div>
                <Tag color="blue" style={{ fontSize: 10 }}>{selectedAgent.replace("agent-", "")}</Tag>
                <Tag color="purple" style={{ fontSize: 10 }}>{selectedModel}</Tag>
                <Tag style={{ fontSize: 10 }}>{messages.length} msgs</Tag>
                {totalTokens > 0 && <Tag color="orange" style={{ fontSize: 10 }}>{totalTokens.toLocaleString()} tokens</Tag>}
              </div>
            </div>
          </Space>
          <Space wrap>
            <Tooltip title="Thinking"><Switch size="small" checked={showThinking} onChange={setShowThinking} checkedChildren={<BulbOutlined />} unCheckedChildren={<BulbOutlined />} /></Tooltip>
            <Select value={selectedAgent} onChange={setSelectedAgent} size="small" style={{ width: 140 }} options={AGENTS} />
            <Select value={selectedModel} onChange={setSelectedModel} size="small" style={{ width: 140 }} options={MODELS} />
            <Segmented size="small" value={thinkingLevel} onChange={v => setThinkingLevel(v as string)} options={[{ value: "off", label: "Off" }, { value: "low", label: "Low" }, { value: "high", label: "High" }]} />
            <Divider type="vertical" />
            <Tooltip title="Export"><Button size="small" type="text" icon={<ExportOutlined />} onClick={exportChat} /></Tooltip>
            <Tooltip title="Clear"><Popconfirm title="Clear all messages?" onConfirm={clearMessages}><Button size="small" type="text" icon={<ClearOutlined />} /></Popconfirm></Tooltip>
            <Tooltip title="Inject system message"><Button size="small" type="text" icon={<CodeOutlined />} onClick={() => { const t = prompt("System message:"); if (t) inject(t); }} /></Tooltip>
            <Tooltip title={fullscreen ? "Exit" : "Fullscreen"}><Button size="small" type="text" icon={fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} onClick={() => setFullscreen(!fullscreen)} /></Tooltip>
          </Space>
        </div>

        <div ref={chatRef} style={{ flex: 1, overflow: "auto", padding: "16px 24px", background: "#f8f9fa" }}>
          {msgsLoading ? (
            <div style={{ textAlign: "center", padding: "80px 0" }}><Spin size="large" /></div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "#999" }}>
              <RobotOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />
              <p style={{ marginTop: 16, fontSize: 16 }}>Start a new conversation</p>
              <p style={{ fontSize: 13, color: "#bbb" }}>Select an Agent and model, then send a message</p>
              <Space style={{ marginTop: 16 }}>
                {["Hello, introduce yourself", "Check server status", "What's the weather?"].map(q => (
                  <Button key={q} size="small" onClick={() => { setInput(q); inputRef.current?.focus(); }}>{q}</Button>
                ))}
              </Space>
            </div>
          ) : filtered.map(m => (
            <div key={m.id} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 16, gap: 8 }}>
              {m.role !== "user" && <Avatar size={32} style={{ backgroundColor: m.role === "assistant" ? "#4945ff" : "#faad14", flexShrink: 0 }} icon={m.role === "assistant" ? <RobotOutlined /> : <ThunderboltOutlined />} />}
              <div style={{ maxWidth: "75%", minWidth: 100 }}>
                {showThinking && m.thinking && (
                  <div style={{ background: "#fffbe6", border: "1px solid #ffe58f", borderRadius: 8, padding: "8px 12px", marginBottom: 6, fontSize: 12 }}>
                    <BulbOutlined style={{ color: "#faad14" }} /> <Text type="secondary" italic>{m.thinking}</Text>
                  </div>
                )}
                {m.toolCalls?.map((tc, i) => (
                  <div key={i} style={{ background: "#f6ffed", border: "1px solid #b7eb8f", borderRadius: 6, padding: "6px 10px", marginBottom: 4, fontSize: 12 }}>
                    <ThunderboltOutlined style={{ color: "#52c41a" }} /> <Text strong>{tc.name}</Text>
                    {tc.result && <pre style={{ margin: "4px 0 0", fontSize: 11, color: "#666", whiteSpace: "pre-wrap" }}>{tc.result}</pre>}
                  </div>
                ))}
                <div style={{
                  background: m.role === "user" ? "#4945ff" : m.role === "system" ? "#fff7e6" : "#fff",
                  color: m.role === "user" ? "#fff" : "#333",
                  border: m.role === "system" ? "1px solid #ffe58f" : m.role === "user" ? "none" : "1px solid #e8e8e8",
                  borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  padding: "10px 16px", boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                }}>
                  {m.role === "system" && <Tag color="orange" style={{ marginBottom: 4, fontSize: 10 }}>SYSTEM</Tag>}
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 14 }}>{m.content}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, padding: "0 4px" }}>
                  <Text type="secondary" style={{ fontSize: 10 }}>{new Date(m.time).toLocaleTimeString()}</Text>
                  {m.model && <Tag style={{ fontSize: 9, lineHeight: "14px", padding: "0 3px" }}>{m.model}</Tag>}
                  {m.tokens && <Text type="secondary" style={{ fontSize: 10 }}>{(m.tokens.input || 0) + (m.tokens.output || 0)} tok</Text>}
                  <div style={{ flex: 1 }} />
                  <Space size={2}>
                    <Tooltip title="Copy"><Button size="small" type="text" icon={<CopyOutlined style={{ fontSize: 12 }} />} onClick={() => copyMessage(m.content)} /></Tooltip>
                    <Tooltip title={m.starred ? "Unstar" : "Star"}><Button size="small" type="text" icon={m.starred ? <StarFilled style={{ fontSize: 12, color: "#faad14" }} /> : <StarOutlined style={{ fontSize: 12 }} />} onClick={() => toggleStar(m)} /></Tooltip>
                    {m.role === "assistant" && <Tooltip title="Regenerate"><Button size="small" type="text" icon={<ReloadOutlined style={{ fontSize: 12 }} />} /></Tooltip>}
                  </Space>
                </div>
              </div>
              {m.role === "user" && <Avatar size={32} style={{ backgroundColor: "#1890ff", flexShrink: 0 }} icon={<UserOutlined />} />}
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <Avatar size={32} style={{ backgroundColor: "#4945ff" }} icon={<RobotOutlined />} />
              <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: "16px 16px 16px 4px", padding: "12px 16px" }}>
                <span style={{ fontSize: 18, color: "#999" }}>• • •</span>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid #f0f0f0", background: "#fff" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <Input.TextArea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
              autoSize={{ minRows: 1, maxRows: 6 }} disabled={loading}
              style={{ borderRadius: 12, resize: "none", fontSize: 14 }} />
            <Space direction="vertical" size={4}>
              <Button type="primary" icon={<SendOutlined />} onClick={send} loading={loading} style={{ borderRadius: 12, height: 40, width: 80 }} disabled={!input.trim()}>Send</Button>
              {loading && <Button danger icon={<StopOutlined />} onClick={abort} size="small" style={{ borderRadius: 8, width: 80 }}>Stop</Button>}
            </Space>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, padding: "0 4px" }}>
            <Text type="secondary" style={{ fontSize: 11 }}>{selectedAgent.replace("agent-", "")} · {selectedModel} · thinking: {thinkingLevel}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {currentSession?.taskStatus ? (TASK_STATUS_MAP[currentSession.taskStatus]?.label || currentSession.taskStatus) + " · " : ""}
              {messages.length} msgs · {totalTokens.toLocaleString()} tokens
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}
