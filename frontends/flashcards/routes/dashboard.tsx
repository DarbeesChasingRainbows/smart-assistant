import { define } from "../utils.ts";
import { RetentionApiClient } from "../utils/api.ts";
import FlashcardsDashboard from "../components/FlashcardsDashboard.tsx";
import type { Deck, HealthCheckResponse } from "../utils/api.ts";

interface DashboardData {
  stats: {
    deckCount: number;
    cardCount: number;
    categoryCount: number;
  };
  recentDecks: Deck[];
  health: HealthCheckResponse | null;
  error?: string;
}

const client = new RetentionApiClient();

export const handler = define.handlers({
  async GET(_ctx) {
    try {
      const decks = await client.getDecks();
      const health: HealthCheckResponse | null = await client.healthCheck()
        .catch(() => null);

      const categories = new Set(decks.map((d) => d.category).filter(Boolean));
      const totalCards = decks.reduce((sum, d) => sum + (d.cardCount ?? 0), 0);
      const recentDecks = [...decks]
        .sort((a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        .slice(0, 5);

      return {
        data: {
          stats: {
            deckCount: decks.length,
            cardCount: totalCards,
            categoryCount: categories.size,
          },
          recentDecks,
          health,
        } satisfies DashboardData,
      };
    } catch (error) {
      console.error("flashcards:dashboard:load_failed", error);
      return {
        data: {
          stats: { deckCount: 0, cardCount: 0, categoryCount: 0 },
          recentDecks: [],
          health: null,
          error: "Could not connect to backend",
        } satisfies DashboardData,
      };
    }
  },
});

export default define.page<typeof handler>(function DashboardPage(props) {
  const { stats, recentDecks, health, error } = props.data as DashboardData;

  return (
    <div class="space-y-4">
      {error && (
        <div class="alert alert-error shadow">
          <span>{error}</span>
        </div>
      )}

      <FlashcardsDashboard
        stats={stats}
        recentDecks={recentDecks}
        health={health}
      />
    </div>
  );
});
