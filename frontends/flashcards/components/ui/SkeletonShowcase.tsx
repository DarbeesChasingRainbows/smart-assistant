/** @jsxImportSource preact */
import Skeleton from "./Skeleton.tsx";
import SkeletonCard from "./SkeletonCard.tsx";
import SkeletonList from "./SkeletonList.tsx";
import SkeletonText from "./SkeletonText.tsx";

/**
 * SkeletonShowcase component - Visual demonstration of all skeleton components
 *
 * This component is for development/documentation purposes only.
 * It shows all skeleton variants, animations, and configurations.
 *
 * Usage: Add to a route for visual testing during development
 *
 * @example
 * // In a route file
 * import SkeletonShowcase from "../components/ui/SkeletonShowcase.tsx";
 *
 * export default function SkeletonsPage() {
 *   return <SkeletonShowcase />;
 * }
 */

export default function SkeletonShowcase() {
  return (
    <div class="min-h-screen bg-[#0a0a0a] p-8">
      <div class="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div class="border-b border-[#333] pb-6">
          <h1 class="text-3xl font-mono text-[#00d9ff] mb-2">
            Skeleton Loader Showcase
          </h1>
          <p class="text-[#888]">
            Visual demonstration of all skeleton loading components in the Sci-Fi HUD design system
          </p>
        </div>

        {/* Base Skeleton Variants */}
        <section>
          <h2 class="text-xl font-mono text-[#00d9ff] mb-6">
            Base Skeleton Variants
          </h2>
          <div class="grid gap-8">
            {/* Text variant */}
            <div>
              <h3 class="text-sm font-mono text-[#888] mb-4">Text</h3>
              <Skeleton variant="text" width="300px" />
            </div>

            {/* Circular variant */}
            <div>
              <h3 class="text-sm font-mono text-[#888] mb-4">Circular</h3>
              <Skeleton variant="circular" width="64px" height="64px" />
            </div>

            {/* Rectangular variant */}
            <div>
              <h3 class="text-sm font-mono text-[#888] mb-4">Rectangular</h3>
              <Skeleton variant="rectangular" width="400px" height="100px" />
            </div>

            {/* Card variant */}
            <div>
              <h3 class="text-sm font-mono text-[#888] mb-4">Card</h3>
              <Skeleton variant="card" width="400px" />
            </div>
          </div>
        </section>

        {/* Animation Types */}
        <section>
          <h2 class="text-xl font-mono text-[#00d9ff] mb-6">
            Animation Types
          </h2>
          <div class="grid gap-8">
            {/* Shimmer animation */}
            <div>
              <h3 class="text-sm font-mono text-[#888] mb-4">
                Shimmer (Default)
              </h3>
              <Skeleton
                variant="rectangular"
                width="400px"
                height="60px"
                animation="shimmer"
              />
            </div>

            {/* Pulse animation */}
            <div>
              <h3 class="text-sm font-mono text-[#888] mb-4">Pulse</h3>
              <Skeleton
                variant="rectangular"
                width="400px"
                height="60px"
                animation="pulse"
              />
            </div>

            {/* No animation */}
            <div>
              <h3 class="text-sm font-mono text-[#888] mb-4">None</h3>
              <Skeleton
                variant="rectangular"
                width="400px"
                height="60px"
                animation="none"
              />
            </div>
          </div>
        </section>

        {/* SkeletonCard Examples */}
        <section>
          <h2 class="text-xl font-mono text-[#00d9ff] mb-6">
            SkeletonCard Component
          </h2>
          <div class="grid gap-8 md:grid-cols-2">
            {/* Basic card */}
            <div>
              <h3 class="text-sm font-mono text-[#888] mb-4">Basic</h3>
              <SkeletonCard />
            </div>

            {/* With header and actions */}
            <div>
              <h3 class="text-sm font-mono text-[#888] mb-4">
                With Header & Actions
              </h3>
              <SkeletonCard showHeader={true} showActions={true} />
            </div>

            {/* Accent variant */}
            <div>
              <h3 class="text-sm font-mono text-[#888] mb-4">Accent Variant</h3>
              <SkeletonCard variant="accent" showHeader={true} lines={4} />
            </div>

            {/* Success variant */}
            <div>
              <h3 class="text-sm font-mono text-[#888] mb-4">Success Variant</h3>
              <SkeletonCard variant="success" showHeader={true} lines={2} />
            </div>
          </div>
        </section>

        {/* SkeletonList Examples */}
        <section>
          <h2 class="text-xl font-mono text-[#00d9ff] mb-6">
            SkeletonList Component
          </h2>
          <div class="grid gap-8">
            {/* Simple list */}
            <div>
              <h3 class="text-sm font-mono text-[#888] mb-4">Simple List</h3>
              <div class="border border-[#333] bg-[#0a0a0a] p-4">
                <SkeletonList rows={3} />
              </div>
            </div>

            {/* With avatars */}
            <div>
              <h3 class="text-sm font-mono text-[#888] mb-4">With Avatars</h3>
              <div class="border border-[#333] bg-[#0a0a0a] p-4">
                <SkeletonList rows={3} showAvatar={true} />
              </div>
            </div>

            {/* Full featured */}
            <div>
              <h3 class="text-sm font-mono text-[#888] mb-4">
                Full Featured (Avatar + Secondary Text + Action)
              </h3>
              <div class="border border-[#333] bg-[#0a0a0a] p-4">
                <SkeletonList
                  rows={4}
                  showAvatar={true}
                  showSecondaryText={true}
                  showAction={true}
                />
              </div>
            </div>
          </div>
        </section>

        {/* SkeletonText Examples */}
        <section>
          <h2 class="text-xl font-mono text-[#00d9ff] mb-6">
            SkeletonText Component
          </h2>
          <div class="grid gap-8">
            {/* Normal spacing */}
            <div>
              <h3 class="text-sm font-mono text-[#888] mb-4">
                Normal Spacing (3 lines)
              </h3>
              <SkeletonText lines={3} spacing="normal" />
            </div>

            {/* Tight spacing */}
            <div>
              <h3 class="text-sm font-mono text-[#888] mb-4">
                Tight Spacing (5 lines)
              </h3>
              <SkeletonText lines={5} spacing="tight" />
            </div>

            {/* Relaxed spacing */}
            <div>
              <h3 class="text-sm font-mono text-[#888] mb-4">
                Relaxed Spacing (4 lines)
              </h3>
              <SkeletonText lines={4} spacing="relaxed" />
            </div>

            {/* Large spacing */}
            <div>
              <h3 class="text-sm font-mono text-[#888] mb-4">
                Large Spacing (6 lines)
              </h3>
              <SkeletonText lines={6} spacing="large" />
            </div>
          </div>
        </section>

        {/* Real-world Example */}
        <section>
          <h2 class="text-xl font-mono text-[#00d9ff] mb-6">
            Real-world Example: Dashboard Loading State
          </h2>
          <div class="space-y-6">
            {/* Stats grid */}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SkeletonCard lines={1} variant="accent" />
              <SkeletonCard lines={1} variant="success" />
              <SkeletonCard lines={1} variant="warning" />
            </div>

            {/* Chart area */}
            <SkeletonCard showHeader={true} variant="default">
              <Skeleton variant="rectangular" height="300px" />
            </SkeletonCard>

            {/* Recent activity */}
            <SkeletonCard showHeader={true} variant="default">
              <SkeletonList
                rows={5}
                showAvatar={true}
                showSecondaryText={true}
                showAction={true}
              />
            </SkeletonCard>
          </div>
        </section>

        {/* Footer note */}
        <div class="border-t border-[#333] pt-6">
          <p class="text-sm text-[#888] font-mono">
            Note: Animations respect <code class="text-[#00d9ff]">prefers-reduced-motion</code> media query.
            Users with motion sensitivity will see static skeletons.
          </p>
        </div>
      </div>
    </div>
  );
}
