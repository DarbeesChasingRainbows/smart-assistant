# Phase 4.2: Loading States & Error Handling - Implementation Guide

## Overview

This guide documents the implementation of robust loading states and error
handling for the budget frontend, following Phase 4.2 requirements.

## Completed Components

### 1. LoadingState Component (`components/LoadingState.tsx`)

**Purpose:** Reusable skeleton loaders matching Sci-Fi HUD theme

**Key Features:**

- `Skeleton` - Generic skeleton with cyan shimmer animation
- `DashboardCardSkeleton` - Matches dashboard card layout
- `BudgetSummarySkeleton` - 3-column stat layout skeleton
- `TransactionListSkeleton` - List view skeleton
- `TableSkeleton` - Table view skeleton
- `LoadingSpinner` - Spinning loader with cyan accent
- `PageLoading` - Full-page loading state
- `LoadingText` - Inline loading with text

**Design:** Dark backgrounds (#1a1a1a), sharp borders, cyan shimmer effect

### 2. ErrorBoundary Component (`components/ErrorBoundary.tsx`)

**Purpose:** Catch JavaScript errors in Preact component trees

**Key Features:**

- Uses Preact's `useErrorBoundary` hook
- Displays Sci-Fi HUD themed error UI
- Provides "Try Again" and "Reload Page" buttons
- Technical details in collapsible section
- `CompactErrorBoundary` - Smaller version for UI sections

**Usage:**

```tsx
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>;
```

### 3. Toast Notification System (`islands/Toast.tsx`)

**Purpose:** Display temporary notifications to users

**Key Features:**

- Signal-based global state management
- Four types: success (green), error (red), warning (amber), info (cyan)
- Auto-dismiss after configurable timeout (default 5s)
- Bottom-right stacked display
- Manual dismiss button (44px touch target)

**Usage:**

```tsx
import { toast } from "../islands/Toast.tsx";

// Show notifications
toast.success("Transaction saved successfully!");
toast.error("Failed to load data");
toast.warning("Budget over-assigned");
toast.info("Sync complete");

// Place ToastContainer once in app layout
<ToastContainer />;
```

### 4. ErrorState Component (`components/ErrorState.tsx`)

**Purpose:** User-friendly error messages for API failures

**Key Features:**

- `ErrorState` - Full error card with retry button
- `InlineError` - Compact inline error
- `NetworkError` - Specific for connection issues with troubleshooting tips
- `NotFoundError` - 404 error state
- `PermissionError` - 401/403 error state
- `EmptyState` - For successfully loaded but empty data
- `OfflineBanner` - Offline mode indicator

**Usage:**

```tsx
<ErrorState
  title="Failed to Load Transactions"
  message="Could not connect to the server."
  onRetry={fetchTransactions}
/>;
```

### 5. Enhanced API Client (`lib/api.ts`)

**Purpose:** Retry logic, offline detection, request queuing

**Key Features:**

#### Offline Detection

- `isOnline` signal tracks connection status
- Listens to browser online/offline events
- Automatically updates UI when connection changes

#### Retry Logic

- Exponential backoff (1s, 2s, 4s, up to 10s)
- Retries 5xx errors and 429 rate limiting
- Configurable max retries (default: 3)
- Logs retry attempts for debugging

#### Request Queue

- Queues failed POST/PUT/PATCH/DELETE requests when offline
- Automatically retries when connection restored
- Limits retries per request (max 3)
- Prevents data loss during connectivity issues

#### Error Classes

```tsx
export class ApiError extends Error {
  status: number;
  statusText: string;
}

export class NetworkError extends Error {}
```

#### Utility Functions

```tsx
getQueueStatus(); // Check queue status
clearRequestQueue(); // Clear queue
retryQueuedRequests(); // Manually retry
```

## Remaining Implementation Steps

### Step 1: Update Navigation Component

Add offline banner and ToastContainer to `components/Navigation.tsx`:

```tsx
import { isOnline } from "../lib/api.ts";
import ToastContainer from "../islands/Toast.tsx";

// Add after <div class="drawer-content flex flex-col">:
{
  !isOnline.value && (
    <div class="bg-[#ffb000]/20 border-b-2 border-[#ffb000]">
      <div class="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-3">
        <span class="text-xl">📡</span>
        <p class="font-mono text-sm text-[#ffb000]">
          <strong>[OFFLINE MODE]</strong> - Some features may be unavailable
        </p>
      </div>
    </div>
  );
}

// Add before closing </div> (end of drawer):
<ToastContainer />;
```

Update footer text from "Phase 4: Mobile Optimization" to "Phase 4.2: Loading &
Error Handling"

### Step 2: Add Loading States to Dashboard Route

Update `routes/dashboard.tsx`:

1. **Import loading components:**

```tsx
import {
  BudgetSummarySkeleton,
  DashboardCardSkeleton,
} from "../components/LoadingState.tsx";
```

2. **Add loading state to handler:**

```tsx
export const handler = define.handlers({
  async GET(ctx) {
    // Add loading indicator via props if needed
    // Current implementation loads on server-side, so skeleton isn't needed
    // But keep for client-side data fetching patterns
  },
});
```

3. **Display skeletons while loading (if converting to client-side):**

```tsx
{loading ? (
  <>
    <BudgetSummarySkeleton />
    <DashboardCardSkeleton />
    <DashboardCardSkeleton />
  </>
) : (
  // Actual dashboard content
)}
```

**Note:** Dashboard currently uses server-side rendering, so loading states are
primarily for client-side islands.

### Step 3: Add Error Handling to TransactionsManager Island

Update `islands/TransactionsManager.tsx`:

1. **Import components:**

```tsx
import { ErrorBoundary } from "../components/ErrorBoundary.tsx";
import { ErrorState, NetworkError } from "../components/ErrorState.tsx";
import { TableSkeleton } from "../components/LoadingState.tsx";
import { toast } from "./Toast.tsx";
import { ApiError, NetworkError as ApiNetworkError } from "../lib/api.ts";
```

2. **Add loading and error states:**

```tsx
const isLoading = useSignal(false);
const error = useSignal<string | null>(null);

const fetchTransactions = async () => {
  isLoading.value = true;
  error.value = null;
  try {
    const data = await getTransactions(...);
    transactions.value = data;
    toast.success("Transactions loaded");
  } catch (err) {
    if (err instanceof ApiNetworkError) {
      error.value = "network";
    } else if (err instanceof ApiError) {
      error.value = `Failed to load: ${err.status}`;
    } else {
      error.value = "An unexpected error occurred";
    }
    toast.error("Failed to load transactions");
  } finally {
    isLoading.value = false;
  }
};
```

3. **Wrap component in ErrorBoundary:**

```tsx
export default function TransactionsManager(props) {
  return (
    <ErrorBoundary>
      <TransactionsManagerContent {...props} />
    </ErrorBoundary>
  );
}

function TransactionsManagerContent(props) {
  // Component logic here

  if (isLoading.value) {
    return <TableSkeleton rows={10} />;
  }

  if (error.value === "network") {
    return <NetworkError onRetry={fetchTransactions} />;
  }

  if (error.value) {
    return (
      <ErrorState
        title="Failed to Load Transactions"
        message={error.value}
        onRetry={fetchTransactions}
      />
    );
  }

  // Normal render
}
```

4. **Add toast notifications for actions:**

```tsx
const handleSave = async () => {
  try {
    await saveTransaction(...);
    toast.success("Transaction saved successfully!");
  } catch (err) {
    toast.error("Failed to save transaction");
  }
};

const handleDelete = async (id: string) => {
  try {
    await deleteTransaction(id);
    toast.success("Transaction deleted");
  } catch (err) {
    toast.error("Failed to delete transaction");
  }
};
```

### Step 4: Add Error Handling to BillsManager Island

Update `islands/BillsManager.tsx`:

Follow same pattern as TransactionsManager:

1. Import error components and toast
2. Add loading/error signals
3. Wrap in ErrorBoundary
4. Show skeleton during loading
5. Show error state on failure
6. Add toast notifications for user actions (bill paid, bill saved, etc.)

**Specific toasts for bills:**

```tsx
toast.success("Bill marked as paid");
toast.warning("Bill is overdue!");
toast.info("Bill reminder set");
```

### Step 5: Add Error Handling to GoalsManager Island

Update `islands/GoalsManager.tsx`:

Follow same pattern:

1. Import error components and toast
2. Add loading/error signals
3. Wrap in ErrorBoundary
4. Show skeleton during loading
5. Show error state on failure
6. Add toast notifications

**Specific toasts for goals:**

```tsx
toast.success("Goal created successfully!");
toast.success("Goal progress updated");
toast.success("Goal completed! 🎉");
```

### Step 6: Testing Error Scenarios

**Test Network Errors:**

```javascript
// In browser DevTools Console:

// Simulate offline mode
navigator.serviceWorker?.controller?.postMessage({ type: "SIMULATE_OFFLINE" });

// Or use Chrome DevTools:
// 1. Open DevTools (F12)
// 2. Network tab
// 3. Select "Offline" from throttling dropdown
```

**Test API Errors:**

```javascript
// Stop backend API server
// Try to load data
// Verify error state shows with retry button

// Test retry:
// Click retry button while still offline
// Start backend
// Click retry - should succeed
```

**Test Retry Logic:**

```javascript
// Monitor console for retry messages:
// "[API] Retrying /endpoint in 1000ms (attempt 1/3)"
// "[API] Retrying /endpoint in 2000ms (attempt 2/3)"
```

**Test Toast Notifications:**

```javascript
// Trigger various actions:
// - Save transaction -> success toast
// - Delete with backend down -> error toast
// - Offline mode -> warning toast
// Verify auto-dismiss after 5 seconds
// Verify manual dismiss button works
```

**Test Request Queue:**

```javascript
// 1. Go offline
// 2. Create new transaction
// 3. Check console: "[API] Queued request for later"
// 4. Go online
// 5. Check console: "[API] Successfully retried"
// 6. Verify data was saved
```

## Design Consistency

All components follow Sci-Fi HUD theme:

### Colors

- Background: `#0a0a0a` to `#1a1a1a`
- Borders: `#333` to `#555`
- Accent: `#00d9ff` (cyan)
- Success: `#00ff88` (green)
- Warning: `#ffb000` (amber)
- Error: `#ff4444` or `red-500`
- Text: `white`, `#888`, `#aaa`

### Typography

- Monospace font for all data and status text
- Sharp corners (border-radius: 0 or minimal)
- High contrast for readability

### Interactive Elements

- All buttons/links: `min-h-[44px]` (Fitts's Law)
- All icons paired with text labels (Kid Test)
- Clear hover states
- Loading spinners: cyan accent

## Best Practices Implemented

1. **Kid Test Compliance:** All icons have visible text labels
2. **Fitts's Law Compliance:** All interactive elements ≥ 44px
3. **Preact Signals:** Used for all state management
4. **Error Boundaries:** Catch JavaScript errors gracefully
5. **Retry Logic:** Exponential backoff, configurable limits
6. **Offline Support:** Request queuing and auto-retry
7. **User Feedback:** Toast notifications for all actions
8. **Loading States:** Skeleton loaders match actual UI
9. **Error Messages:** User-friendly, actionable messages
10. **Accessibility:** Semantic HTML, ARIA labels where needed

## File Structure Summary

```
frontends/budget/
├── components/
│   ├── LoadingState.tsx       ✅ NEW - Skeleton loaders
│   ├── ErrorBoundary.tsx      ✅ NEW - Error catching
│   ├── ErrorState.tsx         ✅ NEW - Error display
│   └── Navigation.tsx         🔨 UPDATE - Add offline banner + toast
├── islands/
│   ├── Toast.tsx              ✅ NEW - Toast notifications
│   ├── TransactionsManager.tsx 🔨 UPDATE - Add loading/error
│   ├── BillsManager.tsx       🔨 UPDATE - Add loading/error
│   └── GoalsManager.tsx       🔨 UPDATE - Add loading/error
├── lib/
│   └── api.ts                 ✅ REPLACED - Retry + offline
└── routes/
    └── dashboard.tsx          ⚠️  OPTIONAL - Already server-side

✅ Completed
🔨 To Update
⚠️  Optional
```

## Migration Path from Backup

If the API client backup needs to be restored:

```bash
# The backup is at:
frontends/budget/lib/api.ts.backup

# To restore old version:
mv api.ts api.ts.new
mv api.ts.backup api.ts

# To use new version:
mv api.ts.backup api.ts.old
mv api.ts.new api.ts
```

## Next Steps After Implementation

1. Test all error scenarios thoroughly
2. Verify offline mode works correctly
3. Check toast notifications on all actions
4. Ensure loading states show correctly
5. Verify error recovery with retry buttons
6. Test on mobile devices (touch targets)
7. Validate accessibility (screen readers)
8. Performance test with slow network
9. Update documentation
10. Create PR with Phase 4.2 completion

## Integration with Existing Code

The new components integrate seamlessly:

- **ErrorBoundary** wraps islands (no breaking changes)
- **LoadingState** replaces manual loading divs
- **ErrorState** replaces generic error messages
- **Toast** provides better feedback than alerts
- **API client** is drop-in replacement (same exports)

Existing code continues to work while new patterns are gradually adopted.

## Performance Considerations

- **Skeletons:** CSS-only animations (no JavaScript)
- **Toasts:** Signal-based (minimal re-renders)
- **Error Boundaries:** Only catch, don't prevent rendering
- **API retry:** Exponential backoff prevents hammering server
- **Request queue:** Bounded size (max 100 items)

## Conclusion

Phase 4.2 establishes production-ready error handling and loading states for the
budget frontend. The implementation:

- ✅ Provides user-friendly error messages
- ✅ Implements automatic retry with exponential backoff
- ✅ Supports offline mode with request queuing
- ✅ Shows appropriate loading states
- ✅ Gives immediate feedback via toasts
- ✅ Maintains Sci-Fi HUD aesthetic
- ✅ Follows accessibility guidelines
- ✅ Uses Preact Signals consistently

The remaining work is primarily integration - adding the new components to
existing islands and routes.
