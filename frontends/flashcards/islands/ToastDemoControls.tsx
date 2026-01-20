/** @jsxImportSource preact */
import { useEffect } from "preact/hooks";
import { toast, dismissAllToasts } from "../lib/toast.ts";

/**
 * Interactive controls for toast demo page
 *
 * Registers global functions that can be called from the demo page buttons.
 * This is a simple pattern for demo purposes - production code should
 * use proper component communication patterns.
 */
export default function ToastDemoControls() {
  useEffect(() => {
    // Register demo functions globally
    (globalThis as any).showInfoToast = () => {
      toast.info("This is an informational message about deck synchronization");
    };

    (globalThis as any).showSuccessToast = () => {
      toast.success("Flashcard created successfully!");
    };

    (globalThis as any).showWarningToast = () => {
      toast.warning("Your session will expire in 5 minutes");
    };

    (globalThis as any).showErrorToast = () => {
      toast.error("Failed to connect to server - please check your connection", 0);
    };

    (globalThis as any).showMultipleToasts = () => {
      toast.info("Processing deck 1...");
      setTimeout(() => toast.success("Deck 1 complete"), 500);
      setTimeout(() => toast.info("Processing deck 2..."), 1000);
      setTimeout(() => toast.success("Deck 2 complete"), 1500);
      setTimeout(() => toast.info("Processing deck 3..."), 2000);
      setTimeout(() => toast.success("Deck 3 complete"), 2500);
      setTimeout(() => toast.success("All decks processed!"), 3000);
    };

    (globalThis as any).showPersistentToast = () => {
      toast.warning(
        "This toast requires manual dismissal - click the × button or press Enter",
        0
      );
    };

    (globalThis as any).dismissAllToasts = () => {
      dismissAllToasts();
      // Show confirmation after clearing
      setTimeout(() => {
        toast.success("All toasts dismissed", 2000);
      }, 100);
    };

    // Cleanup
    return () => {
      delete (globalThis as any).showInfoToast;
      delete (globalThis as any).showSuccessToast;
      delete (globalThis as any).showWarningToast;
      delete (globalThis as any).showErrorToast;
      delete (globalThis as any).showMultipleToasts;
      delete (globalThis as any).showPersistentToast;
      delete (globalThis as any).dismissAllToasts;
    };
  }, []);

  // This island doesn't render any UI - it only registers global functions
  return null;
}
