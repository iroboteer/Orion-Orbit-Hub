import React, { useState } from "react";
import { Card, Table, Tag, Button, Space, Typography, Modal, Select, message, Popconfirm } from "antd";
import { DownloadOutlined, DeleteOutlined, PlusOutlined, FileExcelOutlined, LoadingOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
const { Title, Text } = Typography;

const TYPE_MAP: Record<string, string> = { sessions: "会话记录", logs: "运行日志", audit: "审计日志", users: "用户列表", alerts: "告警记录" };
const STATUS_MAP: Record<string, { color: string; text: string }> = {
  pending: { color: "orange", text: "排队中" }, processing: { color: "blue", text: "处理中" },
  completed: { color: "green", text: "已完成" }, failed: { color: "red", text: "失败" },
};

export default function ExportsPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [exportType, setExportType] = useState("audit");

  const { data, isLoading } = useQuery({ queryKey: ["exports"], queryFn: () => api.get("/exports").then(r => r.data), refetchInterval: 5000 });

  const createMut = useMutation({
    mutationFn: (type: string) => api.post("/exports", { type }),
    onSuccess: () => { setCreateOpen(false); qc.invalidateQueries({ queryKey: ["exports"] }); message.success("导出任务已创建"); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/exports/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["exports"] }); message.success("已删除"); },
  });

  const columns = [
    { title: "类型", dataIndex: "type", key: "type", render: (v: string) => <Tag icon={<FileExcelOutlined />}>{TYPE_MAP[v] || v}</Tag> },
    { title: "状态", dataIndex: "status", key: "status", render: (v: string) => {
      const s = STATUS_MAP[v]; return <Tag color={s?.color} icon={v === "processing" ? <LoadingOutlined spin /> : undefined}>{s?.text || v}</Tag>;
    }},
    { title: "创建人", dataIndex: "userEmail", key: "user" },
    { title: "文件大小", dataIndex: "fileSize", key: "size", render: (v: number) => v ? `${(v / 1024).toFixed(1)} KB` : "-" },
    { title: "创建时间", dataIndex: "createdAt", key: "time", render: (v: string) => new Date(v).toLocaleString("zh-CN") },
    { title: "操作", key: "actions", render: (_: any, r: any) => (
      <Space>
        {r.status === "completed" && <Button size="small" type="primary" icon={<DownloadOutlined />}>下载</Button>}
        <Popconfirm title="确认删除？" onConfirm={() => deleteMut.mutate(r.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    )},
  ];

  return (
    <Card title={<Title level={4} style={{ margin: 0 }}>📦 数据导出</Title>}
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新建导出</Button>}>
      <Table dataSource={data?.exports || []} columns={columns} rowKey="id" loading={isLoading} pagination={{ pageSize: 20 }} />
      <Modal title="新建导出任务" open={createOpen} onCancel={() => setCreateOpen(false)}
        onOk={() => createMut.mutate(exportType)} confirmLoading={createMut.isPending}>
        <Select value={exportType} onChange={setExportType} style={{ width: "100%" }}
          options={Object.entries(TYPE_MAP).map(([k, v]) => ({ value: k, label: v }))} />
      </Modal>
    </Card>
  );
}
