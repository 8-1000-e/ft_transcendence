_This project has been created as part of the 42 curriculum by edubois-, npalissi, lospacce, fben-ham._

# ft_hub — a Reddit + Slack for 42

---

## Description

**ft_hub** is a social web platform for 42 students — a non-game "social network / collaborative platform"
concept, which the subject explicitly allows (Chapter III, Project Examples).

Sign in with email/password or 42 OAuth, browse a **Reddit-style public forum per 42 project**, discuss in
**Slack-style per-project group chats in real time**, add **friends** and see who is online (and where they are
sitting on campus), and get pointed to the **best students on a project to ask for help** (deterministic
mentor-matching). Non-42 visitors can read the public forum anonymously; only consenting 42 members are ever
shown by their real identity (GDPR / 42 API terms of use).

**Key features**

- Reddit-style forum per 42 project: posts with images, up/down votes, recursive comment threads, cursor pagination.
- Slack-style per-project group chats: real-time messages, reply threading, image attachments.
- Friends system with live online status and current campus seat.
- Mentor-matching: the best students on a given project, ranked from live 42-API data, with no persistence.
- Full user management: profiles, avatars, 42 linking, 2FA, GDPR export/deletion.
- Trilingual UI (EN / FR / ES), WCAG 2.1 AA accessibility, one-command HTTPS deployment.

---

## Instructions

### Prerequisites

| Requirement | Version / note |
|---|---|
| Docker + Docker Compose | required for the one-command deployment |
| Node.js | **≥ 22** (Prisma 7 requirement) — only for local development |
| A 42 OAuth application | optional: email/password login works without it |

### Configuration (`.env`)

Credentials live in a git-ignored `backend/.env`; `backend/.env.example` lists **every** key.

```bash
cp backend/.env.example backend/.env
```

Then fill in (all optional for a first run — the compose file ships working defaults):

- `FT_OAUTH_CLIENT_ID` / `FT_OAUTH_CLIENT_SECRET` / `FT_OAUTH_REDIRECT_URI` — 42 OAuth. For the Docker stack
  register `https://localhost/api/auth/42/callback` as a redirect URI in your 42 application.
- `PUSHER_*` — real-time transport. Without it the chat falls back to polling.
- `JWT_SECRET`, `DATABASE_URL`, `SMTP_*` — have safe defaults in `docker-compose.yml`.

### Run (one command)

```bash
docker compose up --build
```

Open **https://localhost**. The certificate is self-signed, so the browser shows a warning once — accept it
(there is no way to obtain a browser-trusted certificate for `localhost`). HTTP redirects to HTTPS.
Signup verification codes are delivered to **Maildev** at http://localhost:1080 (offline demo mailer).

To reset everything (database + uploaded files):

```bash
docker compose down -v && docker compose up --build
```

### Local development

```bash
# backend
cd backend && npm ci && npx prisma generate --schema prisma/schema.prisma && npm run start:dev
# frontend (separate shell)
cd frontend && npm ci && npm run dev
```

> On macOS use `npm ci` only — `npm install` rewrites the cross-platform lockfile.
> `npm run db:seed` (backend) loads realistic demo content; it needs at least two 42-linked accounts.

---

## Team Information

| Member (42 login) | Role(s) | Responsibilities |
|---|---|---|
| **edubois-** | Tech Lead / Architect | Defines the technical architecture and stack decisions, reviews critical changes, owns the backend domain core (forum, chat, real-time). |
| **npalissi** | Product Owner / Developer | Owns the product vision and backlog, validates completed work, owns the 42-API integration and the GDPR/consent model. |
| **lospacce** | Frontend Developer | Builds the Vue SPA: components, views, routing, the initial design system. |
| **fben-ham** | Project Manager / DevOps / Developer | Organises planning and tracking, removes blockers, owns CI/CD, containerisation and HTTPS, plus cross-cutting front/back features. |

## Project Management

- **Work organisation:** the project was split into vertical features (auth, forum, chat, friends, …), each
  developed on its own branch and merged into `main` through a pull request.
- **Tools:** GitHub Issues for task tracking, GitHub pull requests for code review, GitHub Actions for CI
  (lint + build on every push), husky pre-push hooks (lint + boot smoke-test) to keep `main` bootable.
- **Communication:** Discord for day-to-day coordination, plus in-person sessions on campus.
- **Meetings:** regular syncs to review progress, re-prioritise the backlog and unblock each other.

---

## Technical Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Vue 3** + Vite + Pinia + vue-router | Reactive SPA framework with first-class TypeScript; the Composition API keeps views as template + wiring on top of a shared design system. |
| Styling | **Tailwind CSS v4** + custom design system (`hub.css`) | Tailwind covers layout/spacing utilities; `hub.css` adds 10+ reusable components, a palette, typography and icons for a coherent identity. |
| Backend | **NestJS 11** (TypeScript) | Modular dependency-injection architecture; guards, pipes and DTO validation map directly onto our auth and validation needs. |
| Database | **PostgreSQL 16** | Relational data (users, posts, votes, friendships, memberships) with strong constraints and transactions — a document store would have made these joins and unique pairs awkward. |
| ORM | **Prisma 7** | Type-safe queries generated from a single schema, plus a real migration history that a fresh evaluator clone can replay. |
| Real-time | **Pusher** (WebSockets) | Hosted WebSocket transport with channel authorisation; handles connect/disconnect gracefully and degrades to polling. |
| Auth | JWT (access + rotating refresh) + **bcrypt** + **TOTP** | Stateless access tokens, single-use server-stored refresh tokens, bcrypt-hashed passwords, RFC 6238 2FA. |
| Container | **Docker Compose** + **nginx** (TLS) | One-command stack; nginx terminates HTTPS, serves the SPA and reverse-proxies `/api` — a single origin, so no CORS. |
| Mail | Nodemailer (SMTP-configurable) | Maildev for a fully offline demo, real SMTP in production. |
| i18n | Custom dependency-free engine | EN / FR / ES with a reactive switcher; no runtime dependency for ~200 keys. |

### Architecture

```
Browser ──HTTPS──► nginx ─┬─ /            → Vue SPA (static build)
                          └─ /api/*       → NestJS backend ──► PostgreSQL
                                              │
                                              ├─ Pusher  (real-time chat)
                                              └─ 42 API  (OAuth + live reads)
```

- **Frontend** (`frontend/`): Vue 3 SPA, API base `/api` (same origin behind nginx).
- **Backend** (`backend/`): NestJS under a global `/api` prefix. Modules: `auth`, `users`, `friends`,
  `posts` (forum + search + feed), `groups` / `group-chat`, `suggest` (mentor-matching), `ftapi` (42 sync),
  `pusher`, `upload`, `mail`, `notifications`, `tasks` (deletion-purge cron), `prisma`.

---

## Database Schema

Prisma models (`backend/prisma/schema.prisma`):

| Model | Key fields | Relationships |
|---|---|---|
| **User** | `id` (uuid PK), `email` (unique), `passwordHash`, `name`, `locale`, 42 fields (`ftId` unique, `login`, `ftPfpUrl`, `campus`, `campusId`), anon fields (`rdmName`/`rdmPfp`/`rdmCampus`), `lastSeenAt`, `tokenVersion`, `totpSecret`/`totpEnabled`, `deleteAt` | authors posts/comments, casts votes, has friendships, notifications, refresh tokens |
| **Friendship** | `requesterId`, `addresseeId`, `status` (`PENDING`/`ACCEPTED`) | User ↔ User, unique pair |
| **Notification** | `recipientId`, `type` (enum), `actorId`, `entityLabel`, `link`, `read` | belongs to a User |
| **RefreshToken** | `tokenHash`, `userId`, `expiresAt` | belongs to a User, single-use |
| **PendingRegistration** | `email`, `passwordHash`, `verifCode`, `verifCodeExpiresAt` | staging before a User exists |
| **Projects** | `id` (42 project id), `name`, `category` (`core`/`specialization`) | has many posts |
| **ProjectsPost** | `id`, `projectId`, `writer`, `title`, `content`, `filesUrl[]`, `postedAt`, `editedAt` | belongs to Projects + User; has comments and votes |
| **ProjectsChat** | `id`, `answeringPost` **or** `answeringChat` (self-relation), `writer`, `content`, `filesUrl[]` | a comment on a post **or** a reply to another comment (recursive) |
| **PostVote** / **ChatVote** | `userId`, `postId`/`chatId`, `vote` (`UP`/`DOWN`) | unique per (user, target) |
| **ProjectGroup** | `id` (42 team id), `groupName`, `projectId`, `projectName`, `usersId[]`, `githubLink` | has many GroupChat messages |
| **GroupChat** | `id`, `group`, `sender`, `content`, `filesUrl[]`, `messageReply`, `sendTime` | belongs to a ProjectGroup + User, self-relation for replies |

A User authors many Posts and Chats and casts Votes; a Post has many Chats (comments), and each Chat can have
child Chats (replies, unbounded depth); Friendships and Notifications link Users to Users; a ProjectGroup holds
many GroupChat messages.

---

## Features List

> ⚠️ **Team: confirm the owner of each line before the defense** — every member is questioned individually on
> their own work.

| Feature | Owner(s) | Description |
|---|---|---|
| Email/password auth (signup, email verification, login) | edubois- | bcrypt hashing, verification code by email, JWT session |
| 42 OAuth login + explicit account linking | npalissi | Parallel login resolved by `ftId`; a logged-in user can attach their 42 identity |
| Two-factor authentication (TOTP) | fben-ham | Enrol in Settings via an authenticator app; login gated by a 6-digit code, replay-protected |
| Forum per project (posts, images, votes) | edubois- | Post creation/edit, up/down votes, per-project feeds |
| Recursive comment threads | edubois- | Comments and replies at unbounded depth, collapse + "continue thread" |
| Home feed across all projects | fben-ham | Server-side `/feed` over every catalogued project, cursor-paginated, sortable |
| Real-time group chats | edubois- | Pusher broadcast with poll fallback, reply threading, image attachments |
| Friends + online status + campus seat | fben-ham | Requests/accept/remove, online via heartbeat, live 42 location |
| Mentor-matching (`suggest`) | npalissi | Best students on a project, from live 42-API reads, campus-aware, no persistence |
| Notifications (comment, reply, friend events) | fben-ham | Topbar bell with unread count and mark-as-read |
| Search (projects, posts, comments) | fben-ham | Sectioned results, sorting tabs, pagination |
| File upload (images + documents) | fben-ham | Images, PDF, TXT, MD, CSV; client + server validation, progress, inline preview or download chip, delete, gated private storage for chat |
| Anonymisation for non-42 viewers | npalissi | Shared default-deny `authorView`; non-42 accounts are read-only |
| GDPR export / account deletion | fben-ham | Readable JSON export, 14-day soft delete, anonymise-in-place, media erasure, confirmation emails |
| Internationalisation (EN/FR/ES) | fben-ham | Dependency-free engine, per-user persisted locale |
| Accessibility pass (WCAG 2.1 AA) | fben-ham | Keyboard operability, screen-reader semantics, contrast, reduced motion |
| Vue SPA foundation + design system | lospacce | Components, views, routing, `hub.css` |
| Docker one-command stack + HTTPS + CI | fben-ham | Compose stack, nginx TLS gateway, GitHub Actions, boot smoke-test |

---

## Modules

Non-game social app → all Gaming / AI-Opponent / Graphics / Pong modules are **N/A** by design.

| # | Module (subject section) | Type | Pts | Owner | How it was implemented |
|---|---|---|---|---|---|
| 1 | Web — framework for **both** frontend and backend | Major | 2 | lospacce + edubois- | Vue 3 SPA (`frontend/`) and NestJS (`backend/`), both used with their full ecosystem (router, store, DI, guards, pipes) |
| 2 | Web — real-time features (WebSockets) | Major | 2 | edubois- | Pusher channels with server-side authorisation; live message broadcast, graceful connect/disconnect, polling fallback (`pusher`, `group-chat`) |
| 3 | Web — user interaction (chat + profile + friends) | Major | 2 | edubois- + fben-ham | Basic chat between users, profile pages, and a full friends system (add/remove/list) — the three required sub-features |
| 4 | User Management — standard user management | Major | 2 | fben-ham | Profile edit, avatar with default fallback, friends with online status, profile page (`users`, `friends`) |
| 5 | Accessibility — complete WCAG 2.1 AA compliance | Major | 2 | fben-ham | Keyboard operability (visible `:focus-visible`, skip-link, Escape closes popovers, focus-trapped modals), screen-reader support (landmarks, ARIA roles/labels, `aria-pressed` votes, `aria-live` chat log, decorative SVGs hidden), AA contrast tokens, `prefers-reduced-motion`, `lang` synchronised with the locale |
| 6 | Web — ORM | Minor | 1 | edubois- | Prisma 7 with a committed migration history (`backend/prisma`) |
| 7 | Web — custom design system (≥ 10 components) | Minor | 1 | lospacce | `frontend/src/styles/hub.css`: palette, typography, icons and 10+ reusable components shared by every view |
| 8 | Web — advanced search (filters, sorting, pagination) | Minor | 1 | fben-ham | `GET /api/search` across projects, post titles/bodies and comments; feed sort tabs; cursor pagination everywhere |
| 9 | User Management — OAuth 2.0 (42) | Minor | 1 | npalissi | 42 login resolved by `ftId`, CSRF-protected `state`, explicit account linking (`auth`) |
| 10 | User Management — complete 2FA system | Minor | 1 | fben-ham | TOTP (RFC 6238) implemented from scratch: enrolment key + `otpauth` URI, 6-digit verification, replay protection, enable/disable in Settings (`utils/totp.ts`) |
| 11 | Accessibility & i18n — multiple languages (≥ 3) | Minor | 1 | fben-ham | EN / FR / ES, switcher in Settings, per-user persisted locale, all UI text translatable (`frontend/src/i18n`) |
| 12 | Data & Analytics — GDPR compliance | Minor | 1 | fben-ham | Data request/export in readable JSON, deletion with confirmation, confirmation emails, anonymise-in-place |
| 13 | Web — file upload and management system | Minor | 1 | fben-ham | Multiple file types (images, PDF, TXT, MD, CSV) validated **client and server side** (MIME **and** extension, 5 MB cap); forum files served publicly, chat files behind a membership-gated endpoint; inline preview for images and a download chip for documents; upload progress; delete, with orphan cleanup on cancel and erasure on account deletion (`upload`, `utils/files.ts`) |

**Point calculation: 5 Major × 2 + 8 Minor × 1 = 18 points** (14 required + 4 beyond).

### Justification for the module choices

The concept — a forum + chat platform for 42 students — drove the selection: the four Major modules (framework,
real-time, user interaction, user management) are what a social platform *is*, and the Minors reinforce the same
axis rather than scattering. ORM and the design system serve maintainability; search, i18n, accessibility, 2FA
and GDPR each answer a concrete need of a student-facing product handling real 42 identities.

### Module of choice (not counted in the 17) — mentor-matching (`suggest`)

- **Why:** the original product idea — "who on my campus can help me on this project *right now*".
- **Technical challenge:** ranking students from **live 42-API reads** (project marks, validation status,
  current physical location) under a strict rate limit (~2 req/s per app), with **zero persistence** of
  non-consenting users' data, and bounded so a single request cannot exceed the gateway timeout.
- **Value:** it turns a forum into something actionable — you get a name and a seat number.
- **Status:** deliberately **not counted** in our total; we present it as a Module of choice (Minor) only if the
  evaluator agrees it qualifies.

---

## Security & privacy

- Passwords hashed and salted with bcrypt; JWT access tokens + rotating single-use refresh tokens; a password
  change revokes every session (`tokenVersion` bump + refresh-token wipe); optional TOTP 2FA.
- All forms and inputs validated **on both sides** (class-validator DTOs in the backend, checks in the SPA).
- Private state (`deleteAt`, e-mail, …) is only exposed on `GET /api/me`, never on `/api/users/:id`; a shared
  default-deny `authorView` helper anonymises non-consenting identities everywhere.
- **Scope of anonymisation (by design):** what is protected is the *identity directory* of 42 members — a non-42
  viewer never learns which real 42 login authored a post (authors appear as `rdm*`) and never sees 42-only
  mentor/location data. **Forum content itself is public**, since a 42 member posting on a public forum is
  deliberately sharing it. Group-chat images are private and gated (`GET /api/files/:name` requires membership).
- On account deletion the row is anonymised in place and the user's uploaded media is unlinked from disk.
- HTTPS everywhere in production (nginx TLS). `.env` is git-ignored and `.env.example` lists every key.
- **Privacy Policy** (`/privacy`) and **Terms of Service** (`/terms`) are reachable from the footer.

---

## Individual Contributions

> ⚠️ **Team: complete the "challenges" column with your own words before the defense.**

**edubois- — Tech Lead / Architect.** Defined the NestJS module layout and the Prisma data model, and
implemented the domain core: forum posts, the recursive comment/reply model (a single self-referencing
`ProjectsChat` table), the vote system, group chats and the Pusher real-time layer.
_Challenges:_ modelling comments and replies as one recursive structure while keeping queries bounded; making
real-time delivery degrade gracefully to polling when Pusher is unavailable.

**npalissi — Product Owner / Developer.** Owns the product concept and the 42-API integration: OAuth 2.0 login,
the project/team synchronisation (`ftapi`), the mentor-matching service, and the GDPR/consent model that governs
what may be stored about non-consenting 42 users.
_Challenges:_ staying within the 42 API rate limit while reading live data; designing an anonymisation model that
keeps the forum public without ever exposing a non-consenting student's identity.

**lospacce — Frontend Developer.** Built the Vue 3 SPA foundation: routing, the component library, the views,
and the first iteration of the shared design system that later became `hub.css`.
_Challenges:_ keeping a consistent visual language across a growing number of views.

**fben-ham — Project Manager / DevOps / Developer.** Ran planning and tracking, and delivered the
infrastructure (Docker Compose stack, nginx HTTPS gateway, CI and the boot smoke-test) plus cross-cutting
features: friends and presence, search, notifications, i18n, GDPR, file upload, 2FA and the accessibility pass.
_Challenges:_ making a fresh clone deploy in one command (schema drift only surfaces on a clean
`prisma migrate deploy`); keeping the browser console error-free; bounding live 42-API calls so a request could
not time out at the gateway.

---

## Resources

**Documentation**

- [Vue 3](https://vuejs.org/guide/introduction.html), [Pinia](https://pinia.vuejs.org/), [vue-router](https://router.vuejs.org/)
- [NestJS](https://docs.nestjs.com/), [Prisma](https://www.prisma.io/docs), [PostgreSQL](https://www.postgresql.org/docs/)
- [42 API reference](https://api.intra.42.fr/apidoc) and its terms of use
- [Pusher Channels](https://pusher.com/docs/channels/), [Tailwind CSS](https://tailwindcss.com/docs), [Docker Compose](https://docs.docker.com/compose/), [nginx](https://nginx.org/en/docs/)
- [RFC 6238 — TOTP](https://datatracker.ietf.org/doc/html/rfc6238), [WCAG 2.1](https://www.w3.org/TR/WCAG21/), [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)

**Use of AI**

AI assistants (mainly Claude) were used throughout the project, on the following tasks:

- **Exploration and design:** discussing architecture options and trade-offs (data model for recursive comments,
  session/token strategy, anonymisation model) before implementing them.
- **Implementation support:** drafting boilerplate and repetitive code (DTOs, i18n message files, CSS for the
  design system), and pair-debugging concrete failures (a `504` on the mentor-matching endpoint, a stale-chunk
  error after redeploys, a refresh-token rotation race across tabs).
- **Review:** running systematic audits of the codebase (accessibility, privacy, file lifecycle, reactivity) and
  cross-checking our module claims against the subject.
- **Documentation:** structuring this README and the technical notes.

Everything generated was reviewed, tested and adapted by the team; each member is able to explain and modify the
code they own. Security-sensitive parts (authentication, 2FA, anonymisation) were re-read line by line and
verified against the specifications listed above.

---

## Known limitations

- The TLS certificate is self-signed, so browsers show a warning on first load (unavoidable for `localhost`).
- Uploads are limited to JPEG, PNG, GIF, WebP, PDF, TXT, MD and CSV, 5 MB per file. Archives and executables
  are deliberately refused (upload attack surface), and both the MIME type and the extension must match.
- Mentor-matching returns an empty list when the 42 API has no recent data for a project, or when the logged-in
  user has no resolvable campus.

## License

Student project built at 42. Not affiliated with 42.
