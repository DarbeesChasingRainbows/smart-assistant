# Toast Integration Examples

This document shows practical examples of integrating the toast notification system into existing flashcards frontend components.

## Example 1: Enhancing LoginForm with Toasts

### Before (Using Local Error State)

```tsx
import { useSignal } from "@preact/signals";
import { RetentionApiClient, User } from "../utils/api.ts";

export default function LoginForm({ onSuccess }: { onSuccess: (user: User) => void }) {
  const email = useSignal("");
  const password = useSignal("");
  const isLoading = useSignal(false);
  const error = useSignal(""); // Local error state

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    isLoading.value = true;
    error.value = ""; // Clear previous error

    try {
      const client = new RetentionApiClient();
      const response = await client.login(email.value, password.value);
      onSuccess(response.user);
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Login failed"; // Set error
    } finally {
      isLoading.value = false;
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Error display */}
      {error.value && (
        <div class="text-red-600 text-sm mb-4">
          {error.value}
        </div>
      )}
      {/* Form fields... */}
    </form>
  );
}
```

### After (Using Toast Notifications)

```tsx
import { useSignal } from "@preact/signals";
import { RetentionApiClient, User } from "../utils/api.ts";
import { toast } from "../lib/toast.ts"; // Import toast

export default function LoginForm({ onSuccess }: { onSuccess: (user: User) => void }) {
  const email = useSignal("");
  const password = useSignal("");
  const isLoading = useSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    isLoading.value = true;

    try {
      const client = new RetentionApiClient();
      const response = await client.login(email.value, password.value);

      toast.success("Login successful!"); // Success toast
      onSuccess(response.user);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      toast.error(message); // Error toast instead of local state
    } finally {
      isLoading.value = false;
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* No inline error display needed - toasts handle it */}
      {/* Form fields... */}
    </form>
  );
}
```

**Benefits:**
- Cleaner component state (no local error signal)
- Consistent error presentation across app
- Auto-dismissing notifications
- Better accessibility (ARIA live regions)
- Less visual clutter in forms

---

## Example 2: FlashcardManager with Progress Toasts

### Scenario: Creating Multiple Flashcards

```tsx
import { useSignal } from "@preact/signals";
import { toast, dismissToast } from "../lib/toast.ts";

export default function FlashcardManager() {
  const isProcessing = useSignal(false);

  const handleBulkCreate = async (flashcards: FlashcardData[]) => {
    isProcessing.value = true;

    // Show processing toast (no auto-dismiss)
    const processingToastId = toast.info(
      `Creating ${flashcards.length} flashcards...`,
      0
    );

    try {
      const results = await bulkCreateFlashcards(flashcards);

      // Dismiss processing toast
      dismissToast(processingToastId);

      // Show success toast
      toast.success(
        `Successfully created ${results.length} flashcards!`,
        5000
      );
    } catch (error) {
      // Dismiss processing toast
      dismissToast(processingToastId);

      // Show error toast (no auto-dismiss for errors)
      toast.error(
        "Failed to create flashcards - please try again",
        0
      );
    } finally {
      isProcessing.value = false;
    }
  };

  return (
    <button
      onClick={() => handleBulkCreate(selectedCards)}
      disabled={isProcessing.value}
      class="min-h-[44px] px-6 py-2 bg-[#00ff88] text-[#0a0a0a] font-mono"
    >
      {isProcessing.value ? "Creating..." : "Create Flashcards"}
    </button>
  );
}
```

---

## Example 3: Quiz Interface with Feedback Toasts

### Scenario: Showing Answer Feedback

```tsx
import { useSignal } from "@preact/signals";
import { toast } from "../lib/toast.ts";

export default function QuizInterface() {
  const currentCard = useSignal<Flashcard | null>(null);
  const userAnswer = useSignal("");

  const handleSubmitAnswer = async () => {
    const isCorrect = checkAnswer(userAnswer.value, currentCard.value?.answer);

    if (isCorrect) {
      // Success toast with short duration
      toast.success("Correct!", 2000);

      // Move to next card
      loadNextCard();
    } else {
      // Warning toast with explanation
      toast.warning(
        `Incorrect. The answer was: ${currentCard.value?.answer}`,
        5000
      );
    }

    // Update spaced repetition stats
    await updateStats(currentCard.value?.id, isCorrect);
  };

  return (
    <div>
      <div class="mb-4 font-mono text-[#ddd]">
        {currentCard.value?.question}
      </div>
      <input
        type="text"
        value={userAnswer.value}
        onInput={(e) => userAnswer.value = e.currentTarget.value}
        class="w-full min-h-[44px] px-4 bg-[#1a1a1a] border-2 border-[#00d9ff] text-[#ddd] font-mono"
      />
      <button
        onClick={handleSubmitAnswer}
        class="min-h-[44px] px-6 py-2 mt-4 bg-[#00d9ff] text-[#0a0a0a] font-mono"
      >
        Submit Answer
      </button>
    </div>
  );
}
```

---

## Example 4: DeckEditButton with Optimistic Updates

### Scenario: Saving Deck Edits

```tsx
import { useSignal } from "@preact/signals";
import { toast } from "../lib/toast.ts";

export default function DeckEditButton({ deckId }: { deckId: string }) {
  const isSaving = useSignal(false);

  const handleSave = async (deckData: DeckData) => {
    isSaving.value = true;

    try {
      // Optimistically show success
      toast.info("Saving deck...", 2000);

      const response = await fetch(`/api/decks/${deckId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deckData),
      });

      if (!response.ok) throw new Error("Save failed");

      // Confirm success
      toast.success("Deck saved successfully!", 3000);

    } catch (error) {
      // Show error with no auto-dismiss
      toast.error(
        "Failed to save deck - your changes may be lost",
        0
      );
    } finally {
      isSaving.value = false;
    }
  };

  return (
    <button
      onClick={() => handleSave(currentDeckData)}
      disabled={isSaving.value}
      class="min-h-[44px] px-6 py-2 bg-[#00ff88] text-[#0a0a0a] font-mono"
    >
      <span class="mr-2">💾</span>
      {isSaving.value ? "Saving..." : "Save Deck"}
    </button>
  );
}
```

---

## Example 5: TagManager with Batch Operations

### Scenario: Bulk Tag Assignment

```tsx
import { useSignal } from "@preact/signals";
import { toast, dismissAllToasts } from "../lib/toast.ts";

export default function TagManager() {
  const selectedCards = useSignal<string[]>([]);
  const selectedTags = useSignal<string[]>([]);

  const handleBulkTag = async () => {
    // Clear any previous toasts
    dismissAllToasts();

    const cardCount = selectedCards.value.length;
    const tagCount = selectedTags.value.length;

    try {
      toast.info(
        `Applying ${tagCount} tags to ${cardCount} cards...`,
        0
      );

      await bulkApplyTags(selectedCards.value, selectedTags.value);

      toast.success(
        `Successfully tagged ${cardCount} flashcards!`,
        5000
      );

      // Clear selections
      selectedCards.value = [];
      selectedTags.value = [];

    } catch (error) {
      toast.error(
        "Failed to apply tags - please try again",
        0
      );
    }
  };

  return (
    <div>
      <div class="mb-4 text-sm text-[#888] font-mono">
        {selectedCards.value.length} cards selected,{" "}
        {selectedTags.value.length} tags selected
      </div>
      <button
        onClick={handleBulkTag}
        disabled={selectedCards.value.length === 0 || selectedTags.value.length === 0}
        class="min-h-[44px] px-6 py-2 bg-[#00d9ff] text-[#0a0a0a] font-mono disabled:opacity-50"
      >
        Apply Tags to Selected
      </button>
    </div>
  );
}
```

---

## Example 6: File Upload with Progress

### Scenario: Importing Deck from File

```tsx
import { useSignal } from "@preact/signals";
import { toast, dismissToast } from "../lib/toast.ts";

export default function DeckImporter() {
  const isUploading = useSignal(false);

  const handleFileUpload = async (file: File) => {
    isUploading.value = true;

    let uploadToastId: string | null = null;

    try {
      // Show upload progress toast
      uploadToastId = toast.info(`Uploading ${file.name}...`, 0);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/decks/import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();

      // Dismiss upload toast
      if (uploadToastId) dismissToast(uploadToastId);

      // Show success with import details
      toast.success(
        `Imported ${data.cardCount} flashcards from ${file.name}`,
        7000
      );

    } catch (error) {
      // Dismiss upload toast
      if (uploadToastId) dismissToast(uploadToastId);

      // Show error
      toast.error(
        "Import failed - please check file format",
        0
      );
    } finally {
      isUploading.value = false;
    }
  };

  return (
    <input
      type="file"
      accept=".json,.csv"
      onChange={(e) => {
        const file = e.currentTarget.files?.[0];
        if (file) handleFileUpload(file);
      }}
      disabled={isUploading.value}
    />
  );
}
```

---

## Example 7: Network Status Monitoring

### Scenario: Global Network Error Handling

```tsx
// In _app.tsx or a global monitoring island

import { useEffect } from "preact/hooks";
import { toast, dismissAllToasts } from "../lib/toast.ts";

export default function NetworkMonitor() {
  useEffect(() => {
    let offlineToastId: string | null = null;

    const handleOffline = () => {
      offlineToastId = toast.warning(
        "You are offline - changes will not be saved",
        0
      );
    };

    const handleOnline = () => {
      if (offlineToastId) {
        dismissToast(offlineToastId);
        offlineToastId = null;
      }
      toast.success("Connection restored", 3000);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return null; // No UI needed
}
```

---

## Best Practices Summary

### Do's

1. **Use appropriate variants:**
   - `info` - Neutral information
   - `success` - Successful operations
   - `warning` - Important non-critical warnings
   - `error` - Errors requiring attention

2. **Set appropriate durations:**
   - Quick confirmations: 2-3 seconds
   - Standard notifications: 5 seconds (default)
   - Important warnings: 7-10 seconds
   - Critical errors: 0 (no auto-dismiss)

3. **Keep messages concise:**
   ```tsx
   // Good
   toast.success("Flashcard created");

   // Too verbose
   toast.success("The flashcard has been successfully created and added to your deck");
   ```

4. **Dismiss progress toasts:**
   ```tsx
   const id = toast.info("Processing...", 0);
   // ... do work ...
   dismissToast(id);
   toast.success("Complete!");
   ```

5. **Clear toasts on navigation:**
   ```tsx
   // When leaving a page with active toasts
   dismissAllToasts();
   ```

### Don'ts

1. **Don't spam toasts:**
   ```tsx
   // Bad - too many toasts at once
   results.forEach(r => toast.info(r.message));

   // Good - summarize
   toast.success(`Processed ${results.length} items`);
   ```

2. **Don't use for form validation:**
   ```tsx
   // Bad - use inline validation instead
   if (!email) toast.error("Email required");

   // Good - inline error message
   {!email && <span class="text-red-500">Email required</span>}
   ```

3. **Don't use for critical blocking errors:**
   ```tsx
   // Bad - user might miss toast
   toast.error("Account suspended - please contact support");

   // Good - use Modal for critical errors
   <Modal>
     <Alert variant="error">
       Account suspended - please contact support
     </Alert>
   </Modal>
   ```

4. **Don't rely on toasts for critical information:**
   - Toasts auto-dismiss and can be missed
   - Use persistent UI elements for important state

5. **Don't forget accessibility:**
   - Error toasts should use `duration: 0` (no auto-dismiss)
   - Keep messages screen-reader friendly
   - Don't use only color to convey meaning

---

## Integration Checklist

When adding toasts to a component:

- [ ] Import `toast` or `showToast` from `../lib/toast.ts`
- [ ] Choose appropriate variant (info/success/warning/error)
- [ ] Set appropriate duration (or use default 5000ms)
- [ ] Write concise, clear messages
- [ ] Consider screen reader users
- [ ] Test keyboard interaction
- [ ] Verify toast doesn't block critical UI
- [ ] Ensure errors use `duration: 0` (manual dismiss)
- [ ] Test with multiple simultaneous toasts
- [ ] Verify mobile responsiveness

---

## Testing Your Integration

1. **Visual Testing:**
   - Navigate to `/demo/toasts` to verify styling
   - Test all variants in your component
   - Check positioning and animations

2. **Keyboard Testing:**
   - Tab to toast
   - Press Enter/Space/Esc to dismiss
   - Verify focus management

3. **Screen Reader Testing:**
   - Enable VoiceOver (macOS) or NVDA (Windows)
   - Trigger toasts
   - Verify announcements are clear

4. **Reduced Motion Testing:**
   - Enable "Reduce motion" in OS settings
   - Verify toasts appear instantly (no animation)

5. **Mobile Testing:**
   - Test on actual mobile device
   - Verify 44px touch targets
   - Check positioning at bottom-right

---

For more details, see `TOAST_USAGE.md` for complete API reference and best practices.
