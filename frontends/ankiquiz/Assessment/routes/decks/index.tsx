import { define } from "../../utils.ts";
import { RetentionApiClient } from "../../utils/api.ts";
import DeckEditButton from "../../islands/DeckEditButton.tsx";

const client = new RetentionApiClient();

interface Deck {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  difficultyLevel: string;
  cardCount: number;
  updatedAt?: string;
}

interface DeckStats {
  totalDecks: number;
  totalCards: number;
  totalCategories: number;
}

// Utility function for conditional classes (similar to cn from shadcn)
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Helper function to get difficulty styling
function getDifficultyStyling(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case 'beginner':
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    case 'intermediate':
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    case 'advanced':
    case 'expert':
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    default:
      return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  }
}

export default define.page(async (ctx) => {
  const url = new URL(ctx.req.url);
  const search = url.searchParams.get("search") || "";
  const category = url.searchParams.get("category") || "";
  const subcategory = url.searchParams.get("subcategory") || "";
  const difficulty = url.searchParams.get("difficulty") || "";
  const sortBy = url.searchParams.get("sortBy") || "name";

  // Fetch all decks and calculate stats
  const allDecks: Deck[] = await client.getDecks();
  const uniqueCategories = [...new Set(allDecks.map((d: Deck) => d.category).filter(Boolean))];
  const uniqueSubcategories = [...new Set(allDecks.map((d: Deck) => d.subcategory).filter(Boolean))];
  const totalCards = allDecks.reduce((sum: number, d: Deck) => sum + (d.cardCount || 0), 0);
  
  const stats: DeckStats = {
    totalDecks: allDecks.length,
    totalCards,
    totalCategories: uniqueCategories.length
  };

  // Apply filters server-side
  let filteredDecks = [...allDecks];
  
  // Apply search filter
  if (search) {
    const searchLower = search.toLowerCase();
    filteredDecks = filteredDecks.filter((deck: Deck) => 
      deck.name.toLowerCase().includes(searchLower) ||
      deck.description?.toLowerCase().includes(searchLower)
    );
  }
  
  // Apply category filter
  if (category) {
    filteredDecks = filteredDecks.filter((deck: Deck) => deck.category === category);
  }
  
  // Apply subcategory filter
  if (subcategory) {
    filteredDecks = filteredDecks.filter((deck: Deck) => deck.subcategory === subcategory);
  }
  
  // Apply difficulty filter
  if (difficulty) {
    filteredDecks = filteredDecks.filter((deck: Deck) => deck.difficultyLevel === difficulty);
  }
  
  // Apply sorting
  filteredDecks.sort((a: Deck, b: Deck) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "cardCount":
        return (b.cardCount || 0) - (a.cardCount || 0);
      case "difficulty":
        const difficultyOrder = { "beginner": 1, "intermediate": 2, "advanced": 3, "expert": 4 };
        return (difficultyOrder[b.difficultyLevel as keyof typeof difficultyOrder] || 0) - 
               (difficultyOrder[a.difficultyLevel as keyof typeof difficultyOrder] || 0);
      case "updated":
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      default:
        return 0;
    }
  });

  // Helper function to build URL with current filters
  const buildUrl = (updates: Record<string, string>) => {
    const params = new URLSearchParams(url.searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    return `/decks?${params.toString()}`;
  };
  
  return (
    <div class="min-h-screen bg-background p-4 md:p-8">
        <div class="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-4xl font-bold text-foreground">Flashcard Decks</h1>
                        <p class="text-muted-foreground mt-2">
                            Explore and master your learning materials
                        </p>
                    </div>
                    <div class="flex gap-2">
                        <a href="/quiz/interleaved" class="btn btn-primary btn-sm">Interleaved Study</a>
                        <a href="/graph" class="btn btn-ghost btn-sm">View Graph</a>
                        <a href="/" class="btn btn-ghost">Back to Home</a>
                    </div>
                </div>
            </div>

            {/* Enhanced Stats Summary Bar */}
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div class="card bg-base-100 shadow-sm border border-gray-200">
                    <div class="card-body p-4">
                        <div class="flex items-center gap-2">
                            <svg class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <div class="text-xs text-muted-foreground">Total Decks</div>
                        </div>
                        <div class="text-2xl font-bold mt-2">{stats.totalDecks}</div>
                    </div>
                </div>

                <div class="card bg-base-100 shadow-sm border border-gray-200">
                    <div class="card-body p-4">
                        <div class="flex items-center gap-2">
                            <svg class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <div class="text-xs text-muted-foreground">Total Cards</div>
                        </div>
                        <div class="text-2xl font-bold mt-2">{stats.totalCards}</div>
                    </div>
                </div>

                <div class="card bg-base-100 shadow-sm border border-gray-200">
                    <div class="card-body p-4">
                        <div class="flex items-center gap-2">
                            <svg class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            <div class="text-xs text-muted-foreground">Categories</div>
                        </div>
                        <div class="text-2xl font-bold mt-2">{stats.totalCategories}</div>
                    </div>
                </div>

                <div class="card bg-base-100 shadow-sm border border-gray-200">
                    <div class="card-body p-4">
                        <div class="flex items-center gap-2">
                            <svg class="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div class="text-xs text-muted-foreground">Available</div>
                        </div>
                        <div class="text-2xl font-bold mt-2 text-green-500">{filteredDecks.length}</div>
                    </div>
                </div>

                <div class="card bg-base-100 shadow-sm border border-gray-200">
                    <div class="card-body p-4">
                        <div class="flex items-center gap-2">
                            <svg class="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <div class="text-xs text-muted-foreground">Avg Cards</div>
                        </div>
                        <div class="text-2xl font-bold mt-2 text-blue-500">
                            {stats.totalDecks > 0 ? Math.round(stats.totalCards / stats.totalDecks) : 0}
                        </div>
                    </div>
                </div>

                <div class="card bg-base-100 shadow-sm border border-gray-200">
                    <div class="card-body p-4">
                        <div class="flex items-center gap-2">
                            <svg class="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div class="text-xs text-muted-foreground">Updated</div>
                        </div>
                        <div class="text-2xl font-bold mt-2 text-purple-500">Today</div>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                {/* Search Bar */}
                <div class="mb-4">
                    <form method="GET" action="/decks" class="flex gap-2">
                        <input
                            type="text"
                            name="search"
                            placeholder="Search decks by name or description..."
                            class="input input-bordered flex-1 max-w-md"
                            value={search}
                        />
                        <button type="submit" class="btn btn-primary">Search</button>
                        {search && (
                            <a href={buildUrl({ search: "" })} class="btn btn-ghost">Clear</a>
                        )}
                    </form>
                </div>

                {/* Filter Controls */}
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {/* Category Filter */}
                    <form method="GET" action="/decks" class="contents">
                        <input type="hidden" name="search" value={search} />
                        <input type="hidden" name="difficulty" value={difficulty} />
                        <input type="hidden" name="sortBy" value={sortBy} />
                        <select 
                            name="category"
                            class="select select-bordered"
                            value={category}
                        >
                            <option value="">All Categories</option>
                            {uniqueCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </form>

                    {/* Subcategory Filter */}
                    <form method="GET" action="/decks" class="contents">
                        <input type="hidden" name="search" value={search} />
                        <input type="hidden" name="category" value={category} />
                        <input type="hidden" name="difficulty" value={difficulty} />
                        <input type="hidden" name="sortBy" value={sortBy} />
                        <select 
                            name="subcategory"
                            class="select select-bordered"
                            value={subcategory}
                            disabled={!category}
                        >
                            <option value="">All Subcategories</option>
                            {category && uniqueSubcategories
                                .filter(sub => allDecks.some((d: Deck) => d.category === category && d.subcategory === sub))
                                .map(sub => (
                                    <option key={sub} value={sub}>{sub}</option>
                                ))}
                        </select>
                    </form>

                    {/* Difficulty Filter */}
                    <form method="GET" action="/decks" class="contents">
                        <input type="hidden" name="search" value={search} />
                        <input type="hidden" name="category" value={category} />
                        <input type="hidden" name="subcategory" value={subcategory} />
                        <input type="hidden" name="sortBy" value={sortBy} />
                        <select 
                            name="difficulty"
                            class="select select-bordered"
                            value={difficulty}
                        >
                            <option value="">All Difficulties</option>
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                            <option value="expert">Expert</option>
                        </select>
                    </form>

                    {/* Sort Options */}
                    <form method="GET" action="/decks" class="contents">
                        <input type="hidden" name="search" value={search} />
                        <input type="hidden" name="category" value={category} />
                        <input type="hidden" name="subcategory" value={subcategory} />
                        <input type="hidden" name="difficulty" value={difficulty} />
                        <select 
                            name="sortBy"
                            class="select select-bordered"
                            value={sortBy}
                        >
                            <option value="name">Sort by Name</option>
                            <option value="cardCount">Sort by Card Count</option>
                            <option value="difficulty">Sort by Difficulty</option>
                            <option value="updated">Sort by Recently Updated</option>
                        </select>
                    </form>
                </div>

                {/* Active Filters Display */}
                <div class="flex flex-wrap gap-2">
                    {search && (
                        <span class="badge badge-primary gap-2">
                            Search: {search}
                            <a href={buildUrl({ search: "" })} class="btn btn-ghost btn-xs">✕</a>
                        </span>
                    )}
                    {category && (
                        <span class="badge badge-primary gap-2">
                            Category: {category}
                            <a href={buildUrl({ category: "", subcategory: "" })} class="btn btn-ghost btn-xs">✕</a>
                        </span>
                    )}
                    {subcategory && (
                        <span class="badge badge-primary gap-2">
                            Subcategory: {subcategory}
                            <a href={buildUrl({ subcategory: "" })} class="btn btn-ghost btn-xs">✕</a>
                        </span>
                    )}
                    {difficulty && (
                        <span class="badge badge-primary gap-2">
                            Difficulty: {difficulty}
                            <a href={buildUrl({ difficulty: "" })} class="btn btn-ghost btn-xs">✕</a>
                        </span>
                    )}
                </div>
            </div>

            {/* Results Count */}
            <div class="mb-4">
                <p class="text-gray-600">
                    Showing {filteredDecks.length} of {stats.totalDecks} decks
                    {filteredDecks.length !== stats.totalDecks && " (filtered)"}
                </p>
            </div>

            {filteredDecks.length === 0 ? (
                <div class="text-center py-12">
                    <svg class="h-12 w-12 text-muted-foreground mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <h3 class="text-lg font-semibold text-foreground">No decks found</h3>
                    <p class="text-muted-foreground mt-2">
                        Try adjusting your search or filters
                    </p>
                    <a href="/decks" class="btn btn-primary btn-sm mt-4">
                        Clear All Filters
                    </a>
                </div>
            ) : (
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDecks.map((deck: Deck) => (
                        <div class={cn(
                            "group bg-background relative isolate z-0 flex h-full flex-col justify-between overflow-hidden rounded-lg border px-5 py-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-1",
                            "shadow-sm border-gray-200 hover:border-blue-300"
                        )}>
                            {/* Grid Pattern Background */}
                            <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <div class="absolute -inset-[25%] -skew-y-12 opacity-30">
                                    <svg class="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                                        <defs>
                                            <pattern id={`grid-${deck.id}`} width="30" height="30" patternUnits="userSpaceOnUse">
                                                <path d="M.5 30V.5H30" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.3"/>
                                            </pattern>
                                        </defs>
                                        <rect width="100%" height="100%" fill={`url(#grid-${deck.id})`} />
                                    </svg>
                                </div>
                            </div>

                            <div class="relative z-10 space-y-4">
                                {/* Header with Category and Card Count */}
                                <div class="flex items-start justify-between">
                                    <div class="flex-1">
                                        <h3 class="text-lg font-semibold text-foreground group-hover:text-blue-600 transition-colors">
                                            {deck.name}
                                        </h3>
                                        <p class="text-sm text-muted-foreground mt-1 line-clamp-2">
                                            {deck.description}
                                        </p>
                                    </div>
                                    <div class="flex flex-col items-end gap-2 ml-4">
                                        <span class={cn(
                                            "badge badge-sm border",
                                            getDifficultyStyling(deck.difficultyLevel)
                                        )}>
                                            {deck.difficultyLevel}
                                        </span>
                                        <span class="text-xs text-muted-foreground font-medium">
                                            {deck.cardCount} cards
                                        </span>
                                    </div>
                                </div>

                                {/* Category and Subcategory Badges */}
                                <div class="flex flex-wrap gap-2">
                                    <span class="badge badge-secondary badge-sm">
                                        {deck.category}
                                    </span>
                                    {deck.subcategory && (
                                        <span class="badge badge-outline badge-sm">
                                            {deck.subcategory}
                                        </span>
                                    )}
                                </div>

                                {/* Stats Grid */}
                                <div class="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                                    <div class="space-y-1">
                                        <div class="flex items-center gap-1 text-xs text-muted-foreground">
                                            <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                            </svg>
                                            <span>Cards</span>
                                        </div>
                                        <div class="text-lg font-semibold text-foreground">{deck.cardCount}</div>
                                    </div>

                                    <div class="space-y-1">
                                        <div class="flex items-center gap-1 text-xs text-muted-foreground">
                                            <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>Updated</span>
                                        </div>
                                        <div class="text-sm font-semibold text-foreground">
                                            {deck.updatedAt ? new Date(deck.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Today'}
                                        </div>
                                    </div>
                                </div>

                                {/* Metadata Indicators */}
                                <div class="flex items-center justify-between pt-2 text-xs text-muted-foreground border-t border-gray-200">
                                    <div class="flex items-center gap-3">
                                        <div class="flex items-center gap-1">
                                            <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                            </svg>
                                            <span>Glossary</span>
                                            <span class="badge badge-xs badge-outline">{(deck.id?.toString().slice(-1) || "1")}</span>
                                        </div>
                                        <div class="flex items-center gap-1">
                                            <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                            </svg>
                                            <span>References</span>
                                            <span class="badge badge-xs badge-outline">{(deck.cardCount?.toString().slice(-1) || "1")}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div class="card-actions justify-end mt-4 gap-2">
                                    <DeckEditButton deck={deck} />
                                    <a 
                                        href={`/quiz/${deck.id}`} 
                                        class="btn btn-primary btn-sm hover:btn-primary transition-colors"
                                    >
                                        Start Quiz
                                    </a>
                                    <a 
                                        href={`/decks/${deck.id}`} 
                                        class="btn btn-outline btn-sm hover:btn-outline transition-colors"
                                    >
                                        Explore Deck
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
});
