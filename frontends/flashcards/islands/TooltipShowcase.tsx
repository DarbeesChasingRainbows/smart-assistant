/** @jsxImportSource preact */
import Tooltip from "../components/ui/Tooltip.tsx";

/**
 * Tooltip Showcase Component
 *
 * Demonstrates all tooltip features and positions.
 * Use this for testing and visual verification.
 *
 * Access at: /dev/tooltips (add route if needed)
 */
export default function TooltipShowcase() {
  return (
    <div class="min-h-screen bg-[#0a0a0a] p-8">
      <div class="max-w-6xl mx-auto">
        {/* Header */}
        <div class="mb-8 border-b-2 border-[#00d9ff] pb-4">
          <h1 class="text-3xl font-mono text-[#00d9ff] mb-2">
            Tooltip Component Showcase
          </h1>
          <p class="text-[#888] font-mono text-sm">
            Comprehensive demonstration of tooltip features and positions
          </p>
        </div>

        {/* Positioning Examples */}
        <section class="mb-12">
          <h2 class="text-xl font-mono text-[#00d9ff] mb-4 border-l-4 border-[#00d9ff] pl-3">
            Positioning Options
          </h2>
          <div class="grid grid-cols-2 gap-8">
            <div class="bg-[#1a1a1a] border border-[#333] p-6 flex flex-col items-center justify-center min-h-[200px]">
              <p class="text-[#888] text-sm font-mono mb-4">Top Position</p>
              <Tooltip content="This tooltip appears above the button" position="top">
                <button class="min-h-[44px] px-6 py-2 bg-[#00d9ff] border border-[#00d9ff] text-[#0a0a0a] font-mono font-semibold hover:bg-[#00b8d4] transition-colors">
                  Hover or Focus Me
                </button>
              </Tooltip>
            </div>

            <div class="bg-[#1a1a1a] border border-[#333] p-6 flex flex-col items-center justify-center min-h-[200px]">
              <p class="text-[#888] text-sm font-mono mb-4">Bottom Position</p>
              <Tooltip content="This tooltip appears below the button" position="bottom">
                <button class="min-h-[44px] px-6 py-2 bg-[#00d9ff] border border-[#00d9ff] text-[#0a0a0a] font-mono font-semibold hover:bg-[#00b8d4] transition-colors">
                  Hover or Focus Me
                </button>
              </Tooltip>
            </div>

            <div class="bg-[#1a1a1a] border border-[#333] p-6 flex flex-col items-center justify-center min-h-[200px]">
              <p class="text-[#888] text-sm font-mono mb-4">Left Position</p>
              <Tooltip content="This tooltip appears to the left" position="left">
                <button class="min-h-[44px] px-6 py-2 bg-[#00d9ff] border border-[#00d9ff] text-[#0a0a0a] font-mono font-semibold hover:bg-[#00b8d4] transition-colors">
                  Hover or Focus Me
                </button>
              </Tooltip>
            </div>

            <div class="bg-[#1a1a1a] border border-[#333] p-6 flex flex-col items-center justify-center min-h-[200px]">
              <p class="text-[#888] text-sm font-mono mb-4">Right Position</p>
              <Tooltip content="This tooltip appears to the right" position="right">
                <button class="min-h-[44px] px-6 py-2 bg-[#00d9ff] border border-[#00d9ff] text-[#0a0a0a] font-mono font-semibold hover:bg-[#00b8d4] transition-colors">
                  Hover or Focus Me
                </button>
              </Tooltip>
            </div>
          </div>
        </section>

        {/* Auto Positioning */}
        <section class="mb-12">
          <h2 class="text-xl font-mono text-[#00d9ff] mb-4 border-l-4 border-[#00d9ff] pl-3">
            Auto Positioning
          </h2>
          <div class="bg-[#1a1a1a] border border-[#333] p-6">
            <p class="text-[#888] text-sm font-mono mb-4">
              Auto position detects viewport edges and flips automatically
            </p>
            <div class="grid grid-cols-4 gap-4">
              <Tooltip content="Smart positioning based on viewport space" position="auto">
                <button class="min-h-[44px] px-4 py-2 bg-[#1a1a1a] border border-[#00d9ff] text-[#00d9ff] hover:bg-[#00d9ff]/10 transition-colors font-mono text-sm">
                  Top Left
                </button>
              </Tooltip>
              <Tooltip content="Automatically flips to fit screen" position="auto">
                <button class="min-h-[44px] px-4 py-2 bg-[#1a1a1a] border border-[#00d9ff] text-[#00d9ff] hover:bg-[#00d9ff]/10 transition-colors font-mono text-sm">
                  Top Right
                </button>
              </Tooltip>
              <Tooltip content="Detects available space" position="auto">
                <button class="min-h-[44px] px-4 py-2 bg-[#1a1a1a] border border-[#00d9ff] text-[#00d9ff] hover:bg-[#00d9ff]/10 transition-colors font-mono text-sm">
                  Bottom Left
                </button>
              </Tooltip>
              <Tooltip content="Prevents clipping at edges" position="auto">
                <button class="min-h-[44px] px-4 py-2 bg-[#1a1a1a] border border-[#00d9ff] text-[#00d9ff] hover:bg-[#00d9ff]/10 transition-colors font-mono text-sm">
                  Bottom Right
                </button>
              </Tooltip>
            </div>
          </div>
        </section>

        {/* Delay Variations */}
        <section class="mb-12">
          <h2 class="text-xl font-mono text-[#00d9ff] mb-4 border-l-4 border-[#00d9ff] pl-3">
            Hover Delay Variations
          </h2>
          <div class="bg-[#1a1a1a] border border-[#333] p-6">
            <p class="text-[#888] text-sm font-mono mb-4">
              Note: Keyboard focus shows tooltip immediately (no delay)
            </p>
            <div class="flex gap-4">
              <Tooltip content="Appears quickly (200ms delay)" position="top" delay={200}>
                <button class="min-h-[44px] px-6 py-2 bg-[#1a1a1a] border border-[#00ff88] text-[#00ff88] hover:bg-[#00ff88]/10 transition-colors font-mono">
                  Fast (200ms)
                </button>
              </Tooltip>
              <Tooltip content="Standard delay (500ms default)" position="top">
                <button class="min-h-[44px] px-6 py-2 bg-[#1a1a1a] border border-[#00d9ff] text-[#00d9ff] hover:bg-[#00d9ff]/10 transition-colors font-mono">
                  Normal (500ms)
                </button>
              </Tooltip>
              <Tooltip content="Appears slowly (1000ms delay)" position="top" delay={1000}>
                <button class="min-h-[44px] px-6 py-2 bg-[#1a1a1a] border border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000]/10 transition-colors font-mono">
                  Slow (1000ms)
                </button>
              </Tooltip>
            </div>
          </div>
        </section>

        {/* Content Length Examples */}
        <section class="mb-12">
          <h2 class="text-xl font-mono text-[#00d9ff] mb-4 border-l-4 border-[#00d9ff] pl-3">
            Content Length Variations
          </h2>
          <div class="bg-[#1a1a1a] border border-[#333] p-6">
            <div class="flex gap-4 flex-wrap">
              <Tooltip content="Short" position="top">
                <button class="min-h-[44px] px-6 py-2 bg-[#1a1a1a] border border-[#00d9ff] text-[#00d9ff] hover:bg-[#00d9ff]/10 transition-colors font-mono">
                  Short Tooltip
                </button>
              </Tooltip>
              <Tooltip content="This is a medium-length tooltip that provides helpful context" position="top">
                <button class="min-h-[44px] px-6 py-2 bg-[#1a1a1a] border border-[#00d9ff] text-[#00d9ff] hover:bg-[#00d9ff]/10 transition-colors font-mono">
                  Medium Tooltip
                </button>
              </Tooltip>
              <Tooltip content="This is a longer tooltip that demonstrates how content wraps at the 250px max-width. The text will flow to multiple lines while maintaining readability and the Sci-Fi HUD aesthetic with monospace font." position="top">
                <button class="min-h-[44px] px-6 py-2 bg-[#1a1a1a] border border-[#00d9ff] text-[#00d9ff] hover:bg-[#00d9ff]/10 transition-colors font-mono">
                  Long Tooltip
                </button>
              </Tooltip>
            </div>
          </div>
        </section>

        {/* Use Case Examples */}
        <section class="mb-12">
          <h2 class="text-xl font-mono text-[#00d9ff] mb-4 border-l-4 border-[#00d9ff] pl-3">
            Real-World Use Cases
          </h2>
          <div class="bg-[#1a1a1a] border border-[#333] p-6 space-y-6">
            {/* Action Buttons */}
            <div>
              <p class="text-[#888] text-sm font-mono mb-3">Action Buttons</p>
              <div class="flex gap-3">
                <Tooltip content="Save all changes to the server" position="top">
                  <button class="min-h-[44px] px-4 py-2 bg-[#00ff88] border border-[#00ff88] text-[#0a0a0a] font-mono font-semibold hover:bg-[#00dd77] transition-colors flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Save</span>
                  </button>
                </Tooltip>
                <Tooltip content="Discard all unsaved changes" position="top">
                  <button class="min-h-[44px] px-4 py-2 bg-[#1a1a1a] border border-[#666] text-[#ddd] font-mono hover:bg-[#222] transition-colors flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Cancel</span>
                  </button>
                </Tooltip>
                <Tooltip content="Permanently delete this item (cannot be undone)" position="top">
                  <button class="min-h-[44px] px-4 py-2 bg-[#1a1a1a] border border-[#ff4444] text-[#ff4444] font-mono hover:bg-[#ff4444]/10 transition-colors flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete</span>
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* Links */}
            <div>
              <p class="text-[#888] text-sm font-mono mb-3">Navigation Links</p>
              <div class="flex gap-3">
                <Tooltip content="View your dashboard and statistics" position="top">
                  <a href="#" class="min-h-[44px] px-4 py-2 bg-[#1a1a1a] border border-[#00d9ff] text-[#00d9ff] hover:bg-[#00d9ff]/10 transition-colors font-mono inline-flex items-center">
                    Dashboard
                  </a>
                </Tooltip>
                <Tooltip content="Manage your flashcard decks" position="top">
                  <a href="#" class="min-h-[44px] px-4 py-2 bg-[#1a1a1a] border border-[#00d9ff] text-[#00d9ff] hover:bg-[#00d9ff]/10 transition-colors font-mono inline-flex items-center">
                    Decks
                  </a>
                </Tooltip>
                <Tooltip content="Configure application settings" position="top">
                  <a href="#" class="min-h-[44px] px-4 py-2 bg-[#1a1a1a] border border-[#00d9ff] text-[#00d9ff] hover:bg-[#00d9ff]/10 transition-colors font-mono inline-flex items-center">
                    Settings
                  </a>
                </Tooltip>
              </div>
            </div>

            {/* Icon Buttons (with text - Kid Test compliant) */}
            <div>
              <p class="text-[#888] text-sm font-mono mb-3">Icon Buttons (Kid Test Compliant)</p>
              <div class="flex gap-3">
                <Tooltip content="Edit this item's properties" position="top">
                  <button class="min-h-[44px] px-4 py-2 bg-[#1a1a1a] border border-[#00d9ff] text-[#00d9ff] hover:bg-[#00d9ff]/10 transition-colors font-mono flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span class="text-sm">Edit</span>
                  </button>
                </Tooltip>
                <Tooltip content="Download to your device" position="top">
                  <button class="min-h-[44px] px-4 py-2 bg-[#1a1a1a] border border-[#00d9ff] text-[#00d9ff] hover:bg-[#00d9ff]/10 transition-colors font-mono flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span class="text-sm">Download</span>
                  </button>
                </Tooltip>
                <Tooltip content="Share with others" position="top">
                  <button class="min-h-[44px] px-4 py-2 bg-[#1a1a1a] border border-[#00d9ff] text-[#00d9ff] hover:bg-[#00d9ff]/10 transition-colors font-mono flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    <span class="text-sm">Share</span>
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        </section>

        {/* Accessibility Notes */}
        <section class="mb-12">
          <h2 class="text-xl font-mono text-[#00d9ff] mb-4 border-l-4 border-[#00d9ff] pl-3">
            Accessibility Testing
          </h2>
          <div class="bg-[#1a1a1a] border border-[#333] p-6">
            <ul class="space-y-2 text-[#ddd] font-mono text-sm">
              <li class="flex items-start gap-2">
                <span class="text-[#00ff88]">✓</span>
                <span>Press Tab to focus buttons (tooltip shows immediately)</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-[#00ff88]">✓</span>
                <span>Press Escape to close tooltip</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-[#00ff88]">✓</span>
                <span>Hover over buttons (tooltip shows after delay)</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-[#00ff88]">✓</span>
                <span>Hover over tooltip itself (stays visible)</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-[#00ff88]">✓</span>
                <span>All buttons are ≥ 44px touch targets (Fitts's Law)</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-[#00ff88]">✓</span>
                <span>All icons have visible text labels (Kid Test)</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-[#00ff88]">✓</span>
                <span>Screen readers announce tooltip via aria-describedby</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Footer */}
        <div class="border-t-2 border-[#333] pt-4 text-center">
          <p class="text-[#888] font-mono text-sm">
            Component: Tooltip.tsx | Design System: Sci-Fi HUD | WCAG 2.1 Level AA
          </p>
        </div>
      </div>
    </div>
  );
}
