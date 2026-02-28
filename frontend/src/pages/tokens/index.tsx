import React, { useState } from "react";
import { Card, Table, Tag, Button, Space, Typography, Modal, Form, Input, Select, InputNumber,
  message, Popconfirm, Alert, Tooltip } from "antd";
import { PlusOutlined, DeleteOutlined, KeyOutlined, CopyOutlined, EyeInvisibleOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
const { Title, Text, Paragraph } = Typography;

const PERM_OPTIONS = [
  { value: "chat.send", label: "发送消息" }, { value: "chat.read", label: "读取会话" },
  { value: "session.read", label: "查看会话" }, { value: "cron.read", label: "查看任务" },
  { value: "cron.manage", label: "管理任务" }, { value: "gateway.read", label: "网关只读" },
];

export default function TokensPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({ queryKey: ["tokens"], queryFn: () => api.get("/tokens").then(r => r.data) });

  const createMut = useMutation({
    mutationFn: (values: any) => api.post("/tokens", values),
    onSuccess: (res) => {
      setNewToken(res.data.token.rawToken);
      setCreateOpen(false); form.resetFields();
      qc.invalidateQueries({ queryKey: ["tokens"] });
    },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/tokens/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tokens"] }); message.success("已撤销"); },
  });

  const columns = [
    { title: "名称", dataIndex: "name", key: "name", render: (v: string) => <Space><KeyOutlined /><Text strong>{v}</Text></Space> },
    { title: "权限", dataIndex: "permissions", key: "perms", render: (v: string[]) => (
      <Space wrap size={[4, 4]}>{v?.map(p => <Tag key={p} color="blue">{p}</Tag>)}{(!v || v.length === 0) && <Tag>全部</Tag>}</Space>
    )},
    { title: "创建人", dataIndex: "userEmail", key: "user" },
    { title: "过期时间", dataIndex: "expiresAt", key: "expires", render: (v: string) => v ? new Date(v).toLocaleDateString("zh-CN") : <Tag color="orange">永不过期</Tag> },
    { title: "最后使用", dataIndex: "lastUsedAt", key: "lastUsed", render: (v: string) => v ? new Date(v).toLocaleString("zh-CN") : "-" },
    { title: "创建时间", dataIndex: "createdAt", key: "time", render: (v: string) => new Date(v).toLocaleString("zh-CN") },
    { title: "操作", key: "actions", render: (_: any, r: any) => (
      <Popconfirm title="撤销后不可恢复，确认？" onConfirm={() => deleteMut.mutate(r.id)}>
        <Button size="small" danger icon={<DeleteOutlined />}>撤销</Button>
      </Popconfirm>
    )},
  ];

  return (
    <div>
      {newToken && (
        <Alert type="success" closable onClose={() => setNewToken(null)} style={{ marginBottom: 16 }}
          message="Token 创建成功" description={
            <Space direction="vertical">
              <Text>请立即复制此 Token，关闭后将无法再次查看：</Text>
              <Space><Text code copyable>{newToken}</Text></Space>
            </Space>
          } />
      )}
      <Card title={<Title level={4} style={{ margin: 0 }}>🔑 API Token 管理</Title>}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>创建 Token</Button>}>
        <Table dataSource={data?.tokens || []} columns={columns} rowKey="id" loading={isLoading} pagination={{ pageSize: 20 }} />
      </Card>
      <Modal title="创建 API Token" open={createOpen} onCancel={() => setCreateOpen(false)}
        onOk={() => form.validateFields().then(v => createMut.mutate(v))} confirmLoading={createMut.isPending}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input placeholder="例如：CI/CD Pipeline" /></Form.Item>
          <Form.Item name="permissions" label="权限"><Select mode="multiple" options={PERM_OPTIONS} placeholder="留空 = 全部权限" /></Form.Item>
          <Form.Item name="expiresInDays" label="有效期（天）"><InputNumber min={1} max={365} placeholder="留空 = 永不过期" style={{ width: "100%" }} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
