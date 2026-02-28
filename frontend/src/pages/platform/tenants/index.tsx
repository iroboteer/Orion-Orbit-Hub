import React, { useState } from "react";
import { Card, Table, Button, Tag, Space, Modal, Form, Input, InputNumber, Switch, message, Popconfirm, Typography, Descriptions } from "antd";
import { PlusOutlined, EditOutlined, StopOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

const { Title } = Typography;

export default function TenantsPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState<any>(null);
  const [editTenant, setEditTenant] = useState<any>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({ queryKey: ["tenants"], queryFn: () => api.get("/tenants").then(r => r.data) });

  const createMut = useMutation({
    mutationFn: (values: any) => editTenant ? api.put(`/tenants/${editTenant.id}`, values) : api.post("/tenants", values),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenants"] }); setModalOpen(false); message.success("保存成功"); },
  });

  const freezeMut = useMutation({
    mutationFn: ({ id, action }: any) => api.post(`/tenants/${id}/${action}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenants"] }); message.success("操作成功"); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/tenants/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenants"] }); message.success("删除成功"); },
  });

  const columns = [
    { title: "Slug", dataIndex: "slug", key: "slug", width: 120 },
    { title: "名称", dataIndex: "name", key: "name" },
    { title: "联系人", dataIndex: "contactName", key: "contact" },
    { title: "状态", dataIndex: "status", key: "status", render: (s: string) => (
      <Tag color={s === "active" ? "green" : s === "frozen" ? "orange" : "red"}>{s === "active" ? "活跃" : s === "frozen" ? "冻结" : "已删除"}</Tag>
    )},
    { title: "创建时间", dataIndex: "createdAt", key: "createdAt", render: (v: string) => new Date(v).toLocaleDateString("zh-CN") },
    { title: "操作", key: "actions", render: (_: any, r: any) => (
      <Space>
        <Button size="small" icon={<EyeOutlined />} onClick={() => setDetailOpen(r)}>详情</Button>
        <Button size="small" icon={<EditOutlined />} onClick={() => { setEditTenant(r); form.setFieldsValue(r); setModalOpen(true); }}>编辑</Button>
        {r.status === "active" ? (
          <Popconfirm title="确认冻结？" onConfirm={() => freezeMut.mutate({ id: r.id, action: "freeze" })}>
            <Button size="small" danger icon={<StopOutlined />}>冻结</Button>
          </Popconfirm>
        ) : r.status === "frozen" ? (
          <Button size="small" onClick={() => freezeMut.mutate({ id: r.id, action: "unfreeze" })}>解冻</Button>
        ) : null}
        <Popconfirm title="确认删除？" onConfirm={() => deleteMut.mutate(r.id)}>
          <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      </Space>
    )},
  ];

  return (
    <div>
      <Card title={<Title level={4} style={{ margin: 0 }}>🏢 租户管理</Title>}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditTenant(null); form.resetFields(); setModalOpen(true); }}>创建租户</Button>}>
        <Table dataSource={data?.tenants || []} columns={columns} rowKey="id" loading={isLoading} pagination={{ pageSize: 10 }} />
      </Card>

      <Modal title={editTenant ? "编辑租户" : "创建租户"} open={modalOpen} onCancel={() => setModalOpen(false)}
        onOk={() => form.validateFields().then(v => createMut.mutate(v))} confirmLoading={createMut.isPending} width={640}>
        <Form form={form} layout="vertical">
          <Form.Item name="slug" label="Slug" rules={[{ required: true }]}><Input placeholder="tenant-slug" disabled={!!editTenant} /></Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="contactName" label="联系人"><Input /></Form.Item>
          <Form.Item name="contactEmail" label="联系邮箱"><Input /></Form.Item>
          <Form.Item name="notes" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal title="租户详情" open={!!detailOpen} onCancel={() => setDetailOpen(null)} footer={null} width={640}>
        {detailOpen && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="ID">{detailOpen.id}</Descriptions.Item>
            <Descriptions.Item label="Slug">{detailOpen.slug}</Descriptions.Item>
            <Descriptions.Item label="名称">{detailOpen.name}</Descriptions.Item>
            <Descriptions.Item label="状态"><Tag color={detailOpen.status === "active" ? "green" : "orange"}>{detailOpen.status}</Tag></Descriptions.Item>
            <Descriptions.Item label="联系人">{detailOpen.contactName}</Descriptions.Item>
            <Descriptions.Item label="邮箱">{detailOpen.contactEmail}</Descriptions.Item>
            <Descriptions.Item label="配额" span={2}><pre style={{ fontSize: 12 }}>{JSON.stringify(detailOpen.quotas, null, 2)}</pre></Descriptions.Item>
            <Descriptions.Item label="策略" span={2}><pre style={{ fontSize: 12 }}>{JSON.stringify(detailOpen.policies, null, 2)}</pre></Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
