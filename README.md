# Reported

**Reported** is a modern, high-velocity developer platform combining the strengths of **GitHub Issues, GitHub Discussions, Linear, an internal engineering forum, and a team code & architecture review system**.

Designed with a **minimal, developer-oriented, high information density** philosophy - without nested card clutter, without garish gradients, and built for real productivity.

---

## 🛠️ Architecture & Monorepo Overview

This project is built as a TypeScript end-to-end modular monolith using a `pnpm` workspace:

```
Reported/
├── packages/
│   ├── contracts/             # Shared Zod validation schemas, TypeScript DTOs, and system enums
│   └── database/              # PostgreSQL schema (Drizzle ORM), migrations, and realistic dev seed
├── apps/
│   ├── api/                   # Express + TypeScript Modular Monolith backend
│   │   ├── src/events/        # Transactional Outbox & Background Worker
│   │   ├── src/modules/       # auth, issues, reviews, comments, github, notifications, emails, etc.
│   │   └── src/middleware/    # RBAC permissions, timing-safe webhook HMAC, error handling
│   └── web/                   # Vite + React + MUI v6 developer interface
│       ├── src/components/    # CodeBlock (PrismJS), JsonViewer, MarkdownRenderer, PRPreview
│       └── src/theme/         # Semantic tokens for Light, Dark, and System modes
├── docker-compose.yml         # PostgreSQL 16 & Redis
└── README.md
```

---

## 🚀 Quick Start

### 1. Prerequisites

- **Node.js**: `v20+` or `v22+`
- **pnpm**: `v9+` or `v11+`
- **Docker**: For running PostgreSQL (or use an existing PostgreSQL instance)

### 2. Start PostgreSQL Infrastructure

```bash
docker compose up -d
```

_Note: PostgreSQL is exposed on port `5435` to avoid colliding with any default PostgreSQL installations._

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Run Migrations & Seed Realistic Data

```bash
pnpm db:migrate
pnpm db:seed
```

### 5. Start Development Servers

```bash
pnpm dev
```

- **Web Interface**: `http://localhost:5173`
- **API Server**: `http://localhost:4000`
- **Health Check**: `http://localhost:4000/health`

---

## 👥 Seeded Engineering Personas

All seeded accounts share the password: `Password123!`
You can also click any persona button on the `/login` page for **1-click instant login**:

| Persona           | Username    | Email                 | Role       | Specialization                      |
| :---------------- | :---------- | :-------------------- | :--------- | :---------------------------------- |
| **Hoang Nguyen**  | `hoaug`     | `hoaug@reported.dev`  | Admin      | Core Platform Lead & Backend        |
| **Alex Chen**     | `alex.chen` | `alex@reported.dev`   | Maintainer | Staff Distributed Systems Architect |
| **Sarah Kim**     | `sarah.kim` | `sarah@reported.dev`  | Reviewer   | Lead Frontend Engineer              |
| **Marcus Vance**  | `marcus.v`  | `marcus@reported.dev` | Reviewer   | Application Security Researcher     |
| **Elena Rostova** | `elena.r`   | `elena@reported.dev`  | User       | Database Reliability Engineer       |

---

## ✨ Key Features & Capabilities

### 1. Rich Bug Report Templates & Blank Issues

- Structured Bug reports: **Environment**, **Precondition**, **Steps to Reproduce**, **Actual vs Expected**, **Frequency** (Always / Often / Sometimes / Rare), and **Evidence Logs / JSON**.
- Severity: `Blocker`, `Critical`, `Major`, `Minor`, `Trivial`.
- Priority: `P0` (Blocker) to `P4` (None).
- Sequential numbers (e.g. `#101`, `#102`).

### 2. Review Requests (Code, Architecture, Database, Security, UI, API)

- Dedicated review request domain with deadline tracking.
- Multi-reviewer assignments with formal decisions: `Approved` (✅), `Changes Requested` (❌), or `Commented` (💬).
- Decision notes and audit timeline tracking.

### 3. Code Block & Dedicated JSON Viewer

- **CodeBlock**: PrismJS syntax highlighting for TypeScript, JavaScript, JSON, C#, Java, SQL, Bash, YAML, Dockerfile, HTML, CSS, Markdown with line numbers, copy button, and line wrapping.
- **JsonViewer**: Interactive tree view with collapsible/expandable nodes, prettify, minify, copy, and invalid JSON error boundary.

### 4. Technical Discussions & Mentions

- Technical forum thread on every issue and review request.
- Autocomplete mentions (`@username`) when typing `@` in editor.
- Nested replies and quote reply.
- Lightweight reactions (`👍 Like`, `💡 Useful`, `✅ Agree`, `❌ Disagree`, `👀 Eyes`).

### 5. GitHub Integration & Webhook Receiver

- Pull request link auto-detection: displays PR number, title, branches (`feature -> main`), CI checks status, author, and review status.
- Webhook receiver at `/api/v1/github/webhook` with constant-time HMAC signature verification (`crypto.timingSafeEqual`).

### 6. Transactional Outbox & Email Notification Engine

- Domain events (`USER_MENTIONED`, `ISSUE_ASSIGNED`, `REVIEW_REQUESTED`, `COMMENT_CREATED`, `ISSUE_STATUS_CHANGED`) are saved to `outbox_events` in the same transaction.
- Background worker processes events, creates in-app notifications, checks user channel preferences (`IN_APP`, `EMAIL`, `BOTH`, `DISABLED`), and queues email jobs.
- **In-App Email Inspector**: Click the envelope icon in the notification popover to view and inspect all dispatched emails in rendered HTML!

### 7. Global Command Palette (`Cmd+K` / `Ctrl+K`)

- Jump to issues, reviews, users, or repositories.
- Quick create issues/reviews and toggle theme.

---

## 🧪 Testing & Verification

Run tests:

```bash
pnpm test
```

Typecheck:

```bash
pnpm typecheck
```

Build production bundle:

```bash
pnpm build
```
