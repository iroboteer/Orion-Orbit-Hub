import React, { useEffect, Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Spin } from "antd";
import { useAuth } from "@/stores/auth";
import AdminLayout from "@/layouts/AdminLayout";

const Login = lazy(() => import("@/pages/login"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Tenants = lazy(() => import("@/pages/platform/tenants"));
const Users = lazy(() => import("@/pages/tenant/users"));
const Roles = lazy(() => import("@/pages/tenant/roles"));
const Sessions = lazy(() => import("@/pages/sessions"));
const Chat = lazy(() => import("@/pages/chat"));
const Logs = lazy(() => import("@/pages/logs"));
const Crons = lazy(() => import("@/pages/crons"));
const Config = lazy(() => import("@/pages/config"));
const Approvals = lazy(() => import("@/pages/approvals"));
const Audit = lazy(() => import("@/pages/audit"));
const Alerts = lazy(() => import("@/pages/alerts"));
const Skills = lazy(() => import("@/pages/skills"));
const Agents = lazy(() => import("@/pages/agents"));
const Nodes = lazy(() => import("@/pages/nodes"));
const Gateway = lazy(() => import("@/pages/gateway"));
const Profile = lazy(() => import("@/pages/profile"));
const Exports = lazy(() => import("@/pages/exports"));
const Tokens = lazy(() => import("@/pages/tokens"));
const Org = lazy(() => import("@/pages/org"));

const Loading = () => (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
    <Spin size="large" />
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function AppRoutes() {
  const { fetchMe, loading, user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    fetchMe();
  }, []);

  // Don't show loading spinner on login page
  if (loading && location.pathname !== "/login") return <Loading />;

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="platform/tenants" element={<Tenants />} />
          <Route path="tenant/users" element={<Users />} />
          <Route path="tenant/roles" element={<Roles />} />
          <Route path="sessions" element={<Sessions />} />
          <Route path="chat" element={<Chat />} />
          <Route path="logs" element={<Logs />} />
          <Route path="crons" element={<Crons />} />
          <Route path="config" element={<Config />} />
          <Route path="approvals" element={<Approvals />} />
          <Route path="audit" element={<Audit />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="agents" element={<Agents />} />
          <Route path="skills" element={<Skills />} />
          <Route path="nodes" element={<Nodes />} />
          <Route path="gateway" element={<Gateway />} />
          <Route path="exports" element={<Exports />} />
          <Route path="tokens" element={<Tokens />} />
          <Route path="org" element={<Org />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
