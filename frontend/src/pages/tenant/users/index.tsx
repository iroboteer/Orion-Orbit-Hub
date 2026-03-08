import React, { useState } from "react";
import { Card, Table, Button, Tag, Space, Modal, Form, Input, Select, message, Popconfirm,
  Typography, Drawer, Descriptions, List, Tabs, Tooltip, Badge, Row, Col, Statistic, Avatar, Divider } from "antd";
import { PlusOutlined, UserOutlined, LockOutlined, EditOutlined, DeleteOutlined,
  EyeOutlined, StopOutlined, CheckCircleOutlined, SafetyCertificateOutlined,
  LogoutOutlined, KeyOutlined, MailOutlined, TeamOutlined,
  EyeTwoTone, EyeInvisibleOutlined, SearchOutlined, FilterOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
const { Title, Text } = Typography;

export default function UsersPage() {
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [detailUser, setDetailUser] = useState<any>(null);
  const [resetPwOpen, setResetPwOpen] = useState(false);
  const [resetPwUser, setResetPwUser] = useState<any>(null);
  const [roleModalUser, setRoleModalUser] = useState<any>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [resetPwForm] = Form.useForm();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [authFilter, setAuthFilter] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["users"], queryFn: () => api.get("/users").then(r => r.data) });
  const { data: rolesData } = useQuery({ queryKey: ["roles"], queryFn: () => api.get("/roles").then(r => r.data) });
  const { data: userDetail, refetch: refetchDetail } = useQuery({
    queryKey: ["user-detail", detailUser?.id], enabled: !!detailUser,
    queryFn: () => api.get(`/users/${detailUser.id}`).then(r => r.data),
  });

  const inviteMut = useMutation({
    mutationFn: (v: any) => api.post("/users/invite", v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setInviteOpen(false); message.success("User invited"); form.resetFields(); },
    onError: () => message.error("Failed"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...v }: any) => api.put(`/users/${id}`, v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setEditOpen(false); message.success("Updated"); editForm.resetFields(); if (detailUser) refetchDetail(); },
    onError: () => message.error("Failed"),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: any) => api.put(`/users/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); message.success("Status updated"); if (detailUser) refetchDetail(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); message.success("User removed"); setDetailUser(null); },
    onError: () => message.error("Failed"),
  });

  const resetPwMut = useMutation({
    mutationFn: ({ id, newPassword }: any) => api.post(`/users/${id}/reset-password`, { newPassword }),
    onSuccess: () => { setResetPwOpen(false); message.success("Password reset"); resetPwForm.resetFields(); },
    onError: () => message.error("Failed"),
  });

  const assignRoleMut = useMutation({
    mutationFn: ({ userId, roleId }: any) => api.post(`/users/${userId}/roles`, { roleId }),
    onSuccess: () => { message.success("Role assigned"); if (detailUser) refetchDetail(); },
  });

  const removeRoleMut = useMutation({
    mutationFn: ({ userId, roleId }: any) => api.delete(`/users/${userId}/roles/${roleId}`),
    onSuccess: () => { message.success("Role removed"); if (detailUser) refetchDetail(); },
  });

  const forceLogoutMut = useMutation({
    mutationFn: (id: string) => api.post(`/users/${id}/force-logout`),
    onSuccess: () => message.success("Sessions cleared"),
  });

  const openEdit = (u: any) => {
    setEditUser(u);
    editForm.setFieldsValue({ displayName: u.displayName, email: u.email, status: u.status });
    setEditOpen(true);
  };

  const allUsers = data?.users || [];
  const users_list = allUsers.filter((u: any) => {
    if (search && !u.email?.toLowerCase().includes(search.toLowerCase()) && !u.displayName?.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && u.status !== statusFilter) return false;
    if (authFilter && (u.idpProvider || "local") !== authFilter) return false;
    return true;
  });
  const activeCount = allUsers.filter((u: any) => u.status === "active").length;

  const columns = [
    {
      title: "User", key: "user", width: 280,
      render: (_: any, r: any) => (
        <Space>
          <Avatar style={{ backgroundColor: r.status === "active" ? "#4945ff" : "#d9d9d9" }} icon={<UserOutlined />} />
          <div>
            <Text strong>{r.displayName || r.email.split("@")[0]}</Text>
            <br /><Text type="secondary" style={{ fontSize: 12 }}>{r.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Status", dataIndex: "status", key: "status", width: 100,
      render: (s: string) => (
        <Tag color={s === "active" ? "green" : s === "suspended" ? "orange" : s === "disabled" ? "red" : "default"}>
          {s === "active" ? "Active" : s === "suspended" ? "Suspended" : s === "disabled" ? "Disabled" : "Pending"}
        </Tag>
      ),
    },
    {
      title: "Auth", dataIndex: "idpProvider", key: "idp", width: 100,
      render: (v: string) => <Tag color={v === "local" || !v ? "default" : "blue"}>{v || "local"}</Tag>,
    },
    {
      title: "MFA", dataIndex: "mfaEnabled", key: "mfa", width: 70,
      render: (v: boolean) => v ? <Tag color="green">ON</Tag> : <Tag>OFF</Tag>,
    },
    {
      title: "Last Login", dataIndex: "lastLoginAt", key: "login", width: 160,
      render: (v: string) => v ? new Date(v).toLocaleString() : "—",
    },
    {
      title: "Created", dataIndex: "createdAt", key: "created", width: 120,
      render: (v: string) => v ? new Date(v).toLocaleDateString() : "—",
    },
    {
      title: "Actions", key: "actions", width: 220, fixed: "right" as const,
      render: (_: any, r: any) => (
        <Space size={4}>
          <Tooltip title="Details"><Button size="small" icon={<EyeOutlined />} onClick={() => setDetailUser(r)} /></Tooltip>
          <Tooltip title="Edit"><Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} /></Tooltip>
          <Tooltip title="Reset Password"><Button size="small" icon={<KeyOutlined />} onClick={() => { setResetPwUser(r); setResetPwOpen(true); }} /></Tooltip>
          {r.status === "active" ? (
            <Popconfirm title="Suspend this user?" onConfirm={() => statusMut.mutate({ id: r.id, status: "suspended" })}>
              <Tooltip title="Suspend"><Button size="small" danger icon={<StopOutlined />} /></Tooltip>
            </Popconfirm>
          ) : (
            <Tooltip title="Activate"><Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => statusMut.mutate({ id: r.id, status: "active" })} /></Tooltip>
          )}
          <Popconfirm title="Remove user from tenant?" onConfirm={() => deleteMut.mutate(r.id)}>
            <Tooltip title="Remove"><Button size="small" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="Total Users" value={users_list.length} prefix={<TeamOutlined />} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="Active" value={activeCount} valueStyle={{ color: "#52c41a" }} prefix={<CheckCircleOutlined />} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="Suspended" value={users_list.filter((u: any) => u.status === "suspended").length} valueStyle={{ color: "#faad14" }} prefix={<StopOutlined />} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="Available Roles" value={rolesData?.roles?.length || 0} prefix={<SafetyCertificateOutlined />} /></Card></Col>
      </Row>

      <Card title={<Space><TeamOutlined /> <Title level={4} style={{ margin: 0 }}>User Management</Title></Space>}
        extra={
          <Space>
            <Input placeholder="Search name or email..." prefix={<SearchOutlined />} allowClear size="small" style={{ width: 200 }}
              value={search} onChange={e => setSearch(e.target.value)} />
            <Select placeholder="Status" size="small" style={{ width: 120 }} allowClear value={statusFilter}
              onChange={v => setStatusFilter(v)} options={[
                { value: "active", label: "✅ Active" }, { value: "suspended", label: "⏸️ Suspended" }, { value: "disabled", label: "🚫 Disabled" },
              ]} />
            <Select placeholder="Auth" size="small" style={{ width: 110 }} allowClear value={authFilter}
              onChange={v => setAuthFilter(v)} options={[
                { value: "local", label: "🔒 Local" }, { value: "oidc", label: "🌐 OIDC" },
              ]} />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setInviteOpen(true)}>Invite User</Button>
          </Space>
        }>
        <Table dataSource={users_list} columns={columns} rowKey="id" loading={isLoading} scroll={{ x: 1100 }}
          pagination={{ total: data?.total, pageSize: 20, showTotal: t => `${t} users` }} />
      </Card>

      {/* Invite Modal */}
      <Modal title="Invite User" open={inviteOpen} onCancel={() => { setInviteOpen(false); form.resetFields(); }}
        onOk={() => form.validateFields().then(v => inviteMut.mutate(v))} confirmLoading={inviteMut.isPending}>
        <Form form={form} layout="vertical">
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email", message: "Valid email required" }]}>
            <Input prefix={<MailOutlined />} placeholder="user@example.com" />
          </Form.Item>
          <Form.Item name="displayName" label="Display Name"><Input prefix={<UserOutlined />} placeholder="John Doe" /></Form.Item>
          <Form.Item name="password" label="Initial Password" rules={[{ min: 6, message: "Min 6 characters" }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Minimum 6 characters" iconRender={v => v ? <EyeTwoTone /> : <EyeInvisibleOutlined />} />
          </Form.Item>
          <Form.Item name="roleId" label="Role">
            <Select placeholder="Select role" allowClear options={(rolesData?.roles || []).map((r: any) => ({ value: r.id, label: r.displayName || r.name }))} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal title="Edit User" open={editOpen} onCancel={() => { setEditOpen(false); editForm.resetFields(); }}
        onOk={() => editForm.validateFields().then(v => updateMut.mutate({ id: editUser.id, ...v }))} confirmLoading={updateMut.isPending}>
        <Form form={editForm} layout="vertical">
          <Form.Item name="displayName" label="Display Name" rules={[{ required: true }]}>
            <Input prefix={<UserOutlined />} />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
            <Input prefix={<MailOutlined />} />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select options={[
              { value: "active", label: "✅ Active" },
              { value: "suspended", label: "⏸️ Suspended" },
              { value: "disabled", label: "🚫 Disabled" },
            ]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal title={`Reset Password — ${resetPwUser?.displayName || resetPwUser?.email}`} open={resetPwOpen}
        onCancel={() => { setResetPwOpen(false); resetPwForm.resetFields(); }}
        onOk={() => resetPwForm.validateFields().then(v => resetPwMut.mutate({ id: resetPwUser.id, ...v }))} confirmLoading={resetPwMut.isPending}>
        <Form form={resetPwForm} layout="vertical">
          <Form.Item name="newPassword" label="New Password" rules={[{ required: true, min: 6, message: "Min 6 characters" }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="New password" iconRender={v => v ? <EyeTwoTone /> : <EyeInvisibleOutlined />} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Drawer */}
      <Drawer title={<Space><Avatar style={{ backgroundColor: "#4945ff" }} icon={<UserOutlined />} /> {detailUser?.displayName || detailUser?.email}</Space>}
        open={!!detailUser} onClose={() => setDetailUser(null)} width={600}
        extra={
          <Space>
            <Button icon={<EditOutlined />} onClick={() => { if (detailUser) openEdit(detailUser); }}>Edit</Button>
            <Popconfirm title="Force logout all sessions?" onConfirm={() => forceLogoutMut.mutate(detailUser.id)}>
              <Button icon={<LogoutOutlined />} danger>Force Logout</Button>
            </Popconfirm>
          </Space>
        }>
        {detailUser && (
          <Tabs items={[
            { key: "info", label: "Info", children: (
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Email">{userDetail?.user?.email || detailUser.email}</Descriptions.Item>
                <Descriptions.Item label="Display Name">{userDetail?.user?.displayName || detailUser.displayName}</Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={(userDetail?.user?.status || detailUser.status) === "active" ? "green" : "orange"}>
                    {userDetail?.user?.status || detailUser.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Auth Provider"><Tag>{userDetail?.user?.idpProvider || "local"}</Tag></Descriptions.Item>
                <Descriptions.Item label="MFA">{userDetail?.user?.mfaEnabled ? <Tag color="green">Enabled</Tag> : <Tag>Disabled</Tag>}</Descriptions.Item>
                <Descriptions.Item label="Platform Admin">{userDetail?.user?.isPlatformAdmin ? <Tag color="purple">Yes</Tag> : "No"}</Descriptions.Item>
                <Descriptions.Item label="Last Login">{userDetail?.user?.lastLoginAt ? new Date(userDetail.user.lastLoginAt).toLocaleString() : "—"}</Descriptions.Item>
                <Descriptions.Item label="Last Login IP">{userDetail?.user?.lastLoginIp || "—"}</Descriptions.Item>
                <Descriptions.Item label="Created">{userDetail?.user?.createdAt ? new Date(userDetail.user.createdAt).toLocaleString() : "—"}</Descriptions.Item>
              </Descriptions>
            )},
            { key: "roles", label: `Roles (${userDetail?.roles?.length || 0})`, children: (
              <div>
                <Space style={{ marginBottom: 16 }}>
                  <Select placeholder="Assign role" style={{ width: 200 }}
                    options={(rolesData?.roles || []).map((r: any) => ({ value: r.id, label: r.displayName || r.name }))}
                    onSelect={(v: string) => assignRoleMut.mutate({ userId: detailUser.id, roleId: v })} />
                </Space>
                <List dataSource={userDetail?.roles || []} locale={{ emptyText: "No roles assigned" }}
                  renderItem={(r: any) => (
                    <List.Item actions={[
                      <Popconfirm title="Remove this role?" onConfirm={() => removeRoleMut.mutate({ userId: detailUser.id, roleId: r.roleId })}>
                        <Button size="small" danger icon={<DeleteOutlined />}>Remove</Button>
                      </Popconfirm>
                    ]}>
                      <List.Item.Meta
                        avatar={<SafetyCertificateOutlined style={{ fontSize: 20, color: "#4945ff" }} />}
                        title={<Text strong>{r.roleName}</Text>}
                        description={r.permissions ? `${JSON.parse(r.permissions).length} permissions` : "—"}
                      />
                    </List.Item>
                  )} />
              </div>
            )},
            { key: "tenants", label: `Tenants (${userDetail?.tenants?.length || 0})`, children: (
              <List dataSource={userDetail?.tenants || []} locale={{ emptyText: "No tenants" }}
                renderItem={(t: any) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<TeamOutlined style={{ fontSize: 20, color: "#1890ff" }} />}
                      title={t.tenantName}
                      description={<Tag color={t.status === "active" ? "green" : "orange"}>{t.status}</Tag>}
                    />
                  </List.Item>
                )} />
            )},
          ]} />
        )}
      </Drawer>
    </div>
  );
}
