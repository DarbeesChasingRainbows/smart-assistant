# UI Components - Sci-Fi HUD Design System

This directory contains reusable UI primitives following the **Sci-Fi HUD** design language for the flashcards frontend.

## Design Principles

All components in this directory follow these principles:

### Visual Language
- **Dark backgrounds**: `#0a0a0a` to `#1a1a1a` range
- **Sharp corners**: `border-radius: 0` (no rounding)
- **Border treatments**: Use borders instead of drop shadows
- **Monospace fonts**: For data, numbers, and technical information
- **High contrast accents**:
  - Cyan: `#00d9ff` (primary accent)
  - Green: `#00ff88` (success)
  - Amber: `#ffb000` (warning)
  - Red: `#ff4444` (error)
- **Muted text**: `#888` to `#aaa` for secondary information

### Accessibility Requirements
1. **The Kid Test**: Every icon must have visible text labels
2. **Fitts's Law**: All interactive elements minimum 44px × 44px touch targets
3. **High contrast**: WCAG AA minimum
4. **Semantic HTML**: Use proper elements
5. **ARIA attributes**: Where appropriate

## Components

### Card.tsx

Container component with consistent styling.

**Props:**
- `children` (ComponentChildren) - Card content
- `title?` (string) - Optional header title
- `subtitle?` (string) - Optional header subtitle
- `headerActions?` (ComponentChildren) - Actions to display in header
- `variant?` ("default" | "accent" | "success" | "warning" | "error") - Border color variant
- `padding?` ("none" | "small" | "medium" | "large") - Internal padding
- `class?` (string) - Additional CSS classes

**Usage:**
```tsx
import Card from "./components/ui/Card.tsx";

<Card
  title="Flashcard Statistics"
  subtitle="Your learning progress"
  variant="accent"
>
  <p>Content goes here...</p>
</Card>
```

---

### Badge.tsx

Status/tag indicator with technical styling.

**Props:**
- `children` (ComponentChildren) - Badge text (required)
- `variant?` ("default" | "accent" | "success" | "warning" | "error" | "info") - Color scheme
- `size?` ("small" | "medium" | "large") - Badge size
- `class?` (string) - Additional CSS classes

**Usage:**
```tsx
import Badge from "./components/ui/Badge.tsx";

<Badge variant="success">Active</Badge>
<Badge variant="warning" size="small">Beta</Badge>
```

---

### Modal.tsx

Standardized modal wrapper with backdrop.

**Props:**
- `open` (boolean) - Whether modal is visible
- `onClose` (() => void) - Close callback
- `title?` (string) - Modal title
- `subtitle?` (string) - Modal subtitle
- `children` (ComponentChildren) - Modal body content
- `footer?` (ComponentChildren) - Footer actions (buttons)
- `preventClose?` (boolean) - Prevent closing via backdrop/escape (for loading states)
- `variant?` ("default" | "accent" | "success" | "warning" | "error") - Border color
- `maxWidth?` ("small" | "medium" | "large" | "full") - Maximum width
- `class?` (string) - Additional CSS classes

**Usage:**
```tsx
import { useSignal } from "@preact/signals";
import Modal from "./components/ui/Modal.tsx";

const isOpen = useSignal(false);

<Modal
  open={isOpen.value}
  onClose={() => isOpen.value = false}
  title="Create Flashcard"
  subtitle="Add a new card to your deck"
  footer={
    <>
      <button onClick={() => isOpen.value = false}>Cancel</button>
      <button onClick={handleSubmit}>Create</button>
    </>
  }
>
  <form>...</form>
</Modal>
```

---

### Alert.tsx

Error/success/info/warning messages.

**Props:**
- `variant` ("error" | "warning" | "info" | "success") - Alert type (required)
- `title?` (string) - Alert title
- `children` (ComponentChildren) - Alert message
- `onAction?` (() => void) - Optional action callback
- `actionLabel?` (string) - Action button text (required if onAction provided)
- `onDismiss?` (() => void) - Optional dismiss callback
- `class?` (string) - Additional CSS classes

**Usage:**
```tsx
import Alert from "./components/ui/Alert.tsx";

<Alert
  variant="error"
  title="Connection Failed"
  onAction={() => retryConnection()}
  actionLabel="Retry"
>
  Unable to reach the backend server.
</Alert>
```

---

### Progress.tsx

Progress bar/indicator with technical styling.

**Props:**
- `value` (number) - Current value
- `max` (number) - Maximum value
- `label?` (string) - Progress label
- `showValue?` (boolean) - Show numeric value (e.g., "450 / 1000")
- `showPercentage?` (boolean) - Show percentage (default: true)
- `variant?` ("default" | "accent" | "success" | "warning" | "error") - Color scheme
- `size?` ("small" | "medium" | "large") - Bar height
- `class?` (string) - Additional CSS classes

**Usage:**
```tsx
import Progress from "./components/ui/Progress.tsx";

<Progress
  value={75}
  max={100}
  label="Study Progress"
  variant="success"
  showPercentage
/>
```

---

## Non-Interactive Nature

All components in this directory are **presentational only**. They do not:
- Make API calls
- Manage complex state (beyond basic UI state)
- Contain business logic

For interactive functionality, use these components as building blocks within islands.

## Styling Consistency

All components use:
- `border-radius: 0` for sharp corners
- Consistent color palette from design system
- Monospace fonts for technical data
- 44px minimum touch targets for interactive elements
- Border treatments instead of box-shadow

## Migration Path

Existing components can gradually adopt these primitives:
1. Replace inline styling with these components
2. Update color schemes to match Sci-Fi HUD palette
3. Ensure all interactive elements meet accessibility requirements
4. Remove rounded corners and replace with sharp edges
