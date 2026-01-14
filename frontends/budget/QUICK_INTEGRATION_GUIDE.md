# Quick Integration Guide - Phase 4.2

This guide provides copy-paste code snippets for the remaining integration work.

## 1. Update Navigation Component (5 minutes)

**File:** `frontends/budget/components/Navigation.tsx`

### Step 1: Add imports at the top

```typescript
import type { ComponentChildren } from "preact";
import { isOnline } from "../lib/api.ts"; // ADD THIS
import ToastContainer from "../islands/Toast.tsx"; // ADD THIS

interface NavigationProps {
  children: ComponentChildren;
  currentPath?: string;
}
```

### Step 2: Add offline banner after `<div class="drawer-content flex flex-col">`

```tsx
<div class="drawer-content flex flex-col">
  {/* ADD THIS ENTIRE BLOCK */}
  {/* Offline Banner - Shows when user is offline */}
  {!isOnline.value && (
    <div class="bg-[#ffb000]/20 border-b-2 border-[#ffb000]">
      <div class="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-3">
        <span class="text-xl">📡</span>
        <p class="font-mono text-sm text-[#ffb000]">
          <strong>[OFFLINE MODE]</strong> - Some features may be unavailable
        </p>
      </div>
    </div>
  )}
  {/* END NEW BLOCK */}

  {/* Header - Always visible */}
  <header class="bg-[#0a0a0a] text-white shadow-lg border-b border-[#00d9ff]/20">
```

### Step 3: Add ToastContainer before the closing `</div>` (end of drawer component)

```tsx
      </nav>
    </div>

    {/* ADD THIS LINE */}
    <ToastContainer />
  </div>
);
```

### Step 4: Update footer text

```tsx
<footer class="bg-[#0a0a0a] text-[#888] border-t border-[#333] p-4 mt-12">
  <div class="max-w-7xl mx-auto text-center text-sm font-mono">
    <span class="text-[#00d9ff]">[</span>
    Phase 4.2: Loading & Error Handling {/* CHANGE THIS */}
    <span class="text-[#00d9ff]">]</span>
  </div>
</footer>;
```

## 2. Update TransactionsManager Island (20 minutes)

**File:** `frontends/budget/islands/TransactionsManager.tsx`

### Step 1: Add imports

```typescript
import { useSignal } from "@preact/signals";
import { ErrorBoundary } from "../components/ErrorBoundary.tsx"; // ADD
import { ErrorState, NetworkError } from "../components/ErrorState.tsx"; // ADD
import { TableSkeleton } from "../components/LoadingState.tsx"; // ADD
import { toast } from "./Toast.tsx"; // ADD
import { ApiError, NetworkError as ApiNetworkError } from "../lib/api.ts"; // ADD
```

### Step 2: Add loading and error state signals (inside component)

```typescript
export default function TransactionsManager(props) {
  // ADD THESE
  const isLoading = useSignal(false);
  const error = useSignal<string | null>(null);

  // ... existing code ...
}
```

### Step 3: Update fetch function with error handling

```typescript
const fetchTransactions = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    // Your existing fetch code
    const data = await getTransactions(...);
    transactions.value = data;

  } catch (err) {
    if (err instanceof ApiNetworkError) {
      error.value = "network";
      toast.error("Connection error - check your internet");
    } else if (err instanceof ApiError) {
      error.value = `Failed to load: ${err.status}`;
      toast.error("Failed to load transactions");
    } else {
      error.value = "An unexpected error occurred";
      toast.error("Something went wrong");
    }
  } finally {
    isLoading.value = false;
  }
};
```

### Step 4: Add loading and error states to render

```typescript
export default function TransactionsManager(props) {
  // ... state declarations ...

  // ADD THESE CONDITIONS
  if (isLoading.value) {
    return (
      <div class="p-4">
        <TableSkeleton rows={10} />
      </div>
    );
  }

  if (error.value === "network") {
    return (
      <div class="p-4">
        <NetworkError onRetry={fetchTransactions} />
      </div>
    );
  }

  if (error.value) {
    return (
      <div class="p-4">
        <ErrorState
          title="Failed to Load Transactions"
          message={error.value}
          onRetry={fetchTransactions}
        />
      </div>
    );
  }

  // ... normal render ...
}
```

### Step 5: Add toasts to user actions

```typescript
const handleSave = async (transaction) => {
  try {
    await saveTransaction(transaction);
    toast.success("Transaction saved successfully!");
    await fetchTransactions(); // Refresh list
  } catch (err) {
    toast.error("Failed to save transaction");
  }
};

const handleDelete = async (id: string) => {
  try {
    await deleteTransaction(id);
    toast.success("Transaction deleted");
    await fetchTransactions(); // Refresh list
  } catch (err) {
    toast.error("Failed to delete transaction");
  }
};
```

### Step 6: Wrap in ErrorBoundary (optional but recommended)

```typescript
// At the end of the file:
function TransactionsManagerContent(props) {
  // Move all the component logic here
}

export default function TransactionsManager(props) {
  return (
    <ErrorBoundary>
      <TransactionsManagerContent {...props} />
    </ErrorBoundary>
  );
}
```

## 3. Update BillsManager Island (20 minutes)

**File:** `frontends/budget/islands/BillsManager.tsx`

Follow the exact same pattern as TransactionsManager:

### Step 1: Add same imports

```typescript
import { ErrorBoundary } from "../components/ErrorBoundary.tsx";
import { ErrorState, NetworkError } from "../components/ErrorState.tsx";
import { DashboardCardSkeleton } from "../components/LoadingState.tsx";
import { toast } from "./Toast.tsx";
import { ApiError, NetworkError as ApiNetworkError } from "../lib/api.ts";
```

### Step 2: Add state signals

```typescript
const isLoading = useSignal(false);
const error = useSignal<string | null>(null);
```

### Step 3: Update fetch with error handling (same pattern)

### Step 4: Add loading/error renders (same pattern, use DashboardCardSkeleton)

### Step 5: Add bill-specific toasts

```typescript
toast.success("Bill marked as paid");
toast.success("Bill saved successfully");
toast.warning("Bill is overdue!");
toast.info("Reminder set for bill");
```

## 4. Update GoalsManager Island (20 minutes)

**File:** `frontends/budget/islands/GoalsManager.tsx`

### Step 1-4: Same as BillsManager

### Step 5: Add goal-specific toasts

```typescript
toast.success("Goal created successfully!");
toast.success("Goal progress updated");
toast.success("Goal completed! 🎉");
toast.info("Goal milestone reached");
```

## Testing After Integration

### 1. Visual Test (Browser)

```
1. Run: deno task dev
2. Navigate to http://localhost:8040/budget/dashboard
3. Open DevTools (F12)
4. Check console for errors
```

### 2. Offline Test

```
1. DevTools -> Network tab
2. Select "Offline" from throttling dropdown
3. Verify offline banner appears
4. Try to save data
5. Select "Online"
6. Verify data saves automatically
```

### 3. Error Test

```
1. Stop backend API server
2. Try to load transactions
3. Verify error state shows
4. Click retry button
5. Start backend
6. Click retry again
7. Verify data loads
```

### 4. Toast Test

```
1. Create a transaction
2. Verify green success toast appears
3. Wait 5 seconds -> toast auto-dismisses
4. Trigger an error
5. Verify red error toast appears
6. Click X button -> toast dismisses
```

## Type Checking

Before committing:

```bash
cd frontends/budget
deno check **/*.tsx
```

Fix any TypeScript errors that appear.

## Common Issues

### Issue: Toast not showing

**Solution:** Make sure `<ToastContainer />` is added to Navigation component

### Issue: Offline banner not appearing

**Solution:** Check that `isOnline` import is correct from `../lib/api.ts`

### Issue: TypeScript errors on ApiError

**Solution:** Make sure you import both:

```typescript
import { ApiError, NetworkError as ApiNetworkError } from "../lib/api.ts";
```

### Issue: Skeleton not matching UI

**Solution:** Use appropriate skeleton:

- Tables: `TableSkeleton`
- Cards: `DashboardCardSkeleton`
- Stats: `BudgetSummarySkeleton`
- Lists: `TransactionListSkeleton`

## Estimated Time

- Navigation: **5 minutes**
- TransactionsManager: **20 minutes**
- BillsManager: **20 minutes**
- GoalsManager: **20 minutes**
- Testing: **30 minutes**

**Total: ~1.5 hours**

## Files to Modify

1. ✅ `components/Navigation.tsx`
2. ✅ `islands/TransactionsManager.tsx`
3. ✅ `islands/BillsManager.tsx`
4. ✅ `islands/GoalsManager.tsx`

## Files Already Complete

1. ✅ `components/LoadingState.tsx`
2. ✅ `components/ErrorBoundary.tsx`
3. ✅ `components/ErrorState.tsx`
4. ✅ `islands/Toast.tsx`
5. ✅ `lib/api.ts`

## Success Checklist

- [ ] Navigation shows offline banner when offline
- [ ] Toasts appear bottom-right
- [ ] Loading skeletons show during data fetch
- [ ] Error states show when API fails
- [ ] Retry buttons work
- [ ] Success toasts show on save/delete
- [ ] Error toasts show on failures
- [ ] No TypeScript errors
- [ ] All touch targets ≥ 44px
- [ ] All icons have text labels

Once all checkboxes are ticked, Phase 4.2 is complete! 🎉
