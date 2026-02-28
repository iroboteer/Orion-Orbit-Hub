import React from "react";
import { Card, Table, Tag, Button, Space, Typography, message } from "antd";
import { CheckOutlined, BellOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
const { Title } = Typography;

const SEV_MAP: Record<string, { color: string; text: string }> = {
  critical: { color: "red", text: "严重" }, warning: { color: "orange", text: "警告" }, info: { color: "blue", text: "信息" },
};

export default function AlertsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["alerts"], queryFn: () => api.get("/alerts").then(r => r.data) });

  const ackMut = useMutation({
    mutationFn: (id: string) => api.post(`/alerts/${id}/ack`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["alerts"] }); message.success("已确认"); },
  });

  const columns = [
    { title: "级别", dataIndex: "severity", key: "severity", render: (v: string) => { const s = SEV_MAP[v]; return s ? <Tag color={s.color}>{s.text}</Tag> : <Tag>{v}</Tag>; }},
    { title: "标题", dataIndex: "title", key: "title" },
    { title: "来源", dataIndex: "source", key: "source" },
    { title: "状态", dataIndex: "status", key: "status", render: (v: string) => (
      <Tag color={v === "open" ? "red" : v === "acked" ? "orange" : "green"}>{v === "open" ? "未处理" : v === "acked" ? "已确认" : "已解决"}</Tag>
    )},
    { title: "时间", dataIndex: "createdAt", key: "time", render: (v: string) => new Date(v).toLocaleString("zh-CN") },
    { title: "操作", key: "actions", render: (_: any, r: any) => r.status === "open" ? (
      <Button size="small" icon={<CheckOutlined />} onClick={() => ackMut.mutate(r.id)}>确认</Button>
    ) : null },
  ];

  return (
    <Card title={<Title level={4} style={{ margin: 0 }}>🔔 告警中心</Title>}>
      <Table dataSource={data?.alerts || []} columns={columns} rowKey="id" loading={isLoading} pagination={{ pageSize: 20 }} />
    </Card>
  );
}
