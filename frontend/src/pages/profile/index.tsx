import React, { useState } from "react";
import { Card, Descriptions, Tag, Typography, Button, Space, List, Form, Input, message, Tabs, Divider, Alert } from "antd";
import { LockOutlined, EyeTwoTone, EyeInvisibleOutlined, UserOutlined, SafetyCertificateOutlined, LogoutOutlined, BankOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/stores/auth";
import api from "@/lib/api";
const { Title, Text } = Typography;

export default function ProfilePage() {
  const { user, tenants, currentTenant, logout } = useAuth();
  const [pwForm] = Form.useForm();

  const changePwMut = useMutation({
    mutationFn: (v: any) => api.post("/auth/change-password", v),
    onSuccess: () => { pwForm.resetFields(); message.success("密码修改成功"); },
    onError: (e: any) => message.error(e.response?.data?.error || "修改失败"),
  });

  return (
    <Card title={<Title level={4} style={{ margin: 0 }}>👤 个人中心</Title>}>
      <Tabs items={[
        { key: "info", label: <Space><UserOutlined />基本信息</Space>, children: (
          <div>
            <Descriptions bordered column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="邮箱">{user?.email}</Descriptions.Item>
              <Descriptions.Item label="显示名">{user?.displayName || "-"}</Descriptions.Item>
              <Descriptions.Item label="平台管理员">{user?.isPlatformAdmin ? <Tag color="gold">是</Tag> : <Tag>否</Tag>}</Descriptions.Item>
              <Descriptions.Item label="当前租户">{tenants.find(t => t.tenantId === currentTenant)?.tenantName || "-"}</Descriptions.Item>
            </Descriptions>
          </div>
        )},
        { key: "security", label: <Space><LockOutlined />安全设置</Space>, children: (
          <div style={{ maxWidth: 400 }}>
            <Title level={5}>修改密码</Title>
            <Form form={pwForm} layout="vertical" onFinish={v => changePwMut.mutate(v)}>
              <Form.Item name="currentPassword" label="当前密码" rules={[{ required: true, message: "请输入当前密码" }]}>
                <Input.Password placeholder="当前密码" iconRender={(visible) => visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />} />
              </Form.Item>
              <Form.Item name="newPassword" label="新密码" rules={[{ required: true, min: 6, message: "至少 6 位" }]}>
                <Input.Password placeholder="新密码（至少 6 位）" iconRender={(visible) => visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />} />
              </Form.Item>
              <Form.Item name="confirmPassword" label="确认新密码" dependencies={["newPassword"]}
                rules={[{ required: true }, ({ getFieldValue }) => ({
                  validator(_, value) { return !value || getFieldValue("newPassword") === value ? Promise.resolve() : Promise.reject("密码不一致"); }
                })]}>
                <Input.Password placeholder="再次输入新密码" iconRender={(visible) => visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />} />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={changePwMut.isPending} icon={<LockOutlined />}>修改密码</Button>
            </Form>
            <Divider />
            <Title level={5}>会话管理</Title>
            <Alert type="info" message="登录中的设备将在此处显示（开发中）" />
          </div>
        )},
        { key: "tenants", label: <Space><BankOutlined />所属租户</Space>, children: (
          <List dataSource={tenants} renderItem={(t) => (
            <List.Item><Tag color={t.tenantId === currentTenant ? "blue" : "default"}>{t.tenantName}</Tag><Text type="secondary">{t.tenantSlug}</Text></List.Item>
          )} />
        )},
      ]} />
      <Divider />
      <Button danger icon={<LogoutOutlined />} onClick={() => { logout(); window.location.href = "/login"; }}>退出登录</Button>
    </Card>
  );
}
