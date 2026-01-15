/** @jsxImportSource preact */
import { Component, type ComponentChildren } from "preact";
import Alert from "./ui/Alert.tsx";
import Card from "./ui/Card.tsx";

/**
 * ErrorBoundary - Standard error boundary component for graceful error handling
 *
 * Design characteristics:
 * - Sci-Fi HUD themed error display
 * - User-friendly error messages
 * - Optional retry and report actions
 * - Displays error details in development mode
 *
 * Accessibility:
 * - Error state clearly communicated
 * - Action buttons meet 44px touch targets
 * - Visible text labels on all actions
 *
 * Usage:
 * Wrap any component tree that might throw errors:
 *
 * @example
 * <ErrorBoundary>
 *   <FlashcardManager />
 * </ErrorBoundary>
 *
 * @example
 * <ErrorBoundary
 *   fallback={(error, retry) => <CustomErrorUI error={error} onRetry={retry} />}
 * >
 *   <ComplexComponent />
 * </ErrorBoundary>
 */

interface ErrorBoundaryProps {
  /** Child components to protect */
  children: ComponentChildren;

  /** Optional custom fallback UI */
  fallback?: (error: Error, retry: () => void) => ComponentChildren;

  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: any) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    this.setState({
      errorInfo,
    });

    // Call optional error callback
    this.props.onError?.(error, errorInfo);
  }

  retry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  reportIssue = () => {
    const { error, errorInfo } = this.state;

    const issueBody = `
**Error Message:**
${error?.message || "Unknown error"}

**Stack Trace:**
\`\`\`
${error?.stack || "No stack trace available"}
\`\`\`

**Component Stack:**
\`\`\`
${errorInfo?.componentStack || "No component stack available"}
\`\`\`

**Browser:**
${navigator.userAgent}

**Timestamp:**
${new Date().toISOString()}
    `.trim();

    // Open GitHub issues page with pre-filled template
    // Update the URL to match your project's GitHub repository
    const repoUrl = "https://github.com/yourusername/smart-assistant";
    const issuesUrl = `${repoUrl}/issues/new?title=${encodeURIComponent(
      `Error: ${error?.message || "Unknown error"}`
    )}&body=${encodeURIComponent(issueBody)}`;

    window.open(issuesUrl, "_blank");
  };

  render() {
    if (this.state.hasError) {
      const { error } = this.state;

      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(error!, this.retry);
      }

      // Default error UI with Sci-Fi HUD theme
      const isDev = Deno.env.get("DENO_ENV") === "development" ||
        globalThis.location?.hostname === "localhost";

      return (
        <div class="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
          <Card
            variant="error"
            title="System Error"
            subtitle="An unexpected error occurred"
            padding="large"
            class="max-w-2xl w-full"
          >
            <div class="space-y-6">
              {/* Error Alert */}
              <Alert variant="error" title="Error">
                {error?.message || "An unknown error occurred"}
              </Alert>

              {/* Error Details (Development Only) */}
              {isDev && error?.stack && (
                <details class="border border-[#333] bg-[#1a1a1a] p-4">
                  <summary class="cursor-pointer text-sm font-mono text-[#888] hover:text-[#00d9ff] transition-colors">
                    View Stack Trace
                  </summary>
                  <pre class="mt-4 text-xs font-mono text-[#aaa] overflow-x-auto">
                    {error.stack}
                  </pre>
                </details>
              )}

              {/* Actions */}
              <div class="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  class="min-h-[44px] px-6 py-2 bg-[#00d9ff] text-[#0a0a0a] font-mono font-semibold hover:bg-[#00b8e6] transition-colors"
                  onClick={this.retry}
                  style="border-radius: 0;"
                >
                  <span class="mr-2">↻</span>
                  Retry
                </button>

                <button
                  type="button"
                  class="min-h-[44px] px-6 py-2 border-2 border-[#444] text-[#aaa] font-mono hover:border-[#00d9ff] hover:text-[#00d9ff] transition-colors"
                  onClick={this.reportIssue}
                  style="border-radius: 0;"
                >
                  <span class="mr-2">⚠</span>
                  Report Issue
                </button>

                <button
                  type="button"
                  class="min-h-[44px] px-6 py-2 border-2 border-[#444] text-[#aaa] font-mono hover:border-[#00d9ff] hover:text-[#00d9ff] transition-colors"
                  onClick={() => window.location.href = "/flashcards/dashboard"}
                  style="border-radius: 0;"
                >
                  <span class="mr-2">←</span>
                  Go to Dashboard
                </button>
              </div>

              {/* Additional Help */}
              <div class="text-sm text-[#888] border-t border-[#333] pt-4">
                <p>
                  If this error persists, please try the following:
                </p>
                <ul class="list-disc list-inside mt-2 space-y-1">
                  <li>Refresh the page</li>
                  <li>Clear your browser cache</li>
                  <li>Check your network connection</li>
                  <li>Report the issue using the button above</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
