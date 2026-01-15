# Form Components

This directory contains standardized form input components with consistent styling and accessibility features.

## Design Principles

All form components follow:
- **Sci-Fi HUD aesthetic**: Dark backgrounds, sharp corners, technical feel
- **Visible labels**: Never hidden (sr-only not allowed)
- **Error handling**: Clear error display with red accent
- **44px touch targets**: Minimum height for accessibility
- **Semantic HTML**: Proper form elements and attributes
- **ARIA support**: Proper linking of labels, errors, and help text

## Components

### FormInput.tsx

Standardized text input with label and error display.

**Props:**
- `label` (string) - Input label (required, always visible)
- `value` (string) - Input value
- `onChange` ((e: Event) => void) - Change handler
- `onInput?` ((e: Event) => void) - Input handler (alternative)
- `type?` ("text" | "email" | "password" | "url" | "tel" | "number" | "search") - Input type
- `placeholder?` (string) - Placeholder text
- `error?` (string) - Error message to display
- `required?` (boolean) - Whether field is required
- `disabled?` (boolean) - Whether field is disabled
- `inputMode?` ("text" | "decimal" | "numeric" | "tel" | "email" | "url") - Mobile keyboard hint
- `monospace?` (boolean) - Use monospace font (auto for numeric types)
- `helpText?` (string) - Additional help text
- `id?` (string) - HTML id attribute
- `name?` (string) - HTML name attribute
- `class?` (string) - Additional CSS classes

**Usage:**
```tsx
import FormInput from "./components/forms/FormInput.tsx";
import { useSignal } from "@preact/signals";

const email = useSignal("");
const error = useSignal("");

<FormInput
  label="Email Address"
  type="email"
  value={email.value}
  onChange={(e) => email.value = e.currentTarget.value}
  error={error.value}
  required
  helpText="We'll never share your email"
/>
```

---

### FormSelect.tsx

Dropdown select with label and consistent styling.

**Props:**
- `label` (string) - Select label (required, always visible)
- `value` (string) - Selected value
- `onChange` ((e: Event) => void) - Change handler
- `children` (ComponentChildren) - Option elements
- `error?` (string) - Error message to display
- `required?` (boolean) - Whether field is required
- `disabled?` (boolean) - Whether field is disabled
- `helpText?` (string) - Additional help text
- `id?` (string) - HTML id attribute
- `name?` (string) - HTML name attribute
- `class?` (string) - Additional CSS classes

**Usage:**
```tsx
import FormSelect from "./components/forms/FormSelect.tsx";
import { useSignal } from "@preact/signals";

const deckId = useSignal("");

<FormSelect
  label="Select Deck"
  value={deckId.value}
  onChange={(e) => deckId.value = e.currentTarget.value}
  required
>
  <option value="">Choose a deck...</option>
  {decks.map(d => (
    <option key={d.id} value={d.id}>{d.name}</option>
  ))}
</FormSelect>
```

---

### FormTextarea.tsx

Multi-line text input with label and character counter.

**Props:**
- `label` (string) - Textarea label (required, always visible)
- `value` (string) - Textarea value
- `onChange` ((e: Event) => void) - Change handler
- `onInput?` ((e: Event) => void) - Input handler (alternative)
- `placeholder?` (string) - Placeholder text
- `rows?` (number) - Number of visible rows (default: 4)
- `error?` (string) - Error message to display
- `required?` (boolean) - Whether field is required
- `disabled?` (boolean) - Whether field is disabled
- `maxLength?` (number) - Maximum character length
- `showCharCount?` (boolean) - Show character counter
- `resize?` ("none" | "vertical" | "horizontal" | "both") - Resize behavior
- `helpText?` (string) - Additional help text
- `id?` (string) - HTML id attribute
- `name?` (string) - HTML name attribute
- `class?` (string) - Additional CSS classes

**Usage:**
```tsx
import FormTextarea from "./components/forms/FormTextarea.tsx";
import { useSignal } from "@preact/signals";

const answer = useSignal("");

<FormTextarea
  label="Answer"
  value={answer.value}
  onChange={(e) => answer.value = e.currentTarget.value}
  rows={5}
  maxLength={500}
  showCharCount
  required
  helpText="Provide a detailed answer"
/>
```

---

## Common Patterns

### Error Handling

All form components accept an `error` prop that displays a red error message below the input:

```tsx
const nameError = useSignal("");

const validateName = (value: string) => {
  if (!value.trim()) {
    nameError.value = "Name is required";
    return false;
  }
  nameError.value = "";
  return true;
};

<FormInput
  label="Name"
  value={name.value}
  onChange={(e) => {
    name.value = e.currentTarget.value;
    validateName(name.value);
  }}
  error={nameError.value}
  required
/>
```

### Monospace for Technical Data

Numeric inputs automatically use monospace font. You can explicitly control this:

```tsx
<FormInput
  label="API Key"
  value={apiKey.value}
  onChange={(e) => apiKey.value = e.currentTarget.value}
  monospace={true}
  placeholder="sk_live_..."
/>
```

### Help Text

Use `helpText` for additional guidance that isn't an error:

```tsx
<FormInput
  label="Username"
  value={username.value}
  onChange={(e) => username.value = e.currentTarget.value}
  helpText="3-20 characters, letters and numbers only"
/>
```

### Mobile Keyboard Optimization

Use `inputMode` to show appropriate mobile keyboards:

```tsx
<FormInput
  label="Amount"
  type="text"
  inputMode="decimal"
  value={amount.value}
  onChange={(e) => amount.value = e.currentTarget.value}
/>
```

---

## Accessibility Features

### Visible Labels
All form components require a `label` prop that is always visible. Hidden labels (sr-only) are not supported.

### Error Announcements
Error messages are linked via `aria-describedby` and use `role="alert"` for screen reader announcements.

### Required Indicators
Required fields show a red asterisk (*) next to the label with `aria-label="required"`.

### Touch Targets
All inputs have a minimum height of 44px to meet touch target requirements.

### Proper Attributes
Form components include appropriate HTML attributes:
- `required` for validation
- `disabled` for non-interactive states
- `type` for semantic input types
- `inputMode` for mobile keyboard hints
- `maxLength` for character limits

---

## Migration from Existing Forms

To migrate existing forms to use these components:

1. **Replace inline inputs:**
   ```tsx
   // Before
   <input
     type="text"
     value={name.value}
     onChange={(e) => name.value = e.currentTarget.value}
     class="input input-bordered"
   />

   // After
   <FormInput
     label="Name"
     value={name.value}
     onChange={(e) => name.value = e.currentTarget.value}
   />
   ```

2. **Add error handling:**
   ```tsx
   <FormInput
     label="Email"
     type="email"
     value={email.value}
     onChange={handleEmailChange}
     error={emailError.value}
     required
   />
   ```

3. **Update styling** - Remove custom classes and use component props:
   ```tsx
   <FormTextarea
     label="Description"
     value={desc.value}
     onChange={(e) => desc.value = e.currentTarget.value}
     rows={6}
     maxLength={1000}
     showCharCount
   />
   ```
