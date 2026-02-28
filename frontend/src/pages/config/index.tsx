import React, { useState } from "react";
import { Card, Button, Tag, Typography, Descriptions, Timeline, Modal, Input, message, Empty, Space } from "antd";
import { EditOutlined, HistoryOutlined, RollbackOutlined } from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
const { Title, Text } = Typography;

export default function ConfigPage() {
  const qc = useQueryClient();
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftConfig, setDraftConfig] = useState("");
  const [draftNote, setDraftNote] = useState("");

  const { data: current } = useQuery({ queryKey: ["config-current"], queryFn: () => api.get("/config/current").then(r => r.data) });
  const { data: versions } = useQuery({ queryKey: ["config-versions"], queryFn: () => api.get("/config/versions").then(r => r.data) });

  const draftMut = useMutation({
    mutationFn: () => api.post("/config/draft", { config: JSON.parse(draftConfig), note: draftNote }),
    onSuccess: () => { setDraftOpen(false); message.success("配置草稿已提交审批"); qc.invalidateQueries({ queryKey: ["config"] }); },
    onError: () => message.error("JSON 格式错误"),
  });

  return (
    <div>
      <Card title={<Title level={4} style={{ margin: 0 }}>⚙️ 配置中心</Title>}
        extra={<Button type="primary" icon={<EditOutlined />} onClick={() => {
          setDraftConfig(JSON.stringify(current?.config?.config || {}, null, 2));
          setDraftOpen(true);
        }}>新建草稿</Button>}>
        {current?.config ? (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="当前版本"><Tag color="blue">v{current.config.version}</Tag></Descriptions.Item>
            <Descriptions.Item label="应用时间">{new Date(current.config.createdAt).toLocaleString("zh-CN")}</Descriptions.Item>
            <Descriptions.Item label="配置内容" span={2}>
              <pre style={{ maxHeight: 300, overflow: "auto", fontSize: 12, background: "#f5f5f5", padding: 12, borderRadius: 6 }}>
                {JSON.stringify(current.config.config, null, 2)}
              </pre>
            </Descriptions.Item>
          </Descriptions>
        ) : <Empty description="暂无配置" />}
      </Card>

      <Card title="📜 配置历史" style={{ marginTop: 16 }} size="small">
        <Timeline items={(versions?.versions || []).map((v: any) => ({
          color: "blue",
          children: <div>
            <Space><Tag color="blue">v{v.version}</Tag><Text type="secondary">{new Date(v.createdAt).toLocaleString("zh-CN")}</Text></Space>
            {v.note && <div><Text type="secondary">{v.note}</Text></div>}
          </div>,
        }))} />
        {(!versions?.versions || versions.versions.length === 0) && <Empty description="无历史版本" />}
      </Card>

      <Modal title="新建配置草稿" open={draftOpen} onCancel={() => setDraftOpen(false)}
        onOk={() => draftMut.mutate()} confirmLoading={draftMut.isPending} width={700}>
        <Input.TextArea value={draftConfig} onChange={e => setDraftConfig(e.target.value)}
          rows={15} style={{ fontFamily: "monospace", fontSize: 12 }} />
        <Input value={draftNote} onChange={e => setDraftNote(e.target.value)}
          placeholder="变更说明" style={{ marginTop: 8 }} />
      </Modal>
    </div>
  );
}
