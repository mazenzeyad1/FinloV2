# Finlo

A personal finance app that connects to your bank accounts via Plaid, automatically categorizes transactions using AI, and helps you track budgets and savings goals.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL (Neon) via Prisma ORM |
| Auth | JWT (access + refresh tokens), Passport.js |
| Banking | Plaid API |
| AI Categorization | Groq API (Llama 3.1 — free tier) |
| Email | Nodemailer (Brevo SMTP) |
| Payments | Stripe |
| State | Zustand + TanStack Query |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Icons | Heroicons |
| Security | Helmet, NestJS Throttler |
| Logging | Winston |
| Hosting | Vercel (frontend) + Render (backend) |

## Project Structure

```
FinloV2/
├── backend/          # NestJS API (port 3000)
│   ├── src/
│   │   ├── app/              # Root module
│   │   ├── auth/             # Login, register, JWT, email verification, password reset
│   │   ├── users/            # User profile management
│   │   ├── connections/      # Plaid bank connections + transaction sync + AI categorization
│   │   ├── accounts/         # Bank accounts synced from Plaid
│   │   ├── transactions/     # Transaction history & manual category edits
│   │   ├── budgets/          # Monthly budgets per category
│   │   ├── goals/            # Savings goals & contributions
│   │   ├── transfers/        # Peer-to-peer transfers between users
│   │   ├── investments/      # Investment tracking
│   │   ├── notifications/    # In-app notifications
│   │   ├── health/           # GET /health
│   │   ├── providers/plaid/  # Plaid SDK service
│   │   └── common/
│   │       ├── ai/           # Groq AI categorizer service
│   │       ├── mailer/       # Brevo SMTP email service
│   │       ├── prisma/       # Prisma client
│   │       └── logger/       # Winston logger
│   └── prisma/
│       ├── schema.prisma     # Database schema
│       └── seed.ts           # Default categories seed
└── frontend/         # React app (port 5174)
    └── src/
        ├── pages/        # auth, dashboard, accounts, transactions, budgets, goals
        ├── components/   # Layout, charts, Plaid Link, shared UI
        ├── hooks/        # TanStack Query hooks per feature
        ├── store/        # Zustand auth store
        └── lib/          # Axios API client
```

## Prerequisites

- Node.js 20+
- A PostgreSQL database (local or [Neon](https://neon.tech) free tier)
- [Plaid](https://plaid.com) developer account (sandbox is free)
- [Groq](https://console.groq.com) API key (free)
- [Brevo](https://brevo.com) account for email (free tier)

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure backend environment

```bash
cp backend/.env.example backend/.env
```

Fill in `backend/.env`:

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret"
JWT_ACCESS_TTL="15m"
JWT_REFRESH_TTL_MS="2592000000"
APP_URL="http://localhost:5174"
FRONTEND_URL="http://localhost:5174"
PORT=3000

SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT=587
SMTP_USER="..."
SMTP_PASS="..."
MAIL_FROM="no-reply@finlo.ca"
MAIL_FROM_NAME="Finlo"

PLAID_CLIENT_ID="..."
PLAID_SECRET="..."
PLAID_ENV="sandbox"

GROQ_API_KEY="gsk_..."   # free at console.groq.com

STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### 3. Set up the database

```bash
npm --workspace backend run prisma:migrate
npm --workspace backend run prisma:generate
npm --workspace backend run prisma:seed
```

### 4. Start the app

```bash
npm run dev
```

Frontend: `http://localhost:5174` — Backend: `http://localhost:3000`

## Scripts

### Root (runs both)

| Command | Description |
|---|---|
| `npm run dev` | Start backend + frontend together |

### Backend

| Command | Description |
|---|---|
| `npm run start:dev` | Hot-reload dev server |
| `npm run build` | Compile to `dist/` |
| `npm run start` | Run production build |
| `npm run prisma:migrate` | Apply migrations |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:seed` | Seed default categories |
| `npm run prisma:studio` | Open Prisma Studio |

### Frontend

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## Transaction Categorization

Transactions are categorized automatically on every sync using a 4-pass pipeline:

1. **Plaid detailed category** — `personal_finance_category.detailed` field (most accurate)
2. **Plaid legacy category** — `category[]` array fallback
3. **Keyword matching** — description + merchant name against a keyword map
4. **AI fallback** — Groq (Llama 3.1) classifies anything still uncategorized

Users can also manually override any category from the transaction detail drawer.

## Plaid Sandbox Testing

1. Go to **Accounts** → **Connect Bank**
2. In Plaid Link, use credentials: `user_good` / `pass_good`
3. Accounts and 90 days of transactions sync automatically

To switch to production: set `PLAID_ENV=production` and update `PLAID_SECRET` in your env.

## Deployment

### Backend (Render)

- Connect the repo to Render, set root directory to `backend/`
- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Add all `backend/.env` variables in the Render dashboard

### Frontend (Vercel)

- Connect the repo to Vercel, set root directory to `frontend/`
- `vercel.json` rewrites `/api/*` → Render backend URL to avoid CORS

## Database Models

| Model | Description |
|---|---|
| `User` | App users |
| `RefreshToken` | Hashed refresh tokens |
| `EmailToken` | Email verification & password reset tokens |
| `Connection` | Plaid bank connections |
| `Account` | Bank accounts from Plaid |
| `Transaction` | Synced transactions with category assignments |
| `Category` | Transaction categories (seeded defaults) |
| `Budget` | Monthly spending limits per category |
| `Goal` | Savings goals |
| `GoalContribution` | Individual goal contributions |
| `Transfer` | Peer-to-peer transfers |
| `Notification` | In-app notifications |
