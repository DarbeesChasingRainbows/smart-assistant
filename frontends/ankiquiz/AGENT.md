# AnkiQuiz - Comprehensive Learning Platform

## Project Overview

AnkiQuiz is a sophisticated spaced repetition learning platform implementing advanced scheduling algorithms (FSRS/SM-2) with support for complex multi-part questions, cross-reference systems, and integrated glossaries. The platform uses a microservices architecture with Deno Fresh 2.x for the frontend/edge layer and .NET Core for backend business logic.

### Core Features

- **Spaced Repetition Engine**: Implements FSRS (Free Spaced Repetition Scheduler) for optimal learning intervals
- **Quiz Generation**: Dynamic quiz creation with multiple difficulty levels (Easy, Medium, Difficult, Expert)
- **Complex Question Types**: Simple, Multiple Choice, Scenario-Based, and Multi-Part questions
- **Cross-Reference System**: Obsidian-like linking between cards, decks, and glossary terms
- **Glossary Integration**: Contextual terminology with pronunciations and etymologies
- **168+ Organized Decks**: Spanning Education, Sciences, Healthcare, Cybersecurity, Languages, and more

### Technology Stack

- **Frontend/Edge**: Deno Fresh 2.x (TypeScript, JSX)
- **Backend**: .NET Core 9+ with Clean Architecture
- **Database**: PostgreSQL 17/18 with UUIDv7 for primary keys
- **Styling**: CSS Modules (no atomic CSS frameworks)
- **State Management**: Preact Signals for fine-grained reactivity
- **Data Access**: Dapper for high-performance queries
- **Architecture**: Domain-Driven Design (DDD) + CQRS + Hexagonal Architecture

---

## Architecture

### Microservices Structure

```
ankiquiz/
├── Assessment/          # Deno Fresh 2.x (Edge/Frontend Service)
│   ├── routes/         # File-based routing
│   ├── islands/        # Client-side interactive components
│   ├── components/     # Server-side components
│   └── utils/          # Utility functions
│
├── Retention/          # .NET Core (Business Logic Service)
│   ├── src/
│   │   ├── Retention.Domain/        # Pure domain logic
│   │   ├── Retention.Application/   # CQRS handlers
│   │   └── Retention.Infrastructure/ # Data access, external services
│   └── Retention.App/  # API entry point
│
└── Decks/              # 168+ flashcard decks organized by category
    ├── 01-Education_Learning/
    ├── 02-Sciences/
    ├── 03-Healthcare_Medical/
    └── ...
```

### Service Boundaries

**Assessment Service (Deno Fresh)**
- Responsibilities: User interface, quiz presentation, client-side interactions
- Communication: Consumes REST API from Retention Service
- Technology: Deno 2.x, Fresh 2.x, TypeScript, Preact Signals

**Retention Service (.NET Core)**
- Responsibilities: Scheduling algorithm, quiz generation, data persistence
- Communication: Exposes REST API, future event publishing
- Technology: C# 13, ASP.NET Core 9+, Dapper, PostgreSQL

---

## Build & Development Commands

### Assessment Service (Deno Fresh)

```bash
# Navigate to Assessment directory
cd Assessment

# Run development server (with file watching)
deno task dev

# Run production server
deno task build
deno task start

# Type check
deno check main.ts

# Lint
deno lint

# Format
deno fmt

# Run tests
deno test --allow-env --allow-net
```

### Retention Service (.NET Core)

```bash
# Navigate to Retention directory
cd Retention

# Restore dependencies
dotnet restore

# Build solution
dotnet build

# Run application
dotnet run --project src/Retention.App

# Run tests
dotnet test

# Database migrations (DbUp)
dotnet run --project src/Retention.Infrastructure -- migrate
```

---

## Code Style & Patterns

### Deno Fresh 2.x Conventions

#### File Organization

```
routes/
├── index.tsx           # Homepage (/)
├── quiz/
│   ├── [id].tsx       # Dynamic route (/quiz/:id)
│   └── _layout.tsx    # Nested layout for /quiz/*
└── api/
    └── flashcards.ts  # API route

islands/
├── QuizInterface.tsx   # Interactive quiz component
├── GlossaryPanel.tsx   # Sidebar glossary
└── Timer.tsx           # Quiz timer

components/
├── FlashcardDisplay.tsx  # Server-rendered flashcard
└── Header.tsx            # Static header
```

#### Route Patterns

**Async Route Components** (using `define.page`)
```typescript
import { define } from "../utils.ts";

export default define.page(async (props) => {
  const flashcards = await loadFlashcards();
  
  return (
    <div class="page">
      <h1>Flashcards</h1>
      <ul>
        {flashcards.map(card => (
          <li key={card.id}>{card.question}</li>
        ))}
      </ul>
    </div>
  );
});
```

**Handler + Component** (using `define.handlers`)
```typescript
import { define } from "../utils.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const data = await loadData();
    return ctx.render(data);
  },
  async POST(ctx) {
    const form = await ctx.req.formData();
    await processSubmission(form);
    return new Response(null, { status: 303, headers: { "Location": "/" } });
  },
});

export default define.page(function Page(props) {
  return <div>{/* render with props.data */}</div>;
});
```

#### Islands (Client-Side Components)

**Using Signals for State**
```typescript
// islands/QuizInterface.tsx
import { useSignal } from "@preact/signals";
import { useState } from "preact/hooks";

interface QuizInterfaceProps {
  flashcard: Flashcard;
  onAnswer: (answer: string) => void;
}

export default function QuizInterface(props: QuizInterfaceProps) {
  const userAnswer = useSignal("");
  const showAnswer = useSignal(false);
  
  const submitAnswer = () => {
    props.onAnswer(userAnswer.value);
    showAnswer.value = true;
  };
  
  return (
    <div class="quiz-card">
      <h2>{props.flashcard.question}</h2>
      
      {!showAnswer.value ? (
        <>
          <input
            type="text"
            value={userAnswer.value}
            onInput={(e) => userAnswer.value = e.currentTarget.value}
          />
          <button onClick={submitAnswer}>Submit</button>
        </>
      ) : (
        <div class="answer">{props.flashcard.answer}</div>
      )}
    </div>
  );
}
```

**Global Signals** (Share state across islands)
```typescript
// utils/signals.ts
import { signal } from "@preact/signals";

export const cart = signal<string[]>([]);
export const currentDeck = signal<string | null>(null);

// islands/DeckSelector.tsx
import { currentDeck } from "../utils/signals.ts";

export default function DeckSelector() {
  return (
    <select onChange={(e) => currentDeck.value = e.currentTarget.value}>
      {/* options */}
    </select>
  );
}
```

#### Styling (Tailwind CSS)

The project uses Tailwind CSS via the Fresh Vite plugin.

```typescript
// components/Button.tsx
export default function Button({ variant = "primary", children }) {
  const baseClass = "px-4 py-2 rounded transition-colors";
  const variantClass = variant === "primary" 
    ? "bg-blue-500 text-white hover:bg-blue-600" 
    : "bg-gray-200 text-gray-800 hover:bg-gray-300";

  return (
    <button class={`${baseClass} ${variantClass}`}>
      {children}
    </button>
  );
}
```

### .NET Core Conventions

#### Domain-Driven Design Structure

**Domain Layer** (Pure business logic)
```csharp
// Retention.Domain/Entities/Flashcard.cs
public class Flashcard : Entity<Guid>
{
    public Guid DeckId { get; private set; }
    public string Question { get; private set; }
    public string Answer { get; private set; }
    public QuestionMetadata Metadata { get; private set; }
    public SchedulingData Scheduling { get; private set; }
    
    private readonly List<GlossaryTerm> _glossaryTerms = new();
    public IReadOnlyList<GlossaryTerm> GlossaryTerms => _glossaryTerms.AsReadOnly();
    
    // Factory method
    public static Flashcard Create(
        Guid deckId,
        string question,
        string answer,
        QuestionMetadata metadata)
    {
        // Validation
        if (string.IsNullOrWhiteSpace(question))
            throw new ArgumentException("Question cannot be empty", nameof(question));
            
        return new Flashcard
        {
            Id = Guid.NewGuid(), // UUIDv7 in production
            DeckId = deckId,
            Question = question,
            Answer = answer,
            Metadata = metadata,
            Scheduling = SchedulingData.New()
        };
    }
    
    public void UpdateScheduling(DifficultyRating rating)
    {
        Scheduling = SchedulingEngine.CalculateNext(Scheduling, rating);
    }
}
```

**Value Objects** (Immutable, validated)
```csharp
// Retention.Domain/ValueObjects/SchedulingData.cs
public record SchedulingData
{
    public DateTime NextReviewDate { get; init; }
    public int IntervalDays { get; init; }
    public int Repetitions { get; init; }
    public decimal EaseFactor { get; init; }
    
    public static SchedulingData New() => new()
    {
        NextReviewDate = DateTime.UtcNow,
        IntervalDays = 1,
        Repetitions = 0,
        EaseFactor = 2.5m
    };
}

public enum DifficultyRating
{
    Again,  // 0
    Hard,   // 1
    Good,   // 2
    Easy    // 3
}
```

#### CQRS Pattern

**Commands** (Write operations)
```csharp
// Retention.Application/Commands/SubmitQuizAnswerCommand.cs
public record SubmitQuizAnswerCommand(
    Guid QuizSessionId,
    Guid FlashcardId,
    string UserAnswer,
    DifficultyRating DifficultyRating,
    int ResponseTimeMs
) : IRequest<Result<QuizAnswerResult>>;

// Handler
public class SubmitQuizAnswerHandler : IRequestHandler<SubmitQuizAnswerCommand, Result<QuizAnswerResult>>
{
    private readonly IFlashcardRepository _flashcardRepository;
    private readonly IQuizSessionRepository _quizSessionRepository;
    
    public async Task<Result<QuizAnswerResult>> Handle(
        SubmitQuizAnswerCommand command,
        CancellationToken cancellationToken)
    {
        var flashcard = await _flashcardRepository.GetByIdAsync(command.FlashcardId);
        if (flashcard == null)
            return Result.Failure<QuizAnswerResult>("Flashcard not found");
            
        // Update scheduling
        flashcard.UpdateScheduling(command.DifficultyRating);
        await _flashcardRepository.UpdateAsync(flashcard);
        
        // Record session data
        var session = await _quizSessionRepository.GetByIdAsync(command.QuizSessionId);
        session.RecordAnswer(command.FlashcardId, command.UserAnswer, command.ResponseTimeMs);
        
        return Result.Success(new QuizAnswerResult(flashcard.Scheduling));
    }
}
```

**Queries** (Read operations)
```csharp
// Retention.Application/Queries/GetDueFlashcardsQuery.cs
public record GetDueFlashcardsQuery(
    DateTime AsOfDate,
    int Limit = 20
) : IRequest<Result<List<FlashcardDto>>>;

// Handler (uses Dapper for optimized queries)
public class GetDueFlashcardsHandler : IRequestHandler<GetDueFlashcardsQuery, Result<List<FlashcardDto>>>
{
    private readonly string _connectionString;
    
    public async Task<Result<List<FlashcardDto>>> Handle(
        GetDueFlashcardsQuery query,
        CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT f.*, d.name as deck_name
            FROM flashcards f
            JOIN decks d ON f.deck_id = d.id
            WHERE f.next_review_date <= @AsOfDate
            ORDER BY f.next_review_date
            LIMIT @Limit";
            
        using var connection = new NpgsqlConnection(_connectionString);
        var results = await connection.QueryAsync<FlashcardDto>(sql, new 
        { 
            AsOfDate = query.AsOfDate, 
            Limit = query.Limit 
        });
        
        return Result.Success(results.ToList());
    }
}
```

#### Repository Pattern (Dapper)

```csharp
// Retention.Infrastructure/Repositories/FlashcardRepository.cs
public class FlashcardRepository : IFlashcardRepository
{
    private readonly string _connectionString;
    
    public async Task<Flashcard?> GetByIdAsync(Guid id)
    {
        const string sql = @"
            SELECT * FROM flashcards WHERE id = @Id";
            
        using var connection = new NpgsqlConnection(_connectionString);
        var dto = await connection.QuerySingleOrDefaultAsync<FlashcardDto>(sql, new { Id = id });
        
        return dto?.ToDomain();
    }
    
    public async Task UpdateAsync(Flashcard flashcard)
    {
        const string sql = @"
            UPDATE flashcards
            SET next_review_date = @NextReviewDate,
                interval_days = @IntervalDays,
                repetitions = @Repetitions,
                ease_factor = @EaseFactor,
                updated_at = @UpdatedAt
            WHERE id = @Id";
            
        using var connection = new NpgsqlConnection(_connectionString);
        await connection.ExecuteAsync(sql, new
        {
            Id = flashcard.Id,
            NextReviewDate = flashcard.Scheduling.NextReviewDate,
            IntervalDays = flashcard.Scheduling.IntervalDays,
            Repetitions = flashcard.Scheduling.Repetitions,
            EaseFactor = flashcard.Scheduling.EaseFactor,
            UpdatedAt = DateTime.UtcNow
        });
    }
}
```

---

## Database

### Connection Configuration

**Deno Fresh** (Assessment Service)
```typescript
// utils/db.ts
import postgres from "npm:postgres@3";

const sql = postgres({
  host: Deno.env.get("DB_HOST") || "localhost",
  port: parseInt(Deno.env.get("DB_PORT") || "5432"),
  database: Deno.env.get("DB_NAME") || "ankiquiz",
  username: Deno.env.get("DB_USER") || "postgres",
  password: Deno.env.get("DB_PASSWORD"),
});

export { sql };
```

**.NET Core** (Retention Service)
```csharp
// appsettings.json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=ankiquiz;Username=postgres;Password=yourpassword"
  }
}

// Program.cs
builder.Services.AddScoped<IFlashcardRepository>(sp => 
    new FlashcardRepository(
        builder.Configuration.GetConnectionString("DefaultConnection")!
    )
);
```

### Schema Overview

```sql
-- Primary Keys: UUIDv7 (generated in C# using UUIDNext library)
-- Indexes: Optimized for Skip Scan (PostgreSQL 18)
-- JSONB: Used for flexible metadata storage

CREATE TABLE decks (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    difficulty_level VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE flashcards (
    id UUID PRIMARY KEY,
    deck_id UUID NOT NULL REFERENCES decks(id),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    question_type VARCHAR(50) DEFAULT 'simple',
    metadata JSONB,  -- QuestionMetadata
    next_review_date TIMESTAMPTZ NOT NULL,
    interval_days INTEGER NOT NULL DEFAULT 1,
    repetitions INTEGER NOT NULL DEFAULT 0,
    ease_factor DECIMAL(3,2) NOT NULL DEFAULT 2.50,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE glossary_terms (
    id UUID PRIMARY KEY,
    term VARCHAR(255) NOT NULL UNIQUE,
    pronunciation VARCHAR(255),
    definition TEXT NOT NULL,
    etymology TEXT,
    category VARCHAR(100)
);

CREATE TABLE cross_references (
    id UUID PRIMARY KEY,
    source_type VARCHAR(50) NOT NULL,
    source_id UUID NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    reference_type VARCHAR(50) DEFAULT 'related'
);

-- Indexes for performance
CREATE INDEX idx_flashcards_next_review_date ON flashcards(next_review_date);
CREATE INDEX idx_flashcards_deck_id ON flashcards(deck_id);
```

### Migrations (DbUp)

```csharp
// Retention.Infrastructure/Database/DbUpRunner.cs
public class DbUpRunner
{
    public void RunMigrations(string connectionString)
    {
        EnsureDatabase.For.PostgresqlDatabase(connectionString);
        
        var upgrader = DeployChanges.To
            .PostgresqlDatabase(connectionString)
            .WithScriptsEmbeddedInAssembly(Assembly.GetExecutingAssembly())
            .LogToConsole()
            .Build();
            
        var result = upgrader.PerformUpgrade();
        
        if (!result.Successful)
            throw new Exception("Database migration failed", result.Error);
    }
}
```

---

## Current Status & Priorities

### ✅ Completed

#### Assessment Service (Deno Fresh)
- [x] Strict mode enabled in `deno.json`
- [x] Basic routing structure
- [x] Island architecture setup

#### Retention Service (.NET Core)
- [x] Clean Architecture structure (Domain, Application, Infrastructure)
- [x] FSRS scheduling algorithm implementation
- [x] Quiz generation engine with difficulty levels
- [x] Dapper data access strategy
- [x] Nullable reference types enabled
- [x] Modern C# patterns (records, pattern matching)

### 🔄 In Progress

#### Assessment Service
- [ ] Preact Signals implementation for islands
- [ ] CSS Modules standardization
- [ ] PostgreSQL connection setup
- [ ] Server-side actions for API calls

#### Retention Service
- [ ] DbUp migration system setup
- [ ] Complete repository implementations
- [ ] API controllers for decks/glossary/cross-references
- [ ] Integration testing

---

## Key Decisions & Rationale

### Why UUIDv7 for Primary Keys?

- **Time-ordered**: Better index performance than UUIDv4
- **Sortable**: Natural chronological ordering
- **Distributed**: No single point of coordination needed
- **PostgreSQL 18**: Native support via `gen_random_uuid()`

### Why Dapper over Entity Framework?

- **Performance**: 50-100x faster for read operations
- **Control**: Full SQL query control for complex queries
- **Simplicity**: No ORM magic, explicit SQL
- **DDD Alignment**: Works well with repository pattern

### Why Preact Signals over useState?

- **Performance**: Updates only affected components
- **Simplicity**: No `setState` boilerplate
- **Global State**: Easy sharing between islands
- **Fine-grained**: Minimal re-renders

### Why Tailwind CSS?

- **Fresh 2.x Support**: Native integration via Vite plugin
- **Rapid Development**: Utility classes speed up UI building
- **Performance**: Compiler generates minimal CSS bundle
- **Consistency**: Standardized design tokens

---

## Resources

### Documentation

- [Deno Fresh Official Docs](https://fresh.deno.dev)
- [Preact Signals Guide](https://preactjs.com/guide/v10/signals/)
- [PostgreSQL 18 Release Notes](https://www.postgresql.org/docs/18/)
- [Domain-Driven Design Reference](https://www.domainlanguage.com/ddd/)
- [Dapper Documentation](https://github.com/DapperLib/Dapper)

---

**Last Updated**: November 2024  
**Version**: 1.0.0  
**Status**: Active Development
