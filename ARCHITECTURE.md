# OpenClaw Control UI - Multi-Tenant Enterprise Platform

## Tech Stack
- Frontend: React 18 + TypeScript + Vite + Ant Design 5 Pro
- BFF: Fastify + TypeScript + Drizzle ORM
- Database: PostgreSQL 15
- Auth: OIDC (openid-client)
- Realtime: WebSocket
- Deploy: Docker Compose

## Architecture
Browser → Nginx → BFF (Fastify) → PostgreSQL + OpenClaw Gateway(s)
