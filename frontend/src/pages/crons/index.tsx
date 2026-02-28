import React from "react";
import { Card, Table, Tag, Button, Space, Empty, Typography } from "antd";
import { PlusOutlined, PlayCircleOutlined, PauseCircleOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
const { Title } = Typography;

export default function CronsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["crons"], queryFn: () => api.get("/crons").then(r => r.data) });
  const crons = data?.crons || data?.data || [];

  const columns = [
    { title: "名称", dataIndex: "name", key: "name" },
    { title: "Schedule", dataIndex: "schedule", key: "schedule", render: (v: string) => <Tag>{v}</Tag> },
    { title: "状态", dataIndex: "enabled", key: "enabled", render: (v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "启用" : "禁用"}</Tag> },
    { title: "最近运行", dataIndex: "lastRun", key: "lastRun", render: (v: string) => v ? new Date(v).toLocaleString("zh-CN") : "-" },
    { title: "操作", key: "actions", render: (_: any, r: any) => (
      <Space>
        <Button size="small" icon={<PlayCircleOutlined />} type="primary">手动运行</Button>
        <Button size="small" icon={<PauseCircleOutlined />}>{r.enabled ? "禁用" : "启用"}</Button>
      </Space>
    )},
  ];

  return (
    <Card title={<Title level={4} style={{ margin: 0 }}>⏰ 定时任务</Title>}
      extra={<Button type="primary" icon={<PlusOutlined />}>创建任务</Button>}>
      {crons.length > 0 ? (
        <Table dataSource={crons} columns={columns} rowKey="id" loading={isLoading} />
      ) : (
        <Empty description="暂无定时任务（需连接 OpenClaw Gateway）" />
      )}
    </Card>
  );
}
