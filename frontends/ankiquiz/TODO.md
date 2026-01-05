# Project Comprehensive Todo List

This document outlines the comprehensive tasks for the AnkiQuiz project, categorized by role/persona.

---

## 🚀 Priority Features (Current Sprint)

### 1. Reliability & Error Handling ✅
- [x] **Frontend Error UI**: Surface quiz/API errors with retry buttons and user-friendly messages
  - Created `ErrorAlert.tsx` and `LoadingSpinner.tsx` components
- [x] **Request Timeout Feedback**: Show loading spinners with timeout warnings after 5s
  - `LoadingSpinner` shows warnings at 5s and 15s elapsed
- [x] **Rate Limit Handling**: Respect `Retry-After` headers from dictionary API
  - Updated `ResilienceConfiguration.cs` with `DelayGenerator` that extracts `Retry-After` header
  - Added `GetRetryAfter()` helper method
- [x] **Circuit Breaker UI Awareness**: Detect when backend circuit is open; show degraded mode message
  - Created `CircuitBreakerStateTracker` to track circuit states
  - Created `SystemStatusController` with `GET /api/v1/system/status` endpoint
  - Created `SystemStatusBanner.tsx` component for degraded mode display

### 2. Deck Sharing ✅
- [x] **ShareToken Entity**: Add `ShareToken` field to Deck (nullable, unique slug for sharing)
- [x] **Generate Share Link**: API endpoint `POST /api/v1/decks/{id}/share` → returns shareable URL
- [x] **Public Deck View**: Route `/shared/{token}` for read-only deck access (no auth required)
- [x] **Revoke Share**: API endpoint `DELETE /api/v1/decks/{id}/share` to remove share token
- [x] **Import from Share**: Clone shared deck into user's collection
  - Added `POST /api/v1/decks/shared/{token}/clone` endpoint
  - Created `CloneDeckButton.tsx` island component

### 3. Authoring & Content Management ✅
- [x] **Flashcard Version History**: Track edits with `FlashcardVersion` entity (question, answer, editedAt)
- [x] **Undo/Rollback**: API to restore previous version of a flashcard
- [x] **Tags System**: Add `Tags` table and many-to-many with Flashcards
- [x] **Tags UI**: Filter by tag in UI
  - Created `TagFilter.tsx` for filtering flashcards by tags
  - Created `TagManager.tsx` for adding/removing tags on flashcards
- [x] **Duplicate Detection**: Warn when creating flashcard with similar question in same deck
  - Added `FindSimilarQuestionsAsync()` using PostgreSQL trigram similarity
  - Added `GET /api/v1/flashcards/check-duplicates` endpoint
  - Created `DuplicateWarning.tsx` island component
  - Added migration `007_TrigramExtension.sql` for pg_trgm
- [x] **Bulk Operations**: Move/copy cards between decks; merge decks
  - Created `FlashcardBulkController` with endpoints:
    - `POST /api/v1/flashcards/bulk/move`
    - `POST /api/v1/flashcards/bulk/copy`
    - `POST /api/v1/flashcards/bulk/delete`
    - `POST /api/v1/flashcards/bulk/merge`

### 4. Interleaved Learning (Multi-Deck Study) ✅
- [x] **Interleaved Quiz Session**: New quiz mode that pulls cards from multiple selected decks
- [x] **Deck Selection UI**: Checkbox list to select which decks to include in interleaved session
- [x] **Interleaving Algorithm**: Shuffle cards across decks; ensure no consecutive same-deck cards
- [x] **Subject Context Display**: Show deck name/category badge on each card during interleaved quiz
- [x] **Per-Deck Progress Tracking**: Track and display progress per deck within interleaved session

---

## 🦕 Deno Fresh Expert (Assessment Service)
**Context**: `d:\repos\ankiquiz\Assessment`

- [x] **Configuration**
    - [x] Enable strict mode in `deno.json` (`"strict": true`).
    - [ ] Check import map for `jsr:@std` usage over `https:` imports.
    - [ ] Verify workspace member configuration if applicable.
- **Architecture & State**
    - [ ] Implement **Preact Signals** (`@preact/signals`) for fine-grained island reactivity.
    - [ ] Ensure `Handlers` return strict `Response` objects (no magic returns).
    - [ ] Verify DDD boundaries within the Fresh app (if business logic exists here).
- **Styling & UI**
    - [ ] Standardize on **CSS Modules** (`.module.css`) or standard imports.
    - [ ] Audit usage of Layouts (`_layout.tsx`) and App wrappers (`_app.tsx`).
- **Data Access**
    - [ ] Verify PostgreSQL connection logic (using `postgres.js` or `@db/postgres`).
    - [ ] Ensure UUIDv7 usage for primary keys if accessing DB directly.

## 🔷 C# Developer (Retention Service)
**Context**: `d:\repos\ankiquiz\Retention\src`

- [x] **Solution Architecture**
    - [x] Review `Retention.App`, `Retention.Domain`, `Retention.Infrastructure` for Clean Architecture adherence.
    - [x] Ensure Domain layer has zero dependencies.
    - [x] Check for MediatR usage for CQRS pattern implementation.
- [x] **Code Quality & Standards**
    - [x] **Nullable Reference Types**: Verify `<Nullable>enable</Nullable>` in `.csproj` files.
    - [x] **Modern C#**: Check for usage of `record` types for DTOs/Value Objects.
    - [ ] **Analysis**: Ensure `.editorconfig` is present and enforcing rules.
- [x] **Data & Performance**
    - [x] Audit Data Access Strategy (Confirmed **Dapper** implementation; matches Persona).
    - [x] Verify migration strategy (SQL-based/DbUp required).
- **Testing**
    - [ ] specific test project check (xUnit/NUnit).
    - [ ] Target >80% test coverage.

## 🧠 Retention Domain (Business Logic)

- [x] **Algorithm Implementation**
    - [x] Implement **FSRS (Free Spaced Repetition Scheduler)** or **SM-2** algorithm for scheduling.
    - [x] Create `SchedulingEngine` service to calculate next review dates/intervals.
    - [x] Define "Difficulty" metrics (Again, Hard, Good, Easy) affecting the algorithm.
- [x] **Quiz Generation Engine**
    - [x] Implement `QuizGenerator` service.
    - [x] Logic: Pull due cards -> Select random subset -> Mix with new cards -> Generate Quiz.
    - [x] **Storage Strategy**:
        - [x] Store generated "Quiz Sessions" (referencing Card IDs).
        - [x] Prevent duplicating Card content; reference existing Cards.
    - [x] Difficulty Levels:
        - [x] **Easy**: High frequency of "Good" cards, low new cards.
        - [x] **Medium**: Balanced mix.
        - [x] **Difficult**: High frequency of "Hard" cards + new cards.
        - [x] **Expert**: All "Hard" cards + "Again" cards.
    - [x] Connect `QuizInterface` (Islands) to `.NET API`.
    - [x] Implement **Server-Side Actions** (Fresh 2.x) for secure API calls (hiding API keys/internal URLs).

## 🏗️ Microservices Architect (System Wide)

- [x] **Service Boundaries**
    - [x] Define clear contract between **Assessment** (Edge/Frontend) and **Retention** (Core Backend).
    - [x] Ensure "Database per Service" pattern (or clear schema separation).
- **Communication**
    - [ ] Define Protocol: Synchronous (REST/gRPC) vs Asynchronous (Events).
    - [x] Implement Resilience: Circuit Breakers, Retries, Timeouts.
- **Operations**
    - [x] Containerization: Dockerfiles for both services.
    - [x] Observability: Distributed tracing setup (connecting Deno and .NET traces).

## 🌐 Fullstack Developer (Integration)

- [x] **End-to-End Flow**
    - [x] Align Data Contracts: Ensure TypeScript interfaces in Assessment match C# DTOs in Retention.
    - [ ] **Authentication**: Implement consistent Auth flow (JWT/Session) passing securely between services.
- **Quality Assurance**
    - [x] Setup **Playwright** for E2E testing across the full stack.
    - [ ] Validated UI components against backend capabilities.
- **Deployment**
    - [ ] Create unified build/deploy pipeline.
    - [ ] Environment variable management across services.
