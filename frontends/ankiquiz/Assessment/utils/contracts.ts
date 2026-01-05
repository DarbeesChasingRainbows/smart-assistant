/**
 * TypeScript contracts aligned with C# DTOs from Retention.App
 * These interfaces match the exact structure of the backend API responses.
 * 
 * @see Retention.App/Contracts/Dtos.cs
 * @see Retention.App/Controllers/UsersController.cs
 */

// ============================================================================
// Core Domain Types
// ============================================================================

/**
 * Deck DTO - matches DeckDto in C#
 */
export interface Deck {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  difficultyLevel: string;
  cardCount: number;
  createdAt: string; // ISO 8601 datetime
  updatedAt: string; // ISO 8601 datetime
}

/**
 * Flashcard DTO - matches Flashcard entity serialization
 */
export interface Flashcard {
  id: string;
  deckId: string;
  question: string;
  answer: string;
  metadata: QuestionMetadata | null;
  scheduling: SchedulingData;
  createdAt: string;
  updatedAt: string;
}

/**
 * Question metadata - matches QuestionMetadata value object
 */
export interface QuestionMetadata {
  questionType?: string;
  tags?: string[];
  difficulty?: string;
  hints?: string[];
  explanation?: string;
  [key: string]: unknown;
}

/**
 * Scheduling data - matches SchedulingData value object
 */
export interface SchedulingData {
  nextReviewDate: string;
  interval: number;
  repetitions: number;
  easeFactor: number;
}

/**
 * Quiz session - matches QuizSession domain object
 */
export interface QuizSession {
  id: string;
  createdAt: string;
  cardIds: string[];
  difficulty: QuizDifficulty;
}

/**
 * Quiz difficulty levels - matches QuizDifficulty enum
 */
export enum QuizDifficulty {
  Easy = 0,
  Medium = 1,
  Difficult = 2,
  Expert = 3,
}

/**
 * Glossary term DTO - matches GlossaryTermDto
 */
export interface GlossaryTerm {
  id: string;
  term: string;
  pronunciation: string;
  definition: string;
  category: string;
}

/**
 * Cross reference DTO - matches CrossReferenceDto
 */
export interface CrossReference {
  id: string;
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  referenceType: string;
}

/**
 * Media asset DTO - matches MediaAsset entity
 */
export interface MediaAsset {
  id: string;
  flashcardId: string;
  assetType: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

// ============================================================================
// User & Stats Types
// ============================================================================

/**
 * User DTO - matches UserDto in UsersController
 */
export interface User {
  id: string;
  displayName: string;
  email: string | null;
  createdAt: string;
  lastActiveAt: string;
  totalQuizzesTaken: number;
  totalCardsReviewed: number;
  totalCorrectAnswers: number;
  currentStreak: number;
  longestStreak: number;
  accuracyPercentage: number;
}

/**
 * Quiz result - matches QuizResult entity
 */
export interface QuizResult {
  id: string;
  userId: string;
  deckId: string;
  flashcardId: string;
  isCorrect: boolean;
  difficulty: string;
  answeredAt: string;
  rawAnswer: string | null;
}

// ============================================================================
// Request Types
// ============================================================================

/**
 * Create flashcard request - matches CreateFlashcardRequest
 */
export interface CreateFlashcardRequest {
  question: string;
  answer: string;
  deckId?: string | null;
}

/**
 * Update flashcard request - matches UpdateFlashcardRequest
 */
export interface UpdateFlashcardRequest {
  question: string;
  answer: string;
}

/**
 * Bulk create flashcards request - matches BulkCreateFlashcardsRequest
 */
export interface BulkCreateFlashcardsRequest {
  flashcards: CreateFlashcardRequest[];
}

/**
 * Update deck request - matches UpdateDeckRequest
 */
export interface UpdateDeckRequest {
  name: string;
  description: string;
  category: string;
  subcategory: string;
  difficultyLevel: string;
}

/**
 * Review request - matches ReviewRequest
 */
export interface ReviewRequest {
  rating: ReviewRating;
}

/**
 * Review rating - matches ReviewRating enum
 */
export type ReviewRating = "Again" | "Hard" | "Good" | "Easy";

/**
 * Quiz result request - matches QuizResultRequest
 */
export interface QuizResultRequest {
  userId: string;
  deckId: string;
  flashcardId: string;
  isCorrect: boolean;
  difficulty: string;
  rawAnswer?: string | null;
}

/**
 * Identify user request - matches IdentifyUserRequest
 */
export interface IdentifyUserRequest {
  displayName: string;
  email?: string | null;
}

/**
 * Create user request - matches CreateUserRequest
 */
export interface CreateUserRequest {
  displayName: string;
  email?: string | null;
}

/**
 * Update user request - matches UpdateUserRequest
 */
export interface UpdateUserRequest {
  displayName?: string | null;
}

/**
 * Quiz completion request - matches QuizCompletionRequest
 */
export interface QuizCompletionRequest {
  cardsReviewed: number;
  correctAnswers: number;
}

/**
 * Card review request - matches CardReviewRequest
 */
export interface CardReviewRequest {
  isCorrect: boolean;
  difficulty?: string | null;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Import result - matches ImportResult
 */
export interface ImportResult {
  totalCards: number;
  importedCards: number;
  errors: string[];
  deckName: string;
}

/**
 * Deck import result - matches DeckImportResult
 */
export interface DeckImportResult {
  success: boolean;
  deckId: string | null;
  deckName: string | null;
  flashcardsImported: number;
  glossaryTermsImported: number;
  crossReferencesCreated: number;
  messages: string[];
  errors: string[];
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: "Healthy" | "Unhealthy";
  cardCount: number;
}

/**
 * API error response
 */
export interface ApiError {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  traceId?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * API response wrapper for consistent error handling
 */
export type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: ApiError };

// ============================================================================
// Type Guards
// ============================================================================

export function isApiError(obj: unknown): obj is ApiError {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "title" in obj &&
    "status" in obj
  );
}

export function isUser(obj: unknown): obj is User {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    "displayName" in obj &&
    "totalQuizzesTaken" in obj
  );
}

export function isFlashcard(obj: unknown): obj is Flashcard {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    "question" in obj &&
    "answer" in obj &&
    "scheduling" in obj
  );
}

export function isDeck(obj: unknown): obj is Deck {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    "name" in obj &&
    "cardCount" in obj
  );
}
