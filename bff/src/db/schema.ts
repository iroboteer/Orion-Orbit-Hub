import { pgTable, text, timestamp, boolean, integer, jsonb, uuid, varchar, pgEnum, index, uniqueIndex } from "drizzle-orm/pg-core";

// ============ ENUMS ============
export const accountStatusEnum = pgEnum("account_status", ["active", "suspended", "disabled", "pending"]);
export const tenantStatusEnum = pgEnum("tenant_status", ["active", "frozen", "deleted"]);
export const approvalStatusEnum = pgEnum("approval_status", ["pending", "approved", "rejected", "expired", "cancelled"]);
export const auditResultEnum = pgEnum("audit_result", ["success", "failure", "denied"]);
export const alertSeverityEnum = pgEnum("alert_severity", ["info", "warning", "critical"]);
export const alertStatusEnum = pgEnum("alert_status", ["open", "acked", "resolved", "closed"]);

// ============ TENANTS ============
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 256 }).notNull(),
  status: tenantStatusEnum("status").notNull().default("active"),
  contactEmail: varchar("contact_email", { length: 256 }),
  contactName: varchar("contact_name", { length: 256 }),
  notes: text("notes"),
  // Quotas
  quotas: jsonb("quotas").$type<{
    maxConcurrentSessions?: number;
    maxQps?: number;
    maxDailyRequests?: number;
    maxTokensBudget?: number;
    maxCrons?: number;
    maxExportsPerDay?: number;
  }>().default({}),
  // Security policies
  policies: jsonb("policies").$type<{
    allowExec?: boolean;
    allowPluginInstall?: boolean;
    allowWebFetch?: boolean;
    domainWhitelist?: string[];
    logRetentionDays?: number;
    sessionRetentionDays?: number;
  }>().default({}),
  // Gateway binding
  gatewayConfig: jsonb("gateway_config").$type<{
    endpoint?: string;
    apiKey?: string;
    pool?: string[];
  }>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// ============ USERS ============
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 256 }).notNull(),
  displayName: varchar("display_name", { length: 256 }),
  avatarUrl: text("avatar_url"),
  status: accountStatusEnum("status").notNull().default("active"),
  // IdP info
  idpProvider: varchar("idp_provider", { length: 128 }), // azure, okta, keycloak, google, local
  idpSubject: varchar("idp_subject", { length: 512 }),    // sub claim
  idpGroups: jsonb("idp_groups").$type<string[]>().default([]),
  // Security
  passwordHash: text("password_hash"), // for local auth fallback
  mfaEnabled: boolean("mfa_enabled").default(false),
  lastLoginAt: timestamp("last_login_at"),
  lastLoginIp: varchar("last_login_ip", { length: 64 }),
  loginFailCount: integer("login_fail_count").default(0),
  // Platform level
  isPlatformAdmin: boolean("is_platform_admin").default(false),
  // Preferences
  preferences: jsonb("preferences").$type<{
    locale?: string;
    timezone?: string;
    notifications?: Record<string, boolean>;
  }>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  emailIdx: uniqueIndex("users_email_idx").on(table.email),
  idpIdx: index("users_idp_idx").on(table.idpProvider, table.idpSubject),
}));

// ============ USER SESSIONS (login sessions) ============
export const userSessions = pgTable("user_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  token: text("token").notNull().unique(),
  refreshToken: text("refresh_token"),
  ip: varchar("ip", { length: 64 }),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdx: index("sessions_user_idx").on(table.userId),
  tokenIdx: index("sessions_token_idx").on(table.token),
}));

// ============ TENANT MEMBERSHIPS ============
export const tenantMembers = pgTable("tenant_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  status: accountStatusEnum("status").notNull().default("active"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
}, (table) => ({
  uniqueMember: uniqueIndex("tenant_members_unique").on(table.tenantId, table.userId),
}));

// ============ ROLES ============
export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id), // null = platform-level template
  name: varchar("name", { length: 128 }).notNull(),
  displayName: varchar("display_name", { length: 256 }),
  description: text("description"),
  permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
  isSystem: boolean("is_system").default(false), // system roles cannot be deleted
  version: integer("version").default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============ USER ROLE ASSIGNMENTS ============
export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  roleId: uuid("role_id").notNull().references(() => roles.id),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  assignedBy: uuid("assigned_by").references(() => users.id),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
}, (table) => ({
  uniqueAssign: uniqueIndex("user_roles_unique").on(table.userId, table.roleId, table.tenantId),
}));

// ============ ORGANIZATIONS / DEPARTMENTS ============
export const departments = pgTable("departments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  parentId: uuid("parent_id"), // self-referencing for tree
  name: varchar("name", { length: 256 }).notNull(),
  leaderId: uuid("leader_id").references(() => users.id),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const departmentMembers = pgTable("department_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  departmentId: uuid("department_id").notNull().references(() => departments.id),
  userId: uuid("user_id").notNull().references(() => users.id),
});

// ============ TEAMS ============
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const teamMembers = pgTable("team_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull().references(() => teams.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  role: varchar("role", { length: 64 }).default("member"), // owner, admin, member
});

// ============ RESOURCE SCOPES ============
export const resourceScopes = pgTable("resource_scopes", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  scopeType: varchar("scope_type", { length: 64 }).notNull(), // channel, session, cron, node, log
  resourcePattern: text("resource_pattern").notNull(), // glob or tag match
  // Bound to one of:
  userId: uuid("user_id").references(() => users.id),
  teamId: uuid("team_id").references(() => teams.id),
  roleId: uuid("role_id").references(() => roles.id),
  tags: jsonb("tags").$type<Record<string, string>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============ APPROVALS ============
export const approvals = pgTable("approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  type: varchar("type", { length: 128 }).notNull(), // config.change, exec.policy, cron.create, skill.install, etc.
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description"),
  requesterId: uuid("requester_id").notNull().references(() => users.id),
  status: approvalStatusEnum("status").notNull().default("pending"),
  // Payload
  payload: jsonb("payload").$type<Record<string, any>>().default({}),
  diff: jsonb("diff").$type<{ before?: any; after?: any }>().default({}),
  // Approval chain
  requiredApprovers: integer("required_approvers").default(1),
  approvedBy: jsonb("approved_by").$type<Array<{ userId: string; at: string; note?: string }>>().default([]),
  rejectedBy: jsonb("rejected_by").$type<{ userId: string; at: string; reason?: string }>(),
  // TTL
  expiresAt: timestamp("expires_at"),
  resolvedAt: timestamp("resolved_at"),
  executedAt: timestamp("executed_at"), // when the approved action was applied
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  tenantStatusIdx: index("approvals_tenant_status_idx").on(table.tenantId, table.status),
  requesterIdx: index("approvals_requester_idx").on(table.requesterId),
}));

// ============ AUDIT LOGS ============
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id), // null = platform-level
  userId: uuid("user_id").references(() => users.id),
  action: varchar("action", { length: 256 }).notNull(), // e.g. tenant.create, user.invite, config.apply
  resource: varchar("resource", { length: 512 }),        // e.g. tenant:abc, user:xyz
  resourceType: varchar("resource_type", { length: 128 }),
  result: auditResultEnum("result").notNull().default("success"),
  requestId: varchar("request_id", { length: 128 }),
  ip: varchar("ip", { length: 64 }),
  userAgent: text("user_agent"),
  before: jsonb("before_data"),
  after: jsonb("after_data"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  tenantTimeIdx: index("audit_tenant_time_idx").on(table.tenantId, table.createdAt),
  userIdx: index("audit_user_idx").on(table.userId),
  actionIdx: index("audit_action_idx").on(table.action),
}));

// ============ ALERTS ============
export const alerts = pgTable("alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  severity: alertSeverityEnum("severity").notNull(),
  status: alertStatusEnum("status").notNull().default("open"),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description"),
  source: varchar("source", { length: 128 }), // exec, cron, cost, login, etc.
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  ackedBy: uuid("acked_by").references(() => users.id),
  ackedAt: timestamp("acked_at"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============ CONFIG SNAPSHOTS ============
export const configSnapshots = pgTable("config_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  version: integer("version").notNull(),
  config: jsonb("config").notNull(),
  appliedBy: uuid("applied_by").references(() => users.id),
  approvalId: uuid("approval_id").references(() => approvals.id),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============ API TOKENS ============
export const apiTokens = pgTable("api_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  name: varchar("name", { length: 256 }).notNull(),
  tokenHash: text("token_hash").notNull(),
  permissions: jsonb("permissions").$type<string[]>().default([]),
  expiresAt: timestamp("expires_at"),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============ EXPORT TASKS ============
export const exportTasks = pgTable("export_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  type: varchar("type", { length: 64 }).notNull(), // sessions, logs, audit, users
  status: varchar("status", { length: 32 }).notNull().default("pending"), // pending, processing, completed, failed
  filters: jsonb("filters").$type<Record<string, any>>().default({}),
  fileUrl: text("file_url"),
  fileSize: integer("file_size"),
  expiresAt: timestamp("expires_at"),
  approvalId: uuid("approval_id").references(() => approvals.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// ============ CHAT SESSIONS & MESSAGES ============
export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  key: varchar("key", { length: 128 }).notNull(),
  title: varchar("title", { length: 256 }).notNull().default("New Chat"),
  agent: varchar("agent", { length: 64 }).notNull().default("agent-main"),
  model: varchar("model", { length: 64 }).notNull().default("claude-opus-4"),
  status: varchar("status", { length: 32 }).notNull().default("active"), // active, archived, completed, failed
  taskStatus: varchar("task_status", { length: 32 }), // null, pending, running, success, failed, cancelled
  taskDescription: text("task_description"),
  taskProgress: integer("task_progress"), // 0-100
  pinned: boolean("pinned").default(false),
  messageCount: integer("message_count").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  lastMessage: text("last_message"),
  lastMessageAt: timestamp("last_message_at"),
  metadata: jsonb("metadata"), // extra context: tags, labels, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("chat_sessions_user_idx").on(table.userId),
  tenantIdx: index("chat_sessions_tenant_idx").on(table.tenantId),
  keyIdx: index("chat_sessions_key_idx").on(table.key),
  statusIdx: index("chat_sessions_status_idx").on(table.status),
}));

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull().references(() => chatSessions.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 16 }).notNull(), // user, assistant, system, tool
  content: text("content").notNull(),
  model: varchar("model", { length: 64 }),
  tokensInput: integer("tokens_input"),
  tokensOutput: integer("tokens_output"),
  toolCalls: jsonb("tool_calls"), // [{name, args, result}]
  thinking: text("thinking"),
  starred: boolean("starred").default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index("chat_messages_session_idx").on(table.sessionId),
  roleIdx: index("chat_messages_role_idx").on(table.role),
  createdIdx: index("chat_messages_created_idx").on(table.createdAt),
}));
