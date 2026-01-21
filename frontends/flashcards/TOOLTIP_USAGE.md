# Tooltip Component Usage Guide

Accessible tooltip implementation for the Flashcards frontend following WCAG 2.1 Level AA standards and ARIA best practices.

## Table of Contents

- [Quick Start](#quick-start)
- [Component API](#component-api)
- [Accessibility Compliance](#accessibility-compliance)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)
- [Advanced Usage](#advanced-usage)
- [Design System](#design-system)
- [Research & Standards](#research--standards)

## Quick Start

Import and wrap any focusable element with the `Tooltip` component:

```tsx
import Tooltip from "../components/ui/Tooltip.tsx";

export default function MyComponent() {
  return (
    <Tooltip content="Save your changes" position="top">
      <button class="btn">
        <svg>...</svg>
        Save
      </button>
    </Tooltip>
  );
}
```

## Component API

### Tooltip Component

```tsx
interface TooltipProps {
  /** Tooltip text content (must be plain text, no interactive elements) */
  content: string;

  /** Preferred position relative to trigger (default: "top") */
  position?: "top" | "bottom" | "left" | "right" | "auto";

  /** Delay before showing on hover in milliseconds (default: 500ms) */
  delay?: number;

  /** The trigger element */
  children: ComponentChildren;

  /** Additional CSS classes for the trigger wrapper */
  class?: string;
}
```

### Props Details

**`content`** (required)
- Plain text string only
- No HTML or interactive elements
- Keep concise (recommended: under 250 characters)
- Should add value, not repeat visible text

**`position`**
- `"top"` - Above trigger (default)
- `"bottom"` - Below trigger
- `"left"` - Left of trigger
- `"right"` - Right of trigger
- `"auto"` - Smart positioning based on viewport space

**`delay`**
- Milliseconds to wait before showing on hover
- Default: 500ms
- Keyboard focus shows immediately (no delay)
- Recommendation: 300-700ms for most use cases

**`children`**
- The trigger element that activates the tooltip
- Must be keyboard focusable (button, link, or have `tabIndex={0}`)
- Should already have visible text (Kid Test compliance)

## Accessibility Compliance

The Tooltip component follows WCAG 2.1 Level AA standards and ARIA best practices:

### ARIA Implementation

✅ **Correct ARIA Usage:**
- `role="tooltip"` on tooltip element
- `aria-describedby` on trigger element (connects trigger to tooltip)
- Tooltip ID is unique per instance
- `aria-describedby` only added when tooltip is visible

❌ **What We Don't Do:**
- No `aria-label` on tooltip element (violates pattern)
- No `aria-describedby` on tooltip itself (circular reference)
- No `role="tooltip"` on trigger element (wrong role)

### Keyboard Interaction

| Key | Action |
|-----|--------|
| `Tab` | Focus trigger, show tooltip immediately |
| `Shift+Tab` | Move focus away, hide tooltip |
| `Escape` | Close tooltip |
| `Enter/Space` | Activate trigger (tooltip stays visible) |

### Mouse Interaction

| Action | Result |
|--------|--------|
| Hover over trigger | Show tooltip after delay |
| Move mouse away | Hide tooltip |
| Hover over tooltip | Keep tooltip visible |
| Mouse leave tooltip | Hide tooltip |

### Screen Reader Support

- Tooltip content announced automatically when trigger receives focus
- Uses `aria-describedby` for association (polite announcement)
- No focus trap (focus stays on trigger)
- Content is always accessible even if tooltip doesn't appear

### Focus Management

- Tooltip never receives focus
- Focus remains on trigger element
- Tooltip can be hovered without losing trigger focus
- ESC key returns control to trigger

## Usage Examples

### Basic Button Tooltip

```tsx
<Tooltip content="Save your work" position="top">
  <button class="btn">
    <svg>...</svg>
    Save
  </button>
</Tooltip>
```

### Link with Tooltip

```tsx
<Tooltip content="View detailed statistics" position="right">
  <a href="/stats" class="link">
    Statistics
  </a>
</Tooltip>
```

### Icon Button with Text (Kid Test Compliant)

```tsx
<Tooltip content="Edit flashcard properties and scheduling" position="top">
  <button class="btn btn-icon">
    <svg class="w-4 h-4">...</svg>
    <span class="ml-2">Edit</span>
  </button>
</Tooltip>
```

### Auto-Positioning Near Viewport Edge

```tsx
{/* Automatically flips to fit viewport */}
<Tooltip content="This tooltip will position itself smartly" position="auto">
  <button class="btn">Action</button>
</Tooltip>
```

### Custom Delay

```tsx
{/* Show faster for frequently-used controls */}
<Tooltip content="Quick action" position="top" delay={200}>
  <button class="btn">Quick</button>
</Tooltip>

{/* Show slower to avoid distraction */}
<Tooltip content="Advanced settings" position="top" delay={800}>
  <button class="btn">Advanced</button>
</Tooltip>
```

### Non-Button Elements

```tsx
{/* Make div focusable with tabIndex */}
<Tooltip content="Click to expand details">
  <div tabIndex={0} role="button" class="card">
    <span>Flashcard Title</span>
  </div>
</Tooltip>
```

### Disabled Elements

```tsx
{/* Wrap disabled element in focusable container */}
<Tooltip content="Action unavailable: Complete setup first">
  <span tabIndex={0}>
    <button disabled class="btn">
      Unavailable
    </button>
  </span>
</Tooltip>
```

## Best Practices

### When to Use Tooltips

✅ **Good Use Cases:**
- Explain abbreviated or technical terms
- Provide additional context for actions
- Clarify consequences of destructive actions
- Show keyboard shortcuts
- Display truncated text in full

❌ **Poor Use Cases:**
- Critical information (use visible text instead)
- Long explanations (use help text or modal)
- Interactive content (links, buttons)
- Repeating visible text exactly
- Mobile-only interfaces (hover unreliable)

### Content Guidelines

**Do:**
- Keep concise (under 250 characters)
- Use complete sentences
- Front-load important information
- Match tone to UI (technical for Sci-Fi HUD)
- Provide unique value

**Don't:**
- Include HTML or formatting
- Repeat button text exactly
- Use for critical errors or warnings
- Add interactive elements (links, buttons)
- Write novels (use help documentation)

### Kid Test Compliance

**Rule:** Icons must have visible text labels, not just tooltips.

✅ **Correct:**
```tsx
<Tooltip content="Remove this item from your collection">
  <button>
    <TrashIcon />
    <span>Delete</span> {/* Visible text */}
  </button>
</Tooltip>
```

❌ **Incorrect:**
```tsx
<Tooltip content="Delete"> {/* Tooltip is not a substitute */}
  <button>
    <TrashIcon /> {/* Icon only, fails Kid Test */}
  </button>
</Tooltip>
```

### Fitts's Law Compliance

**Rule:** Interactive elements must be at least 44px × 44px.

✅ **Correct:**
```tsx
<Tooltip content="Settings">
  <button class="min-h-[44px] min-w-[44px] px-4 py-2">
    Settings
  </button>
</Tooltip>
```

❌ **Incorrect:**
```tsx
<Tooltip content="Settings">
  <button class="p-1"> {/* Too small */}
    Settings
  </button>
</Tooltip>
```

## Advanced Usage

### Programmatic Control (useTooltip Hook)

For advanced cases where declarative API isn't sufficient:

```tsx
import { useTooltip } from "../lib/useTooltip.ts";

export default function AdvancedComponent() {
  const tooltip = useTooltip();

  const handleSpecialEvent = (e: MouseEvent) => {
    tooltip.show(
      e.currentTarget as HTMLElement,
      "Dynamic content based on state",
      "top"
    );
  };

  return (
    <div>
      <button
        onMouseEnter={handleSpecialEvent}
        onMouseLeave={() => tooltip.hide()}
      >
        Hover Me
      </button>
      {tooltip.render()}
    </div>
  );
}
```

### Multiple Tooltips in Same Component

Each tooltip instance is independent with unique IDs:

```tsx
<div class="button-group">
  <Tooltip content="Save changes">
    <button>Save</button>
  </Tooltip>
  <Tooltip content="Discard changes">
    <button>Cancel</button>
  </Tooltip>
  <Tooltip content="Preview before saving">
    <button>Preview</button>
  </Tooltip>
</div>
```

### Conditional Tooltips

```tsx
<Tooltip content={isComplete ? "Task completed" : "Task in progress"}>
  <button>{isComplete ? "Done" : "Working..."}</button>
</Tooltip>
```

### Styling Trigger Wrapper

```tsx
<Tooltip content="Information" class="inline-block w-full">
  <button class="w-full">
    Full Width Button
  </button>
</Tooltip>
```

## Design System

The Tooltip follows the Sci-Fi HUD design language:

### Visual Characteristics

- **Background:** `#1a1a1a` (dark gray)
- **Border:** 1px solid `#00d9ff` (cyan)
- **Text:** `#ffffff` (white), 12px monospace
- **Corners:** Sharp (border-radius: 0)
- **Shadow:** `0 2px 8px rgba(0, 217, 255, 0.2)` (subtle cyan glow)
- **Max Width:** 250px with word-wrap
- **Padding:** 6px vertical, 10px horizontal
- **Z-Index:** 9999 (above most UI elements)

### Animations

**Fade In:**
- Duration: 150ms
- Easing: ease-out
- Property: opacity (0 → 1)

**Prefers-Reduced-Motion:**
- Animation disabled automatically
- Instant appearance/disappearance
- Respects user accessibility preferences

### Positioning

- **Offset:** 8px from trigger
- **Auto-Detection:** Flips to fit viewport
- **Priority:** Prefers specified position, then tries alternatives
- **Fallback Order:** top → bottom → right → left

## Integration Examples

### FlashcardManager Island

```tsx
<Tooltip content="Edit this flashcard (modify question and answer)" position="top">
  <button onClick={() => openEditModal(card)} class="btn">
    <EditIcon />
    Edit
  </button>
</Tooltip>

<Tooltip content="Permanently delete this flashcard (cannot be undone)" position="top">
  <button onClick={() => deleteFlashcard(card.id)} class="btn btn-danger">
    <TrashIcon />
    Delete
  </button>
</Tooltip>
```

### DeckEditButton Island

```tsx
<Tooltip content="Edit deck metadata (name, description, category, difficulty)" position="top">
  <button onClick={openModal} class="btn">
    <EditIcon />
    Edit Deck
  </button>
</Tooltip>
```

### CloneDeckButton Island

```tsx
<Tooltip content="Create your own editable copy of this deck" position="top">
  <button onClick={() => showModal.value = true} class="btn">
    <CloneIcon />
    Clone to My Collection
  </button>
</Tooltip>
```

## Research & Standards

This implementation is based on authoritative sources:

### WCAG 2.1 Standards
- [WCAG 2.1 Level AA](https://www.w3.org/WAI/WCAG21/quickref/)
- [Understanding Success Criterion 1.4.13 (Content on Hover or Focus)](https://www.w3.org/WAI/WCAG21/Understanding/content-on-hover-or-focus.html)

### ARIA Specifications
- [W3C Tooltip Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/)
- [MDN ARIA tooltip role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/tooltip_role)
- [aria-describedby specification](https://www.w3.org/TR/wai-aria-1.2/#aria-describedby)

### Expert Resources
- [The A11Y Collective: Tooltips in Web Accessibility](https://www.a11y-collective.com/blog/tooltips-in-web-accessibility/)
- [Sara Soueidan: Accessible Icon Buttons](https://www.sarasoueidan.com/blog/accessible-icon-buttons/)
- [Inclusive Components: Tooltips & Toggletips](https://inclusive-components.design/tooltips-toggletips/)

### Design Principles
- [Fitts's Law](https://www.interaction-design.org/literature/topics/fitts-law) - Touch target sizing
- [The Kid Test](https://www.nngroup.com/articles/icon-usability/) - Icon labeling

## Troubleshooting

### Tooltip Not Appearing

**Check:**
1. Is trigger element keyboard focusable?
   - Buttons and links are focusable by default
   - Other elements need `tabIndex={0}`
2. Is content prop a non-empty string?
3. Is tooltip being clipped by parent `overflow: hidden`?

### Tooltip Positioning Issues

**Solutions:**
- Use `position="auto"` for smart positioning
- Check for `overflow: hidden` on parent containers
- Ensure trigger has valid `getBoundingClientRect()`
- Test near viewport edges

### Accessibility Issues

**Verify:**
- Trigger has visible text (not just icon)
- Touch target is at least 44px × 44px
- Content provides unique value (not repeating button text)
- Keyboard interaction works (Tab, Escape)

### Performance Concerns

**Optimizations:**
- Tooltip only renders when visible
- Event listeners cleaned up on unmount
- Position calculation debounced
- Single tooltip per trigger (not multiple hidden ones)

## Migration from Old Patterns

### From aria-label to Tooltip

**Before:**
```tsx
<button aria-label="Delete item">
  <TrashIcon />
</button>
```

**After:**
```tsx
<Tooltip content="Permanently delete this item">
  <button>
    <TrashIcon />
    <span>Delete</span>
  </button>
</Tooltip>
```

### From title Attribute to Tooltip

**Before:**
```tsx
<button title="Save changes">
  Save
</button>
```

**After:**
```tsx
<Tooltip content="Save all changes to the server">
  <button>
    Save
  </button>
</Tooltip>
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Required Features:**
- ES2020 JavaScript
- CSS Grid/Flexbox
- `prefers-reduced-motion` media query
- `aria-describedby` support

---

**Last Updated:** 2026-01-21
**Component Version:** 1.0.0
**Maintained By:** Flashcards Frontend Team
