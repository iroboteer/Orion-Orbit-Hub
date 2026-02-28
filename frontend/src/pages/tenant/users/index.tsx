import React, { useState } from "react";
import { Card, Table, Button, Tag, Space, Modal, Form, Input, Select, message, Popconfirm, Typography, Drawer, Descriptions, List } from "antd";
import { PlusOutlined, UserOutlined, LockOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
const { Title } = Typography;

export default function UsersPage() {
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<any>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({ queryKey: ["users"], queryFn: () => api.get("/users").then(r => r.data) });
  const { data: rolesData } = useQuery({ queryKey: ["roles"], queryFn: () => api.get("/roles").then(r => r.data) });
  const { data: userDetail } = useQuery({
    queryKey: ["user-detail", detailUser?.id], enabled: !!detailUser,
    queryFn: () => api.get(`/users/${detailUser.id}`).then(r => r.data),
  });

  const inviteMut = useMutation({
    mutationFn: (v: any) => api.post("/users/invite", v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setInviteOpen(false); message.success("邀请成功"); form.resetFields(); },
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: any) => api.put(`/users/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); message.success("操作成功"); },
  });

  const columns = [
    { title: "邮箱", dataIndex: "email", key: "email" },
    { title: "显示名", dataIndex: "displayName", key: "name" },
    { title: "状态", dataIndex: "status", key: "status", render: (s: string) => (
      <Tag color={s === "active" ? "green" : s === "suspended" ? "orange" : "red"}>
        {s === "active" ? "活跃" : s === "suspended" ? "停用" : s === "disabled" ? "禁用" : "待激活"}
      </Tag>
    )},
    { title: "最近登录", dataIndex: "lastLoginAt", key: "login", render: (v: string) => v ? new Date(v).toLocaleString("zh-CN") : "-" },
    { title: "认证来源", dataIndex: "idpProvider", key: "idp", render: (v: string) => <Tag>{v || "local"}</Tag> },
    { title: "操作", key: "actions", render: (_: any, r: any) => (
      <Space>
        <Button size="small" onClick={() => setDetailUser(r)}>详情</Button>
        {r.status === "active" ? (
          <Popconfirm title="确认停用？" onConfirm={() => statusMut.mutate({ id: r.id, status: "suspended" })}>
            <Button size="small" danger>停用</Button>
          </Popconfirm>
        ) : (
          <Button size="small" type="primary" onClick={() => statusMut.mutate({ id: r.id, status: "active" })}>启用</Button>
        )}
      </Space>
    )},
  ];

  return (
    <div>
      <Card title={<Title level={4} style={{ margin: 0 }}>👥 用户管理</Title>}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setInviteOpen(true)}>邀请用户</Button>}>
        <Table dataSource={data?.users || []} columns={columns} rowKey="id" loading={isLoading}
          pagination={{ total: data?.total, pageSize: 20, showTotal: t => `共 ${t} 人` }} />
      </Card>

      <Modal title="邀请用户" open={inviteOpen} onCancel={() => setInviteOpen(false)}
        onOk={() => form.validateFields().then(v => inviteMut.mutate(v))} confirmLoading={inviteMut.isPending}>
        <Form form={form} layout="vertical">
          <Form.Item name="email" label="邮箱" rules={[{ required: true, type: "email" }]}><Input prefix={<UserOutlined />} /></Form.Item>
          <Form.Item name="displayName" label="显示名"><Input /></Form.Item>
          <Form.Item name="password" label="初始密码"><Input.Password prefix={<LockOutlined />} /></Form.Item>
          <Form.Item name="roleId" label="角色">
            <Select placeholder="选择角色" options={(rolesData?.roles || []).map((r: any) => ({ value: r.id, label: r.displayName || r.name }))} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer title="用户详情" open={!!detailUser} onClose={() => setDetailUser(null)} width={500}>
        {userDetail?.user && (
          <>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="邮箱">{userDetail.user.email}</Descriptions.Item>
              <Descriptions.Item label="显示名">{userDetail.user.displayName}</Descriptions.Item>
              <Descriptions.Item label="状态"><Tag color={userDetail.user.status === "active" ? "green" : "red"}>{userDetail.user.status}</Tag></Descriptions.Item>
              <Descriptions.Item label="认证来源">{userDetail.user.idpProvider || "local"}</Descriptions.Item>
              <Descriptions.Item label="MFA">{userDetail.user.mfaEnabled ? "已启用" : "未启用"}</Descriptions.Item>
              <Descriptions.Item label="最近登录IP">{userDetail.user.lastLoginIp || "-"}</Descriptions.Item>
            </Descriptions>
            <Title level={5} style={{ marginTop: 16 }}>角色</Title>
            <List size="small" dataSource={userDetail.roles || []}
              renderItem={(r: any) => <List.Item><Tag color="blue">{r.roleName}</Tag></List.Item>}
              locale={{ emptyText: "无角色" }} />
          </>
        )}
      </Drawer>
    </div>
  );
}
