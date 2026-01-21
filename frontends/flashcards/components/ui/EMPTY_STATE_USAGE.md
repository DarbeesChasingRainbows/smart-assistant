# Empty State Component Usage Guide

## Overview

The Empty State component system provides a consistent, accessible, and visually cohesive way to handle empty states across the flashcards application. Built with the Sci-Fi HUD design system, these components follow UX best practices from 2026 research on microcopy, geometric illustrations, and accessibility.

## Design System

### Sci-Fi HUD Characteristics

- **Sharp corners**: No border-radius (or minimal 2px max)
- **Monospace fonts**: For technical, data-driven feel
- **High contrast colors**:
  - Cyan `#00d9ff` (action/informational)
  - Green `#00ff88` (celebratory/success)
  - Amber `#ffb000` (warnings)
- **Geometric SVG illustrations**: Minimal line art, 120px × 120px
- **Dark backgrounds**: `#0a0a0a` to `#1a1a1a` range
- **Border treatments**: Instead of drop shadows

### Accessibility Compliance

#### Kid Test
Every interactive element has visible text labels. Icons never appear alone.

✅ **Correct:**
```tsx
<button>Create Deck</button>
```

❌ **Wrong:**
```tsx
<button aria-label="Create Deck"><IconPlus /></button>
```

#### Fitts's Law
All interactive elements meet 44px × 44px minimum touch targets.

```tsx
// All buttons automatically comply
<button class="min-h-[44px] min-w-[120px] px-6 py-3">
  Create Deck
</button>
```

## Component API

### EmptyState

Main component for creating custom empty states.

```tsx
interface EmptyStateProps {
  variant: "informational" | "action" | "celebratory";
  title: string;
  description: string;
  illustration?: "no-decks" | "no-cards" | "all-done" | "no-results" | "custom";
  customSvg?: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  isDynamic?: boolean;
  class?: string;
}
```

### Variants

#### Informational
Neutral state, no immediate action required.

- **Border**: Subtle `#333`
- **Title color**: Cyan `#00d9ff`
- **Background**: Transparent
- **Use case**: Search results, filters, read-only states

#### Action
Requires user action to proceed.

- **Border**: Cyan `#00d9ff`
- **Title color**: Cyan `#00d9ff`
- **Background**: `#0a0a0a`
- **Use case**: Empty collections, onboarding, creation prompts

#### Celebratory
Positive achievement or completion state.

- **Border**: Green `#00ff88`
- **Title color**: Green `#00ff88`
- **Background**: `#001a0f`
- **Use case**: All tasks done, milestones reached, success states

## Predefined Scenarios

### 1. No Decks

**When to use:** User has no decks created yet.

```tsx
import { NoDecksEmptyState } from "@/components/ui/EmptyState.tsx";

<NoDecksEmptyState
  onCreateDeck={() => router.push('/decks/new')}
/>
```

**Microcopy:**
- Title: "No Decks Yet"
- Description: "Create your first deck to start learning with spaced repetition"
- CTA: "Create Deck"

---

### 2. No Cards in Deck

**When to use:** Deck exists but contains no flashcards.

```tsx
import { NoCardsEmptyState } from "@/components/ui/EmptyState.tsx";

<NoCardsEmptyState
  onCreateCard={() => openCardModal()}
  onImportCards={() => openImportDialog()}
/>
```

**Microcopy:**
- Title: "No Flashcards"
- Description: "Add cards to this deck to begin your learning journey"
- Primary CTA: "Create Card"
- Secondary CTA: "Import Cards" (optional)

---

### 3. All Cards Reviewed (Celebratory)

**When to use:** User completed all due reviews.

```tsx
import { AllDoneEmptyState } from "@/components/ui/EmptyState.tsx";

<AllDoneEmptyState
  onReviewAgain={() => startNewSession()}
  onViewStats={() => router.push('/stats')}
/>
```

**Microcopy:**
- Title: "All Done! 🎯"
- Description: "You've reviewed all due cards. Excellent work!"
- Primary CTA: "Review Again"
- Secondary CTA: "View Stats" (optional)

---

### 4. Search No Results

**When to use:** Search or filter returns no matches.

```tsx
import { NoResultsEmptyState } from "@/components/ui/EmptyState.tsx";

<NoResultsEmptyState
  onClearFilters={() => resetFilters()}
  searchTerm={searchQuery}
  isDynamic
/>
```

**Microcopy:**
- Title: "No Cards Found"
- Description: "Try different keywords or adjust your filters"
- CTA: "Clear Filters"

**Note:** Set `isDynamic={true}` for search results as they change based on user input.

---

## Custom Empty States

For unique scenarios, use the base `EmptyState` component:

```tsx
import EmptyState from "@/components/ui/EmptyState.tsx";

<EmptyState
  variant="action"
  title="Import Failed"
  description="The CSV file format wasn't recognized. Please check the template."
  illustration="no-results"
  primaryAction={{
    label: "Download Template",
    onClick: () => downloadTemplate()
  }}
  secondaryAction={{
    label: "Try Again",
    onClick: () => retryImport()
  }}
/>
```

### Custom SVG Illustrations

For non-standard illustrations, use `illustration="custom"`:

```tsx
<EmptyState
  variant="informational"
  title="Custom State"
  description="This uses a custom SVG illustration"
  illustration="custom"
  customSvg={`
    <svg viewBox="0 0 120 120" fill="none">
      <rect x="20" y="20" width="80" height="80" stroke="#00d9ff" stroke-width="2" />
    </svg>
  `}
/>
```

**SVG Guidelines:**
- ViewBox: `0 0 120 120`
- Stroke color: `#00d9ff` (cyan) or `#00ff88` (green)
- Stroke width: 2-3px
- Sharp corners (no rounded paths)
- Minimal, geometric patterns
- Include `aria-hidden="true"` (automatically applied)

## Microcopy Writing Guidelines

Based on [Shopify 2026 Guide](https://www.shopify.com/enterprise/blog/how-to-write-microcopy-that-influences-customers-even-if-they-don-t-read-it) and [UX Writing Hub](https://uxwritinghub.com/empty-state-examples/):

### Titles (15-30 characters)
- Be concise and descriptive
- Use present tense
- Avoid negative framing

✅ "No Decks Yet" (positive, concise)
❌ "You Don't Have Any Decks" (negative, wordy)

### Descriptions (40-80 characters)
- Explain what's missing AND what to do next
- Use conversational tone
- Focus on benefits

✅ "Create your first deck to start learning with spaced repetition"
❌ "There are no decks in the system"

### CTAs (10-20 characters)
- Start with action verbs
- Be specific about outcome
- Use sentence case

✅ "Create Deck"
❌ "Click here"

### Voice and Tone
- **Informational**: Neutral, helpful
- **Action**: Encouraging, clear
- **Celebratory**: Enthusiastic, rewarding

## Integration Examples

### In a Route Component

```tsx
// routes/decks/index.tsx
import { NoDecksEmptyState } from "@/components/ui/EmptyState.tsx";
import DeckList from "@/islands/DeckList.tsx";

export default function DecksPage({ data }: PageProps) {
  const { decks } = data;

  if (decks.length === 0) {
    return (
      <main class="container mx-auto p-6">
        <NoDecksEmptyState
          onCreateDeck={() => {
            window.location.href = '/decks/new';
          }}
        />
      </main>
    );
  }

  return <DeckList decks={decks} />;
}
```

### In an Island Component

```tsx
// islands/ReviewSession.tsx
import { useSignal } from "@preact/signals";
import { AllDoneEmptyState } from "@/components/ui/EmptyState.tsx";

export default function ReviewSession({ deckId }: { deckId: string }) {
  const cardsRemaining = useSignal(0);

  if (cardsRemaining.value === 0) {
    return (
      <AllDoneEmptyState
        onReviewAgain={() => {
          // Restart session
          loadNewCards();
        }}
        onViewStats={() => {
          window.location.href = `/decks/${deckId}/stats`;
        }}
      />
    );
  }

  return <ReviewCard />;
}
```

### With Search/Filter Islands

```tsx
// islands/CardSearch.tsx
import { useSignal, computed } from "@preact/signals";
import { NoResultsEmptyState } from "@/components/ui/EmptyState.tsx";

export default function CardSearch() {
  const searchTerm = useSignal("");
  const filteredCards = computed(() => {
    // Filter logic
    return cards.value.filter(card =>
      card.front.toLowerCase().includes(searchTerm.value.toLowerCase())
    );
  });

  return (
    <>
      <input
        type="search"
        value={searchTerm.value}
        onInput={(e) => searchTerm.value = e.currentTarget.value}
        placeholder="Search cards..."
      />

      {filteredCards.value.length === 0 ? (
        <NoResultsEmptyState
          onClearFilters={() => searchTerm.value = ""}
          searchTerm={searchTerm.value}
        />
      ) : (
        <CardGrid cards={filteredCards.value} />
      )}
    </>
  );
}
```

## Layout Patterns

### Centered in Main Content

```tsx
<main class="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
  <NoDecksEmptyState onCreateDeck={() => {}} />
</main>
```

### Inside Container

```tsx
<div class="container mx-auto p-6">
  <h1>My Decks</h1>
  <NoDecksEmptyState onCreateDeck={() => {}} />
</div>
```

### In Card/Panel

```tsx
<section class="border border-[#333] bg-[#1a1a1a] p-6">
  <NoCardsEmptyState
    onCreateCard={() => {}}
    onImportCards={() => {}}
  />
</section>
```

## Animations

Empty states support `isDynamic` for screen reader announcements:

```tsx
// When content changes dynamically (e.g., search results)
<NoResultsEmptyState
  onClearFilters={() => {}}
  isDynamic  // Adds aria-live="polite"
/>
```

This ensures screen readers announce the empty state when search results change.

## Responsive Design

Empty states are responsive by default:

- **Mobile**: Single column, full-width buttons
- **Desktop**: Buttons display inline (side-by-side)

```tsx
// Buttons stack on mobile, inline on sm+ screens
<div class="flex flex-col sm:flex-row gap-3">
  <button>Primary</button>
  <button>Secondary</button>
</div>
```

## Testing Checklist

When creating custom empty states:

- [ ] Title is concise (15-30 characters)
- [ ] Description explains context and action (40-80 characters)
- [ ] CTAs start with action verbs
- [ ] Max 2 CTAs (Hick's Law)
- [ ] All buttons have visible text labels (Kid Test)
- [ ] Touch targets are ≥ 44px (Fitts's Law)
- [ ] Variant matches user intent (informational/action/celebratory)
- [ ] Illustration matches context
- [ ] SVG uses Sci-Fi HUD colors
- [ ] Background/border colors match variant
- [ ] `isDynamic` set for changing content
- [ ] Semantic HTML used (`<section>`, `<h2>`, `<p>`)

## Related Components

- **Skeleton**: For loading states before content appears
- **Toast**: For temporary notifications after actions
- **Alert**: For inline contextual messages
- **Modal**: For focused interactions that create content

## References

- [Shopify Microcopy Guide 2026](https://www.shopify.com/enterprise/blog/how-to-write-microcopy-that-influences-customers-even-if-they-don-t-read-it)
- [UX Writing Hub Empty States](https://uxwritinghub.com/empty-state-examples/)
- [Slate Designers Illustration Trends 2026](https://slatedesigner.com/blogs-inner-page/illustration-trends)
- [Hick's Law](https://lawsofux.com/hicks-law/) - Limit choices to reduce decision time
- [Fitts's Law](https://lawsofux.com/fittss-law/) - 44px minimum touch targets
