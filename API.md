# API Documentation

All endpoints expect JSON request bodies and return JSON responses.
Protected endpoints require a JWT token passed in the `Authorization: Bearer <token>` header.

## Authentication

### `POST /api/auth/login`
Authenticates a user and returns a token.

**Request Body:**
```json
{
  "email": "rep1@pipelineiq.com",
  "password": "password123"
}
```

**Success Response (200 OK):**
```json
{
  "token": "eyJhbGciOi...",
  "user": {
    "id": "uuid",
    "email": "rep1@pipelineiq.com",
    "name": "Alex Rivera",
    "role": "SALES_REP"
  }
}
```

**Error Responses:**
*   `400 Bad Request`: Invalid email/password format.
*   `401 Unauthorized`: `{"error": "Invalid credentials"}`

---

## Leads

*Reps only see/modify leads assigned to them. Managers see/modify all leads.*

### `GET /api/leads`
Lists leads. Supports query params: `?status=QUALIFIED&search=Acme`.
**Auth:** Rep or Manager

### `GET /api/leads/:id`
Gets a specific lead.
**Auth:** Rep or Manager
**Errors:** `403 Forbidden` if Rep tries to view unowned lead; `404 Not Found`.

### `POST /api/leads`
Creates a new lead.
**Auth:** Rep or Manager
**Request Body:**
```json
{
  "companyName": "New Corp",
  "contactName": "Jane Doe",
  "contactEmail": "jane@newcorp.com",
  "source": "Website"
}
```
*Note: Reps can optionally pass `assignedTo` but it must equal their own ID. Managers can pass any Rep ID.*

### `PUT /api/leads/:id`
Updates a lead.
**Auth:** Rep or Manager (Rep must own lead)
*Note: Only Managers can update the `assignedTo` field to reassign a lead.*

### `POST /api/leads/:id/convert`
Converts a lead into a Customer. The lead must have `status === 'QUALIFIED'`.
**Auth:** Rep or Manager (Rep must own lead)
**Errors:** `409 Conflict` if status is not QUALIFIED.

---

## Opportunities

*Reps only see/modify opportunities assigned to them.*

### `GET /api/opportunities`
Lists opportunities. Supports query params: `?stage=NEGOTIATION&search=Acme`.
**Auth:** Rep or Manager

### `POST /api/opportunities`
Creates a new deal.
**Auth:** Rep or Manager (Rep must own the associated lead)
**Request Body:**
```json
{
  "title": "Enterprise License",
  "dealValue": 50000,
  "leadId": "lead-uuid"
}
```

### `PUT /api/opportunities/:id/stage`
Moves a deal through the pipeline state machine.
**Auth:** Rep or Manager (Rep must own opportunity)

**Request Body:**
```json
{
  "stage": "CONTACTED"
}
```
**Errors:**
*   `409 Conflict`: If the transition is invalid (e.g. jumping stages), or if moving past QUALIFIED with a deal value of 0, or if trying to move out of a terminal stage (WON/LOST).

---

## Dashboard

### `GET /api/dashboard/metrics`
Returns aggregated metrics for the dashboard (total leads, pipeline value, conversion rate).
**Auth:** Rep or Manager (Reps only get metrics calculated from their own data).

### `GET /api/dashboard/pipeline-summary`
Returns opportunity counts and sums grouped by pipeline stage.
**Auth:** Rep or Manager.

### `GET /api/dashboard/team-performance`
Returns performance stats grouped by sales rep.
**Auth:** Manager ONLY.
**Errors:** `403 Forbidden` if requested by a Rep.

---

## Activities & Customers
Standard CRUD endpoints exist for `/api/customers`, `/api/contacts`, and `/api/activities` following the same ownership rules: Reps can only access records tied to entities they own.
