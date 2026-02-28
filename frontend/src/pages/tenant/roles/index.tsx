import React, { useState } from "react";
import { Card, Table, Button, Tag, Space, Modal, Form, Input, Checkbox, message, Typography, Row, Col } from "antd";
import { PlusOutlined, EditOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
const { Title, Text } = Typography;

export default function RolesPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editRole, setEditRole] = useState<any>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({ queryKey: ["roles"], queryFn: () => api.get("/roles").then(r => r.data) });
  const { data: permsData } = useQuery({ queryKey: ["permissions"], queryFn: () => api.get("/roles/permissions").then(r => r.data) });

  const saveMut = useMutation({
    mutationFn: (v: any) => editRole ? api.put(`/roles/${editRole.id}`, v) : api.post("/roles", v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles"] }); setModalOpen(false); message.success("保存成功"); },
  });

  const permGroups: Record<string, any[]> = {};
  (permsData?.permissions || []).forEach((p: any) => {
    const group = p.key.split(".")[0];
    if (!permGroups[group]) permGroups[group] = [];
    permGroups[group].push(p);
  });

  const columns = [
    { title: "角色名", dataIndex: "name", key: "name" },
    { title: "显示名", dataIndex: "displayName", key: "displayName" },
    { title: "权限数", key: "perms", render: (_: any, r: any) => <Tag color="blue">{(r.permissions || []).length}</Tag> },
    { title: "系统角色", dataIndex: "isSystem", key: "system", render: (v: boolean) => v ? <Tag color="gold">系统</Tag> : null },
    { title: "版本", dataIndex: "version", key: "version" },
    { title: "操作", key: "actions", render: (_: any, r: any) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} disabled={r.isSystem}
          onClick={() => { setEditRole(r); form.setFieldsValue({ ...r }); setModalOpen(true); }}>编辑</Button>
      </Space>
    )},
  ];

  return (
    <div>
      <Card title={<Title level={4} style={{ margin: 0 }}>🔐 角色权限</Title>}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditRole(null); form.resetFields(); setModalOpen(true); }}>创建角色</Button>}>
        <Table dataSource={data?.roles || []} columns={columns} rowKey="id" loading={isLoading} pagination={false} />
      </Card>

      <Modal title={editRole ? "编辑角色" : "创建角色"} open={modalOpen} onCancel={() => setModalOpen(false)}
        onOk={() => form.validateFields().then(v => saveMut.mutate(v))} confirmLoading={saveMut.isPending} width={800}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="name" label="角色标识" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="displayName" label="显示名"><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="description" label="描述"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="permissions" label="权限点">
            <Checkbox.Group style={{ width: "100%" }}>
              {Object.entries(permGroups).map(([group, perms]) => (
                <div key={group} style={{ marginBottom: 12 }}>
                  <Text strong style={{ textTransform: "capitalize" }}>{group}</Text>
                  <Row>{perms.map(p => (
                    <Col span={8} key={p.key}><Checkbox value={p.key}><Text style={{ fontSize: 12 }}>{p.key}</Text></Checkbox></Col>
                  ))}</Row>
                </div>
              ))}
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
