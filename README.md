<div align="center">

# 🪐 Orion Orbit Hub

**AI Agent Control Plane for the Enterprise**

*One platform to command, monitor, and govern all your AI agents.*

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-compose-2496ED?logo=docker)](docker-compose.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://typescriptlang.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)

[Live Demo](https://x.robotai.cloud) · [Documentation](#architecture) · [Quick Start](#quick-start)

</div>

---

## ✨ Features

### 🤖 Agent Management
- **Multi-Agent Orchestration** — Create, configure, start/stop/restart agents with different models (Claude Opus/Sonnet/Haiku, GPT-4o, Gemini)
- **Channel Binding** — Route agents to webchat, Telegram, Discord, Slack, WhatsApp, Signal, iMessage
- **Real-time Monitoring** — Live session counts, message totals, uptime tracking

### 💬 Controlled Chat Console
- **Multi-session Management** — Sidebar with session list, search, pin, create/delete
- **Agent & Model Switching** — Change agent and model on-the-fly per conversation
- **Thinking Mode** — Off/Low/High thinking level control
- **Tool Call Visualization** — See skill invocations with results in green cards
- **Thinking Display** — Toggle to reveal AI reasoning process
- **Message Actions** — Copy, star/bookmark, regenerate, export conversation
- **System Injection** — Inject system prompts mid-conversation for ops control
- **Full-screen Mode** — Immersive chat experience
- **Token Tracking** — Per-message and session-wide token usage

### 🧩 Skills & Plugins
- **Skill Marketplace** — Browse and install from ClawHub community
- **Risk Assessment** — Low/Medium/High risk classification per skill
- **Usage Analytics** — Track invocation counts per skill
- **Agent Binding** — Assign skills to specific agents
- **Enable/Disable Toggle** — Hot-swap skills without restart

### 📡 Node/Device Management
- **Multi-platform** — macOS, iOS, Android, Linux, Raspberry Pi, cloud VPS
- **Pairing Workflow** — Approve/reject pending device connections
- **Remote Operations** — Camera snap, location, screen capture, push notifications, remote commands
- **Capability Tracking** — Per-device feature matrix

### 🌐 Gateway Integration
- **Real-time Status** — Live gateway health monitoring (15s auto-refresh)
- **OpenClaw Gateway Proxy** — BFF proxies to gateway via chat completions API
- **Config Viewer** — Read-only view of gateway configuration (secrets redacted)
- **Trusted Proxy Auth** — X-Forwarded-User header-based authentication

### 🏢 Multi-Tenancy & RBAC
- **Tenant Management** — CRUD with freeze/unfreeze/soft-delete
- **50+ Permission Points** — Granular access control
- **5 Role Templates** — Platform Admin, Tenant Admin, Ops, Viewer, Auditor
- **Organization Structure** — Departments (tree) + Teams with member management

### ✅ Governance & Audit
- **Approval Workflows** — Config changes, skill installs, exec authorization, cron creation
- **Full Audit Trail** — Every mutation logged with user, IP, timestamp, result
- **Alert Center** — Critical/Warning/Info alerts with acknowledge and resolve
- **Config Versioning** — Draft → Diff → Approve → Apply with rollback

### 🔐 Security
- **Session-based Auth** — Cookie + Bearer token fallback
- **OIDC Ready** — Azure AD, Okta, Keycloak, Google Workspace (PKCE flow)
- **API Tokens** — Scoped tokens with expiry for programmatic access
- **Password Management** — Change password with current password verification
- **Production Hardened** — Secure cookie, CORS whitelist, rate limiting (500/min), security headers (X-Frame-Options, CSP, XSS Protection)

### 🌍 Internationalization
- **English** (default) + **Chinese** (zh-CN)
- Language switcher in header and login page
- Extensible locale system via Zustand store

### 📱 Responsive Design
- Mobile-optimized at 768px and 480px breakpoints
- Collapsible sidebar navigation
- Responsive stat cards and tables

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────┐
│                   Nginx (SSL)                    │
│              x.robotai.cloud:443                 │
├──────────┬──────────────┬───────────────────────┤
│  /       │  /api/*      │  /ws/*                │
│  :3100   │  :4100       │  :4100                │
│ Frontend │  BFF         │  WebSocket            │
├──────────┼──────────────┼───────────────────────┤
│ React 18 │ Fastify      │                       │
│ Vite     │ Drizzle ORM  │ Real-time streams     │
│ Ant D 5  │ PostgreSQL   │                       │
│ Zustand  │              │                       │
│ RQ       │ ┌──────────┐ │                       │
│          │ │ OpenClaw  │ │                       │
│          │ │ Gateway   │ │                       │
│          │ │ :18789    │ │                       │
│          │ └──────────┘ │                       │
└──────────┴──────────────┴───────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Ant Design 5, Zustand, TanStack React Query, TypeScript |
| **BFF** | Fastify, Drizzle ORM, PostgreSQL, WebSocket (@fastify/websocket) |
| **Database** | PostgreSQL 15 |
| **Auth** | bcrypt, session cookies, Bearer tokens, OIDC (PKCE) |
| **Gateway** | OpenClaw Gateway (chat completions API) |
| **Deploy** | Docker Compose, Nginx, Let's Encrypt |

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)

### Deploy with Docker

```bash
git clone git@github.com:iroboteer/Orion-Orbit-Hub.git
cd Orion-Orbit-Hub

# Start all services
docker compose up -d --build

# Push database schema
cd bff && npx drizzle-kit push --force

# Seed admin user
docker exec -i orion-orbit-hub-db-1 psql -U control -d control_ui -c "
INSERT INTO users (email, password_hash, display_name, is_platform_admin)
VALUES ('admin@example.com', '\$2a\$10\$...hash...', 'Admin', true);
"
```

### Access

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3100 |
| BFF API | http://localhost:4100/api/v1/health |
| PostgreSQL | localhost:5433 |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4100` | BFF server port |
| `DATABASE_URL` | `postgres://control:control@db:5432/control_ui` | PostgreSQL connection |
| `COOKIE_SECRET` | (random) | Session cookie encryption key |
| `OPENCLAW_GATEWAY_URL` | `http://127.0.0.1:18789` | OpenClaw Gateway endpoint |
| `OIDC_ISSUER` | — | OIDC provider issuer URL |
| `OIDC_CLIENT_ID` | — | OIDC client ID |
| `OIDC_CLIENT_SECRET` | — | OIDC client secret |

---

## 📁 Project Structure

```
orion-orbit-hub/
├── bff/                          # Backend-for-Frontend
│   ├── src/
│   │   ├── db/schema.ts          # Drizzle ORM schema (15+ tables)
│   │   ├── lib/permissions.ts    # 50+ RBAC permission points
│   │   ├── middleware/           # auth, audit middleware
│   │   ├── modules/
│   │   │   ├── auth/             # Login, logout, OIDC, password change
│   │   │   ├── tenant/           # Tenant CRUD
│   │   │   ├── user/             # User management
│   │   │   ├── role/             # Role & permission management
│   │   │   ├── org/              # Departments & teams
│   │   │   ├── agent/            # Agent proxy to gateway
│   │   │   ├── skill/            # Skill management proxy
│   │   │   ├── node/             # Node/device management proxy
│   │   │   ├── gateway/          # Gateway status & config
│   │   │   ├── session/          # Session proxy
│   │   │   ├── chat/             # Chat via OpenAI-compatible API
│   │   │   ├── cron/             # Cron task management
│   │   │   ├── config/           # Config versioning
│   │   │   ├── approval/         # Approval workflows
│   │   │   ├── audit/            # Audit log queries
│   │   │   ├── alert/            # Alert management
│   │   │   ├── export/           # Data export tasks
│   │   │   └── token/            # API token management
│   │   └── index.ts              # App entry point
│   ├── drizzle.config.ts
│   ├── package.json
│   └── Dockerfile
├── frontend/                     # React SPA
│   ├── src/
│   │   ├── pages/                # 20+ page components
│   │   │   ├── login/            # Login with i18n
│   │   │   ├── dashboard/        # Overview dashboard
│   │   │   ├── chat/             # Controlled chat console
│   │   │   ├── agents/           # Agent management
│   │   │   ├── skills/           # Skill marketplace
│   │   │   ├── nodes/            # Device management
│   │   │   ├── sessions/         # Session viewer
│   │   │   ├── gateway/          # Gateway status
│   │   │   └── ...               # +12 more pages
│   │   ├── layouts/AdminLayout   # Sidebar + header layout
│   │   ├── stores/auth.ts        # Zustand auth store
│   │   ├── i18n/                 # en-US + zh-CN
│   │   ├── lib/api.ts            # Axios API client
│   │   └── routes.tsx            # React Router config
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── ARCHITECTURE.md
└── README.md
```

---

## 📊 Database Schema

15+ tables with tenant isolation:

| Table | Purpose |
|-------|---------|
| `users` | User accounts with bcrypt passwords |
| `tenants` | Multi-tenant organizations |
| `tenant_members` | User-tenant associations |
| `roles` | Custom roles per tenant |
| `user_roles` | Role assignments |
| `departments` | Tree-structured departments |
| `teams` | Cross-functional teams |
| `approvals` | Approval workflow records |
| `audit_logs` | Full mutation audit trail |
| `alerts` | System alerts with severity |
| `config_snapshots` | Versioned configuration |
| `api_tokens` | Scoped API tokens |
| `export_tasks` | Async data export jobs |
| `user_sessions` | Active session tracking |

---

## 🔑 Default Credentials

| Field | Value |
|-------|-------|
| Email | `admin@robotai.cloud` |
| Password | `admin123` |

> ⚠️ Change the default password immediately in production.

---

## 📜 License

MIT © [RobotAI](https://robotai.cloud)
