import React from "react";
import { Card, Table, Tag, Button, Space, Typography, Popconfirm, message } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
const { Title } = Typography;

const STATUS_MAP: Record<string, { color: string; text: string }> = {
  pending: { color: "orange", text: "待审批" }, approved: { color: "green", text: "已通过" },
  rejected: { color: "red", text: "已拒绝" }, expired: { color: "default", text: "已过期" },
  cancelled: { color: "default", text: "已取消" },
};

export default function ApprovalsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["approvals"], queryFn: () => api.get("/approvals").then(r => r.data) });

  const approveMut = useMutation({
    mutationFn: (id: string) => api.post(`/approvals/${id}/approve`, { note: "通过" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["approvals"] }); message.success("已通过"); },
  });
  const rejectMut = useMutation({
    mutationFn: (id: string) => api.post(`/approvals/${id}/reject`, { reason: "拒绝" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["approvals"] }); message.success("已拒绝"); },
  });

  const columns = [
    { title: "类型", dataIndex: "type", key: "type", render: (v: string) => <Tag>{v}</Tag> },
    { title: "标题", dataIndex: "title", key: "title" },
    { title: "申请人", dataIndex: "requesterName", key: "requester", render: (v: string, r: any) => v || r.requesterEmail },
    { title: "状态", dataIndex: "status", key: "status", render: (v: string) => {
      const s = STATUS_MAP[v] || { color: "default", text: v };
      return <Tag color={s.color}>{s.text}</Tag>;
    }},
    { title: "时间", dataIndex: "createdAt", key: "time", render: (v: string) => new Date(v).toLocaleString("zh-CN") },
    { title: "操作", key: "actions", render: (_: any, r: any) => r.status === "pending" ? (
      <Space>
        <Popconfirm title="确认通过？" onConfirm={() => approveMut.mutate(r.id)}>
          <Button size="small" type="primary" icon={<CheckOutlined />}>通过</Button>
        </Popconfirm>
        <Popconfirm title="确认拒绝？" onConfirm={() => rejectMut.mutate(r.id)}>
          <Button size="small" danger icon={<CloseOutlined />}>拒绝</Button>
        </Popconfirm>
      </Space>
    ) : null },
  ];

  return (
    <Card title={<Title level={4} style={{ margin: 0 }}>✅ 审批中心</Title>}>
      <Table dataSource={data?.approvals || []} columns={columns} rowKey="id" loading={isLoading} pagination={{ pageSize: 20 }} />
    </Card>
  );
}
