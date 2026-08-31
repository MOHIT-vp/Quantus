# Database Design

PipelineIQ uses a strictly relational PostgreSQL database schema managed by Prisma ORM.

## Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ LEAD : "assigned_to"
    USER ||--o{ OPPORTUNITY : "assigned_to"
    USER ||--o{ CUSTOMER : "assigned_to"
    USER ||--o{ ACTIVITY : "created_by"

    LEAD ||--o{ OPPORTUNITY : "originates_from"
    LEAD |o--o| CUSTOMER : "converts_to"

    CUSTOMER ||--o{ CONTACT : "has"
    CUSTOMER ||--o{ ACTIVITY : "has"

    OPPORTUNITY ||--o{ ACTIVITY : "has"

    USER {
        uuid id PK
        string email UK
        string password
        enum role "SALES_REP, SALES_MANAGER"
    }

    LEAD {
        uuid id PK
        string company_name
        string contact_email
        enum status "NEW, QUALIFIED, CONVERTED, etc"
        uuid assigned_to FK
    }

    OPPORTUNITY {
        uuid id PK
        string title
        decimal deal_value
        enum stage "NEW, PROPOSAL, WON, LOST, etc"
        uuid lead_id FK
        uuid assigned_to FK
    }

    CUSTOMER {
        uuid id PK
        string company_name
        uuid lead_id FK
        uuid assigned_to FK
    }

    CONTACT {
        uuid id PK
        string name
        string email
        uuid customer_id FK
    }

    ACTIVITY {
        uuid id PK
        enum type "CALL, NOTE, EMAIL, etc"
        string description
        boolean completed
        uuid opportunity_id FK "nullable"
        uuid customer_id FK "nullable"
        uuid created_by FK
    }
```

## Entity Explanations

*   **User**: Represents internal staff. The `role` enum strictly dictates their permissions across the platform.
*   **Lead**: Pre-sales prospects. They contain initial contact info and track qualification status.
*   **Opportunity**: Actual sales deals. Opportunities are tied to Leads and represent pipeline value. They enforce a strict state machine via the `stage` enum.
*   **Customer**: Created when a Lead is converted. Represents an ongoing business relationship, separated from the initial Lead acquisition data.
*   **Contact**: Individual people associated with a Customer account.
*   **Activity**: A polymorphic-like log of actions (calls, notes, meetings). They can be attached to either an Opportunity or a Customer, and are always tied to the User who created them.

## Indexing Rationale

PostgreSQL handles primary key and unique constraint indexes automatically. We added the following explicit indexes to optimize the specific access patterns of this CRM:

1.  `@@index([assignedTo])` on `Lead`, `Opportunity`, and `Customer`.
    *   **Rationale**: Because of our strict ownership authorization model, literally every `findMany` query a Sales Rep runs filters by `assignedTo = current_user.id`. These indexes are critical for performance as the table grows.
2.  `@@index([stage])` on `Opportunity`.
    *   **Rationale**: The Dashboard relies heavily on aggregating deal values grouped by stage (`GROUP BY stage` equivalent), and the Pipeline board fetches records filtered by stage.
3.  `@@index([status])` on `Lead`.
    *   **Rationale**: Filtering leads by status (e.g., "Show me all QUALIFIED leads") is a primary workflow.
4.  `@@index([dueDate, completed])` on `Activity`.
    *   **Rationale**: Supports the dashboard query that identifies pending follow-ups due today efficiently.
