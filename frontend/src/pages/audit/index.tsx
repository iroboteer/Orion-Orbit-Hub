import React, { useState } from "react";
import { Card, Table, Tag, Input, DatePicker, Space, Typography, Select } from "antd";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import dayjs from "dayjs";
const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function AuditPage() {
  const [filters, setFilters] = useState<any>({});
  const { data, isLoading } = useQuery({
    queryKey: ["audit", filters],
    queryFn: () => api.get("/audit", { params: filters }).then(r => r.data),
  });

  const columns = [
    { title: "操作", dataIndex: "action", key: "action", render: (v: string) => <Tag>{v}</Tag> },
    { title: "资源", dataIndex: "resource", key: "resource", ellipsis: true },
    { title: "结果", dataIndex: "result", key: "result", render: (v: string) => (
      <Tag color={v === "success" ? "green" : v === "failure" ? "red" : "orange"}>{v}</Tag>
    )},
    { title: "用户", dataIndex: "userEmail", key: "user" },
    { title: "IP", dataIndex: "ip", key: "ip" },
    { title: "时间", dataIndex: "createdAt", key: "time", render: (v: string) => new Date(v).toLocaleString("zh-CN") },
  ];

  return (
    <Card title={<Title level={4} style={{ margin: 0 }}>📝 审计日志</Title>}
      extra={<Space>
        <Input placeholder="按操作筛选" allowClear onChange={e => setFilters((f: any) => ({ ...f, action: e.target.value || undefined }))} style={{ width: 150 }} />
        <RangePicker onChange={(dates) => {
          if (dates) setFilters((f: any) => ({ ...f, from: dates[0]?.toISOString(), to: dates[1]?.toISOString() }));
          else setFilters((f: any) => { const { from, to, ...rest } = f; return rest; });
        }} />
      </Space>}>
      <Table dataSource={data?.logs || []} columns={columns} rowKey="id" loading={isLoading}
        pagination={{ total: data?.total, pageSize: 50, showTotal: t => `共 ${t} 条` }} />
    </Card>
  );
}
