import React, { useState, useEffect, useRef } from "react";
import { Card, Select, Input, Button, Tag, Typography, Space, Switch } from "antd";
import { ReloadOutlined, VerticalAlignBottomOutlined } from "@ant-design/icons";
const { Title, Text } = Typography;

export default function LogsPage() {
  const [logs, setLogs] = useState<string[]>(["[系统] 日志查看器已就绪，连接 Gateway 后可查看实时日志"]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [level, setLevel] = useState("all");
  const logRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (autoScroll && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs, autoScroll]);

  return (
    <Card title={<Title level={4} style={{ margin: 0 }}>📋 日志查看</Title>}
      extra={<Space>
        <Select value={level} onChange={setLevel} style={{ width: 100 }}
          options={[{ value: "all", label: "全部" }, { value: "error", label: "错误" }, { value: "warn", label: "警告" }, { value: "info", label: "信息" }]} />
        <Switch checked={autoScroll} onChange={setAutoScroll} checkedChildren="自动滚动" unCheckedChildren="暂停" />
        <Button icon={<ReloadOutlined />}>刷新</Button>
      </Space>}>
      <pre ref={logRef} style={{
        height: 600, overflowY: "auto", background: "#1e1e1e", color: "#d4d4d4",
        padding: 16, borderRadius: 8, fontFamily: "monospace", fontSize: 13, lineHeight: 1.6,
      }}>
        {logs.map((l, i) => <div key={i}>{l}</div>)}
      </pre>
    </Card>
  );
}
