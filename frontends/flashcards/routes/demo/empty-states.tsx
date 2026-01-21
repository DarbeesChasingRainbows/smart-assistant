/** @jsxImportSource preact */
import { Head } from "fresh/runtime";
import EmptyStateShowcase from "../../islands/EmptyStateShowcase.tsx";

/**
 * Empty state component system demo page
 *
 * Navigate to /demo/empty-states to preview all empty state variants
 */
export default function EmptyStatesDemo() {
  return (
    <>
      <Head>
        <title>Empty States Demo - Flashcards</title>
        <meta
          name="description"
          content="Preview and test empty state components with Sci-Fi HUD design system"
        />
      </Head>
      <EmptyStateShowcase />
    </>
  );
}
