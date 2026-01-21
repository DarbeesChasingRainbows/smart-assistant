# Budget dashboard wiring + warning cleanup plan

This plan addresses build/runtime warnings and wires the budget dashboard/transactions flow so the frontend and API are fully connected without warnings.

## Scope
- Fix F# compiler warnings (indentation + ambiguous records) in domain files.
- Fix C# nullable warnings in infrastructure mappers/repositories.
- Resolve frontend runtime error "Serializing functions is not supported" and 404 for balances.
- Wire dashboard data flows in `frontends/budget/routes/dashboard.tsx` and related services.
- Create a new feature branch for this work.

## Steps
1. **Create new feature branch**
   - Use branch name `feature/budget-dashboard-wiring`.

2. **Backend warning cleanup**
   - Account.fs / Transaction.fs / SharedKernel/User.fs: fix indentation offside warnings.
   - QuizGenerator.fs: add explicit record type annotations to remove FS0667.
   - AntiCorruptionLayer.fs: rename `component` identifiers to avoid reserved keyword warning FS0046.
   - Infrastructure mappers/repositories: handle null docs safely (return `None`/throw domain error) to remove CS8603/CS8604 warnings.

3. **Frontend wiring & runtime error fixes**
   - Trace `dashboard.tsx` and `transactions.tsx` API calls vs. backend routes; align base path usage.
   - Fix `/budget/balances` 404 by correcting endpoint path or adding API route if missing.
   - Fix serialization error by removing non-serializable values passed to Fresh islands; ensure props are JSON-serializable.
   - Add missing DTO typing or API client utilities to keep typed, warning-free usage.

4. **Verification**
   - Run `dotnet build` to ensure warnings are eliminated.
   - Run frontend build or start dev server to confirm no runtime serialization errors and dashboard loads.

## Decisions
- Branch name: `feature/budget-dashboard-wiring`.
- Scope: resolve **all** listed warnings (domain + infrastructure + rules engine).
- Add missing API endpoints for `/budget/balances/{periodId}`.
