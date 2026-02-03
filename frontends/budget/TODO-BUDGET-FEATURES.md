# Budget Frontend - Feature TODO List

> **For LLM Agents**: This document tracks remaining work for the Budget frontend.
> **Last Updated**: 2026-01-27
> **Stack**: Deno Fresh 2.x, Preact Signals, TailwindCSS, DaisyUI v5

---

## ✅ Completed

### Phase 4.1: Mobile Responsiveness (100%)
- All routes responsive with Sci-Fi HUD theme
- Navigation component with drawer pattern
- Touch targets ≥44px (Fitts's Law)
- All icons have text labels (Kid Test)

### Phase 4.2: Error Handling & Toast (100%)
All islands have:
- `ErrorBoundary` wrapper
- `toast.success()` / `toast.error()` integration
- `console.error` kept for debugging

**Islands completed**:
- AccountsManager.tsx
- BillsManager.tsx
- BudgetAssignment.tsx
- GoalsManager.tsx
- ReceiptsManager.tsx
- SettingsManager.tsx
- TransactionExportIsland.tsx
- TransactionImportIsland.tsx
- TransactionsManager.tsx

### Carryover Display (100%)
- `BudgetAssignment.tsx` now shows carryover amounts
- Header changed from "REMAINING" to "AVAILABLE"
- Available = Carryover + Assigned - Spent
- Visual indicator: ↑/↓ with carryover amount when non-zero
- Transfer modal uses `getAvailableAmount()` for validation

---

## 🔨 Remaining Work

### High Priority - ✅ COMPLETED

#### 1. Settings Route Mobile/Theme ✅
**File**: `routes/settings.tsx`, `islands/SettingsManager.tsx`
**Status**: Already had Sci-Fi HUD theme applied
**Tasks**:
- [x] Apply Sci-Fi HUD theme (bg-[#1a1a1a], border-[#333], etc.)
- [x] Ensure responsive layout (flex-col sm:flex-row)
- [x] Touch targets ≥44px on all buttons
- [x] Test pay period management on mobile

#### 2. Receipts Route Mobile/Theme ✅
**File**: `routes/receipts.tsx`, `islands/ReceiptsManager.tsx`
**Status**: Already had Sci-Fi HUD theme applied
**Tasks**:
- [x] Apply Sci-Fi HUD theme
- [x] Responsive table with column hiding
- [x] Touch-friendly receipt upload
- [x] Mobile-optimized receipt detail view

### Medium Priority

#### 3. Transaction Import Workflow ✅
**File**: `islands/TransactionImportIsland.tsx`
**Status**: Completed
**Tasks**:
- [x] CSV import with auto-delimiter detection
- [x] OFX/QFX support (parses STMTTRN blocks)
- [x] Auto-detection of column mappings
- [x] Preview with selection/deselection
- [x] Theme-aware styling updates

**Features**:
- 3-step wizard: Upload → Map Columns → Preview
- Auto-detects file format (CSV, OFX, QFX)
- Smart column mapping for common field names
- Select/deselect individual transactions before import
- Duplicate detection placeholder (TODO: implement)

#### 4. Dashboard Summary Cards Enhancement ✅
**File**: `routes/dashboard.tsx`
**Status**: Completed
**Tasks**:
- [x] Show total carryover across all categories (badge in header)
- [x] Add "Recalculate Year" button (new island: `RecalculateYearButton.tsx`)
- [x] Quick links to common actions (+ Transaction, Settings)

### Low Priority

#### 5. Reports & Analytics ✅
**Status**: Completed
**Tasks**:
- [x] Spending by category chart (doughnut chart with Chart.js)
- [x] Spending trends over time (line chart - income vs expenses)
- [x] Goal progress visualization (horizontal bar chart)
- [ ] Bill payment history (future enhancement)

**Files Created**:
- `routes/reports.tsx` - Reports page route
- `islands/ReportsManager.tsx` - Interactive reports island with Chart.js

**Features**:
- Summary cards (Income, Budgeted, Spent, Remaining)
- Tabbed interface (Spending, Trends, Goals)
- Doughnut chart for spending by category group
- Category breakdown table with budget vs spent percentages
- Line chart showing income vs expenses over last 6 months
- Monthly summary table with net calculations
- Goal progress bar chart and detail cards

#### 6. Real-time Updates (SignalR) ✅
**Status**: Completed
**Tasks**:
- [x] SignalR hub for budget updates (`BudgetHub.cs`)
- [x] Live balance updates across family members
- [x] Notification push for alerts (bills due, carryover recalculated)

**Files Created**:
- Backend: `LifeOS.API/Hubs/BudgetHub.cs`, `BudgetNotificationService.cs`
- Frontend: `lib/signalr.ts`, `islands/SignalRProvider.tsx`

**Events Supported**:
- AssignmentUpdated, TransactionCreated/Updated/Deleted
- CategoryBalanceChanged, AccountBalanceChanged
- BillPaid, BillDueSoon, GoalProgressUpdated
- PayPeriodChanged, CarryoverRecalculated

---

## Technical Reference

### API Base URL Pattern
```typescript
const API_BASE = globalThis.location?.pathname?.startsWith("/budget")
  ? "/budget/api/v1/budget"
  : "/api/v1/budget";
```

### Key Endpoints
| Endpoint | Description |
|----------|-------------|
| `GET /dashboard` | Aggregated dashboard with categoryBalances |
| `GET /balances/{payPeriodKey}` | Category balances with carryover |
| `POST /assignments/assign` | Upsert budget assignment |
| `POST /pay-periods/{key}/recalculate-year` | Recalculate carryovers |

### CategoryBalance DTO
```typescript
interface CategoryBalance {
  categoryKey: string;
  categoryName: string;
  groupName: string;
  carryover: number;  // From previous period
  assigned: number;   // This period's assignment
  spent: number;      // This period's spending
  available: number;  // carryover + assigned - spent
}
```

### Theme Colors (Sci-Fi HUD)
```css
--bg-primary: #0a0a0a;
--bg-secondary: #1a1a1a;
--border: #333, #444;
--accent-cyan: #00d9ff;
--accent-green: #00ff88;
--accent-amber: #ffb000;
--text-primary: #e0e0e0;
--text-muted: #888, #a0a0a0;
```

### Component Patterns
```tsx
// Island with ErrorBoundary
function MyIslandContent(props: Props) {
  // ... component logic
}

export default function MyIsland(props: Props) {
  return (
    <ErrorBoundary>
      <MyIslandContent {...props} />
    </ErrorBoundary>
  );
}
```

```tsx
// Toast usage
import { toast } from "./Toast.tsx";

try {
  await fetch(...);
  toast.success("Saved successfully!");
} catch (error) {
  console.error("Error:", error);
  toast.error("Failed to save");
}
```

---

## File Structure
```
frontends/budget/
├── components/
│   ├── ErrorBoundary.tsx   # Preact error boundary
│   ├── ErrorState.tsx      # Error display component
│   ├── LoadingState.tsx    # Skeleton loaders
│   ├── Navigation.tsx      # Responsive nav with drawer
│   └── Button.tsx
├── islands/
│   ├── AccountsManager.tsx
│   ├── BillsManager.tsx
│   ├── BudgetAssignment.tsx  # ← Carryover display added
│   ├── GoalsManager.tsx
│   ├── ReceiptsManager.tsx
│   ├── SettingsManager.tsx
│   ├── Toast.tsx             # Global toast system
│   ├── TransactionExportIsland.tsx
│   ├── TransactionImportIsland.tsx
│   └── TransactionsManager.tsx
├── routes/
│   ├── dashboard.tsx
│   ├── transactions.tsx
│   ├── bills.tsx
│   ├── goals.tsx
│   ├── accounts.tsx
│   ├── receipts.tsx
│   └── settings.tsx
├── types/
│   └── api.ts              # TypeScript interfaces
└── lib/
    └── api.ts              # Enhanced API client with retry
```

---

## Testing Checklist

### Before Deploying
- [ ] `deno task dev` runs without errors
- [ ] All routes load on mobile (320px viewport)
- [ ] Toast notifications appear for all user actions
- [ ] Offline banner shows when disconnected
- [ ] Carryover displays correctly in BudgetAssignment

### Manual Tests
1. Create/edit/delete category → toast appears
2. Assign money to category → updates immediately
3. Transfer funds between categories → both update
4. View category with carryover → shows ↑/↓ indicator
5. Toggle SPENT/AVAILABLE → display switches

