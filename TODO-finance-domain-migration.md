# Finance API > Domain Migration TODO

## Objective
Move Finance business logic out of `LifeOS.API` (primary adapter) and into the application/core layers:

- **Domain** (`LifeOS.Domain.Finance`): invariants, entities/value objects, domain services.
- **Application** (new): orchestration/use-cases that call domain + ports.
- **Infrastructure** (`LifeOS.Infrastructure`): adapters implementing ports (ArangoDB, MinIO).
- **API** (`LifeOS.API`): thin endpoints (parse input, call application service, map output).

## Architectural rules (source: Context7 `/sairyss/domain-driven-hexagon`)
- Controllers/endpoints should be thin.
- Application services orchestrate use-cases but contain no domain-specific business logic.
- Domain contains business rules and is framework-agnostic.
- Infrastructure implements ports/adapters and is called only through ports.

## Current status
- `LifeOS.Domain` Finance bounded context exists and compiles.
- `LifeOS.API/Endpoints/FinanceEndpoints.cs` still contains key business rules.

## What still lives in API but should move
### Transactions
- `CreateTransaction`: journal entries + balance update are implemented inline.
- `UpdateTransaction`: amount diff -> balance update is implemented inline.
- `CreateTransfer`: constructs 2 transactions + tagging + journal + balances inline.

### Reconciliation
- `MatchTransactions`: adds keys, updates tx status to Cleared, recalculates balance/difference.
- `CompleteReconciliation`: difference tolerance rule + status transitions + tx status updates.

### Budgets
- `GetPeriodBudgetSummary` / `CreateOrUpdatePeriodBudget`: spent calculation rules live in API.

### Helper methods
- `CreateJournalEntriesForTransaction`
- `CreateJournalEntriesForTransfer`
- `UpdateAccountBalance`
- `CalculateClearedBalance`
- `CalculateSpentForCategory`

## Phased migration plan (keep behavior identical)

### Phase 0  Guardrails (acceptance criteria)
- **All existing endpoints behave the same** (status codes + payloads).
- No persistence schema changes.
- Domain stays clean of ArangoDB/MinIO/framework deps.

### Phase 1  Add Finance application service boundary (no behavior change)
- Add `IFinanceApplicationService` + minimal DTOs/results.
- Add DI registration (`AddFinanceApplication()` or similar).
- Endpoints still call existing logic (temporary), but wiring exists.

### Phase 2  Extract Transfer use-case (highest value)
- Endpoint `POST /api/v1/finance/transactions/transfer` calls application service.
- App service uses domain `FinanceServices.TransferService.executeTransfer`.
- Persist changes via repository ports/adapters.

### Phase 3  Extract Create/Update Transaction use-cases
- Move journal + balance update logic behind app service.
- Ensure idempotency strategy if needed.

### Phase 4  Extract Reconciliation use-cases
- Match/Complete operations use domain rules.

### Phase 5  Extract Budget period calculations
- Spent calculation done in domain; data access through ports.

### Phase 6  Receipts link semantics + storage key policy
- Keep MinIO presign in infra; domain owns storageKey generation rule.

## Implementation notes
- Prefer keeping ports in Domain if domain logic needs them; otherwise put ports in Application layer.
- For incremental migration, keep current Arango queries for reads; move writes first.

## Work log
- [x] Phase 1 completed: IFinanceApplicationService interface and implementation already exist
- [x] Transfer, Create/Update/Void Transaction operations already use application service
- [x] Phase 2 completed: Extracted Reconciliation use-cases to application service
  - [x] CreateReconciliation
  - [x] MatchTransactions
  - [x] CompleteReconciliation
- [ ] Phase 3: Extract Budget period calculations to application service
- [ ] Phase 4: Move helper methods to appropriate layers
