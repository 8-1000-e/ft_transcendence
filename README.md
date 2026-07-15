# ft_hub — a Reddit + Slack for 42

> _42 login → per-project group chat (Slack-like) + a public forum per project (Reddit-like) + deterministic
> mentor-matching. A non-game "social network" concept, valid under the ft_transcendence "Surprise" subject
> (Chapter III)._

ft_hub is a social platform for 42 students: sign in (email/password or 42 OAuth), browse a Reddit-style forum
per 42 project, discuss in Slack-like project group chats in real time, add friends and see who is online, and
get pointed to the best students on a project to ask for help (mentor-matching). Non-42 visitors can read the
public forum anonymously; only consenting 42 members are ever shown by their real identity (RGPD / 42 API CGU).

---

## Team & roles

_Roles were assigned by dominant contribution; everyone contributed across the stack. Contributions are
approximate._

| Member (42 login) | Role | Main contributions |
|---|---|---|
| **edubois-** | Tech Lead | Backend core: real-time chat (WebSockets/Pusher), forum (posts / comments / replies), group chats, domain architecture |
| **npalissi** | Product Owner | 42 API integration: OAuth 2.0 (42), live 42-API sync (`ftapi`), mentor-matching (`suggest`), product concept & RGPD model |
| **lospacce** | Frontend Developer | Vue 3 SPA foundation: components, views, initial design system |
| **fben-ham** | Project Manager / DevOps | CI/CD & GitHub Actions, Docker one-command stack, nginx/HTTPS, plus cross-cutting front/back (friends, i18n, search, pagination, security fixes) |

**Project management:** GitHub Issues for task tracking, one branch per feature (see the Git history),
Discord + in-person for coordination.

---

## Tech stack & justifications

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Vue 3** + Vite + Pinia + vue-router | Reactive SPA, small footprint, first-class TypeScript; Composition API keeps views as template+wiring over a shared design system |
| Styling | **Tailwind CSS v4** + a custom design system (`hub.css`) | Utility framework for layout/spacing; `hub.css` layers 10+ reusable components, a palette, typography and icons on top for a coherent identity |
| Backend | **NestJS 11** (TypeScript) | Modular DI architecture, guards/pipes for auth & validation, matches the "backend framework" module |
| ORM / DB | **Prisma 7** + **PostgreSQL** | Type-safe queries, migrations, relational data (users, posts, votes, friendships) |
| Real-time | **Pusher** (WebSockets) | Live chat/broadcast with graceful connect/disconnect + a poll fallback |
| Auth | JWT (access + rotating refresh) + **bcrypt** | Stateless access tokens, server-stored single-use refresh tokens; passwords hashed + salted with bcrypt |
| Container | **Docker Compose** + **nginx** (TLS) | One-command stack, single HTTPS origin, `/api` reverse-proxy gateway |
| Mail | Nodemailer (SMTP-configurable) | Maildev for the offline demo, Gmail in prod |
| i18n | Custom dependency-free engine | EN / FR / ES, reactive language switcher, all UI text translatable |

---

## Architecture

```
Browser ──HTTPS──► nginx ─┬─ /            → Vue SPA (static build)
                          └─ /api/*        → NestJS backend ──► PostgreSQL
                                              │
                                              ├─ Pusher  (real-time chat)
                                              └─ 42 API  (OAuth + live reads)
```

- **Frontend** (`frontend/`): Vue 3 SPA. API base is `/api` (same origin behind nginx → no CORS in prod).
- **Backend** (`backend/`): NestJS under a global `/api` prefix. Modules: `auth`, `users`, `friends`,
  `posts` (forum + search), `groups` / `group-chat`, `suggest` (mentor-matching), `ftapi` (42 sync),
  `pusher`, `upload`, `mail`, `tasks` (deletion-purge cron), `prisma`.
- **Database** (PostgreSQL): see schema below.

---

## Database schema

Prisma models (`backend/prisma/schema.prisma`):

- **User** — `id`, `email` (unique), `passwordHash`, `name` (editable pseudo), 42 fields (`ftId`, `login`,
  `ftPfpUrl`, `campus`), anon fields (`rdmName`/`rdmPfp`/`rdmCampus`), `lastSeenAt` (online status),
  `tokenVersion` (JWT revocation on password change), `deleteAt` (soft-delete).
- **Friendship** — `requesterId` → `addresseeId`, `status` (`PENDING`/`ACCEPTED`), unique pair.
- **Notification** — `recipientId`, `type`, `actorId`, `entityLabel`, `link`, `read`.
- **RefreshToken** — hashed, single-use, per-user, 7-day expiry.
- **Projects** — a 42 project (`id`, `name`, `category` = core/specialization).
- **ProjectsPost** — a forum post (`title`, `content`, `filesUrl`, `writer` → User, `votes`, `chats`).
- **ProjectsChat** — a comment OR reply (self-relation `answeringPost`/`answeringChat`), `votes`.
- **PostVote** / **ChatVote** — `UP`/`DOWN` per (user, post|chat).
- **ProjectGroup** / **GroupChat** — per-project group chat + messages (with reply threading).
- **PendingRegistration** — email-verification staging before a User is created.

Relationships: a User authors many Posts/Chats and casts Votes; a Post has many Chats (comments), each Chat can
have child Chats (replies); Friendships and Notifications link Users; a ProjectGroup has many GroupChats.

---

## Features & modules

Non-game social app → all Gaming / AI-Opponent / Graphics / Pong modules are **N/A** by design.

### Claimed modules (≥ 14 points)

| # | Module (subject) | Type | Pts | Where |
|---|---|---|---|---|
| 1 | Web — framework front **and** back | Major | 2 | Vue 3 (`frontend/`) + NestJS (`backend/`) |
| 2 | Web — real-time features (WebSockets) | Major | 2 | Pusher chat: live updates, connect/disconnect handling, broadcast (`pusher`, `group-chat`) |
| 3 | Web — user interaction (chat + profile + **friends**) | Major | 2 | group chat + profiles + friends (`groups`, `users`, `friends`) |
| 4 | User Management — standard user management | Major | 2 | profile edit + avatar (default fallback) + friends + **online status** + profile page (`users`, `friends`) |
| 5 | Web — ORM | Minor | 1 | Prisma (`backend/prisma`) |
| 6 | Web — custom design system (≥10 components) | Minor | 1 | `frontend/src/styles/hub.css` |
| 7 | Web — advanced search (filters, sorting, pagination) | Minor | 1 | `GET /api/search` (projects/posts/comments) + feed sort tabs + cursor pagination |
| 8 | User Management — OAuth 2.0 (42) | Minor | 1 | `auth` 42 login resolved by `ftId` |
| 9 | Accessibility & i18n — multiple languages (≥3) | Minor | 1 | EN / FR / ES + switcher, all UI text translatable (`frontend/src/i18n`) |
| 10 | Data & Analytics — GDPR compliance | Minor | 1 | data request/export + deletion with confirmation + confirmation email |
| 11 | Accessibility — support for the visually impaired (WCAG 2.1 AA) | Minor | 1 | keyboard-operable (visible `:focus-visible`, skip-link, ESC-closes menus), screen-reader friendly (landmarks, ARIA roles/labels, `aria-pressed` votes, `aria-live` chat log, decorative SVGs hidden), AA contrast, `prefers-reduced-motion`, `lang` sync |
| 12 | Cybersecurity — Two-Factor Authentication (2FA) + JWT | Major | 2 | TOTP (RFC 6238, authenticator apps) enrol/verify in Settings, login gated by a 6-digit code; JWT access + rotating refresh tokens (`auth`, `utils/totp.ts`) |

**Total: 17 points.**

**Module of choice — mentor-matching (`suggest`):** deterministic (no ML) ranking of the best students on a
given 42 project, computed from **live 42-API reads** (project users, marks, current physical location),
campus-aware, with **no persistence** and gated to authenticated 42 students only (RGPD-compliant). It powers
the per-project "who to ask for help" rail. _(Justification: substantial live-API integration under a strict
consent/no-store model; can be argued as an extra Minor of choice.)_

### Other notable features

- Reddit-style forum per project (posts, ✅/❌ votes, recursive comment threads with collapse), cursor pagination.
- Slack-style per-project group chats, real-time, with reply threading and image attachments.
- Non-42 read-only anonymous browsing; 42 members shown by real identity only with consent.
- Account model: email/password mandatory, 42 OAuth as a parallel login resolved by `ftId`; explicit 42-linking.
- Soft-delete (14-day grace, anonymize-in-place), password-change session revocation (`tokenVersion`).

---

## Getting started

### One-command (Docker)

```bash
cp backend/.env.example backend/.env   # fill 42 OAuth + Pusher keys (or use the demo defaults)
docker compose up --build
```

Then open **https://localhost** (self-signed cert — accept the warning). Signup verification codes are shown in
**Maildev** at http://localhost:1080 (offline demo mailer). HTTP redirects to HTTPS.

### Local dev

```bash
# backend
cd backend && npm ci && npx prisma generate --schema prisma/schema.prisma && npm run start:dev
# frontend (separate shell)
cd frontend && npm ci && npm run dev
```

> macOS: use `npm ci` only (never `npm install` — it re-breaks the cross-platform lockfile). Node ≥ 22.

---

## Security & privacy

- Passwords hashed + salted (bcrypt); JWT access + rotating single-use refresh tokens; password change revokes
  all sessions (`tokenVersion` + refresh-token wipe).
- Input validated **front and back** (class-validator DTOs + Vue-side checks).
- Private state (`deleteAt`, etc.) is exposed only on `GET /api/me`, never on `/api/users/:id`; a shared
  default-deny `authorView` anonymizes non-consenting identities.
- **Scope of anonymisation (by design):** what is protected is the *identity directory / ranking* of 42
  members — a non-42 viewer never learns which real 42 login authored a post (author shown as `rdm*`) and
  never sees the 42-only mentor/location data. **Forum post content itself is public** (a 42 member who
  posts text or an image is deliberately sharing it on a public forum), so post images are served openly;
  they are not treated as private identity data. Group-chat images, by contrast, are private and gated
  (`GET /api/files/:name` requires membership). On account deletion the row is anonymised in place and the
  user's uploaded media is unlinked from disk (right-to-erasure).
- HTTPS everywhere in prod (nginx TLS). `.env` is git-ignored; `.env.example` lists every key.
- **Privacy Policy** (`/privacy`) and **Terms of Service** (`/terms`) are linked in the footer.

---

## License

Student project built at 42. Not affiliated with 42.
