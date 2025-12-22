# SETai MVP Implementation Plan

This document translates the MVP product scope into a concrete implementation plan for the SETai application. It targets a single-tenant experience where a user connects one GitHub repository, requests a change in natural language, reviews the proposed diff, and explicitly approves the publish flow that commits and deploys the change.

## Architecture Overview

- **Frontend**: Next.js (App Router) with TypeScript, Tailwind CSS, and i18n ready using `next-intl` (English default, Norwegian secondary). Components include authentication screens, command input, diff preview, history list, and status indicators.
- **Backend**: Next.js API routes or a colocated Fastify server for GitHub webhooks, AI orchestration endpoints, and GitHub access. TypeScript shared models between frontend and backend to avoid schema drift.
- **Database**: PostgreSQL via Prisma for users, repository connections, command runs, proposed changes, approvals, and audit logs.
- **AI Orchestration**: Server-side orchestration layer that calls an LLM to produce proposed changes (never writes to Git directly). Includes a deterministic prompt scaffold and safety checks.
- **GitHub Integration**: OAuth app using `repo` (or `contents:write`, `metadata`, `read:user`) scopes. Reads repository tree, creates commits after explicit approval, and pushes to the default branch.
- **Deployment**: Webhook-triggered CI/CD (e.g., GitHub Actions or existing VPS hook). SETai posts commits; the repository’s pipeline handles build/deploy.
- **Observability**: Structured logging (pino) and request tracing with OpenTelemetry exporters; audit events stored in the database.

## Data Model (Prisma Sketch)

- `User`: id, email, auth_provider, created_at, last_login_at.
- `RepoConnection`: id, user_id, github_installation_id, owner, repo, default_branch, status, created_at, updated_at.
- `CommandRun`: id, user_id, repo_connection_id, instruction_text, status (`proposed|published|cancelled|failed`), created_at, updated_at.
- `ProposedChange`: id, command_run_id, files_changed JSON (paths + before/after snippets), diff_text, ai_model, created_at.
- `Approval`: id, command_run_id, approved_by, approved_at, commit_sha (nullable until publish), publish_status, error_message (nullable).
- `AuditLog`: id, actor (user/service), event_type, metadata JSON, created_at.

## Key Flows

### 1) Authentication
- Support **magic link** (email) via NextAuth email provider or Supabase Auth, and **GitHub OAuth**.
- Single-user accounts; no team roles. Keep profile minimal (email + provider).
- Persist session in HTTP-only cookies; enforce CSRF protection on API routes.

### 2) Connect GitHub Repository
- After login, start GitHub App OAuth installation flow.
- Store installation id and repository name on success; fetch and store default branch.
- List repositories via installation API; allow the user to pick **one** repository.
- Verify repository accessibility and required scopes before enabling command input.

### 3) Command Intake
- UI: full-width textarea with placeholder “Describe what you want to change on your website”.
- POST `/api/commands` with instruction text and repo connection id.
- Backend validates length, sanitizes input, and enqueues AI proposal generation.

### 4) AI Proposal Generation
- Steps:
  1. Read repository tree via GitHub API.
  2. Retrieve relevant files (heuristics: index/home files, `pages/`, `app/`, `src/components/`, and `public/` content) using embeddings or keyword search.
  3. Prompt LLM to produce proposed edits with file paths and before/after snippets; output unified diff.
  4. Validate diff format and ensure **no secrets** or destructive actions (e.g., package deletions).
  5. Persist `ProposedChange` and mark `CommandRun` as `proposed`.
- No writes to GitHub during this step.

### 5) Diff Preview UI
- Render per-file diff with syntax highlighting and changed-line focus.
- Show summary metadata: files touched, lines changed, instruction text.
- Actions: **Approve & Publish**, **Cancel**. No inline editing.

### 6) Approval & Publish Pipeline
- On approval:
  1. Re-validate repository status and branch head to avoid conflicts.
  2. Apply diff to a temporary workspace (e.g., in-memory fs or temp dir) and run linters/tests if configured.
  3. Create commit with message `SETai: <short description of change>` on the default branch.
  4. Push via GitHub contents API or git+token; handle retries and surface errors in UI.
  5. Trigger deployment by pushing to default branch; optionally call a configured webhook and record response.
- Update `Approval` with commit SHA and publish status; mark `CommandRun` as `published` or `failed`.

### 7) History View
- Show list of past `CommandRun` records with status, timestamp, instruction text, and link to GitHub commit (if published).
- Sort newest first; include filter by status.

## API Surface (First Cut)

- `POST /api/auth/magic-link` – request sign-in link (if using email auth).
- `POST /api/github/installation` – handle GitHub App installation callback.
- `GET /api/github/repositories` – list installable repos.
- `POST /api/github/select` – store selected repository and default branch.
- `POST /api/commands` – submit instruction, return `command_run_id`.
- `GET /api/commands/:id` – fetch status and proposed diff.
- `POST /api/commands/:id/approve` – approve and trigger publish.
- `POST /api/commands/:id/cancel` – cancel a proposal.
- `GET /api/history` – paginated command history for the user.
- `POST /api/webhooks/github` – receive GitHub webhooks (e.g., installation events).

## Frontend Components

- `AuthGate` – wraps pages, checks session, redirects to sign-in.
- `RepoConnectCard` – handles GitHub connection and repository selection.
- `CommandInput` – textarea + submit, with validation messaging.
- `DiffPreview` – per-file diff display with expand/collapse and line highlights.
- `ApprovalActions` – Approve/Cancel buttons with status indicators.
- `HistoryList` – shows past commands with status chips and links to commits.
- `LanguageToggle` – optional toggle; all strings pulled from i18n resource files.

## Deployment & Environments

- **Environments**: dev (local), staging, prod.
- Use `docker-compose` for local dev (Next.js + PostgreSQL).
- CI pipeline (GitHub Actions) steps: lint, test, build. Deployment triggered by pushes to `main`.
- Store secrets via GitHub Actions secrets and Vercel/Render environment variables.

## Infrastructure & Deployment (MVP Scope)

### A. Domain & DNS Management
- Domain ownership: customer-owned.
- DNS configuration:
  - A-record → platform VPS.
  - Optional subdomain strategy (e.g., `client.setai.no`).
- SSL handled automatically via platform (Let’s Encrypt).

### B. Hosting & Platform Management
- VPS managed by SETAI.
- Stack:
  - Docker + reverse proxy.
  - Isolated containers per project/client.
- Security:
  - Firewall, Fail2ban, restricted SSH.
- Updates & monitoring: platform responsibility.

### C. Website Generation Flow (MVP)
- Website is generated by:
  - Git repository (template-based).
  - AI-assisted content generation.
- Deployment pipeline:
  - Repo → CI/CD → VPS container.
- Customer interaction:
  - Customer uses GPT to modify content.
  - Platform handles build & deploy.

### D. Out of Scope (Explicit)
- Advanced DNS automation.
- Multi-region hosting.
- High-availability clusters.

## Safety & Compliance

- Never write to the repository without an explicit approval action.
- Audit log every critical event: login, repo link, command submission, proposal completion, approval, commit, deployment webhook response.
- Enforce rate limiting on command submission and GitHub API calls per user.
- Sanitize AI output to avoid secret leakage; block operations that touch non-frontend files by default (configurable allowlist).

## Open Questions / Next Steps

- Choose between NextAuth vs. standalone auth provider for magic links.
- Decide whether to use a GitHub App or OAuth app with PAT-like token for commits; GitHub App is safer and preferred.
- Determine deployment target assumptions (Vercel vs. user-provided webhook URL) and shape of success/failure feedback.
- Define guardrails for which file paths are considered editable in MVP (e.g., `/app`, `/pages`, `/src/components`, `/public`).
- Establish minimum automated checks before publish (lint? basic tests?) to keep flow fast while providing confidence.
