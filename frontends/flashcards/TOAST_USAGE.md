# Toast Notification System

A fully accessible toast notification system for the flashcards frontend, following Sci-Fi HUD design principles and WCAG accessibility guidelines.

## Overview

The toast system consists of three parts:

1. **`lib/toast.ts`** - State management using Preact Signals
2. **`components/ui/Toast.tsx`** - Individual toast component
3. **`islands/ToastContainer.tsx`** - Container island for rendering toasts

## Basic Usage

### Showing Toasts

```tsx
import { toast } from "../lib/toast.ts";

// Simple usage with convenience methods
toast.success("Flashcard created successfully!");
toast.error("Failed to save flashcard");
toast.warning("Your session is about to expire");
toast.info("5 new flashcards available");

// With custom duration (in milliseconds)
toast.success("Saved!", 3000); // Auto-dismiss after 3 seconds
toast.error("Critical error", 0); // No auto-dismiss (must be manually closed)

// Advanced usage with full control
import { showToast } from "../lib/toast.ts";

showToast({
  variant: "success",
  message: "Your deck has been updated with 12 new cards",
  duration: 7000
});
```

### Dismissing Toasts

```tsx
import { dismissToast, dismissAllToasts } from "../lib/toast.ts";

// Dismiss a specific toast
const toastId = toast.info("Processing...");
// Later...
dismissToast(toastId);

// Dismiss all toasts
dismissAllToasts();
```

## Toast Variants

| Variant | Use Case | Color | ARIA Role | ARIA Live |
|---------|----------|-------|-----------|-----------|
| `info` | Informational messages | Cyan (#00d9ff) | `status` | `polite` |
| `success` | Successful operations | Green (#00ff88) | `status` | `polite` |
| `warning` | Non-critical warnings | Amber (#ffb000) | `alert` | `assertive` |
| `error` | Errors requiring attention | Red (#ff4444) | `alert` | `assertive` |

## Accessibility Features

### ARIA Compliance

The toast system follows accessibility best practices from leading experts:

- **Sara Soueidan**: [Accessible Notifications with ARIA Live Regions](https://www.sarasoueidan.com/blog/accessible-notifications-with-aria-live-regions-part-1/)
- **Scott O'Hara**: [A Toast to Accessible Toasts](https://www.scottohara.me/blog/2019/07/08/a-toast-to-a11y-toasts.html)
- **MDN**: [ARIA Alert Role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/alert_role)

**Key Features:**

1. **Live Regions Pre-rendered**: ARIA live regions exist at render time (not dynamically created)
2. **Proper Role Assignment**:
   - `role="status"` for info/success (non-disruptive)
   - `role="alert"` for warning/error (important)
3. **Live Region Politeness**:
   - `aria-live="polite"` for info/success (waits for pause in speech)
   - `aria-live="assertive"` for warning/error (interrupts immediately)
4. **Atomic Announcements**: `aria-atomic="true"` ensures complete message is read
5. **Keyboard Support**:
   - Tab to focus toast
   - Enter/Space/Escape to dismiss
   - Pause timer on focus
6. **Reduced Motion**: Respects `prefers-reduced-motion` (no animations)

### Fitts's Law Compliance

- Dismiss button: 44px × 44px minimum touch target
- Adequate spacing between stacked toasts (8px gap)
- Large interactive area for pause-on-hover

### The Kid Test

- Close button has visible "×" icon AND accessible label
- Icon + message format (icons never alone)
- Clear, readable text labels

## Design System (Sci-Fi HUD)

### Visual Style

```css
/* Sharp corners (no border-radius) */
border-radius: 0;

/* Dark backgrounds with subtle tints */
info: #0a0a1a
success: #001a0f
warning: #1f1500
error: #1a0000

/* High-contrast borders */
border: 2px solid [variant-color];

/* Monospace font */
font-family: monospace;

/* Subtle box shadow/glow effect */
box-shadow: 0 0 20px [variant-color]/20;
```

### Layout

- **Position**: Fixed bottom-right (24px from edges)
- **Width**: 360px
- **Stacking**: Vertical with 8px gap
- **Max Visible**: 3 toasts (older ones queued)
- **Z-Index**: 50

### Animations

```css
/* Slide in from right */
@keyframes toast-slide-in {
  from { transform: translateX(400px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

/* Slide out to right */
@keyframes toast-slide-out {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(400px); opacity: 0; }
}

/* Duration: 300ms, easing: ease-out */
```

### Progress Bar

- Height: 2px
- Color: Matches variant border color
- Animates from 100% → 0% width over duration
- Pauses on hover/focus

## Integration Examples

### In an Island Component

```tsx
/** @jsxImportSource preact */
import { toast } from "../lib/toast.ts";

export default function CreateFlashcardForm() {
  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/flashcards", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        toast.success("Flashcard created successfully!");
      } else {
        toast.error("Failed to create flashcard");
      }
    } catch (error) {
      toast.error("Network error - please try again");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
    </form>
  );
}
```

### In a Route Handler

```tsx
// routes/api/flashcards.ts
import { toast } from "../lib/toast.ts";

export const handler: Handlers = {
  async POST(req, ctx) {
    try {
      // Process request...
      return new Response(JSON.stringify({ success: true }));
    } catch (error) {
      // Note: toast won't work server-side, use client-side error handling
      return new Response(
        JSON.stringify({ error: "Failed to create flashcard" }),
        { status: 500 }
      );
    }
  }
};
```

### With Loading States

```tsx
import { useSignal } from "@preact/signals";
import { toast } from "../lib/toast.ts";

export default function DeckActions() {
  const isLoading = useSignal(false);

  const handleSync = async () => {
    let toastId: string | null = null;

    try {
      isLoading.value = true;
      toastId = toast.info("Syncing deck...", 0); // No auto-dismiss

      await syncDeck();

      dismissToast(toastId);
      toast.success("Deck synced successfully!");
    } catch (error) {
      if (toastId) dismissToast(toastId);
      toast.error("Sync failed - please try again");
    } finally {
      isLoading.value = false;
    }
  };

  return (
    <button onClick={handleSync} disabled={isLoading.value}>
      Sync Deck
    </button>
  );
}
```

### Queue Management

```tsx
// Show multiple toasts - only 3 visible at a time
toast.info("Starting backup...");
toast.success("Deck 1 backed up");
toast.success("Deck 2 backed up");
toast.success("Deck 3 backed up");
toast.success("Deck 4 backed up"); // Queued until earlier toast dismissed

// Clear all toasts
import { dismissAllToasts } from "../lib/toast.ts";

dismissAllToasts(); // Useful for navigation or cleanup
```

## Best Practices

### When to Use Toasts

**Use toasts for:**
- Confirmation of successful actions ("Flashcard saved!")
- Non-critical errors that don't block workflow
- Brief status updates ("Syncing in progress...")
- Undo notifications ("Card deleted. Undo?")

**Don't use toasts for:**
- Critical errors requiring user action (use Modal instead)
- Complex messages with multiple actions (use Alert component)
- Persistent status information (use status bar)
- Form validation errors (use inline validation)

### Duration Guidelines

```tsx
// Quick confirmations (2-3 seconds)
toast.success("Saved!", 2000);

// Standard notifications (5 seconds) - DEFAULT
toast.info("Deck updated");

// Important warnings (7-10 seconds)
toast.warning("Session expires in 5 minutes", 10000);

// Critical errors (no auto-dismiss)
toast.error("Connection lost - please reconnect", 0);
```

### Message Writing

**Good Examples:**
```tsx
toast.success("Flashcard created");
toast.error("Failed to save - network error");
toast.warning("3 cards due for review");
toast.info("Deck exported to Downloads");
```

**Avoid:**
```tsx
toast.success("Success!"); // Too vague
toast.error("Error"); // Not helpful
toast.info("The flashcard you created has been successfully saved to the database"); // Too long
```

### Accessibility Considerations

1. **Don't rely solely on color** - Each variant has a unique icon
2. **Keep messages concise** - Screen readers will read the entire message
3. **Avoid rapid-fire toasts** - Can overwhelm screen reader users
4. **Test with keyboard only** - Ensure all toasts are dismissible
5. **Test with screen reader** - Verify announcements are clear

## API Reference

### `showToast(data: Omit<ToastData, "id">): string`

Show a new toast notification.

**Parameters:**
- `variant`: "info" | "success" | "warning" | "error"
- `message`: string
- `duration?`: number (milliseconds, 0 = no auto-dismiss, default: 5000)

**Returns:** Toast ID (string)

### `dismissToast(id: string): void`

Dismiss a specific toast by ID.

### `dismissAllToasts(): void`

Dismiss all active toasts.

### `toast` Object

Convenience methods for common toast types:

```tsx
toast.info(message: string, duration?: number): string
toast.success(message: string, duration?: number): string
toast.warning(message: string, duration?: number): string
toast.error(message: string, duration?: number): string
```

## Technical Details

### State Management

Uses Preact Signals for reactive state:

```tsx
import { signal } from "@preact/signals";

export const toasts = signal<ToastData[]>([]);
```

All toast mutations update the signal, triggering reactive re-renders in the ToastContainer island.

### Animation Implementation

Animations are CSS-based for performance:
- No JavaScript animation libraries
- GPU-accelerated transforms
- Respects system preferences

### Timer Management

- Uses `setTimeout` for auto-dismiss
- Pauses on hover/focus (stores remaining time)
- Resumes when mouse leaves/blur
- Progress bar updates at ~60fps

### Memory Management

- Toasts automatically removed from state when dismissed
- Timer cleanup in component unmount
- No memory leaks from retained references

## Troubleshooting

### Toasts Not Appearing

1. Verify ToastContainer is in _app.tsx:
   ```tsx
   import ToastContainer from "../islands/ToastContainer.tsx";
   // Add <ToastContainer /> to body
   ```

2. Check z-index conflicts (ToastContainer uses z-50)

3. Verify import paths are correct

### Screen Reader Not Announcing

1. Ensure browser supports ARIA live regions
2. Test with multiple screen readers (behavior varies)
3. Check that messages are concise (very long messages may be truncated)

### Animations Janky

1. Verify GPU acceleration is enabled
2. Check for CSS conflicts
3. Test with `prefers-reduced-motion` media query

### Toasts Overlapping Content

1. Adjust bottom/right positioning in ToastContainer
2. Consider page-specific z-index adjustments
3. Ensure fixed positioning is not conflicting with scrolling containers

## Future Enhancements

Potential improvements for future iterations:

- Action buttons within toasts ("Undo", "View", etc.)
- Sound effects for critical toasts (with audio preferences)
- Grouped toasts (e.g., "3 flashcards saved")
- Custom positioning (top-right, bottom-left, etc.)
- Progress toasts with percentage updates
- Persistent toasts across page navigation (via localStorage)

## Related Components

- **Alert** (`components/ui/Alert.tsx`) - For inline, persistent messages
- **Modal** (`components/ui/Modal.tsx`) - For critical interactions requiring user decision
- **Progress** (`components/ui/Progress.tsx`) - For long-running operations with progress tracking
