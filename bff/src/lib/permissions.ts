// All permission points in the system
export const PERMISSIONS = {
  // Platform
  "platform.admin": "Platform super admin",
  // Tenants
  "tenant.read": "View tenant info",
  "tenant.write": "Create/edit tenant",
  "tenant.freeze": "Freeze/unfreeze tenant",
  "tenant.delete": "Delete tenant",
  // Users (global)
  "user.global.read": "View all users (cross-tenant)",
  "user.global.disable": "Disable user globally",
  // Users (tenant)
  "user.tenant.read": "View tenant users",
  "user.tenant.invite": "Invite users to tenant",
  "user.tenant.remove": "Remove users from tenant",
  "user.tenant.role.assign": "Assign roles to users",
  // Org
  "org.manage": "Manage departments",
  "team.manage": "Manage teams",
  "scope.manage": "Manage resource scopes",
  // Roles
  "role.read": "View roles",
  "role.write": "Create/edit roles",
  // Audit
  "audit.read": "View audit logs",
  "audit.export": "Export audit logs",
  // Approvals
  "approval.read": "View approvals",
  "approval.create": "Create approval requests",
  "approval.approve": "Approve/reject requests",
  // Sessions
  "session.read": "View sessions",
  "session.export": "Export sessions",
  // Chat
  "chat.send": "Send messages in chat console",
  "chat.inject": "Inject messages (admin)",
  "chat.abort": "Abort running tasks",
  // Logs
  "log.read": "View logs",
  "log.stream": "Stream real-time logs",
  "log.export": "Export logs",
  // Channels
  "channel.read": "View channels",
  "channel.manage": "Manage channel auth",
  // Cron
  "cron.read": "View cron jobs",
  "cron.create": "Create cron jobs (via approval)",
  "cron.run": "Manually run cron jobs",
  "cron.enable": "Enable/disable cron jobs",
  // Skills
  "skill.read": "View skills/plugins",
  "skill.enable": "Enable/disable skills",
  "skill.install": "Install/upgrade skills",
  // Config
  "config.read": "View configuration",
  "config.draft": "Create config drafts",
  "config.apply": "Apply config changes",
  "config.rollback": "Rollback config",
  // Exec
  "exec.policy.read": "View exec policies",
  "exec.policy.change": "Change exec policies",
  "exec.request.approve": "Approve exec requests",
  // Nodes
  "node.read": "View nodes/devices",
  "node.pair.approve": "Approve device pairing",
  "node.revoke": "Revoke devices",
  // Gateway
  "gateway.read": "View gateway status",
  "gateway.switch": "Switch/failover gateway",
  // Usage
  "usage.read": "View usage & cost",
  "usage.export": "Export usage reports",
  // Alerts
  "alert.read": "View alerts",
  "alert.manage": "Manage alerts (ack/resolve)",
  // Export
  "export.read": "View exports",
  "export.create": "Create export tasks",
  "token.read": "View API tokens",
  "token.manage": "Create and revoke API tokens",
  "skill.manage": "Manage skills",
  "node.manage": "Manage nodes",
} as const;

export type Permission = keyof typeof PERMISSIONS;

// Default role templates
export const ROLE_TEMPLATES = {
  "platform-admin": {
    displayName: "平台管理员",
    permissions: Object.keys(PERMISSIONS) as Permission[],
  },
  "tenant-admin": {
    displayName: "租户管理员",
    permissions: [
      "tenant.read", "user.tenant.read", "user.tenant.invite", "user.tenant.remove",
      "user.tenant.role.assign", "org.manage", "team.manage", "scope.manage",
      "role.read", "role.write", "audit.read", "approval.read", "approval.create",
      "approval.approve", "session.read", "session.export", "chat.send", "chat.inject",
      "chat.abort", "log.read", "log.stream", "log.export", "channel.read", "channel.manage",
      "cron.read", "cron.create", "cron.run", "cron.enable", "skill.read", "skill.enable",
      "skill.install", "config.read", "config.draft", "config.apply", "config.rollback",
      "exec.policy.read", "exec.policy.change", "exec.request.approve",
      "node.read", "node.pair.approve", "node.revoke", "gateway.read",
      "usage.read", "usage.export", "alert.read", "alert.manage", "export.read", "export.create", "token.read", "token.manage", "skill.manage", "node.manage",
    ] as Permission[],
  },
  "tenant-ops": {
    displayName: "运维人员",
    permissions: [
      "tenant.read", "user.tenant.read", "audit.read", "approval.read", "approval.create",
      "session.read", "chat.send", "chat.abort", "log.read", "log.stream",
      "channel.read", "cron.read", "cron.create", "cron.run",
      "skill.read", "config.read", "config.draft",
      "exec.policy.read", "node.read", "gateway.read",
      "usage.read", "alert.read", "alert.manage", "export.read", "export.create", "token.read", "token.manage", "skill.manage", "node.manage",
    ] as Permission[],
  },
  "tenant-viewer": {
    displayName: "只读查看",
    permissions: [
      "tenant.read", "user.tenant.read", "audit.read", "approval.read",
      "session.read", "log.read", "channel.read", "cron.read",
      "skill.read", "config.read", "exec.policy.read", "node.read",
      "gateway.read", "usage.read", "alert.read", "export.read",
    ] as Permission[],
  },
  "tenant-auditor": {
    displayName: "审计员",
    permissions: [
      "tenant.read", "user.tenant.read", "audit.read", "audit.export",
      "approval.read", "session.read", "session.export", "log.read", "log.export",
      "config.read", "exec.policy.read", "usage.read", "usage.export",
      "alert.read", "export.read",
    ] as Permission[],
  },
};
