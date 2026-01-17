import type { Deck } from "../utils/api.ts";
import type { HealthCheckResponse } from "../utils/api.ts";
import { url } from "../utils.ts";

export interface FlashcardsDashboardStats {
  deckCount: number;
  cardCount: number;
  categoryCount: number;
}

export interface FlashcardsDashboardProps {
  stats: FlashcardsDashboardStats;
  recentDecks: Deck[];
  health: HealthCheckResponse | null;
}

export default function FlashcardsDashboard(
  { stats, recentDecks, health }: FlashcardsDashboardProps,
) {
  return (
    <div class="max-w-6xl mx-auto">
      <div class="mb-6">
        <h1 class="text-3xl font-bold">Dashboard</h1>
        <p class="text-base-content/70 mt-1">
          Pick up where you left off. Review what’s due, jump into study mode,
          or manage decks.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="stat bg-base-100 rounded-box shadow">
          <div class="stat-title">Decks</div>
          <div class="stat-value">{stats.deckCount}</div>
          <div class="stat-desc">Your active collection</div>
        </div>
        <div class="stat bg-base-100 rounded-box shadow">
          <div class="stat-title">Cards</div>
          <div class="stat-value">{stats.cardCount}</div>
          <div class="stat-desc">Total flashcards across decks</div>
        </div>
        <div class="stat bg-base-100 rounded-box shadow">
          <div class="stat-title">Categories</div>
          <div class="stat-value">{stats.categoryCount}</div>
          <div class="stat-desc">Topics represented</div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div class="lg:col-span-2">
          <div class="card bg-base-100 shadow">
            <div class="card-body">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h2 class="card-title">Quick actions</h2>
                  <p class="text-sm text-base-content/70">
                    Start a review session or manage your decks.
                  </p>
                </div>
                <div class="badge badge-outline">
                  {health?.status ?? "unknown"}
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <a class="btn btn-primary" href={url("/quiz/interleaved")}>
                  Start interleaved study
                </a>
                <a class="btn btn-secondary" href={url("/decks")}>
                  Browse decks
                </a>
                <a class="btn btn-ghost" href={url("/graph")}>
                  Knowledge graph
                </a>
                <a class="btn btn-ghost" href={url("/flashcards")}>
                  Manage cards
                </a>
              </div>
            </div>
          </div>

          <div class="card bg-base-100 shadow mt-6">
            <div class="card-body">
              <h2 class="card-title">Recent decks</h2>
              <p class="text-sm text-base-content/70">
                Your latest updated decks.
              </p>

              {recentDecks.length === 0
                ? (
                  <div class="alert mt-4">
                    <span>
                      No decks yet. Import an Anki deck or create one to get
                      started.
                    </span>
                  </div>
                )
                : (
                  <div class="overflow-x-auto mt-4">
                    <table class="table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Category</th>
                          <th class="text-right">Cards</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentDecks.map((deck) => (
                          <tr key={deck.id}>
                            <td>
                              <div class="font-medium">{deck.name}</div>
                              <div class="text-xs text-base-content/60">
                                {deck.description}
                              </div>
                            </td>
                            <td>
                              <span class="badge badge-outline">
                                {deck.category || "Uncategorized"}
                              </span>
                            </td>
                            <td class="text-right font-mono">
                              {deck.cardCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

              <div class="card-actions justify-end mt-4">
                <a class="btn btn-sm" href={url("/decks")}>View all decks</a>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div class="card bg-base-100 shadow">
            <div class="card-body">
              <h2 class="card-title">Today</h2>
              <p class="text-sm text-base-content/70">
                A simple plan you can follow right now.
              </p>

              <div class="mt-4 space-y-3">
                <div class="flex items-center gap-3">
                  <div class="badge badge-primary badge-lg">1</div>
                  <div>
                    <div class="font-medium">Warm up</div>
                    <div class="text-xs text-base-content/60">
                      Do 10 quick recalls.
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <div class="badge badge-secondary badge-lg">2</div>
                  <div>
                    <div class="font-medium">Interleaved session</div>
                    <div class="text-xs text-base-content/60">
                      Mix categories for better retention.
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <div class="badge badge-outline badge-lg">3</div>
                  <div>
                    <div class="font-medium">Refine decks</div>
                    <div class="text-xs text-base-content/60">
                      Fix 1–2 confusing cards.
                    </div>
                  </div>
                </div>
              </div>

              <div class="card-actions justify-end mt-6">
                <a class="btn btn-outline" href={url("/quiz/interleaved")}>
                  Study now
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
