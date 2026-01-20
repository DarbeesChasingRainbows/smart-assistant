# Skeleton Loader Components - Usage Guide

## Overview

The skeleton loader components provide loading placeholders that match the Sci-Fi HUD design system. They make perceived load times feel shorter and provide visual feedback during async operations.

## Components

### 1. Skeleton (Base Component)

The foundational skeleton component with multiple variants and animations.

```tsx
import { Skeleton } from "./components/ui/index.ts";

// Text skeleton
<Skeleton variant="text" width="200px" height="20px" />

// Circular avatar skeleton
<Skeleton variant="circular" width="44px" height="44px" />

// Rectangular block
<Skeleton variant="rectangular" width="100%" height="100px" />

// Card skeleton
<Skeleton variant="card" />

// Different animations
<Skeleton animation="shimmer" /> // Default: moving gradient
<Skeleton animation="pulse" />   // Opacity fade
<Skeleton animation="none" />    // Static
```

**Props:**
- `variant`: "text" | "circular" | "rectangular" | "card"
- `width`: string | number (e.g., "200px" or 200)
- `height`: string | number
- `animation`: "shimmer" | "pulse" | "none"
- `class`: Additional CSS classes

### 2. SkeletonCard

Mimics the Card component structure with header and content areas.

```tsx
import { SkeletonCard } from "./components/ui/index.ts";

// Basic card skeleton
<SkeletonCard />

// With header and actions
<SkeletonCard
  showHeader={true}
  showActions={true}
  lines={3}
/>

// Accent variant with pulse animation
<SkeletonCard
  variant="accent"
  animation="pulse"
  lines={5}
/>
```

**Props:**
- `showHeader`: boolean - Show header with title skeleton
- `showActions`: boolean - Show action button skeletons
- `lines`: number - Number of content lines (default: 3)
- `variant`: "default" | "accent" | "success" | "warning" | "error"
- `animation`: "shimmer" | "pulse" | "none"
- `class`: Additional CSS classes

### 3. SkeletonList

Multiple skeleton rows for list items.

```tsx
import { SkeletonList } from "./components/ui/index.ts";

// Simple list
<SkeletonList rows={5} />

// Full-featured list items
<SkeletonList
  rows={3}
  showAvatar={true}
  showSecondaryText={true}
  showAction={true}
  showDividers={true}
/>

// Without dividers
<SkeletonList
  rows={4}
  showDividers={false}
  animation="pulse"
/>
```

**Props:**
- `rows`: number - Number of list items (default: 3)
- `showAvatar`: boolean - Show leading circular avatar/icon
- `showSecondaryText`: boolean - Show secondary text line
- `showAction`: boolean - Show trailing action skeleton
- `showDividers`: boolean - Add dividers between items (default: true)
- `animation`: "shimmer" | "pulse" | "none"
- `class`: Additional CSS classes

### 4. SkeletonText

Multiple lines for paragraph text.

```tsx
import { SkeletonText } from "./components/ui/index.ts";

// Basic paragraph
<SkeletonText lines={4} />

// Customized spacing and height
<SkeletonText
  lines={6}
  lineHeight="20px"
  spacing="relaxed"
/>

// Different spacing options
<SkeletonText lines={3} spacing="tight" />     // mt-2
<SkeletonText lines={3} spacing="normal" />    // mt-3 (default)
<SkeletonText lines={3} spacing="relaxed" />   // mt-4
<SkeletonText lines={3} spacing="large" />     // mt-6
```

**Props:**
- `lines`: number - Number of text lines (default: 3)
- `lineHeight`: string | number - Height of each line (default: "16px")
- `spacing`: "tight" | "normal" | "relaxed" | "large" - Spacing between lines
- `width`: string | number - Width of text block (default: "100%")
- `animation`: "shimmer" | "pulse" | "none"
- `class`: Additional CSS classes

## Usage Examples

### Loading a Deck Card

```tsx
import { SkeletonCard } from "./components/ui/index.ts";

export default function DeckList({ isLoading, decks }: Props) {
  if (isLoading) {
    return (
      <div class="grid gap-4">
        <SkeletonCard showHeader={true} showActions={true} lines={2} />
        <SkeletonCard showHeader={true} showActions={true} lines={2} />
        <SkeletonCard showHeader={true} showActions={true} lines={2} />
      </div>
    );
  }

  return decks.map(deck => <DeckCard deck={deck} />);
}
```

### Loading a Quiz Question

```tsx
import { Skeleton, SkeletonText } from "./components/ui/index.ts";

export default function QuizQuestion({ isLoading, question }: Props) {
  if (isLoading) {
    return (
      <div class="p-6">
        {/* Question text */}
        <SkeletonText lines={2} spacing="normal" />

        {/* Answer options */}
        <div class="mt-6 space-y-4">
          <Skeleton variant="rectangular" height="44px" />
          <Skeleton variant="rectangular" height="44px" />
          <Skeleton variant="rectangular" height="44px" />
          <Skeleton variant="rectangular" height="44px" />
        </div>
      </div>
    );
  }

  return <QuestionContent question={question} />;
}
```

### Loading a Statistics Dashboard

```tsx
import { Skeleton, SkeletonCard, SkeletonText } from "./components/ui/index.ts";

export default function StatsDashboard({ isLoading, stats }: Props) {
  if (isLoading) {
    return (
      <div class="space-y-6">
        {/* Stats grid */}
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard lines={1} />
          <SkeletonCard lines={1} />
          <SkeletonCard lines={1} />
        </div>

        {/* Chart area */}
        <SkeletonCard lines={0}>
          <Skeleton variant="rectangular" height="300px" />
        </SkeletonCard>

        {/* Recent activity */}
        <SkeletonCard showHeader={true} lines={0}>
          <SkeletonList rows={5} showAvatar={true} showSecondaryText={true} />
        </SkeletonCard>
      </div>
    );
  }

  return <StatsContent stats={stats} />;
}
```

## Design Features

### Sci-Fi HUD Theme
- Background: `#1a1a1a`
- Shimmer gradient: `#1a1a1a` → `#2a2a2a` → `#3a3a3a` → `#2a2a2a` → `#1a1a1a`
- Sharp corners (border-radius: 0)
- Matches existing Card and component styling

### Animations
- **Shimmer**: Linear gradient moving left-to-right over 1.5s
- **Pulse**: Opacity fading from 0.7 → 1.0 → 0.7 over 1.5s
- **None**: Static placeholder

### Accessibility
- All components have `aria-busy="true"`
- All components have `aria-label="Loading..."`
- All components have `role="status"`
- Animations respect `prefers-reduced-motion` (disabled for users who prefer reduced motion)

### Performance
- Pure CSS animations (no JavaScript)
- No external dependencies
- Minimal DOM overhead
- No layout shift (reserves exact space)

## Best Practices

1. **Match Content Structure**: Use skeleton variants that match the actual content structure
2. **Use Appropriate Counts**: Match the number of skeleton items to expected data
3. **Combine Components**: Mix base Skeleton with specialized components for complex layouts
4. **Respect Motion Preferences**: Animations automatically disabled for users with motion sensitivity
5. **Provide Context**: Use skeletons for async operations that take >200ms

## Integration with Fresh Islands

```tsx
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { SkeletonCard } from "../components/ui/index.ts";

export default function DeckListIsland() {
  const isLoading = useSignal(true);
  const decks = useSignal([]);

  useEffect(() => {
    fetch("/api/decks")
      .then(res => res.json())
      .then(data => {
        decks.value = data;
        isLoading.value = false;
      });
  }, []);

  if (isLoading.value) {
    return (
      <div class="grid gap-4">
        <SkeletonCard showHeader={true} lines={2} />
        <SkeletonCard showHeader={true} lines={2} />
      </div>
    );
  }

  return <div>{/* Render actual decks */}</div>;
}
```
