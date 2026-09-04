<img width="1509" height="858" alt="Screenshot 2026-08-31 at 8 33 10 PM" src="https://github.com/user-attachments/assets/cb179cb3-643c-4662-bd08-b6eb2009f63a" />
<img width="1509" height="858" alt="Screenshot 2026-08-31 at 8 34 20 PM" src="https://github.com/user-attachments/assets/762d453c-51cc-49d6-a3a6-de2cbe665764" />
<img width="1509" height="858" alt="Screenshot 2026-08-31 at 8 35 09 PM" src="https://github.com/user-attachments/assets/cc1258f9-2c96-4feb-b646-01304ee7a031" />
<img width="1509" height="858" alt="Screenshot 2026-08-31 at 8 34 42 PM" src="https://github.com/user-attachments/assets/4a9b993d-50b8-40e4-8da6-29321f2fe84c" />
## Quantus

Quantus is a production-grade B2B CRM MVP built specifically for high-net-worth treasury management, private banking, and institutional sales teams.

**The Problem:**
Generic SaaS CRMs are often visually bloated, overly complex, and lack strict out-of-the-box data isolation for highly sensitive financial data. Institutional sales teams need a fast, premium-feeling interface that strictly enforces process compliance and data privacy without overwhelming the user with unnecessary generic features.

## Features

*   **Role-Based Access Control**:
    *   **Sales Reps**: Can only view and modify leads, opportunities, and customers assigned to them.
    *   **Sales Managers**: Have full visibility across the team, can reassign records, and view team performance dashboards.
*   **Validated Pipeline State Machine**: Deals progress through an enforced state machine (e.g., cannot skip from NEW straight to WON; deal value must be > 0 to move past QUALIFIED).
*   **Lead Management & Conversion**: Track leads and convert qualified leads into Customers and Opportunities.
*   **Activity Tracking**: Log notes, calls, meetings, emails, and follow-ups against customers and opportunities.
*   **Dashboard Analytics**: Real-time metrics on pipeline value, conversion rates, and task tracking.
*   **Trading Floor Editorial Design**: High-contrast, typography-driven UI (Newsreader/IBM Plex Sans fonts, ivory linen background, sharp edges) deliberately diverging from generic SaaS templates. Includes sleek animated UI elements (like frosted glass login cards).

## Tech Stack

*   **Frontend**: React + Vite + TypeScript + Tailwind CSS (Custom Design System configuration)
*   **Backend**: Node.js + Express + TypeScript
*   **Database**: PostgreSQL
*   **ORM**: Prisma
*   **Authentication**: JWT-based (bcrypt password hashing)
*   **Validation**: Zod
*   **Testing**: Jest + Supertest

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture diagrams and authorization design decisions.

## Database

See [DATABASE.md](./DATABASE.md) for the entity-relationship diagram and indexing rationale.

## API Documentation

See [API.md](./API.md) for complete REST API endpoint documentation.

## Setup & Local Run Instructions

### Prerequisites
*   Node.js (v24+)
*   PostgreSQL (v17+)

### 1. Database Setup
Ensure PostgreSQL is running, then create the database:
```bash
createdb pipelineiq
```

### 2. Backend Setup
```bash
cd server
npm install

# Create .env file with your database URL and JWT secret
echo 'DATABASE_URL="postgresql://<your_user>@localhost:5432/pipelineiq"\nJWT_SECRET="dev-secret"\nPORT=3002' > .env

# Run migrations and seed data
npm run db:migrate
npm run db:seed

# Start the dev server
npm run dev
```

### 3. Frontend Setup
```bash
cd client
npm install

# Start the dev server (proxies API requests to backend)
npm run dev
```

The application will be available at `http://localhost:5175`.

### 4. Running Tests
```bash
cd server
npm test
```
The test suite covers authentication, ownership authorization (reps cannot access other reps' data), validation, the pipeline state machine, and dashboard aggregation.

## Demo Credentials

The database seed script generates the following users (All passwords are `password123`):

*   **Manager Role** (Full access, team views, reassignment ability):
    *   `manager1@pipelineiq.com`
    *   `manager2@pipelineiq.com`
*   **Sales Rep Role** (Isolated access to own data only):
    *   `rep1@pipelineiq.com`
    *   `rep2@pipelineiq.com`
    *   `rep3@pipelineiq.com`
    *   `rep4@pipelineiq.com`

## Key Assumptions & Design Decisions

1.  **Auth Transport**: JWTs are transmitted via the `Authorization: Bearer <token>` header rather than `httpOnly` cookies. This simplifies the SPA architecture and local development proxy setup for the MVP while remaining secure over HTTPS.
2.  **Unauthorized Access Status Code**: When a rep attempts to access a record they do not own, the API returns **403 Forbidden** rather than 404 Not Found. This explicitly signals "this record exists, but you lack permission" which is appropriate and transparent for an internal company tool, whereas a 404 would be needlessly opaque.
3.  **Pipeline Transitions**: A deal can move forward exactly one stage at a time, or regress backward to any previous non-terminal stage. WON and LOST are terminal states. This reflects real-world sales where deals progress incrementally but can regress freely if roadblocks occur.
4.  **Lead Status vs. Pipeline Stage**: Leads represent individuals/companies (NEW -> QUALIFIED). Once a lead is QUALIFIED and there is a concrete deal, it is converted into an Opportunity (NEW -> WON) and a Customer profile.

## Known Limitations & Future Improvements

*   **No Multi-Tenancy**: Built for a single organization (B2B CRM). Multi-tenant support would require extending schemas with `tenant_id`.
*   **Activity Due Date Timezones**: Currently handles dates generically; robust timezone support for global teams is deferred.
*   **File Attachments**: No document storage for proposals/contracts in the MVP.
