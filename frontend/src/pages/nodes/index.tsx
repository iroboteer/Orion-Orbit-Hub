import React, { useState } from "react";
import { Card, Table, Tag, Button, Space, Typography, Drawer, Descriptions, Tabs, Badge,
  Popconfirm, message, Tooltip, Row, Col, Statistic, Empty, Alert, Input, List, Modal, Form, Select } from "antd";
import { PlusOutlined, CheckOutlined, CloseOutlined, DeleteOutlined,
  EyeOutlined, MobileOutlined, DesktopOutlined, HomeOutlined,
  CameraOutlined, EnvironmentOutlined, BellOutlined, WifiOutlined,
  DisconnectOutlined, ReloadOutlined, LaptopOutlined, AppleOutlined,
  AndroidOutlined, CloudServerOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
const { Title, Text, Paragraph } = Typography;

const DEMO_NODES = [
  {
    id: "node-macbook", name: "MacBook Pro", type: "laptop", os: "macOS 15.3", arch: "arm64",
    status: "online", paired: true, ip: "192.168.1.100", lastSeen: new Date(Date.now() - 30000).toISOString(),
    agent: "agent-main", capabilities: ["screen", "camera", "notifications", "run", "location"],
    version: "2.1.0", uptime: "5d 12h",
    info: { cpu: "Apple M3 Pro", memory: "36GB", disk: "1TB (45% used)" },
  },
  {
    id: "node-iphone", name: "iPhone 16 Pro", type: "phone", os: "iOS 19.2", arch: "arm64",
    status: "online", paired: true, ip: "192.168.1.101", lastSeen: new Date(Date.now() - 120000).toISOString(),
    agent: "agent-main", capabilities: ["camera", "notifications", "location"],
    version: "2.1.0", uptime: "12d 3h",
    info: { model: "iPhone 16 Pro", storage: "256GB (62% used)" },
  },
  {
    id: "node-rpi-office", name: "树莓派-办公室", type: "server", os: "Raspbian 12", arch: "arm64",
    status: "online", paired: true, ip: "192.168.1.50", lastSeen: new Date(Date.now() - 60000).toISOString(),
    agent: "agent-ops", capabilities: ["run", "camera", "notifications"],
    version: "2.0.3", uptime: "30d 8h",
    info: { cpu: "BCM2712 Quad-core", memory: "8GB", disk: "128GB (23% used)" },
  },
  {
    id: "node-android-tablet", name: "Galaxy Tab S9", type: "tablet", os: "Android 15", arch: "arm64",
    status: "offline", paired: true, ip: "192.168.1.102", lastSeen: new Date(Date.now() - 3600000).toISOString(),
    agent: "agent-cs", capabilities: ["camera", "notifications", "location"],
    version: "2.0.3", uptime: "0m",
    info: { model: "SM-X910", storage: "512GB" },
  },
  {
    id: "node-vps-hk", name: "VPS 香港", type: "server", os: "Ubuntu 24.04", arch: "amd64",
    status: "online", paired: true, ip: "103.88.45.12", lastSeen: new Date(Date.now() - 15000).toISOString(),
    agent: "agent-ops", capabilities: ["run"],
    version: "2.1.0", uptime: "45d 16h",
    info: { cpu: "4 vCPU", memory: "8GB", disk: "80GB (35% used)" },
  },
];

const PENDING_NODES = [
  { id: "node-new-ipad", name: "iPad Air", type: "tablet", os: "iPadOS 19", requestedAt: new Date(Date.now() - 1800000).toISOString() },
  { id: "node-new-pi", name: "Pi-Garage", type: "server", os: "Raspbian 12", requestedAt: new Date(Date.now() - 900000).toISOString() },
];

const TYPE_ICON: Record<string, React.ReactNode> = {
  laptop: <LaptopOutlined />, phone: <MobileOutlined />,
  tablet: <MobileOutlined />, server: <CloudServerOutlined />,
  desktop: <DesktopOutlined />, home: <HomeOutlined />,
};

const CAP_MAP: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
  screen: { color: "blue", icon: <DesktopOutlined />, text: "屏幕" },
  camera: { color: "cyan", icon: <CameraOutlined />, text: "相机" },
  notifications: { color: "purple", icon: <BellOutlined />, text: "通知" },
  run: { color: "orange", icon: <CloudServerOutlined />, text: "命令" },
  location: { color: "green", icon: <EnvironmentOutlined />, text: "定位" },
};

export default function NodesPage() {
  const qc = useQueryClient();
  const [detailNode, setDetailNode] = useState<any>(null);
  const [notifyNode, setNotifyNode] = useState<any>(null);
  const [notifyForm] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ["nodes"],
    queryFn: () => api.get("/nodes").then(r => r.data).catch(() => ({ nodes: [] })),
  });

  const nodes = data?.nodes?.length > 0 ? data.nodes : DEMO_NODES;

  const approveMut = useMutation({
    mutationFn: (id: string) => api.post("/nodes/" + id + "/approve"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["nodes"] }); message.success("已批准"); },
  });
  const rejectMut = useMutation({
    mutationFn: (id: string) => api.post("/nodes/" + id + "/reject"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["nodes"] }); message.success("已拒绝"); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete("/nodes/" + id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["nodes"] }); message.success("已解绑"); },
  });
  const notifyMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.post("/nodes/" + id + "/notify", data),
    onSuccess: () => { setNotifyNode(null); notifyForm.resetFields(); message.success("通知已发送"); },
  });

  const onlineCount = nodes.filter((n: any) => n.status === "online").length;

  const columns = [
    {
      title: "设备", key: "name", width: 250,
      render: (_: any, r: any) => (
        <Space>
          <div style={{ width: 40, height: 40, borderRadius: 8,
            background: r.status === "online" ? "#f0f5ff" : "#fff2f0",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
            {TYPE_ICON[r.type] || <MobileOutlined />}
          </div>
          <div>
            <Text strong>{r.name}</Text>
            <br /><Text type="secondary" style={{ fontSize: 12 }}>{r.os} · {r.arch}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "状态", dataIndex: "status", key: "status", width: 100,
      render: (v: string) => <Badge status={v === "online" ? "processing" : "default"}
        text={<Tag color={v === "online" ? "green" : "default"}>{v === "online" ? "在线" : "离线"}</Tag>} />,
    },
    {
      title: "IP", dataIndex: "ip", key: "ip", width: 130, render: (v: string) => <Text code>{v}</Text>,
    },
    {
      title: "关联 Agent", dataIndex: "agent", key: "agent", width: 130,
      render: (v: string) => v ? <Tag color="geekblue">{v}</Tag> : <Text type="secondary">-</Text>,
    },
    {
      title: "功能", dataIndex: "capabilities", key: "caps", width: 250,
      render: (caps: string[]) => (
        <Space wrap size={[4, 4]}>
          {caps?.map(c => { const m = CAP_MAP[c]; return m ? <Tag key={c} color={m.color} icon={m.icon}>{m.text}</Tag> : <Tag key={c}>{c}</Tag>; })}
        </Space>
      ),
    },
    {
      title: "运行时间", dataIndex: "uptime", key: "uptime", width: 100,
      render: (v: string) => <Text type="secondary">{v}</Text>,
    },
    {
      title: "操作", key: "actions", width: 180,
      render: (_: any, r: any) => (
        <Space>
          <Tooltip title="详情"><Button size="small" icon={<EyeOutlined />} onClick={() => setDetailNode(r)} /></Tooltip>
          <Tooltip title="发送通知"><Button size="small" icon={<BellOutlined />} onClick={() => setNotifyNode(r)} /></Tooltip>
          <Popconfirm title="确认解绑此设备？" onConfirm={() => deleteMut.mutate(r.id)}>
            <Tooltip title="解绑"><Button size="small" danger icon={<DisconnectOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="已配对设备" value={nodes.length} prefix={<MobileOutlined />} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="在线" value={onlineCount} valueStyle={{ color: "#52c41a" }} prefix={<WifiOutlined />} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="待审批" value={PENDING_NODES.length} valueStyle={{ color: "#faad14" }} prefix={<CloseOutlined />} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="离线" value={nodes.length - onlineCount} valueStyle={{ color: "#ff4d4f" }} prefix={<DisconnectOutlined />} /></Card></Col>
      </Row>

      {/* Pending Approvals */}
      {PENDING_NODES.length > 0 && (
        <Card title="⏳ 待配对设备" size="small" style={{ marginBottom: 16 }}>
          <List dataSource={PENDING_NODES} renderItem={item => (
            <List.Item actions={[
              <Button type="primary" size="small" icon={<CheckOutlined />} onClick={() => approveMut.mutate(item.id)}>批准</Button>,
              <Button size="small" danger icon={<CloseOutlined />} onClick={() => rejectMut.mutate(item.id)}>拒绝</Button>,
            ]}>
              <List.Item.Meta
                avatar={<div style={{ width: 36, height: 36, borderRadius: 8, background: "#fff7e6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {TYPE_ICON[item.type] || <MobileOutlined />}
                </div>}
                title={item.name}
                description={<>{item.os} · 申请时间: {new Date(item.requestedAt).toLocaleString("zh-CN")}</>}
              />
            </List.Item>
          )} />
        </Card>
      )}

      {/* Main Table */}
      <Card title={<Title level={4} style={{ margin: 0 }}>📡 设备管理</Title>}>
        <Table dataSource={nodes} columns={columns} rowKey="id" loading={isLoading} pagination={false} scroll={{ x: 1100 }} />
      </Card>

      {/* Detail Drawer */}
      <Drawer title={detailNode?.name} open={!!detailNode} onClose={() => setDetailNode(null)} width={600}>
        {detailNode && (
          <Tabs items={[
            { key: "info", label: "设备信息", children: (
              <>
                <Descriptions bordered column={2} size="small">
                  <Descriptions.Item label="ID"><Text code>{detailNode.id}</Text></Descriptions.Item>
                  <Descriptions.Item label="状态"><Badge status={detailNode.status === "online" ? "processing" : "default"}
                    text={<Tag color={detailNode.status === "online" ? "green" : "default"}>{detailNode.status === "online" ? "在线" : "离线"}</Tag>} /></Descriptions.Item>
                  <Descriptions.Item label="操作系统">{detailNode.os}</Descriptions.Item>
                  <Descriptions.Item label="架构">{detailNode.arch}</Descriptions.Item>
                  <Descriptions.Item label="IP"><Text code>{detailNode.ip}</Text></Descriptions.Item>
                  <Descriptions.Item label="运行时间">{detailNode.uptime}</Descriptions.Item>
                  <Descriptions.Item label="Agent 版本"><Tag>v{detailNode.version}</Tag></Descriptions.Item>
                  <Descriptions.Item label="关联 Agent"><Tag color="geekblue">{detailNode.agent}</Tag></Descriptions.Item>
                  <Descriptions.Item label="最后在线">{new Date(detailNode.lastSeen).toLocaleString("zh-CN")}</Descriptions.Item>
                </Descriptions>
                <Card title="硬件信息" size="small" style={{ marginTop: 16 }}>
                  <Descriptions size="small" column={1}>
                    {Object.entries(detailNode.info || {}).map(([k, v]) => (
                      <Descriptions.Item key={k} label={k}>{String(v)}</Descriptions.Item>
                    ))}
                  </Descriptions>
                </Card>
                <Card title="功能权限" size="small" style={{ marginTop: 16 }}>
                  <Space wrap>
                    {detailNode.capabilities?.map((c: string) => {
                      const m = CAP_MAP[c];
                      return m ? <Tag key={c} color={m.color} icon={m.icon}>{m.text}</Tag> : <Tag key={c}>{c}</Tag>;
                    })}
                  </Space>
                </Card>
              </>
            )},
            { key: "actions", label: "远程操作", children: (
              <Space direction="vertical" style={{ width: "100%" }}>
                {detailNode.capabilities?.includes("camera") && (
                  <Card size="small" hoverable>
                    <Space><CameraOutlined style={{ fontSize: 20, color: "#1890ff" }} />
                      <div><Text strong>拍照</Text><br /><Text type="secondary">远程拍摄照片</Text></div>
                      <Button type="primary" size="small">前置</Button>
                      <Button size="small">后置</Button>
                    </Space>
                  </Card>
                )}
                {detailNode.capabilities?.includes("location") && (
                  <Card size="small" hoverable>
                    <Space><EnvironmentOutlined style={{ fontSize: 20, color: "#52c41a" }} />
                      <div><Text strong>定位</Text><br /><Text type="secondary">获取设备位置</Text></div>
                      <Button type="primary" size="small">获取位置</Button>
                    </Space>
                  </Card>
                )}
                {detailNode.capabilities?.includes("screen") && (
                  <Card size="small" hoverable>
                    <Space><DesktopOutlined style={{ fontSize: 20, color: "#722ed1" }} />
                      <div><Text strong>截屏</Text><br /><Text type="secondary">远程屏幕截图</Text></div>
                      <Button type="primary" size="small">截取</Button>
                    </Space>
                  </Card>
                )}
                {detailNode.capabilities?.includes("notifications") && (
                  <Card size="small" hoverable>
                    <Space><BellOutlined style={{ fontSize: 20, color: "#faad14" }} />
                      <div><Text strong>推送通知</Text><br /><Text type="secondary">发送自定义通知</Text></div>
                      <Button type="primary" size="small" onClick={() => setNotifyNode(detailNode)}>发送</Button>
                    </Space>
                  </Card>
                )}
                {detailNode.capabilities?.includes("run") && (
                  <Card size="small" hoverable>
                    <Space><CloudServerOutlined style={{ fontSize: 20, color: "#fa541c" }} />
                      <div><Text strong>远程命令</Text><br /><Text type="secondary">在设备上执行命令</Text></div>
                      <Button type="primary" size="small">终端</Button>
                    </Space>
                  </Card>
                )}
              </Space>
            )},
          ]} />
        )}
      </Drawer>

      {/* Notify Modal */}
      <Modal title={"发送通知到 " + notifyNode?.name} open={!!notifyNode} onCancel={() => setNotifyNode(null)}
        onOk={() => notifyForm.validateFields().then(v => notifyMut.mutate({ id: notifyNode.id, data: v }))}
        confirmLoading={notifyMut.isPending}>
        <Form form={notifyForm} layout="vertical">
          <Form.Item name="title" label="标题" rules={[{ required: true }]}><Input placeholder="通知标题" /></Form.Item>
          <Form.Item name="body" label="内容" rules={[{ required: true }]}><Input.TextArea rows={3} placeholder="通知内容" /></Form.Item>
          <Form.Item name="priority" label="优先级" initialValue="active">
            <Select options={[
              { value: "passive", label: "低 - 静默" },
              { value: "active", label: "中 - 正常" },
              { value: "timeSensitive", label: "高 - 时效性" },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
