# Reported

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![React](https://img.shields.io/badge/React-18.3-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev/) [![Vite](https://img.shields.io/badge/Vite-6.4-646cff?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/) [![Express](https://img.shields.io/badge/Express-4.21-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/) [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169e1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/) [![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.38-c5f74f?style=flat-square&logo=drizzle&logoColor=black)](https://orm.drizzle.team/) [![Redis](https://img.shields.io/badge/Redis-7-dc382d?style=flat-square&logo=redis&logoColor=white)](https://redis.io/) [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

An internal engineering platform designed for software teams. **Reported** brings together structured issue tracking, multi-reviewer code and architecture reviews, engineering discussion feeds, and GitHub/GitLab repository sync into a single, high-density developer workspace.

Built with a fast, zero-fluff developer UI, dark/light mode tokens, keyboard shortcuts, and full offline PWA support.

---

## Table of Contents

- [Core Highlights](#core-highlights)
- [Monorepo Structure](#monorepo-structure)
- [Quick Start](#quick-start)
  - [Prerequisites](#1-prerequisites)
  - [Setup & Run Locally](#2-setup--run-locally)
- [Demo Accounts](#demo-accounts)
- [Feature Walkthrough](#feature-walkthrough)
  - [1. Technical Issues & Bug Tracking](#1-technical-issues--bug-tracking)
  - [2. Code & Architecture Reviews](#2-code--architecture-reviews)
  - [3. Engineering Post Feed](#3-engineering-post-feed)
  - [4. Git Host Integration (GitHub & GitLab)](#4-git-host-integration-github--gitlab)
  - [5. Discussions, Mentions & Reactions](#5-discussions-mentions--reactions)
  - [6. Transactional Outbox & Email Inspector](#6-transactional-outbox--email-inspector)
  - [7. Command Palette (`Ctrl+K`) & PWA Support](#7-command-palette-ctrlk--pwa-support)
- [Useful Scripts](#useful-scripts)
- [Environment Variables](#environment-variables)
- [Production Deployment](#production-deployment)
- [License](#license)

---

## Core Highlights

- **Fast & Responsive**: Built with Vite 6 + React 18 and content-aware skeleton loaders instead of generic blocking spinners.
- **End-to-End TypeScript**: Shared Zod schemas, TypeScript DTOs, and enums between client and server via `@reported/contracts`.
- **High-Density UI**: Clean typography, pixel-aligned card tags, unified title baselines, and dark mode tailored for long coding sessions.
- **Reliable Async Events**: Transactional outbox pattern guarantees domain events and notifications are never lost during database commits.
- **Installable PWA**: Service Worker caching, web app manifest, and offline support for both desktop and mobile browsers.

---

## Monorepo Structure

Reported uses a lightweight `pnpm` workspace:

```
Reported/
├── apps/
│   ├── api/                   # Express backend (modular monolith architecture)
│   │   ├── src/modules/       # auth, issues, reviews, comments, github, notifications, etc.
│   │   ├── src/events/        # Outbox event publisher & background workers
│   │   └── src/middleware/    # RBAC, HMAC webhook verification, rate limiter, error handler
│   │
│   └── web/                   # Vite + React SPA
│       ├── public/            # PWA manifest, service worker (sw.js), app icons
│       └── src/
│           ├── components/    # CodeBlock (PrismJS), JsonViewer, MarkdownEditor, Skeletons
│           ├── contexts/      # Auth, Theme, Workspace, I18n, Toast
│           ├── pages/         # Dashboard, Issues, Reviews, Posts, Projects, Repos, Profile
│           └── theme/         # Semantic design tokens (light/dark modes)
│
├── packages/
│   ├── contracts/             # Shared DTOs, API payloads, and enums (Zod + TypeScript)
│   └── database/              # PostgreSQL schema (Drizzle ORM), migrations, seed scripts
│
├── infra/                     # Nginx configurations and production Dockerfiles
├── scripts/                   # Remote deploy and automation scripts
├── docker-compose.yml         # Local dev infrastructure (PostgreSQL 16, Redis 7)
└── docker-compose.prod.yml    # Production container orchestration
```

---

## Quick Start

### 1. Prerequisites

- **Node.js**: `v20.x` or `v22.x`
- **pnpm**: `v9.x` or later (`corepack enable pnpm`)
- **Docker & Docker Compose**: For local PostgreSQL and Redis

### 2. Setup & Run Locally

**Clone the repository:**

```bash
git clone https://github.com/hoaug-tran/reported.git
cd reported
```

**Start database and cache containers:**

```bash
docker compose up -d
```

> PostgreSQL is mapped to port `5435` (to prevent conflicts with any locally running Postgres service), and Redis is mapped to `6380`.

**Install dependencies:**

```bash
pnpm install
```

**Configure environment files:**

```bash
cp .env.example .env
```

_(The defaults in `.env.example` connect directly to the Docker containers above)._

**Apply migrations and seed sample data:**

```bash
pnpm db:migrate
pnpm db:seed
```

**Start the development servers:**

```bash
pnpm dev
```

Your applications will be live at:

- **Web App**: [http://localhost:5173](http://localhost:5173)
- **API Server**: [http://localhost:4000](http://localhost:4000)
- **Health Check**: [http://localhost:4000/health](http://localhost:4000/health)

---

## Demo Accounts

The database seed includes realistic engineering personas with pre-filled issues, pull request reviews, and discussion threads.

All seed accounts use the password: **`Password123!`**

You can also use the **1-click Quick Login buttons** on the `/login` page:

| User              | Username    | Email                 | Workspace Role    | Role Focus                         |
| :---------------- | :---------- | :-------------------- | :---------------- | :--------------------------------- |
| **Hoang Nguyen**  | `hoaug`     | `hoaug@reported.dev`  | `OWNER` / `ADMIN` | Platform Lead & Backend            |
| **Alex Chen**     | `alex.chen` | `alex@reported.dev`   | `ADMIN`           | Distributed Systems & Architecture |
| **Sarah Kim**     | `sarah.kim` | `sarah@reported.dev`  | `MEMBER`          | Lead Frontend Engineer             |
| **Marcus Vance**  | `marcus.v`  | `marcus@reported.dev` | `MEMBER`          | Application Security Researcher    |
| **Elena Rostova** | `elena.r`   | `elena@reported.dev`  | `MEMBER`          | Database Reliability Engineer      |

---

## Feature Walkthrough

### 1. Technical Issues & Bug Tracking

- **Structured Bug Reports**: Fill out pre-formatted templates with reproduction steps, environment context, frequency (Always / Often / Rare), and actual vs. expected behavior.
- **Priority & Severity**: Dual prioritization with Severity (`Blocker`, `Critical`, `Major`, `Minor`, `Trivial`) and Priority (`P0` to `P4`).
- **Saved Views & Filters**: Filter by status, priority, author, or project, and save custom view presets for quick access.
- **Trash & Soft Delete**: Deleted items can be reviewed and restored from the trash bin.

### 2. Code & Architecture Reviews

- **Multi-Reviewer Workflow**: Assign multiple reviewers with formal decisions: `Approved` (✅), `Changes Requested` (❌), or `Commented` (💬).
- **Specialized Review Types**: Categorize reviews into `Code`, `Architecture`, `Database Schema`, `Security Audit`, or `API Design`.
- **Review Deadlines**: Visual indicators for upcoming or overdue reviews.

### 3. Engineering Post Feed

- Unified engineering discussions located at `/posts`.
- Categorized tabs: **Bugs**, **Review PRs**, **Questions**, and **Ideas**.
- Standardized badge widths (`90px`) and monospace issue numbers guarantee that titles align vertically in a clean line.

### 4. Git Host Integration (GitHub & GitLab)

- **Repository Linking**: Connect your GitHub and GitLab repositories to track PRs and issues per workspace.
- **PR Previews & CI Status**: Auto-fetches PR status, source/target branches, author avatars, and CI/CD check runs (Success, Failed, Running) with direct external links.
- **Secure Webhooks**: Receives incoming webhook events using constant-time HMAC signature verification (`crypto.timingSafeEqual`).

### 5. Discussions, Mentions & Reactions

- Full Markdown editor with syntax-highlighted code blocks (PrismJS) and collapsible JSON tree inspector.
- User autocomplete with `@username`.
- Quote reply and lightweight emoji reactions (`👍`, `💡`, `✅`, `❌`, `👀`, ...).

### 6. Transactional Outbox & Email Inspector

- All domain events (`USER_MENTIONED`, `ISSUE_ASSIGNED`, `REVIEW_REQUESTED`, etc.) are written to the `outbox_events` table within the same transaction.
- Background worker processes the outbox queue, dispatches in-app notifications, and triggers emails via Resend or SMTP.
- **In-App Email Inspector**: Open the notification dropdown to preview all dispatched HTML emails directly in the browser during development.

### 7. Command Palette (`Ctrl+K`) & PWA Support

- Global `Ctrl+K` (or `Cmd+K`) command bar to quickly search issues, reviews, repositories, and switch pages.
- Installable as a Progressive Web App (PWA) with offline page caching and desktop notification support.

---

## Useful Scripts

| Command            | Description                                                          |
| :----------------- | :------------------------------------------------------------------- |
| `pnpm dev`         | Start both API and Web dev servers concurrently                      |
| `pnpm dev:api`     | Start only the API backend (`tsx watch`)                             |
| `pnpm dev:web`     | Start only the Vite frontend                                         |
| `pnpm build`       | Build all workspace packages (`contracts`, `database`, `api`, `web`) |
| `pnpm typecheck`   | Run TypeScript checks across the entire monorepo                     |
| `pnpm test`        | Run backend test suites (Vitest)                                     |
| `pnpm lint`        | Run code linter across all packages                                  |
| `pnpm db:migrate`  | Apply pending database migrations                                    |
| `pnpm db:seed`     | Seed realistic dev accounts, issues, and discussions                 |
| `pnpm db:clean`    | Wipe and re-create local database tables                             |
| `pnpm docker:up`   | Spin up local PostgreSQL and Redis containers                        |
| `pnpm docker:down` | Stop local Docker containers                                         |

---

## Environment Variables

A `.env.example` file is provided at the project root:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://reported_user:reported_password@localhost:5435/reported_db
REDIS_URL=redis://localhost:6380
JWT_SECRET=super-secret-reported-jwt-key-minimum-32-chars-long
SESSION_SECRET=super-secret-reported-session-key-minimum-32-chars-long
CORS_ORIGIN=http://localhost:5173
CLIENT_URL=http://localhost:5173

# Email Delivery (Resend or SMTP)
MAIL_DRIVER=resend
RESEND_API_KEY=re_your_api_key_here
MAIL_FROM="Reported <no-reply@yourdomain.com>"

# OAuth Providers (Optional)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret

GITLAB_CLIENT_ID=your_gitlab_client_id
GITLAB_CLIENT_SECRET=your_gitlab_client_secret

GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

---

## Production Deployment

For deploying to production servers or remote VPS:

1. **Docker Compose Production**: `docker-compose.prod.yml` spins up Nginx reverse proxy, API backend, Web frontend, isolated Postgres, Redis, and Cloudflare Tunnel.
2. **One-Command Remote Deploy**:

   ```bash
   # Linux / macOS (Bash)
   SERVER_HOST=your-server.com SERVER_USER=ubuntu pnpm deploy:prod:bash

   # Windows (PowerShell)
   pnpm deploy:prod
   ```

---

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
