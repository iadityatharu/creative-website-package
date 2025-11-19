# Plaza Sales API

Plaza Sales is a TypeScript-based REST API that powers a product catalogue, content management, and analytics platform.  
It exposes role-aware endpoints for administering brands, categories, products, inquiries, blogs, and more while
integrating with PostgreSQL (TypeORM), Redis caching/queues, Cloudflare R2 for media, and BullMQ-powered email
notifications.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Installation](#installation)
  - [Run Locally](#run-locally)
  - [Docker Compose](#docker-compose)
- [Available Scripts](#available-scripts)
- [API Surface](#api-surface)
  - [Authentication](#authentication)
  - [User Administration](#user-administration)
  - [Catalogue Management](#catalogue-management)
  - [Content \& Communication](#content--communication)
  - [Media \& Downloads](#media--downloads)
  - [Analytics](#analytics)
  - [Utility Endpoints](#utility-endpoints)
- [Testing](#testing)
- [Background Jobs](#background-jobs)
- [Troubleshooting](#troubleshooting)

---

## Features

- **Role-based Auth**: Access tokens, refresh tokens, and password history enforcement that blocks password reuse for six months.
- **Comprehensive CMS** for brands, categories, products, blogs, FAQs, team members, careers, and marketing assets.
- **Lead Management** with inquiries, replies, and contacts plus Excel/PDF export pipelines.
- **Document & Media Handling** with Cloudflare R2 uploads, validation, and deletion utilities.
- **Analytics APIs** to surface aggregated brand, category, user, and SEO metrics.
- **Redis-backed caching** and **rate limiting** to keep responses fast and resilient to abuse.
- **Email queue** powered by BullMQ for background delivery of transactional messages.
- **Developer friendly tooling** including Jest test harness, seeding utilities, and Docker compose for local stacks.

## Tech Stack

- **Runtime**: Node.js (TypeScript, Express 5)
- **Database**: PostgreSQL with TypeORM
- **Caching & Queues**: Redis + BullMQ
- **Storage**: Cloudflare R2 (S3 compatible)
- **Messaging**: Nodemailer (SMTP)
- **Utilities**: ExcelJS, pdfmake, pdfkit, class-validator, socket.io

## Architecture Overview

```
┌────────────┐     ┌───────────────┐     ┌─────────────┐
│ Express API ├────► Service Layer ├────► TypeORM Repos │
└──────┬─────┘     └──────┬────────┘     └────┬────────┘
       │                  │                   │
       │                  │                   │
       │        ┌─────────▼────────┐     ┌────▼─────┐
       │        │ Validation & DTO │     │ Entities │
       │        └─────────┬────────┘     └────┬─────┘
       │                  │                   │
       │                  │                   │
       │        ┌─────────▼────────┐     ┌────▼───────┐
       └──────► │ Middleware Stack │◄────┤ Redis/R2    │
                └─────────┬────────┘     └────────────┘
                          │
                     ┌────▼────┐
                     │ BullMQ  │
                     └─────────┘
```

## Project Structure

```
src/
 ├─ configs/           # App bootstrap, database, redis, file uploads, sockets
 ├─ constant/          # Shared enums, interfaces, status codes
 ├─ controller/        # HTTP controllers translating requests → services
 ├─ dto/               # class-validator DTOs for input validation
 ├─ entities/          # TypeORM entities
 ├─ middleware/        # Auth, rate limiting, request validation, etc.
 ├─ routes/            # Express routers grouped by domain
 ├─ service/           # Business logic & data access
 ├─ utils/, functions/ # Helpers, mail templates, redis cache utilities
 └─ index.ts           # Entry point / server bootstrap
```

## Getting Started

### Prerequisites

- Node.js **18+**
- pnpm **9+**
- PostgreSQL **15+**
- Redis **7+**
- Cloudflare R2 (or any S3-compatible storage) credentials
- SMTP account for outbound email (Gmail supported by default)

> Use the provided `docker-compose.yml` to provision Postgres + Redis quickly if you do not have local instances.

### Environment Variables

Create a `.env` file in the project root. The application expects the following keys:

```env
# Server
NODE_ENV=development
SERVER_PORT=5436
ALLOWED_ORIGINS=http://localhost:5173

# PostgreSQL
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=

# Redis
REDIS_HOST=
REDIS_PORT=

# Auth
ACCESS_TOKEN_SECRET=replace-me
ACCESS_TOKEN_EXPIRES_IN=30m
REFRESH_TOKEN_SECRET=replace-me
REFRESH_TOKEN_EXPIRES_IN=7d
DASHBOARD_URL=https://dashboard.example.com

# Cloudflare R2
R2_ACCOUNT_ID=xxxxxxxxxxxxxxx
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxx
R2_BUCKET=plaza-sales
R2_PUBLIC_BASE_URL=https://cdn.example.com/

# Email / SMTP
SMTP_USER=your-address@gmail.com
SMTP_PASS=app-password

# Optional
RECAPTCHA_SECRET_KEY=xxxxxxxxxxxxxxxx
```

### Installation

```bash
pnpm install
```

### Run Locally

```bash
# dev server with auto reload
pnpm dev

# compile TypeScript
pnpm build

# production server (build + start)
pnpm start
```

The API is served under `http://localhost:5436/api/v1/creative`.

### Docker Compose

To spin up Postgres, Redis, and the published backend container:

```bash
docker compose up -d
```

The compose file mounts a persistent volume for Postgres and health-checks all services.

## Available Scripts

| Script           | Description                                      |
|------------------|--------------------------------------------------|
| `pnpm dev`       | Run TypeScript sources with `ts-node-dev`        |
| `pnpm build`     | Compile TypeScript into `dist/`                  |
| `pnpm start`     | Build then run compiled server                   |
| `pnpm seed`      | Execute `src/seeder/runSeeder.ts` (if implemented) |
| `pnpm test`      | Execute Jest test suite                          |
| `pnpm test:watch`| Watch tests                                      |
| `pnpm test:coverage` | Generate coverage reports                    |

## API Surface

All routes are available under `https://{host}:{port}/api/v1/creative`.  
Authentication uses cookies populated with `accessToken` and `refreshToken`.

### Authentication

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST   | `/auth/signup` | Register a new user (supports profile upload) | Public |
| POST   | `/auth/signin` | Login and issue tokens | Public |
| POST   | `/auth/forgot-password` | Generate reset email | Public |
| PATCH  | `/auth/reset-password` | Reset password with token (blocks reuse in 6 months) | Public |
| PATCH  | `/auth/change-password` | Change password (requires old password, reuse blocked) | Authenticated & verified |
| DELETE | `/auth/logout` | Invalidate refresh token | Authenticated & verified |

### User Administration

`/admin` endpoints require `authentication`, `isVerifiedUser`, and `isAdmin`.

| Method | Path | Description |
|--------|------|-------------|
| POST   | `/admin/create-users` | Create admins/operators (optional profile upload) |
| GET    | `/admin/get-all-users` | Paginated user list |
| GET    | `/admin/get-users/:id` | Fetch user detail |
| PUT    | `/admin/update-users/:id` | Update user profile |
| DELETE | `/admin/delete-users/:id` | Soft delete users |

### Catalogue Management

Most catalogue routes accept file uploads and require admin privileges for mutations.

#### Categories (`/category`)
`create-category`, `update-category/:id`, `get-all-categories`, `get-category/:identifier`, `delete-category/:id`

#### Subcategories (`/subcategory`)
Similar CRUD interface to categories.

#### Products (`/product`)

| Method | Path | Notes |
|--------|------|-------|
| POST   | `/product/create-product` | Upload cover, detail images, manuals, brochures |
| PUT    | `/product/update-product/:id` | Updates metadata & media |
| GET    | `/product/get-all-products` | Public list with pagination & search |
| GET    | `/product/get-product/:identifier` | Fetch by ID or slug. Includes similar products (max 8). |
| GET    | `/product/export/excel` | Generates formatted Excel catalogue (admin) |
| GET    | `/product/export/pdf` | Generates PDF catalogue (admin) |
| DELETE | `/product/delete-product/:id` | Remove product |
| GET    | `/product/stats` | Summary statistics |

### Content & Communication

- **Inquiries (`/inquiry`)**: create-inquiry (public), list/export/update/delete (admin).
- **Replies (`/reply`)**: manage follow-ups to inquiries.
- **Contacts (`/contact`)**: capture public contact form submissions.
- **Careers (`/career`)**: CRUD job postings.
- **Applications (`/application`)**: accept job applications with resume/cover uploads.
- **Team (`/team`)**: manage team member bios and images.
- **FAQ (`/faq`)**: publish frequently asked questions.
- **Blog (`/blog`)**: manage blog posts with media galleries.
- **Video (`/video`)**: manage marketing videos and metadata.

All management routes follow the pattern:

- `POST /create-*`
- `PUT /update-*/:id`
- `GET /get-all-*`
- `GET /get-*/:id` or `/get-*/:slug`
- `DELETE /delete-*/:id`

Public submission routes (contact, inquiry, application) omit auth middleware.

### Media & Downloads

- **Gallery (`/gallery`)**: Upload/delete gallery images tied to products.
- **Download Categories (`/download-category`)**: Categorise downloadable assets.
- **Product Downloads (`/product-download`)**: Manage PDF/manual downloads by category.

Routes mirror standard CRUD structure and all POST/PUT operations accept multipart uploads handled by Cloudflare R2.

### SEO Metadata (`/seo-metadata`)

Manage SEO tags for multiple entity types (create, update, list, delete).

### Analytics

All analytics endpoints require admin access.

| Module | Base Path | Description |
|--------|-----------|-------------|
| Category Analytics | `/analytics/category` | Category distribution & usage stats |
| SEO Analytics | `/analytics/seo` | Page level SEO performance tracking |
| User Analytics | `/analytics/user` | Signup, activity, and retention metrics |

Each module exposes listing endpoints such as `/metrics`, `/top`, `/overview` (see individual route files for precise signatures).

### Utility Endpoints

- `GET /api/v1/creative` (health check) returns a timestamp and environment status.

## Testing

```bash
pnpm test         # run all tests
pnpm test:watch   # watch mode
pnpm test:coverage
```

Tests live under `tests/` and can be extended with Supertest to perform full request/response validation.  
When writing API tests ensure the database and Redis are running; use the Docker compose stack or local services.

## Background Jobs

Email notifications are enqueued into `email-queue` (BullMQ). The worker boots automatically with the app:

- Requires Redis connectivity (as configured in `redis.config.ts`).
- Uses Gmail SMTP via `SMTP_USER`/`SMTP_PASS` credentials.
- Any failures raise application errors logged through the worker event handlers.

## Troubleshooting

| Issue | Resolution |
|-------|------------|
| `Database connection failed` | Verify PostgreSQL credentials and that the DB is reachable. |
| `R2_PUBLIC_BASE_URL environment variable is not set` | Ensure all R2-related variables are present in `.env`. |
| CORS errors | Add your origin to `ALLOWED_ORIGINS` (comma-separated). |
| Reset/change password fails with `Password used in last 6 months` | Choose a password that has not been used recently; history is enforced automatically. |
| Emails not sending | Confirm Redis is running and SMTP credentials are valid (app logs worker failures). |

---

**Next Steps:**  
Use the provided route documentation alongside Postman or curl to exercise each endpoint. Apply migrations/seeding as needed, run the Jest suite before deploying, and keep secrets out of version control. Contributions should follow the existing DTO + service + controller pattern.
