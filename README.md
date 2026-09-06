# DevAssess — Developer Assessment Platform

A role-based REST API where **evaluators** publish paid technical assessments, **developers** buy them, take them, and review them, and **admins** oversee the whole marketplace.

Built with Express 5, TypeScript, Prisma 7 (PostgreSQL), Redis, JWT + Google OAuth, AWS S3 presigned uploads, and SSLCommerz payments.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Data model](#data-model)
- [API reference](#api-reference)
- [Core flows](#core-flows)
- [Response conventions](#response-conventions)
- [Deployment](#deployment)

---

## Features

**Roles.** Three roles drive the design:

| Role        | What they do                                                                  | Login methods                   |
| ----------- | ----------------------------------------------------------------------------- | ------------------------------- |
| `DEVELOPER` | Browse the public catalog, purchase assessments, get evaluated, leave reviews | Credentials or Google           |
| `EVALUATOR` | Create/manage assessments, see who purchased them, track revenue              | Credentials only                |
| `ADMIN`     | Observe and moderate everything                                               | Seeded at startup from env vars |

**Highlights**

- **OTP-gated registration** — no DB row is created until the emailed 6-digit OTP is verified. The pending payload lives in Redis with a 5-minute TTL.
- **Account linking** — an email that already exists with a Google auth gets a `CREDENTIALS` auth attached instead of a duplicate-user conflict.
- **httpOnly cookie auth** — access/refresh JWTs are set as cookies _and_ returned in the body, so browser and API clients both work.
- **Presign-then-confirm uploads** — the API never receives file bytes. Clients get a presigned S3 URL, `PUT` directly to S3, then send the key back. Keys are namespaced per user and re-checked before persisting.
- **SSLCommerz payments** — server-side re-validation against the gateway before a payment is marked `SUCCESS`.
- **Ownership scoping in the `where` clause** — a record belonging to someone else 404s instead of 403s, so its existence isn't leaked.
- **Soft deletes** — assessments via `status = DELETED` + `deletedAt`; users and reviews via a `deletedAt` timestamp.
- **Zod validation** on body, query, and params, with joined `path: message` errors.

---

## Tech stack

| Concern           | Choice                                                                            |
| ----------------- | --------------------------------------------------------------------------------- |
| Runtime           | Node.js (ESM), TypeScript                                                         |
| Framework         | Express 5                                                                         |
| ORM               | Prisma 7 with the `prisma-client` generator + `@prisma/adapter-pg` driver adapter |
| Database          | PostgreSQL                                                                        |
| Cache / OTP store | Redis                                                                             |
| Auth              | `jsonwebtoken`, `bcryptjs`, Passport (local + `google-oauth20`)                   |
| Validation        | Zod 4                                                                             |
| Email             | Nodemailer + EJS templates                                                        |
| Storage           | AWS S3 (`@aws-sdk/client-s3`, `s3-request-presigner`)                             |
| Payments          | SSLCommerz (via `axios`)                                                          |
| Build             | `tsup` (ESM + CJS), `tsx` for dev                                                 |

---

## Getting started

### Prerequisites

- Node.js 20+
- A PostgreSQL database
- A Redis instance
- SMTP credentials (Gmail app password works)
- AWS S3 buckets + IAM keys — _optional, only for avatar/thumbnail uploads_
- SSLCommerz sandbox store credentials — _optional, only for payments_

### Setup

```bash
git clone <repo-url>
cd DevAssess
npm install

cp .env.example .env
# fill in .env — see the table below

npx prisma generate          # emits the client into generated/prisma
npx prisma migrate dev       # applies prisma/migrations

npm run dev                  # http://localhost:<PORT>
```

The server boots in this order and **exits if any step fails** — Postgres, Redis, and SMTP are all hard dependencies:

```
connect Prisma → seed admin → connect Redis → verify Nodemailer transporter → listen
```

`GET /` returns `Developer Assessment Platform is running...` as a health check.

### The seeded admin

On every startup `src/utils/seed.ts` checks for any user with role `ADMIN`. If none exists it creates one from `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` with status `VERIFIED` and a `CREDENTIALS` auth row. Log in with those credentials at `POST /api/v1/auth/login`.

---

## Environment variables

All of these are read in exactly one place — `src/config/index.ts`. Import `config` from there rather than touching `process.env` (`src/lib/prisma.ts` and `prisma.config.ts` read `DATABASE_URL` directly, which predates the rule).

| Variable                                                          | Description                                                                                 |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                    | PostgreSQL connection string                                                                |
| `PORT`                                                            | HTTP port                                                                                   |
| `NODE_ENV`                                                        | `development` / `production` — controls cookie `secure`/`sameSite`                          |
| `FRONTEND_URL`                                                    | Used for OAuth and payment redirects                                                        |
| `BACKEND_API_URL`                                                 | **Must be publicly reachable** — SSLCommerz success/fail/cancel callbacks are built from it |
| `BCRYPT_SALT_ROUNDS`                                              | bcrypt cost factor                                                                          |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`                     | Startup admin seed                                                                          |
| `REDIS_USER`, `REDIS_PASSWORD`, `REDIS_HOST`, `REDIS_PORT`        | Redis connection                                                                            |
| `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_SENDER`                      | Nodemailer transport + From address                                                         |
| `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`                      | Access token signing + lifetime (e.g. `15m`)                                                |
| `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`                    | Refresh token signing + lifetime (e.g. `30d`)                                               |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Google OAuth app                                                                            |
| `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`        | S3 credentials                                                                              |
| `AWS_S3_AVATAR_BUCKET`, `AWS_S3_ASSESSMENT_BUCKET`                | Two separate buckets                                                                        |
| `AWS_S3_URL_TTL_SECONDS`                                          | Presigned URL lifetime                                                                      |
| `SSLCOMMERZ_SESSION_URL`, `SSLCOMMERZ_VALIDATION_URL`             | Gateway endpoints                                                                           |
| `SSL_COMMERZ_STORE_ID`, `SSL_COMMERZ_STORE_PASSWORD`              | Gateway store credentials                                                                   |

---

## Scripts

| Command                  | What it does                                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`            | `tsx watch src/server.ts` — hot reload                                                                               |
| `npm run build`          | `tsup` — bundles `src/server.ts` to **both** ESM and CJS in `dist/`, with a `createRequire` banner shimming CJS deps |
| `npm start`              | `node dist/server.js`                                                                                                |
| `npx prisma generate`    | Regenerate the client into `generated/prisma` — run after **any** schema change                                      |
| `npx prisma migrate dev` | Create and apply a migration under `prisma/migrations`                                                               |

> There is no test suite and no linter. `tsconfig.json` has `strict` on but no `include`, and `tsup` does not typecheck, so **a type error will not fail the build** — verify changes by running the server.

### Prisma import paths

The generator uses the newer `prisma-client` provider, not `prisma-client-js`. Imports come from `generated/prisma/client` and `generated/prisma/enums` — **not** `@prisma/client`. Both re-export the same enums and the codebase uses them inconsistently; match the file you're editing.

---

## Project structure

```
src/
├── app.ts                  # Express app, middleware order, router mounting
├── server.ts               # startup sequence
├── config/
│   ├── index.ts            # the only place process.env is read
│   └── passport.ts         # local + Google strategies
├── errors/ApiError.ts      # ApiError + BadRequest/NotFound/Conflict/Unauthorized/Forbidden
├── lib/                    # prisma, redis, nodemailer, s3 clients
├── middlewares/
│   ├── auth.ts             # auth(...roles) — token → role check → live user status check
│   ├── validator.ts        # validate(schema, 'body' | 'query' | 'params' | 'cookies')
│   ├── globalErrorHandler.ts
│   └── notFound.ts
├── modules/<name>/         # one folder per domain, five files each
│   ├── <name>.routes.ts        # Router: auth(...roles) + validate(...) + controller
│   ├── <name>.controllers.ts   # thin HTTP layer, catchAsync + sendResponse
│   ├── <name>.services.ts      # all business logic — the only layer touching Prisma/Redis/S3/axios
│   ├── <name>.validators.ts    # Zod schemas
│   └── <name>.interfaces.ts    # TS types for payloads and queries
├── templates/              # EJS emails — read at runtime from process.cwd(), NOT bundled
└── utils/                  # jwt, authToken, authCookie, catchAsync, sendResponse, seed
prisma/schema/*.prisma      # one file per domain, one generated client
generated/prisma/           # generated client (gitignored)
```

**Modules:** `auth`, `user`, `evaluator`, `reviews`, `assessments`, `payments`, `purchases`, `developer`, `admin`. The split is **by role** for dashboard/management surfaces (`/evaluator/*`, `/developer/*`, `/admin/*`) and **by resource** for shared ones (`/assessments` is the public catalog, `/purchases` and `/reviews` are developer-facing).

**Middleware order** in `src/app.ts` is deliberate:

```
cors → express.json → express.urlencoded → cookieParser → passport.initialize()
      → routes → notFound → globalErrorHandler
```

> **Deploying?** `src/templates/` must be present next to `dist/` — the EJS files are resolved relative to `process.cwd()` at runtime and are not bundled by tsup.

---

## Data model

`prisma/schema/` holds one file per domain, all feeding one generated client.

```
User ──< Auth                       (CREDENTIALS and/or GOOGLE per user)
 │
 ├──< Assessment (as creator)  ──< Attempt
 │                             ──< Purchase ──< Payment
 │                             ──< Review
 ├──< Purchase (as customer)
 ├──< Review
 └──< Attempt
```

**Enums**

| Enum               | Values                                                     |
| ------------------ | ---------------------------------------------------------- |
| `Role`             | `DEVELOPER`, `EVALUATOR`, `ADMIN`                          |
| `AuthProvider`     | `CREDENTIALS`, `GOOGLE`                                    |
| `UserStatus`       | `NOT_VERIFIED`, `VERIFIED`, `DELETED`, `SUSPENDED`         |
| `AssessmentStatus` | `DRAFT`, `PUBLISHED`, `ARCHIVED`, `DELETED`                |
| `PaymentStatus`    | `PENDING`, `SUCCESS`, `FAILED`, `CANCELLED`, `REFUNDED`    |
| `AttemptStatus`    | `IDLE`, `IN_PROGRESS`, `SUBMITTED`, `EVALUATED`, `EXPIRED` |

Table names are snake-cased via `@@map` on every model except `Assessment`.

### Assessment content shape

`questions` and `answers` are `Json` columns:

```jsonc
// questions
[
  {
    "id": "q1",
    "question": "Which keyword declares a block-scoped variable in JS?",
    "options": [
      { "id": "a", "text": "var" },
      { "id": "b", "text": "let" }
    ],
    "marks": 5
  }
]

// answers — one per question, value is an option id
[{ "questionId": "q1", "answer": "b" }]
```

Zod enforces unique question ids, exactly one answer per question, and that each answer matches a real option id. **The public catalog never selects `answers`**, so the key stays inside evaluator and scoring paths.

---

## API reference

Base path: **`/api/v1`**. Auth is the `accessToken` cookie or an `Authorization: Bearer <token>` header.

### `/auth`

| Method | Path               | Auth           | Description                                                                                                           |
| ------ | ------------------ | -------------- | --------------------------------------------------------------------------------------------------------------------- |
| POST   | `/register`        | —              | Hashes the password, parks the payload + a 6-digit OTP in Redis (5 min), emails the OTP. **Creates no DB row.**       |
| POST   | `/verify-email`    | —              | Consumes the OTP; creates the user or links a `CREDENTIALS` auth to an existing Google-only account. Returns tokens.  |
| POST   | `/login`           | —              | Passport local strategy; blocks `SUSPENDED`/`DELETED`. Sets cookies and returns tokens.                               |
| GET    | `/logout`          | —              | Clears auth cookies                                                                                                   |
| POST   | `/refresh-token`   | refresh cookie | Issues a new access token                                                                                             |
| GET    | `/google`          | —              | Starts the OAuth flow (`profile`, `email` scopes)                                                                     |
| GET    | `/google/callback` | —              | Links or creates a user (new ones get `DEVELOPER`), then redirects to `${FRONTEND_URL}/auth/success` with cookies set |
| POST   | `/forgot-password` | —              | Emails a reset OTP. Google-only accounts are rejected — no password to reset.                                         |
| POST   | `/reset-password`  | —              | Consumes the OTP and sets the new password                                                                            |

### `/users` — all roles

| Method | Path                 | Description                                                                                             |
| ------ | -------------------- | ------------------------------------------------------------------------------------------------------- |
| GET    | `/me`                | Current profile                                                                                         |
| PATCH  | `/me`                | Update `name`, `bio`, `profession`, `company`, `experience`, `skills`                                   |
| POST   | `/me/avatar/presign` | Body `{ contentType, fileSize }` — `image/jpeg\|png\|webp`, max 5 MB. Returns `{ uploadUrl, key, ... }` |
| PATCH  | `/me/avatar`         | Body `{ key }` — confirms the upload after the client `PUT`s to S3                                      |
| DELETE | `/me/avatar`         | Clears the avatar columns (the S3 object is left in place)                                              |
| DELETE | `/me`                | Soft-deletes the account                                                                                |

### `/assessments` — public catalog, no auth

| Method | Path                     | Description                                                                                                                          |
| ------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/`                      | `tags` (repeatable: `?tags=node&tags=react`), `minPrice`, `maxPrice`, `search`, `page`, `limit`, `sortBy=title\|price\|createdAt\|duration`, `sortOrder` |
| GET    | `/:assessmentId`         | Single assessment — **`answers` omitted**                                                                                            |
| GET    | `/:assessmentId/reviews` | `page`, `limit`, `sortBy=createdAt\|rating`, `sortOrder`                                                                             |

### `/evaluator` — `EVALUATOR`

| Method | Path                            | Description                                                                                                                                                            |
| ------ | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/dashboard`                    | Evaluator overview                                                                                                                                                     |
| POST   | `/assessment/thumbnail/presign` | Body `{ fileName, fileType }` (image mime)                                                                                                                             |
| POST   | `/assessment`                   | Create — `title`, `duration`, `price`, `passingPercentage` (1–100), `questions[]`, `answer[]`, optional `description`, `thumbnailKey`, `tags` (array of strings) |
| GET    | `/assessments`                  | Own list — `status`, `search`, `duration`, `minPrice`, `maxPrice`, pagination, sorting                                                                                 |
| GET    | `/assessments/:assessmentId`    | Full detail incl. answers — `EVALUATOR` or `ADMIN`                                                                                                                     |
| PATCH  | `/assessments/:assessmentId`    | Partial update; `status` may be set to `DRAFT`, `PUBLISHED`, or `ARCHIVED`                                                                                             |
| DELETE | `/assessments/:assessmentId`    | Soft delete (`status = DELETED` + `deletedAt`)                                                                                                                         |
| GET    | `/purchases`                    | Purchases of own assessments — `paymentStatus`, `assessmentId`, `customerId`, `search`, pagination                                                                     |
| GET    | `/purchases/:purchaseId`        | Single purchase                                                                                                                                                        |
| PATCH  | `/purchases/:purchaseId`        | Body `{ price }`                                                                                                                                                       |

### `/purchases` — `DEVELOPER` (list/read also `ADMIN`)

| Method | Path           | Description                                                                                                               |
| ------ | -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/`            | Body `{ assessmentIds: string[] }` — all must exist and be `PUBLISHED`. Creates purchase rows with **no money attached**. |
| GET    | `/`            | `paymentStatus`, `assessmentId`, `customerId`, `search`, pagination, sorting                                              |
| GET    | `/:purchaseId` | Single purchase with its assessment and payments                                                                          |

### `/payments`

| Method | Path          | Auth                        | Description                                                                                                                                                                                             |
| ------ | ------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/create`     | `DEVELOPER`                 | Body `{ purchaseId }` — opens an SSLCommerz session, stores a `PENDING` payment, returns `{ gatewayPageURL }`                                                                                           |
| POST   | `/confirm`    | **none — gateway callback** | Query `purchaseId`, `tranId`, `status=success\|fail\|cancel`. For `success` it re-validates server-side before flipping to `SUCCESS`, then redirects to `${FRONTEND_URL}/developer/payments?status=...` |
| GET    | `/`           | `DEVELOPER`                 | Payment history — `status`, pagination, `sortBy=createdAt\|amount\|paidAt`                                                                                                                              |
| GET    | `/:paymentId` | `DEVELOPER`                 | Single payment                                                                                                                                                                                          |

> Keep `POST /payments/confirm` unauthenticated — it is called by SSLCommerz, not by your client.

### `/developer` — `DEVELOPER`

| Method | Path                                  | Description                                                                         |
| ------ | ------------------------------------- | ----------------------------------------------------------------------------------- |
| GET    | `/dashboard`                          | Developer overview                                                                  |
| POST   | `/assessments/:assessmentId/evaluate` | Body `{ selectedAnswer: [{ questionId, answer }] }` — scores and records an attempt |
| GET    | `/assessments/:assessmentId/attempts` | `status`, pagination, `sortBy=createdAt\|score`                                     |

### `/reviews` — `DEVELOPER`

| Method | Path         | Description                                                                                       |
| ------ | ------------ | ------------------------------------------------------------------------------------------------- |
| POST   | `/`          | Body `{ purchaseId, rating (1–5), comment }` — requires an `EVALUATED` attempt on a paid purchase |
| GET    | `/`          | Own reviews — `search`, pagination, `sortBy=createdAt\|rating`                                    |
| GET    | `/:reviewId` | Single review                                                                                     |
| PATCH  | `/:reviewId` | Update `rating` and/or `comment`                                                                  |
| DELETE | `/:reviewId` | Soft delete (`deletedAt`)                                                                         |

### `/admin` — `ADMIN`

| Method | Path                    | Description                                                             |
| ------ | ----------------------- | ----------------------------------------------------------------------- |
| GET    | `/dashboard`            | Platform-wide overview                                                  |
| GET    | `/users`                | `role`, `status`, `search`, pagination, `sortBy=createdAt\|name\|email` |
| GET    | `/users/:userId`        | Single user                                                             |
| PATCH  | `/users/:userId/status` | Body `{ status }` — `NOT_VERIFIED`, `VERIFIED`, or `SUSPENDED`          |
| GET    | `/assessments`          | `status`, `creatorId`, `tags`, `search`, pagination                     |
| GET    | `/purchases`            | `paymentStatus`, `assessmentId`, `customerId`, `search`, pagination     |

---

## Core flows

### Registration

```
POST /auth/register  →  password hashed, payload + OTP stored in Redis (5 min TTL), OTP emailed
POST /auth/verify-email  →  OTP consumed  →  User created (or CREDENTIALS auth linked)  →  tokens returned
```

### Purchase → payment → access

```
POST /purchases            → Purchase row, no money attached
POST /payments/create      → tran_id = TRNX_<purchaseId>_<timestamp>
                             SSLCommerz session opened, PENDING Payment stored
                             → { gatewayPageURL }
   client redirects to the gateway page
POST /payments/confirm     → gateway callback; success is re-validated server-side
                             → payment SUCCESS → redirect to the frontend
```

**A purchase only counts as paid when it has a payment with status `SUCCESS`.** The predicate

```ts
payments: {
  some: {
    status: PaymentStatus.SUCCESS;
  }
}
```

is the canonical "this developer owns this assessment" check across the purchases, developer, and dashboard services. Never treat a bare `Purchase` row as entitlement.

### S3 uploads — presign, then confirm

Two round trips; the API never handles file bytes.

```
POST /users/me/avatar/presign            →  { uploadUrl, key, avatarUrl, expiresInSeconds }
PUT  <uploadUrl>                         →  client uploads straight to S3
PATCH /users/me/avatar  { key }          →  key validated and persisted
```

Same shape for `POST /evaluator/assessment/thumbnail/presign` → `thumbnailKey` on create/update.

Keys are namespaced per user — `${userId}/avatar/<uuid>.<ext>` and `${creatorId}/assessments/<uuid>-<filename>` — and every consumer re-checks the prefix before persisting, so one user can't claim another's object. `avatarKey`/`thumbnailKey` are stored but stripped from responses; only the public URL is exposed.

### Evaluation

There is no start/submit endpoint — **attempts are created only at evaluation time**. `POST /developer/assessments/:assessmentId/evaluate` verifies the assessment is `PUBLISHED` and paid for, checks every question is answered exactly once with a valid option id, scores against the answer key, and creates one `Attempt` with `startedAt`/`endedAt`/`submittedAt`/`evaluatedAt` all set to now and status `EVALUATED`.

The other `AttemptStatus` values (`IDLE`, `IN_PROGRESS`, `SUBMITTED`, `EXPIRED`) exist in the schema but nothing writes them — treat the timed-attempt lifecycle as unimplemented.

### Soft deletes, two mechanisms

- `Assessment` — `status = DELETED` + `deletedAt`; queries filter on `status`.
- `User` and `Review` — a `deletedAt` timestamp; review queries must carry `deletedAt: null`.

There is no Prisma middleware doing this. **Every query filters explicitly.**

---

## Response conventions

Every response goes through `sendResponse` (`src/utils/sendResponse.ts`):

```jsonc
{
  "success": true,
  "statusCode": 200,
  "message": "Assessments retrieved successfully",
  "data": [
    /* ... */
  ],
  "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }, // list endpoints only
}
```

Every async handler is wrapped in `catchAsync` so throws reach `globalErrorHandler`. Errors are `ApiError` subclasses — `BadRequestError`, `NotFoundError`, `ConflictError`, `UnauthorizedError`, `ForbiddenError` — and error responses use the same envelope with `success: false`.

**Pagination is hand-rolled per service**, not shared. Each list service destructures `{ page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' }`, computes `skip`, runs `Promise.all([findMany, count])`, and returns `{ <items>, meta }` for the controller to pass to `sendResponse`. Copy that shape when adding a list endpoint.

### Adding a module

Follow the five-file layout exactly:

1. `<name>.validators.ts` — Zod schemas
2. `<name>.interfaces.ts` — service payload/query types
3. `<name>.services.ts` — business logic; the only layer touching Prisma/Redis/S3/axios
4. `<name>.controllers.ts` — `catchAsync` + `sendResponse`, nothing more
5. `<name>.routes.ts` — `auth(...roles)` + `validate(schema, source)` + controller; export a named router

Then mount the router in `src/app.ts` under `/api/v1`.

Two conventions worth repeating:

- **Scope ownership in the `where` clause** — look records up by `{ id, customerId }` / `{ id, creatorId }` so another user's record 404s instead of 403s. Don't fetch then compare.
- **Role checks live in the route definition.** Services trust `req.user.role` passed down as an argument.

---

## Deployment

`vercel.json` builds `dist/server.js` with `@vercel/node` and routes everything to it, so `npm run build` must run first.

Checklist:

- [ ] `npm run build` produces `dist/`
- [ ] `src/templates/` ships alongside `dist/` — EJS files are read at runtime from `process.cwd()`
- [ ] `generated/prisma` is regenerated in the build environment (`npx prisma generate`)
- [ ] `BACKEND_API_URL` points at the public deployment — SSLCommerz callbacks depend on it
- [ ] `NODE_ENV=production` so auth cookies are `secure` + `sameSite: none`
- [ ] Postgres, Redis, and SMTP are all reachable — the server exits on startup if any of them fails

---

## Author

- Rezoan Shakil Prince
- Senior Software Engineer (SSE)
- BJIT Ltd.
