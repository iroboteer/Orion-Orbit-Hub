import React, { useState } from "react";
import { Card, Table, Tag, Button, Space, Typography, Modal, Form, Input, Tabs, Popconfirm,
  message, List, Avatar, Empty, Drawer } from "antd";
import { PlusOutlined, DeleteOutlined, TeamOutlined, ApartmentOutlined, UserOutlined, EditOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
const { Title, Text } = Typography;

function DepartmentsTab() {
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [createOpen, setCreateOpen] = useState(false);
  const [members, setMembers] = useState<{ deptId: string; name: string } | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["departments"], queryFn: () => api.get("/org/departments").then(r => r.data) });
  const { data: memberData } = useQuery({
    queryKey: ["dept-members", members?.deptId], enabled: !!members?.deptId,
    queryFn: () => api.get(`/org/departments/${members!.deptId}/members`).then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (v: any) => api.post("/org/departments", v),
    onSuccess: () => { setCreateOpen(false); form.resetFields(); qc.invalidateQueries({ queryKey: ["departments"] }); message.success("已创建"); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/org/departments/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["departments"] }); message.success("已删除"); },
  });

  const columns = [
    { title: "部门", dataIndex: "name", key: "name", render: (v: string) => <Space><ApartmentOutlined /><Text strong>{v}</Text></Space> },
    { title: "排序", dataIndex: "sortOrder", key: "sort" },
    { title: "创建时间", dataIndex: "createdAt", key: "time", render: (v: string) => new Date(v).toLocaleDateString("zh-CN") },
    { title: "操作", key: "actions", render: (_: any, r: any) => (
      <Space>
        <Button size="small" icon={<TeamOutlined />} onClick={() => setMembers({ deptId: r.id, name: r.name })}>成员</Button>
        <Popconfirm title="确认删除？" onConfirm={() => deleteMut.mutate(r.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    )},
  ];

  return (
    <>
      <Card extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新建部门</Button>}>
        <Table dataSource={data?.departments || []} columns={columns} rowKey="id" loading={isLoading} pagination={false} />
      </Card>
      <Modal title="新建部门" open={createOpen} onCancel={() => setCreateOpen(false)}
        onOk={() => form.validateFields().then(v => createMut.mutate(v))} confirmLoading={createMut.isPending}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="部门名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="sortOrder" label="排序"><Input type="number" /></Form.Item>
        </Form>
      </Modal>
      <Drawer title={`${members?.name} - 成员`} open={!!members} onClose={() => setMembers(null)} width={400}>
        <List dataSource={memberData?.members || []} locale={{ emptyText: "暂无成员" }}
          renderItem={(m: any) => (
            <List.Item><List.Item.Meta avatar={<Avatar icon={<UserOutlined />} />}
              title={m.displayName || m.email} description={m.email} /></List.Item>
          )} />
      </Drawer>
    </>
  );
}

function TeamsTab() {
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [createOpen, setCreateOpen] = useState(false);
  const [members, setMembers] = useState<{ teamId: string; name: string } | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["teams"], queryFn: () => api.get("/org/teams").then(r => r.data) });
  const { data: memberData } = useQuery({
    queryKey: ["team-members", members?.teamId], enabled: !!members?.teamId,
    queryFn: () => api.get(`/org/teams/${members!.teamId}/members`).then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (v: any) => api.post("/org/teams", v),
    onSuccess: () => { setCreateOpen(false); form.resetFields(); qc.invalidateQueries({ queryKey: ["teams"] }); message.success("已创建"); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/org/teams/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["teams"] }); message.success("已删除"); },
  });

  const columns = [
    { title: "团队", dataIndex: "name", key: "name", render: (v: string) => <Space><TeamOutlined /><Text strong>{v}</Text></Space> },
    { title: "描述", dataIndex: "description", key: "desc", ellipsis: true },
    { title: "创建时间", dataIndex: "createdAt", key: "time", render: (v: string) => new Date(v).toLocaleDateString("zh-CN") },
    { title: "操作", key: "actions", render: (_: any, r: any) => (
      <Space>
        <Button size="small" icon={<TeamOutlined />} onClick={() => setMembers({ teamId: r.id, name: r.name })}>成员</Button>
        <Popconfirm title="确认删除？" onConfirm={() => deleteMut.mutate(r.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    )},
  ];

  return (
    <>
      <Card extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新建团队</Button>}>
        <Table dataSource={data?.teams || []} columns={columns} rowKey="id" loading={isLoading} pagination={false} />
      </Card>
      <Modal title="新建团队" open={createOpen} onCancel={() => setCreateOpen(false)}
        onOk={() => form.validateFields().then(v => createMut.mutate(v))} confirmLoading={createMut.isPending}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="团队名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
      <Drawer title={`${members?.name} - 成员`} open={!!members} onClose={() => setMembers(null)} width={400}>
        <List dataSource={memberData?.members || []} locale={{ emptyText: "暂无成员" }}
          renderItem={(m: any) => (
            <List.Item><List.Item.Meta avatar={<Avatar icon={<UserOutlined />} />}
              title={<Space>{m.displayName || m.email}<Tag>{m.role}</Tag></Space>} description={m.email} /></List.Item>
          )} />
      </Drawer>
    </>
  );
}

export default function OrgPage() {
  return (
    <Card title={<Title level={4} style={{ margin: 0 }}>🏢 组织架构</Title>}>
      <Tabs items={[
        { key: "departments", label: <Space><ApartmentOutlined />部门</Space>, children: <DepartmentsTab /> },
        { key: "teams", label: <Space><TeamOutlined />团队</Space>, children: <TeamsTab /> },
      ]} />
    </Card>
  );
}
