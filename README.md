# Finlo V2

A personal finance management web app that connects to your bank accounts via Plaid to track spending, budgets, goals, and transfers.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Auth | JWT (access + refresh tokens), Passport.js |
| Banking | Plaid API |
| Payments | Stripe |
| Email | Nodemailer (Brevo SMTP) |
| State | Zustand + TanStack Query |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Icons | Heroicons |
| Validation | class-validator + class-transformer |
| Security | Helmet (HTTP headers), NestJS Throttler (rate limiting) |
| Logging | Winston |

---

## Project Structure

```
FinloV2/
├── backend/          # NestJS API (port 3000)
│   ├── src/
│   │   ├── app/          # Root module (AppModule)
│   │   ├── auth/         # Login, register, JWT, email verification, password reset
│   │   ├── users/        # User profile management
│   │   ├── connections/  # Plaid bank connections (link token, exchange, sync)
│   │   ├── accounts/     # Bank accounts synced from Plaid
│   │   ├── transactions/ # Transaction history & categorization
│   │   ├── budgets/      # Monthly budgets per category
│   │   ├── goals/        # Savings goals & contributions
│   │   ├── transfers/    # Peer-to-peer transfers between users
│   │   ├── investments/  # Investment tracking
│   │   ├── notifications/# In-app notifications
│   │   ├── health/       # Health check endpoint (GET /health)
│   │   ├── providers/    # Plaid & Stripe service providers
│   │   └── common/       # Shared utilities
│   │       ├── errors/       # Global exception filters
│   │       ├── logger/       # Winston logger service
│   │       ├── mailer/       # Nodemailer email service
│   │       ├── pagination/   # Cursor/offset pagination helpers
│   │       ├── prisma/       # Prisma client provider
│   │       └── throttle/     # Rate-limit decorators
│   └── prisma/
│       └── schema.prisma # Database schema
└── frontend/         # React app (port 5173)
    └── src/
        ├── pages/        # auth, dashboard, accounts, transactions, budgets, goals, investments, transfer
        ├── components/   # Shared UI components (charts, layout, plaid, ui)
        ├── hooks/        # Custom React hooks (per feature)
        ├── store/        # Zustand global state (auth)
        └── lib/          # Axios API client
```

---

## Prerequisites

- Node.js 18+
- PostgreSQL running locally
- Plaid account (sandbox credentials)
- (Optional) Brevo account for email, Stripe account for payments

---

## Setup

### 1. Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

### 2. Configure environment variables

**`backend/.env`**
```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/FinloV2?schema=public"
JWT_SECRET="your-jwt-secret"
JWT_ACCESS_TTL="15m"
JWT_REFRESH_TTL_MS="2592000000"
APP_URL="http://localhost:5173"
PORT=3000

# Email (Brevo)
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT=587
SMTP_USER="your-brevo-email@example.com"
SMTP_PASS="your-brevo-smtp-key"
MAIL_FROM="no-reply@finlo.ca"
MAIL_FROM_NAME="Finlo"

# Plaid
PLAID_CLIENT_ID="your-client-id"
PLAID_SECRET="your-sandbox-secret"
PLAID_ENV="sandbox"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### 3. Set up the database

```bash
cd backend

# Run migrations
npm run prisma:migrate

# Generate Prisma client
npm run prisma:generate
```

### 4. Start the app

Open two terminals:

```bash
# Terminal 1 — Backend (http://localhost:3000)
cd backend && npm run start:dev

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend && npm run dev
```

---

## Available Scripts

### Backend

| Command | Description |
|---|---|
| `npm run start:dev` | Start with hot reload (development) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run compiled production build |
| `npm run prisma:migrate` | Apply database migrations |
| `npm run prisma:generate` | Regenerate Prisma client after schema changes |
| `npm run prisma:studio` | Open Prisma Studio (visual DB browser) |

### Frontend

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |

---

## Database Models

| Model | Description |
|---|---|
| `User` | App users with email/password auth |
| `RefreshToken` | Stored hashed refresh tokens |
| `EmailToken` | Tokens for email verification & password reset |
| `Connection` | Plaid bank connections per user |
| `Account` | Bank accounts pulled from Plaid |
| `Transaction` | Transactions synced from Plaid |
| `Category` | Transaction categories (default set seeded) |
| `Budget` | Monthly spending budgets per category |
| `Goal` | Savings goals with contribution history |
| `GoalContribution` | Individual contributions toward a goal |
| `Transfer` | Peer-to-peer transfers between Finlo users |
| `Notification` | In-app notifications |

---

## Plaid Integration

This project uses Plaid in **sandbox** mode by default. To test bank linking:

1. Log in and navigate to Connections
2. Click "Link Account" — Plaid Link will open
3. Use sandbox credentials: `user_good` / `pass_good`
4. Accounts and transactions will sync automatically

To switch to production, update `PLAID_ENV=production` and `PLAID_SECRET` to your production secret in `backend/.env`.
