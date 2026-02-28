import React, { useState } from "react";
import { Card, Table, Tag, Button, Drawer, Typography, Timeline, Space, Empty } from "antd";
import { MessageOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
const { Title, Text } = Typography;

export default function SessionsPage() {
  const [selected, setSelected] = useState<any>(null);
  const { data, isLoading } = useQuery({ queryKey: ["sessions"], queryFn: () => api.get("/sessions").then(r => r.data) });
  const { data: history } = useQuery({
    queryKey: ["session-history", selected?.key], enabled: !!selected,
    queryFn: () => api.get(`/sessions/${selected.key}/history`).then(r => r.data),
  });

  const sessions = data?.sessions || data?.data || [];

  const columns = [
    { title: "会话", dataIndex: "key", key: "key", ellipsis: true },
    { title: "渠道", dataIndex: "channel", key: "channel", render: (v: string) => <Tag>{v || "unknown"}</Tag> },
    { title: "状态", dataIndex: "status", key: "status", render: (v: string) => <Tag color={v === "active" ? "green" : "default"}>{v || "idle"}</Tag> },
    { title: "最近消息", dataIndex: "lastMessage", key: "last", ellipsis: true },
    { title: "操作", key: "actions", render: (_: any, r: any) => <Button size="small" icon={<MessageOutlined />} onClick={() => setSelected(r)}>查看</Button> },
  ];

  return (
    <div>
      <Card title={<Title level={4} style={{ margin: 0 }}>💬 会话管理</Title>}>
        {sessions.length > 0 ? (
          <Table dataSource={sessions} columns={columns} rowKey="key" loading={isLoading} />
        ) : (
          <Empty description={data?.error || "暂无会话数据（需连接 OpenClaw Gateway）"} />
        )}
      </Card>
      <Drawer title="会话详情" open={!!selected} onClose={() => setSelected(null)} width={600}>
        {history?.messages?.length > 0 ? (
          <Timeline items={history.messages.map((m: any, i: number) => ({
            color: m.role === "user" ? "blue" : m.role === "assistant" ? "green" : "gray",
            children: <div><Text strong>{m.role}</Text><br /><Text>{m.content?.substring(0, 200)}</Text></div>,
          }))} />
        ) : <Empty description="无消息记录" />}
      </Drawer>
    </div>
  );
}
