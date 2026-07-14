*This project has been created as part of the 42 curriculum by <login1>, <login2>, <login3>, <login4>.*

<!-- TODO team: replace the placeholders above with your real 42 logins (this italic line is required by the subject). -->

# ft_transcendence — "Reddit + Slack for 42 campuses"

## Description

A collaborative web platform for 42 students, organised **per project**:

- **Project workspaces** with a Slack-like real-time group chat.
- A **Reddit-like public forum** per project (posts, comments, replies, votes).
- **Deterministic mentor-matching** (the *suggest* module): surfaces students who
  recently validated a given project on your campus, so you know who to ask for help
  — no machine learning, a transparent rank by final mark.
- **Anonymous identities** for non-42 viewers, and a GDPR-conscious account lifecycle
  (email verification, 14-day soft-delete with anonymisation-in-place).

Authentication is email/password (mandatory) with 42 OAuth as a parallel login.

## Instructions

### Prerequisites
- Docker + Docker Compose (the only requirement — everything else runs in containers).

### Run (one command)
```bash
docker compose up --build
```
Then open **https://localhost** and accept the self-signed certificate.

| What | Where |
|---|---|
| App (SPA over HTTPS) | https://localhost |
| Verification emails (signup codes) | http://localhost:1080 (Maildev web UI) |

### Configuration
Every value has a working default, so the command above runs as-is. To override
secrets/ports, copy `.env.example` to `.env` (git-ignored) and edit it:
```bash
cp .env.example .env
```
- `JWT_SECRET` — set a strong secret in any real deployment (`openssl rand -hex 32`).
- **Mail:** the demo uses **Maildev** (a local SMTP sink) so signup works with no
  external account — verification codes appear at http://localhost:1080. For real
  email, unset `SMTP_HOST` and set `GMAIL_USER` / `GMAIL_APP_PASSWORD`.
- **42 OAuth / Pusher:** optional. Email/password login works without them; leaving
  the Pusher key empty makes the chat fall back to HTTP polling.

### Local development (without Docker)
- `backend/`: `npm ci && npx prisma generate && npm run start:dev` (needs Postgres + a `backend/.env`).
- `frontend/`: `npm ci && npm run dev` (Vite dev server on :5173).

## Resources
- 42 API v2 reference and RGPD/CGU compliance notes: `docs/42-api/`.
- Project subject: `en.subject.pdf`.
- **Use of AI:** AI assistance (Claude) was used for code review, auditing module
  coverage against the subject, debugging the container/HTTPS setup, and drafting
  documentation. All generated code was reviewed and is understood by the team.
  <!-- TODO team: refine this to match your actual usage before submission. -->

## Technical Stack
- **Frontend:** Vue 3 + Vite + TypeScript, Pinia (state), Vue Router. Custom design
  system (dark glass theme). Chosen for a fast, typed SPA with a small footprint.
- **Backend:** NestJS 11 (TypeScript), Prisma 7 ORM, PostgreSQL. Chosen for a
  structured, modular architecture with first-class DI and a typed data layer.
- **Realtime:** Pusher channels (with a polling fallback).
- **Infra:** Docker Compose (Postgres, backend, Maildev, nginx). **nginx** terminates
  HTTPS (self-signed cert), serves the SPA, and reverse-proxies `/api` to the backend.
- **Database:** PostgreSQL — relational data (users, posts, comments, votes, groups,
  messages) with well-defined foreign keys, managed through Prisma migrations.

## Database Schema
Main models (`backend/prisma/schema.prisma`):
- **User** — identity (email/password + optional 42 `ftId`), anonymous display fields
  (`rdmName/rdmPfp/rdmCampus`), `canSuggest` opt-in flag, `deleteAt` (soft-delete).
- **PendingRegistration** — pre-verification signups (email + code + expiry).
- **RefreshToken** — hashed, single-use refresh tokens (rotation).
- **ProjectsPost / comments / replies** — the per-project forum, with **PostVote /
  ChatVote** for voting.
- **GroupChat** (+ messages, replies, file attachments) — the per-project chat.

<!-- TODO team: add the exported schema diagram (docs/architecture) here. -->

## Modules
Target: **14 points** (Major = 2, Minor = 1). Honest status below.

<!-- TODO team: finalise this table at submission — only fully functional modules count toward the grade. -->

| Module | Type | Pts | Status |
|---|---|---|---|
| Web: frontend + backend frameworks | Major | 2 | ✅ Vue 3 + NestJS |
| Web: real-time (WebSockets / Pusher) | Major | 2 | ✅ group chat |
| Web: ORM | Minor | 1 | ✅ Prisma |
| User interaction (chat + profile + friends) | Major | 2 | ⚠️ chat + profile done, **friends TODO** |
| User Management: standard (profile, avatar, friends, online status) | Major | 2 | ⚠️ **avatar + friends + online status TODO** |
| User Management: 42 OAuth 2.0 | Minor | 1 | ✅ |
| User Management: advanced permissions / roles | Major | 2 | ⚠️ **roles TODO** |
| Module of choice: deterministic mentor-matching | Major | 2 | ⚠️ works, must be re-pointed at the consenting-users DB (RGPD) |

<!-- TODO team: justify the "module of choice" (why, technical challenge, value added) — required by the subject. -->

## Team Information
<!-- TODO team: one entry per member — 42 login, assigned role(s) (PO / PM / Tech Lead / Developer) and responsibilities. -->

## Project Management
<!-- TODO team: how work was distributed, meetings/communication channels, tools (GitHub Issues / PRs, ...). -->

## Individual Contributions
<!-- TODO team: per-member breakdown of features/modules implemented and challenges faced. -->
