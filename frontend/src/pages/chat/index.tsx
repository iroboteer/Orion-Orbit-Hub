import React, { useState, useRef, useEffect, useCallback } from "react";
import { Input, Button, Typography, Tag, Space, Select, message as msg, Tooltip, Badge,
  Drawer, List, Avatar, Dropdown, Divider, Switch, Segmented, Popconfirm, Empty } from "antd";
import { SendOutlined, StopOutlined, PlusOutlined, DeleteOutlined, SettingOutlined,
  HistoryOutlined, RobotOutlined, UserOutlined, CopyOutlined, ReloadOutlined,
  FullscreenOutlined, FullscreenExitOutlined, ClearOutlined, ExportOutlined,
  BulbOutlined, ThunderboltOutlined, CodeOutlined, PictureOutlined,
  SoundOutlined, PaperClipOutlined, DownOutlined, MenuOutlined, SearchOutlined,
  ClockCircleOutlined, StarOutlined, StarFilled, PushpinOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
const { Text, Paragraph } = Typography;

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
  key: string;
  title: string;
  agent: string;
  model: string;
  lastMessage?: string;
  lastTime?: string;
  messageCount: number;
  pinned?: boolean;
}

const DEMO_SESSIONS: Session[] = [
  { key: "main-chat-1", title: "日常对话", agent: "agent-main", model: "claude-opus-4", lastMessage: "好的，我已经帮你查好了天气", lastTime: new Date(Date.now() - 300000).toISOString(), messageCount: 24, pinned: true },
  { key: "ops-debug-1", title: "运维排错", agent: "agent-ops", model: "claude-sonnet-4", lastMessage: "服务器内存使用率正常", lastTime: new Date(Date.now() - 1800000).toISOString(), messageCount: 15 },
  { key: "data-analysis-1", title: "数据分析报告", agent: "agent-data", model: "claude-opus-4", lastMessage: "报告已生成，请查看附件", lastTime: new Date(Date.now() - 3600000).toISOString(), messageCount: 8 },
  { key: "cs-test-1", title: "客服测试", agent: "agent-cs", model: "claude-haiku-4", lastMessage: "您好，请问有什么可以帮助您？", lastTime: new Date(Date.now() - 7200000).toISOString(), messageCount: 42 },
];

const DEMO_MESSAGES: Message[] = [
  { id: "1", role: "system", content: "You are a helpful AI assistant running on NexusCore platform.", time: new Date(Date.now() - 600000).toISOString() },
  { id: "2", role: "user", content: "帮我查一下今天香港的天气", time: new Date(Date.now() - 580000).toISOString() },
  { id: "3", role: "assistant", content: "我来帮你查询香港的天气情况。", time: new Date(Date.now() - 575000).toISOString(), model: "claude-opus-4", toolCalls: [{ name: "weather", result: "香港: 22°C, 多云, 湿度 75%" }], thinking: "用户要查天气，我应该使用 weather skill 来获取实时数据..." },
  { id: "4", role: "assistant", content: "🌤️ **香港今日天气**\n\n- **温度**: 22°C（体感 24°C）\n- **天气**: 多云转晴\n- **湿度**: 75%\n- **风力**: 东南风 3级\n- **紫外线**: 中等\n\n**未来 3 天预报:**\n| 日期 | 天气 | 温度 |\n|------|------|------|\n| 明天 | ☀️ 晴 | 19-25°C |\n| 后天 | 🌤 多云 | 20-26°C |\n| 大后天 | 🌧 小雨 | 18-23°C |\n\n建议今天外出不用带伞，但后天可能需要 ☂️", time: new Date(Date.now() - 570000).toISOString(), model: "claude-opus-4", tokens: { input: 156, output: 234 } },
  { id: "5", role: "user", content: "服务器的磁盘空间还够用吗？", time: new Date(Date.now() - 400000).toISOString() },
  { id: "6", role: "assistant", content: "让我检查一下服务器的磁盘使用情况。", time: new Date(Date.now() - 395000).toISOString(), model: "claude-opus-4", toolCalls: [{ name: "exec", result: "Filesystem  Size  Used Avail Use%\n/dev/root   30G   12G   17G  42%" }] },
  { id: "7", role: "assistant", content: "📊 **磁盘空间报告**\n\n```\nFilesystem  Size  Used  Avail  Use%\n/dev/root   30G   12G   17G   42%\n/dev/data   100G  45G   55G   45%\n```\n\n✅ 磁盘空间充足，主分区使用 42%，数据分区使用 45%。\n\n建议在使用率达到 80% 时进行清理或扩容。", time: new Date(Date.now() - 390000).toISOString(), model: "claude-opus-4", tokens: { input: 89, output: 178 } },
  { id: "8", role: "user", content: "好的，谢谢！帮我把这个对话导出一下", time: new Date(Date.now() - 300000).toISOString() },
  { id: "9", role: "assistant", content: "好的，我已经帮你查好了天气和磁盘状态。如果需要导出对话记录，可以点击右上角的导出按钮 📥 选择格式即可。还有其他需要帮助的吗？", time: new Date(Date.now() - 295000).toISOString(), model: "claude-opus-4", tokens: { input: 45, output: 67 }, starred: true },
];

const AGENTS = [
  { value: "agent-main", label: "🤖 主 Agent", model: "claude-opus-4" },
  { value: "agent-ops", label: "🔧 运维 Agent", model: "claude-sonnet-4" },
  { value: "agent-data", label: "📊 数据 Agent", model: "claude-opus-4" },
  { value: "agent-cs", label: "💬 客服 Agent", model: "claude-haiku-4" },
];

const MODELS = [
  { value: "claude-opus-4", label: "Claude Opus 4" },
  { value: "claude-sonnet-4", label: "Claude Sonnet 4" },
  { value: "claude-haiku-4", label: "Claude Haiku 4" },
  { value: "gpt-4o", label: "GPT-4o" },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(DEMO_MESSAGES);
  const [input, setInput] = useState("");
  const [sessions, setSessions] = useState<Session[]>(DEMO_SESSIONS);
  const [currentSession, setCurrentSession] = useState("main-chat-1");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("agent-main");
  const [selectedModel, setSelectedModel] = useState("claude-opus-4");
  const [thinkingLevel, setThinkingLevel] = useState<string>("low");
  const [streamEnabled, setStreamEnabled] = useState(true);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<any>(null);

  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const currentSessionData = sessions.find(s => s.key === currentSession);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input, time: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const { data } = await api.post("/chat/send", { sessionKey: currentSession, message: input, agent: selectedAgent, model: selectedModel });
      if (data.response) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(), role: "assistant", content: data.response,
          time: new Date().toISOString(), model: selectedModel, tokens: { input: input.length, output: data.response.length },
        }]);
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "system", content: `❌ 错误: ${e.response?.data?.error || e.message}`, time: new Date().toISOString() }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const inject = async (text: string) => {
    try {
      await api.post("/chat/inject", { sessionKey: currentSession, message: text, role: "system" });
      setMessages(prev => [...prev, { id: Date.now().toString(), role: "system", content: text, time: new Date().toISOString() }]);
      msg.success("系统消息已注入");
    } catch { msg.error("注入失败"); }
  };

  const abort = async () => {
    try { await api.post("/chat/abort", { sessionKey: currentSession }); msg.info("已终止生成"); setLoading(false); } catch {}
  };

  const newSession = () => {
    const key = `chat-${Date.now()}`;
    const s: Session = { key, title: "新对话", agent: selectedAgent, model: selectedModel, messageCount: 0 };
    setSessions(prev => [s, ...prev]);
    setCurrentSession(key);
    setMessages([]);
  };

  const deleteSession = (key: string) => {
    setSessions(prev => prev.filter(s => s.key !== key));
    if (currentSession === key && sessions.length > 1) {
      setCurrentSession(sessions.find(s => s.key !== key)!.key);
    }
  };

  const toggleStar = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, starred: !m.starred } : m));
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    msg.success("已复制");
  };

  const exportChat = () => {
    const text = messages.map(m => `[${m.role}] ${new Date(m.time).toLocaleString("zh-CN")}\n${m.content}`).join("\n\n---\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `chat-${currentSession}-${new Date().toISOString().slice(0,10)}.txt`;
    a.click(); URL.revokeObjectURL(url);
    msg.success("对话已导出");
  };

  const filteredMessages = searchText ? messages.filter(m => m.content.toLowerCase().includes(searchText.toLowerCase())) : messages;
  const totalTokens = messages.reduce((s, m) => s + (m.tokens?.input || 0) + (m.tokens?.output || 0), 0);

  return (
    <div style={{ display: "flex", height: fullscreen ? "100vh" : "calc(100vh - 112px)", position: fullscreen ? "fixed" : "relative",
      top: fullscreen ? 0 : "auto", left: fullscreen ? 0 : "auto", right: fullscreen ? 0 : "auto", bottom: fullscreen ? 0 : "auto",
      zIndex: fullscreen ? 1000 : "auto", background: "#fff" }}>

      {/* Session Sidebar */}
      {sidebarOpen && (
        <div style={{ width: 280, borderRight: "1px solid #f0f0f0", display: "flex", flexDirection: "column", background: "#fafafa" }}>
          {/* Sidebar Header */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Text strong style={{ fontSize: 14 }}>💬 会话列表</Text>
            <Space>
              <Tooltip title="搜索"><Button size="small" type="text" icon={<SearchOutlined />} onClick={() => setSearchOpen(!searchOpen)} /></Tooltip>
              <Tooltip title="新建对话"><Button size="small" type="primary" icon={<PlusOutlined />} onClick={newSession} /></Tooltip>
            </Space>
          </div>
          {searchOpen && (
            <div style={{ padding: "8px 12px" }}>
              <Input placeholder="搜索会话..." size="small" prefix={<SearchOutlined />} allowClear
                onChange={e => setSearchText(e.target.value)} />
            </div>
          )}
          {/* Session List */}
          <div style={{ flex: 1, overflow: "auto" }}>
            {sessions.filter(s => !searchText || s.title.includes(searchText) || s.lastMessage?.includes(searchText)).map(s => (
              <div key={s.key} onClick={() => { setCurrentSession(s.key); if (s.key !== currentSession) setMessages(s.key === "main-chat-1" ? DEMO_MESSAGES : []); }}
                style={{
                  padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #f5f5f5",
                  background: s.key === currentSession ? "#e6f4ff" : "transparent",
                  transition: "background 0.2s",
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Space>
                    {s.pinned && <PushpinOutlined style={{ color: "#faad14", fontSize: 11 }} />}
                    <Text strong style={{ fontSize: 13 }}>{s.title}</Text>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 10 }}>{s.lastTime ? new Date(s.lastTime).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : ""}</Text>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <Text type="secondary" style={{ fontSize: 11, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.lastMessage || "暂无消息"}
                  </Text>
                  <Space size={4}>
                    <Tag color="blue" style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px", margin: 0 }}>{s.agent.replace("agent-", "")}</Tag>
                    <Badge count={s.messageCount} size="small" style={{ fontSize: 9 }} />
                  </Space>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Chat Header */}
        <div style={{ padding: "8px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff" }}>
          <Space>
            <Button type="text" icon={<MenuOutlined />} onClick={() => setSidebarOpen(!sidebarOpen)} />
            <div>
              <Text strong>{currentSessionData?.title || "新对话"}</Text>
              <div>
                <Tag color="blue" style={{ fontSize: 10 }}>{selectedAgent.replace("agent-", "")}</Tag>
                <Tag color="purple" style={{ fontSize: 10 }}>{selectedModel}</Tag>
                <Tag style={{ fontSize: 10 }}>{messages.length} 条消息</Tag>
                {totalTokens > 0 && <Tag color="orange" style={{ fontSize: 10 }}>{totalTokens.toLocaleString()} tokens</Tag>}
              </div>
            </div>
          </Space>
          <Space>
            <Tooltip title="Thinking"><Switch size="small" checked={showThinking} onChange={setShowThinking} checkedChildren={<BulbOutlined />} unCheckedChildren={<BulbOutlined />} /></Tooltip>
            <Select value={selectedAgent} onChange={setSelectedAgent} size="small" style={{ width: 140 }} options={AGENTS} />
            <Select value={selectedModel} onChange={setSelectedModel} size="small" style={{ width: 140 }} options={MODELS} />
            <Segmented size="small" value={thinkingLevel} onChange={(v) => setThinkingLevel(v as string)} options={[
              { value: "off", label: "Off" }, { value: "low", label: "Low" }, { value: "high", label: "High" },
            ]} />
            <Divider type="vertical" />
            <Tooltip title="导出对话"><Button size="small" type="text" icon={<ExportOutlined />} onClick={exportChat} /></Tooltip>
            <Tooltip title="清空对话"><Popconfirm title="确认清空？" onConfirm={() => setMessages([])}><Button size="small" type="text" icon={<ClearOutlined />} /></Popconfirm></Tooltip>
            <Tooltip title="注入系统消息"><Button size="small" type="text" icon={<CodeOutlined />} onClick={() => {
              const text = prompt("输入系统消息:");
              if (text) inject(text);
            }} /></Tooltip>
            <Tooltip title={fullscreen ? "退出全屏" : "全屏"}>
              <Button size="small" type="text" icon={fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} onClick={() => setFullscreen(!fullscreen)} />
            </Tooltip>
          </Space>
        </div>

        {/* Messages */}
        <div ref={chatRef} style={{ flex: 1, overflow: "auto", padding: "16px 24px", background: "#f8f9fa" }}>
          {filteredMessages.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "#999" }}>
              <RobotOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />
              <p style={{ marginTop: 16, fontSize: 16 }}>开始一段新对话</p>
              <p style={{ fontSize: 13, color: "#bbb" }}>选择 Agent 和模型，然后发送消息</p>
              <Space style={{ marginTop: 16 }}>
                {["你好，介绍一下你自己", "帮我检查服务器状态", "今天天气怎么样？"].map(q => (
                  <Button key={q} size="small" onClick={() => { setInput(q); inputRef.current?.focus(); }}>{q}</Button>
                ))}
              </Space>
            </div>
          ) : (
            filteredMessages.map((m) => (
              <div key={m.id} style={{
                display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                marginBottom: 16, gap: 8,
              }}>
                {m.role !== "user" && (
                  <Avatar size={32} style={{ backgroundColor: m.role === "assistant" ? "#4945ff" : "#faad14", flexShrink: 0 }}
                    icon={m.role === "assistant" ? <RobotOutlined /> : <ThunderboltOutlined />} />
                )}
                <div style={{ maxWidth: "75%", minWidth: 100 }}>
                  {/* Thinking block */}
                  {showThinking && m.thinking && (
                    <div style={{ background: "#fffbe6", border: "1px solid #ffe58f", borderRadius: 8, padding: "8px 12px", marginBottom: 6, fontSize: 12 }}>
                      <BulbOutlined style={{ color: "#faad14" }} /> <Text type="secondary" italic>{m.thinking}</Text>
                    </div>
                  )}
                  {/* Tool calls */}
                  {m.toolCalls && m.toolCalls.length > 0 && (
                    <div style={{ marginBottom: 6 }}>
                      {m.toolCalls.map((tc, i) => (
                        <div key={i} style={{ background: "#f6ffed", border: "1px solid #b7eb8f", borderRadius: 6, padding: "6px 10px", marginBottom: 4, fontSize: 12 }}>
                          <ThunderboltOutlined style={{ color: "#52c41a" }} /> <Text strong>{tc.name}</Text>
                          {tc.result && <pre style={{ margin: "4px 0 0", fontSize: 11, color: "#666", whiteSpace: "pre-wrap" }}>{tc.result}</pre>}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Message bubble */}
                  <div style={{
                    background: m.role === "user" ? "#4945ff" : m.role === "system" ? "#fff7e6" : "#fff",
                    color: m.role === "user" ? "#fff" : "#333",
                    border: m.role === "system" ? "1px solid #ffe58f" : m.role === "user" ? "none" : "1px solid #e8e8e8",
                    borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    padding: "10px 16px", position: "relative",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                  }}>
                    {m.role === "system" && <Tag color="orange" style={{ marginBottom: 4, fontSize: 10 }}>SYSTEM</Tag>}
                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 14 }}>{m.content}</div>
                  </div>
                  {/* Meta line */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, padding: "0 4px" }}>
                    <Text type="secondary" style={{ fontSize: 10 }}>{new Date(m.time).toLocaleTimeString("zh-CN")}</Text>
                    {m.model && <Tag style={{ fontSize: 9, lineHeight: "14px", padding: "0 3px" }}>{m.model}</Tag>}
                    {m.tokens && <Text type="secondary" style={{ fontSize: 10 }}>{(m.tokens.input || 0) + (m.tokens.output || 0)} tok</Text>}
                    <div style={{ flex: 1 }} />
                    <Space size={2}>
                      <Tooltip title="复制"><Button size="small" type="text" icon={<CopyOutlined style={{ fontSize: 12 }} />} onClick={() => copyMessage(m.content)} /></Tooltip>
                      <Tooltip title={m.starred ? "取消收藏" : "收藏"}>
                        <Button size="small" type="text" icon={m.starred ? <StarFilled style={{ fontSize: 12, color: "#faad14" }} /> : <StarOutlined style={{ fontSize: 12 }} />}
                          onClick={() => toggleStar(m.id)} />
                      </Tooltip>
                      {m.role === "assistant" && <Tooltip title="重新生成"><Button size="small" type="text" icon={<ReloadOutlined style={{ fontSize: 12 }} />} /></Tooltip>}
                    </Space>
                  </div>
                </div>
                {m.role === "user" && (
                  <Avatar size={32} style={{ backgroundColor: "#1890ff", flexShrink: 0 }} icon={<UserOutlined />} />
                )}
              </div>
            ))
          )}
          {loading && (
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <Avatar size={32} style={{ backgroundColor: "#4945ff" }} icon={<RobotOutlined />} />
              <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: "16px 16px 16px 4px", padding: "12px 16px" }}>
                <div className="typing-dots" style={{ display: "flex", gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#999", animation: "blink 1.4s infinite", animationDelay: "0s" }}>•</span>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#999", animation: "blink 1.4s infinite", animationDelay: "0.2s" }}>•</span>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#999", animation: "blink 1.4s infinite", animationDelay: "0.4s" }}>•</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #f0f0f0", background: "#fff" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <Input.TextArea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
              autoSize={{ minRows: 1, maxRows: 6 }}
              disabled={loading}
              style={{ borderRadius: 12, resize: "none", fontSize: 14 }} />
            <Space direction="vertical" size={4}>
              <Button type="primary" icon={<SendOutlined />} onClick={send} loading={loading}
                style={{ borderRadius: 12, height: 40, width: 80 }} disabled={!input.trim()}>
                发送
              </Button>
              {loading && (
                <Button danger icon={<StopOutlined />} onClick={abort} size="small"
                  style={{ borderRadius: 8, width: 80 }}>
                  停止
                </Button>
              )}
            </Space>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, padding: "0 4px" }}>
            <Space size={4}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {selectedAgent.replace("agent-", "")} · {selectedModel} · thinking: {thinkingLevel}
              </Text>
            </Space>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {streamEnabled ? "🟢 流式输出" : "🔴 非流式"} · {messages.length} 条消息 · {totalTokens.toLocaleString()} tokens
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}
