/**
 * Client for the Retention Service (.NET Web API)
 * 
 * @see utils/contracts.ts for type definitions aligned with C# DTOs
 */

// Re-export all contracts for convenience
export * from "./contracts.ts";

import type {
  Deck,
  Flashcard,
  QuizSession,
  GlossaryTerm,
  CrossReference,
  User,
  IdentifyUserRequest,
  CreateUserRequest,
  UpdateUserRequest,
  QuizCompletionRequest,
  CardReviewRequest,
  QuizResultRequest,
  ReviewRequest,
  CreateFlashcardRequest,
  ImportResult,
  DeckImportResult,
  HealthCheckResponse,
} from "./contracts.ts";

export class RetentionApiClient {
  public baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || Deno.env.get("VITE_API_URL") || "http://localhost:8080";
  }

  // ============================================================================
  // Quiz Methods
  // ============================================================================

  async generateQuiz(difficulty: "Easy" | "Medium" | "Difficult" | "Expert", count: number = 10, deckId?: string | null): Promise<QuizSession> {
    const params = new URLSearchParams({ difficulty, count: count.toString() });
    if (deckId) params.set("deckId", deckId);
    const response = await fetch(`${this.baseUrl}/api/v1/flashcards/quiz?${params.toString()}`, {
      method: "POST",
    });
    if (!response.ok) throw new Error(`Failed to generate quiz: ${response.statusText}`);
    return response.json();
  }

  async submitQuizResult(quizResult: QuizResultRequest): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/v1/flashcards/quiz-result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quizResult),
    });
    if (!response.ok) throw new Error(`Failed to submit quiz result: ${response.statusText}`);
  }

  async reviewFlashcard(reviewRequest: ReviewRequest): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/v1/flashcards/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reviewRequest),
    });
    if (!response.ok) throw new Error(`Failed to review flashcard: ${response.statusText}`);
  }

  // ============================================================================
  // Flashcard Methods
  // ============================================================================

  async getFlashcards(deckId?: string | null): Promise<Flashcard[]> {
    let url = `${this.baseUrl}/api/v1/flashcards`;
    if (deckId) url += `?deckId=${deckId}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch flashcards: ${response.statusText}`);
    return response.json();
  }

  async getFlashcardById(id: string): Promise<Flashcard> {
    const response = await fetch(`${this.baseUrl}/api/v1/flashcards/${id}`);
    if (!response.ok) throw new Error(`Failed to fetch flashcard: ${response.statusText}`);
    return response.json();
  }

  async createFlashcard(request: CreateFlashcardRequest): Promise<Flashcard> {
    const response = await fetch(`${this.baseUrl}/api/v1/flashcards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error(`Failed to create flashcard: ${response.statusText}`);
    return response.json();
  }

  async updateFlashcard(flashcard: Flashcard): Promise<Flashcard> {
    const response = await fetch(`${this.baseUrl}/api/v1/flashcards/${flashcard.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(flashcard),
    });
    if (!response.ok) throw new Error(`Failed to update flashcard: ${response.statusText}`);
    return response.json();
  }

  async deleteFlashcard(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/v1/flashcards/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error(`Failed to delete flashcard: ${response.statusText}`);
  }

  // ============================================================================
  // Deck Methods
  // ============================================================================

  async getDecks(): Promise<Deck[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/decks`);
    if (!response.ok) throw new Error(`Failed to fetch decks: ${response.statusText}`);
    return response.json();
  }

  async getDeckById(id: string): Promise<Deck> {
    const response = await fetch(`${this.baseUrl}/api/v1/decks/${id}`);
    if (!response.ok) throw new Error(`Failed to fetch deck: ${response.statusText}`);
    return response.json();
  }

  async getGlossaryTerms(deckId: string): Promise<GlossaryTerm[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/decks/${deckId}/glossary`);
    if (!response.ok) throw new Error(`Failed to fetch glossary terms: ${response.statusText}`);
    return response.json();
  }

  async getCrossReferences(deckId: string): Promise<CrossReference[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/decks/${deckId}/cross-references`);
    if (!response.ok) throw new Error(`Failed to fetch cross references: ${response.statusText}`);
    return response.json();
  }

  async getDeckFlashcards(deckId: string): Promise<Flashcard[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/decks/${deckId}/flashcards`);
    if (!response.ok) throw new Error(`Failed to fetch deck flashcards: ${response.statusText}`);
    return response.json();
  }

  async getDeckFlashcardVersions(deckId: string): Promise<Flashcard[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/decks/${deckId}/flashcard-versions`);
    if (!response.ok) throw new Error(`Failed to fetch deck flashcard versions: ${response.statusText}`);
    return response.json();
  }

  async getDeckStats(deckId: string): Promise<{ cardCount: number; averageDifficulty: number }> {
    const response = await fetch(`${this.baseUrl}/api/v1/decks/${deckId}/stats`);
    if (!response.ok) throw new Error(`Failed to fetch deck stats: ${response.statusText}`);
    return response.json();
  }

  async importDeck(deckName: string, file: File): Promise<DeckImportResult> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${this.baseUrl}/api/v1/decks/import?deckName=${encodeURIComponent(deckName)}`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error(`Failed to import deck: ${response.statusText}`);
    return response.json();
  }

  async importDirectory(directoryPath: string): Promise<ImportResult> {
    const response = await fetch(`${this.baseUrl}/api/v1/decks/import-directory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ directoryPath }),
    });
    if (!response.ok) throw new Error(`Failed to import directory: ${response.statusText}`);
    return response.json();
  }

  // ============================================================================
  // File Methods
  // ============================================================================

  async uploadFile(file: File): Promise<{ filePath: string }> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${this.baseUrl}/api/v1/files/upload`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error(`Failed to upload file: ${response.statusText}`);
    return response.json();
  }

  // ============================================================================
  // User Methods
  // ============================================================================

  async getUsers(): Promise<User[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/users`);
    if (!response.ok) throw new Error(`Failed to fetch users: ${response.statusText}`);
    return response.json();
  }

  async getUserById(id: string): Promise<User> {
    const response = await fetch(`${this.baseUrl}/api/v1/users/${id}`);
    if (!response.ok) throw new Error(`Failed to fetch user: ${response.statusText}`);
    return response.json();
  }

  async identifyUser(request: IdentifyUserRequest): Promise<User> {
    const response = await fetch(`${this.baseUrl}/api/v1/users/identify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error(`Failed to identify user: ${response.statusText}`);
    return response.json();
  }

  async createUser(request: CreateUserRequest): Promise<User> {
    const response = await fetch(`${this.baseUrl}/api/v1/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error(`Failed to create user: ${response.statusText}`);
    return response.json();
  }

  async updateUser(id: string, request: UpdateUserRequest): Promise<User> {
    const response = await fetch(`${this.baseUrl}/api/v1/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error(`Failed to update user: ${response.statusText}`);
    return response.json();
  }

  async recordQuizCompletion(userId: string, request: QuizCompletionRequest): Promise<User> {
    const response = await fetch(`${this.baseUrl}/api/v1/users/${userId}/quiz-completed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error(`Failed to record quiz completion: ${response.statusText}`);
    return response.json();
  }

  async recordCardReview(userId: string, request: CardReviewRequest): Promise<User> {
    const response = await fetch(`${this.baseUrl}/api/v1/users/${userId}/card-reviewed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error(`Failed to record card review: ${response.statusText}`);
    return response.json();
  }

  async getLeaderboard(type: "streak" | "quizzes" | "accuracy"): Promise<User[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/users/leaderboard/${type}`);
    if (!response.ok) throw new Error(`Failed to fetch leaderboard: ${response.statusText}`);
    return response.json();
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async healthCheck(): Promise<HealthCheckResponse> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) throw new Error(`Health check failed: ${response.statusText}`);
    const data: unknown = await response.json();
    if (
      typeof data === "object" &&
      data !== null &&
      "status" in data &&
      "cardCount" in data
    ) {
      const status = (data as { status: unknown }).status;
      const cardCount = (data as { cardCount: unknown }).cardCount;
      if ((status === "Healthy" || status === "Unhealthy") && typeof cardCount === "number") {
        return { status, cardCount };
      }
    }
    throw new Error("Health check returned unexpected payload");
  }
}
