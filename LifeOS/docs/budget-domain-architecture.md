# Budget Domain Architecture

> **Zero-Based Budgeting**: Every dollar has a job.  
> **Pay-Period Centric**: Budget per paycheck, not monthly.

## Overview

The Budget domain implements a pay-period-based zero-based budgeting system integrated into the LifeOS ecosystem. Unlike traditional monthly budgeting, this system aligns with real-world income patterns (bi-weekly, weekly, etc.) and ensures every dollar of income is assigned to a category before the pay period ends.

## Core Concepts

### Zero-Based Budgeting
- **Goal**: `Unassigned = TotalIncome - TotalAssigned = $0`
- Every dollar of income must be assigned to a category
- Categories represent "jobs" for your money (Groceries, Rent, Savings, etc.)
- Assignments are made per pay period, not monthly

### Pay Period
The fundamental time unit for budgeting. Users define when they get paid:
- Start Date → End Date (e.g., Nov 1 - Nov 15)
- Income is tracked per pay period
- Budget assignments are scoped to pay periods

## Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Deno Fresh 2.x | Islands architecture, SSR |
| **API** | ASP.NET Core 10 | Minimal APIs, CQRS |
| **Domain Logic** | F# | Pure functions, discriminated unions |
| **Database** | ArangoDB | Graph-first, document storage |
| **Gateway** | Caddy | Reverse proxy, asset routing |

### Port Assignments

| Service | Port | Route |
|---------|------|-------|
| Caddy Gateway | 8000 | `/` (entry point) |
| Garage Frontend | 8020 | `/garage` |
| Flashcards Frontend | 8030 | `/flashcards` |
| **Budget Frontend** | **8040** | **`/budget`** |
| LifeOS API | 5120 | `/api/v1/*` |
| ArangoDB | 8529 | Database |
| MinIO | 9000/9001 | Object storage |

## Graph Data Model

### Collections (Vertices)

```
budget_pay_periods      - Pay period definitions
budget_category_groups  - Category groupings (e.g., "Living Expenses")
budget_categories       - Individual categories (e.g., "Groceries")
budget_assignments      - Money assigned to categories per period
budget_income_entries   - Income received per period
budget_accounts         - Bank accounts, credit cards
budget_bills            - Recurring bills
budget_goals            - Savings goals
budget_transactions     - Individual transactions
```

### Edge Collections (Relationships)

```
budget_assigned_to       - BudgetAssignment → BudgetCategory
budget_in_period         - BudgetAssignment → PayPeriod
budget_category_in_group - BudgetCategory → CategoryGroup
budget_transaction_in    - Transaction → Account
budget_bill_paid_from    - Bill → Account
budget_goal_funded_by    - Goal → Category
```

### Graph Definition

```javascript
{
  name: "budget_graph",
  edgeDefinitions: [
    { collection: "budget_assigned_to", from: ["budget_assignments"], to: ["budget_categories"] },
    { collection: "budget_in_period", from: ["budget_assignments"], to: ["budget_pay_periods"] },
    { collection: "budget_category_in_group", from: ["budget_categories"], to: ["budget_category_groups"] },
    { collection: "budget_transaction_in", from: ["budget_transactions"], to: ["budget_accounts"] },
    { collection: "budget_bill_paid_from", from: ["budget_bills"], to: ["budget_accounts"] },
    { collection: "budget_goal_funded_by", from: ["budget_goals"], to: ["budget_categories"] }
  ]
}
```

### Graph Traversal Examples

**Get all categories with their assignments for a pay period:**
```aql
FOR pp IN budget_pay_periods
  FILTER pp._key == @payPeriodKey
  FOR assignment IN 1..1 INBOUND pp budget_in_period
    FOR category IN 1..1 OUTBOUND assignment budget_assigned_to
      RETURN { category, assignment }
```

**Get spending by category group:**
```aql
FOR group IN budget_category_groups
  FILTER group.familyId == @familyId
  FOR cat IN 1..1 INBOUND group budget_category_in_group
    LET spent = SUM(
      FOR t IN budget_transactions
        FILTER t.categoryKey == cat._key AND t.amount < 0
        RETURN ABS(t.amount)
    )
    COLLECT groupName = group.name AGGREGATE totalSpent = SUM(spent)
    RETURN { groupName, totalSpent }
```

## CQRS Pattern

### Commands (Write Operations)

| Command | Description | Endpoint |
|---------|-------------|----------|
| `AssignMoney` | Assign income to a category | `POST /api/v1/budget/assignments/assign` |
| `AddIncome` | Record income for a pay period | `POST /api/v1/budget/income` |
| `CreatePayPeriod` | Create a new pay period | `POST /api/v1/budget/pay-periods` |
| `RecordTransaction` | Record a transaction | `POST /api/v1/budget/transactions` |
| `CreateGoal` | Create a savings goal | `POST /api/v1/budget/goals` |

### Queries (Read Operations)

| Query | Description | Endpoint |
|-------|-------------|----------|
| `GetDashboard` | Aggregated dashboard view | `GET /api/v1/budget/dashboard` |
| `GetBudgetSummary` | Income vs assigned totals | `GET /api/v1/budget/pay-periods/{key}/summary` |
| `GetCategoryBalances` | Assigned vs spent per category | `GET /api/v1/budget/categories/{key}/balance` |
| `GetUpcomingBills` | Bills due in date range | `GET /api/v1/budget/bills/upcoming` |

## F# Domain Types

### Location
`LifeOS.RulesEngine.FSharp/Contracts/BudgetTypes.fs`

### Key Types

```fsharp
// Discriminated Unions for type safety
type AccountType = Checking | Savings | CreditCard | Cash | Investment | Loan
type BillFrequency = Weekly | BiWeekly | Monthly | Quarterly | Annually | OneTime
type TransactionType = Inflow | Outflow | Transfer

// Value Objects (internal, not exposed to C#)
type PayPeriodId = PayPeriodId of string
type CategoryId = CategoryId of string
type Money = private Money of decimal

// C#-Friendly DTOs
type PayPeriodDto(key, familyId, name, startDate, endDate, ...)
type BudgetAssignmentDto(key, payPeriodKey, categoryKey, assignedAmount, ...)
type BudgetSummaryDto(payPeriodKey, totalIncome, totalAssigned, unassigned, ...)
```

### Rules Engine Interface

```fsharp
type IBudgetRulesEngine =
    abstract member CalculateBudgetSummaryAsync: ...
    abstract member CalculateCategoryBalancesAsync: ...
    abstract member ValidateAssignmentAsync: ...
    abstract member CalculateUpcomingBillsAsync: ...
    abstract member FindPayPeriodForDateAsync: ...
```

## API Endpoints

### Base URL
`/api/v1/budget`

### Pay Periods
- `GET /pay-periods` - List all pay periods
- `GET /pay-periods/current` - Get current active period
- `GET /pay-periods/{key}` - Get specific period
- `POST /pay-periods` - Create new period
- `PUT /pay-periods/{key}` - Update period
- `GET /pay-periods/{key}/summary` - Get budget summary

### Categories
- `GET /category-groups` - List groups with categories
- `POST /category-groups` - Create group
- `GET /categories` - List categories
- `POST /categories` - Create category
- `PUT /categories/{key}` - Update category
- `GET /categories/{key}/balance` - Get category balance

### Assignments
- `GET /assignments?payPeriodKey=` - List assignments
- `POST /assignments/assign` - Assign money (upsert)

### Income
- `GET /income?payPeriodKey=` - List income entries
- `POST /income` - Add income

### Accounts
- `GET /accounts` - List accounts
- `POST /accounts` - Create account
- `PUT /accounts/{key}` - Update account

### Bills
- `GET /bills` - List bills
- `GET /bills/upcoming` - Get upcoming bills
- `POST /bills` - Create bill
- `PUT /bills/{key}` - Update bill
- `POST /bills/{key}/paid` - Mark as paid

### Goals
- `GET /goals` - List goals
- `POST /goals` - Create goal
- `POST /goals/{key}/progress` - Update progress

### Transactions
- `GET /transactions` - List transactions
- `GET /transactions/account/{accountKey}` - Account transactions
- `POST /transactions` - Create transaction
- `PUT /transactions/{key}` - Update transaction
- `POST /transactions/{key}/clear` - Toggle cleared status

### Dashboard
- `GET /dashboard` - Aggregated dashboard view

## Frontend Architecture

### Fresh 2.x Microfrontend Pattern

```
frontends/budget/
├── main.tsx           # App shell with basePath="/budget"
├── vite.config.ts     # base="/budget/", serverEntry
├── utils.ts           # url() and asset() helpers
├── Dockerfile         # Deno container
├── deno.json          # Tasks and imports
├── routes/            # Server-rendered pages
│   ├── index.tsx      # User picker / dashboard
│   ├── dashboard.tsx  # Main budget view
│   ├── accounts.tsx   # Account management
│   ├── transactions.tsx
│   ├── bills.tsx
│   ├── goals.tsx
│   └── settings.tsx
├── islands/           # Interactive components
│   ├── BudgetAssignment.tsx  # Zero-based assignment UI
│   ├── AccountsManager.tsx
│   ├── TransactionsManager.tsx
│   ├── BillsManager.tsx
│   ├── GoalsManager.tsx
│   └── SettingsManager.tsx
└── assets/
    └── styles.css     # Tailwind CSS
```

### CSS Loading Fix (Fresh 2.x Microfrontend)

The `main.tsx` uses `app.appWrapper()` to manually inject CSS with the correct basePath:

```tsx
app.appWrapper(({ Component }) => (
  <html>
    <head>
      <link rel="stylesheet" href={asset("/assets/styles.css")} />
    </head>
    <body><Component /></body>
  </html>
));
```

The Caddyfile includes asset rewrite rules to handle CSS loading across microfrontends.

## Integration with LifeOS

### Cross-Domain Relationships

The Budget domain can connect to other LifeOS domains via graph edges:

```
budget_transactions ──[consumed]──> inventory_skus     (Track spending on inventory)
budget_transactions ──[for_vehicle]──> vehicles        (Vehicle expenses)
budget_goals ──[supports]──> visions                   (Financial goals support life visions)
budget_categories ──[owned_by]──> users                (User-specific categories)
```

### Shared Services

- **ArangoDB**: Shared graph database
- **MinIO**: Receipt image storage
- **LifeOS API**: Single monolith backend

## Development

### Local Development

```bash
# Start backend
cd LifeOS
dotnet run --project src/LifeOS.API

# Start frontend (separate terminal)
cd frontends/budget
deno task dev
```

### Docker Development

```bash
# Build and run
docker-compose up budget-frontend

# Or using podman
cd frontends/budget
deno task podman:build
deno task podman:run
```

### Database Initialization

Run the ArangoDB init script to create Budget collections:

```bash
cd scripts
./run-init.ps1
```

## Future Enhancements

1. **Event Sourcing**: Track all budget changes as events
2. **SignalR**: Real-time updates across family members
3. **AI Assistant**: Budget recommendations via local LLM
4. **Receipt OCR**: Auto-categorize from receipt images
5. **Bank Sync**: Import transactions from financial institutions
