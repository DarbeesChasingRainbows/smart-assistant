# Flashcards Frontend - LifeOS Integration

## Overview

The Flashcards frontend is a Deno Fresh 2.x application that provides intelligent flashcard management and learning capabilities. It integrates with the LifeOS backend, which uses ArangoDB as its primary graph database for storing and querying interconnected learning data.

### Technology Stack

- **Frontend/Edge**: Deno Fresh 2.x (TypeScript, JSX)
- **Backend**: .NET Core 10+ with Hexagonal Architecture
- **Database**: ArangoDB (Graph Database) with UUIDv7 for primary keys
- **Object Storage**: MinIO S3-compatible for audio, images, and video
- **Styling**: Tailwind CSS v4 + DaisyUI
- **State Management**: Preact Signals for fine-grained reactivity
- **Data Access**: ArangoDB.NET driver for graph operations
- **Media Handling**: MinIO.NET SDK for S3-compatible storage
- **Architecture**: Domain-Driven Design (DDD) + Event Sourcing + Hexagonal Architecture

---

## Architecture

### Microservices Structure

```
LifeOS/
├── frontends/
│   └── flashcards/           # Deno Fresh 2.x (Frontend Service)
│       ├── routes/           # File-based routing
│       ├── islands/          # Client-side interactive components
│       ├── components/       # Server-side components
│       └── utils/            # Utility functions & API client
│
└── src/
    ├── LifeOS.Domain/        # F# Core - Pure domain logic
    │   ├── Flashcards.fs     # Flashcard aggregate
    │   ├── Decks.fs          # Deck aggregate
    │   ├── Users.fs          # User aggregate
    │   └── Quiz.fs           # Quiz session aggregate
    │
    ├── LifeOS.Application/   # CQRS handlers
    │   ├── Commands/         # Write operations
    │   └── Queries/          # Read operations
    │
    ├── LifeOS.Infrastructure/ # C# Adapters
    │   ├── ArangoRepository.cs # Graph database operations
    │   └── EventStore.cs      # Event sourcing implementation
    │
    └── LifeOS.API/           # Web API entry point
        └── Controllers/       # REST endpoints
```

### Graph Database Schema (ArangoDB)

#### Document Collections
- **users** - User accounts and preferences
- **decks** - Flashcard deck definitions
- **flashcards** - Individual flashcard content
- **quiz_sessions** - Quiz session tracking
- **media_metadata** - References to MinIO objects (not the actual files)

#### Edge Collections
- **owns** - User → Deck (1:N)
- **contains** - Deck → Flashcard (1:N)
- **studies** - User → Flashcard (N:M with properties)
- **prerequisite** - Flashcard → Flashcard (N:M)
- **related** - Flashcard → Flashcard (N:M)
- **attempts** - User → Quiz (1:N)
- **has_media** - Flashcard → Media (N:M)

#### MinIO Buckets
- **flashcard-images** - Card images, diagrams, illustrations
- **flashcard-audio** - Pronunciation audio, explanations
- **flashcard-video** - Tutorial videos, demonstrations
- **user-uploads** - User-generated content
- **deck-thumbnails** - Preview images for decks

### Service Boundaries

**Flashcards Service (Deno Fresh)**
- Responsibilities: User interface, quiz presentation, client-side interactions
- Communication: Consumes REST API from LifeOS backend
- Features: 
  - Real-time quiz interface
  - Flashcard creation and editing
  - Deck management
  - Progress tracking
  - Graph visualization of relationships
  - Media upload/management (images, audio, video)
  - Streaming media playback during quizzes

---

## Key Features

### 1. Graph-Powered Learning

Leverages ArangoDB's graph capabilities to:
- Track prerequisite relationships between concepts
- Suggest related flashcards based on graph traversal
- Visualize knowledge connections
- Optimize learning paths through graph algorithms

### 2. Event Sourcing

All state changes are stored as immutable events:
- FlashcardCreated
- FlashcardUpdated
- QuizCompleted
- CardReviewed
- DeckCloned

### 3. Rich Media Support

Utilizes MinIO for scalable media storage:
- Audio pronunciations for language learning
- Images for visual learning (diagrams, charts, photos)
- Video tutorials and demonstrations
- Adaptive media based on learning style
- CDN-like distribution through MinIO's presigned URLs

### 4. Real-time Updates

Uses Server-Sent Events (SSE) for:
- Live progress updates
- Multi-user quiz sessions
- Real-time leaderboard
- Notification system

---

## API Integration

### Core Endpoints

```typescript
// Flashcard Operations
GET    /api/v1/flashcards           // List flashcards
POST   /api/v1/flashcards           // Create flashcard
GET    /api/v1/flashcards/{id}      // Get flashcard
PUT    /api/v1/flashcards/{id}      // Update flashcard
DELETE /api/v1/flashcards/{id}      // Delete flashcard

// Deck Operations
GET    /api/v1/decks                // List decks
POST   /api/v1/decks/import         // Import Anki deck
GET    /api/v1/decks/{id}/graph     // Get deck graph
GET    /api/v1/decks/{id}/stats     // Deck statistics

// Quiz Operations
POST   /api/v1/quiz/generate        // Generate quiz
POST   /api/v1/quiz/submit          // Submit answers
GET    /api/v1/quiz/history         // Quiz history

// Media Operations
POST   /api/v1/media/upload         // Upload media to MinIO
GET    /api/v1/media/{id}/url       // Get presigned URL
DELETE /api/v1/media/{id}           // Delete media
GET    /api/v1/media/{id}/stream    // Stream media content

// Graph Operations
GET    /api/v1/graph/paths          // Learning paths
GET    /api/v1/graph/related/{id}   // Related cards
POST   /api/v1/graph/traverse       // Custom traversal
```

### Data Flow

1. **Client Request** → Fresh Route → API Client
2. **API Client** → LifeOS Backend → ArangoDB/MinIO
3. **Graph Query** → AQL Execution → Result Transformation
4. **Media Request** → MinIO SDK → Presigned URL Generation
5. **Response** → Frontend → UI Update

---

## Development Workflow

### Local Development

```bash
# Start frontend
deno task dev

# Start backend (from LifeOS directory)
dotnet run --project src/LifeOS.API

# Start ArangoDB
podman run -d --name arangodb -p 8529:8529 -e ARANGO_ROOT_PASSWORD=root arangodb/arangodb:latest

# Start MinIO
podman run -d --name minio -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  -v minio-data:/data \
  minio/minio server /data --console-address ":9001"
```

### Testing

```bash
# E2E Tests
deno task test:e2e

# UI Mode
deno task test:e2e:ui

# Headed Mode
deno task test:e2e:headed
```

### Deployment

```bash
# Build and deploy with Podman
deno task podman:build
deno task podman:run

# Or use Docker Compose
docker-compose up -d
```

---

## Graph Database Patterns

### 1. Prerequisite Traversal

```aql
// Find all prerequisites for a flashcard
FOR v, e IN 1..1 OUTBOUND @cardId GRAPH 'learning_graph'
  RETURN {
    card: v,
    strength: e.strength,
    required: e.required
  }
```

### 2. Learning Path Generation

```aql
// Generate optimal learning path
FOR vertex IN OUTBOUND @startId GRAPH 'learning_graph'
  FILTER vertex.difficulty <= @maxDifficulty
  SORT vertex.priority DESC
  LIMIT 10
  RETURN vertex
```

### 3. Related Content Discovery

```aql
// Find related flashcards
FOR v IN 2..2 INBOUND @cardId GRAPH 'learning_graph'
  COLLECT card = v WITH COUNT INTO frequency
  SORT frequency DESC
  LIMIT 5
  RETURN {
    card: card,
    relevance: frequency
  }
```

---

## Performance Considerations

### Graph Optimization
- Use ArangoDB's built-in graph indexes
- Implement edge caching for frequently accessed relationships
- Batch graph traversals for complex queries
- Use satellite collections for hot data

### Media Optimization
- Implement progressive image loading
- Use adaptive bitrate streaming for videos
- Cache frequently accessed media in CDN
- Compress audio files with optimal codecs
- Generate thumbnails on upload

### Frontend Optimization
- Implement virtual scrolling for large card lists
- Cache graph data in IndexedDB
- Use Preact Signals for granular reactivity
- Lazy load graph visualizations
- Preload critical media assets

---

## Security

### Authentication
- JWT tokens handled by backend
- Secure cookie transmission
- CORS configuration for API access

### Authorization
- Role-based access control
- Deck ownership verification
- Privacy settings enforcement
- Media access control via presigned URLs
- Bucket policies for public/private content

---

## Monitoring & Observability

### Metrics
- Quiz completion rates
- Learning path efficiency
- Graph query performance
- User engagement analytics
- Media storage usage and access patterns
- CDN cache hit rates
- Upload/download bandwidth

### Logging
- Structured logging with correlation IDs
- Graph query performance tracking
- Error aggregation and alerting

---

## Future Enhancements

1. **AI-Powered Recommendations**
   - Machine learning on graph data
   - Personalized learning paths
   - Difficulty adaptation
   - Media optimization based on learning style

2. **Advanced Analytics**
   - Learning pattern analysis
   - Knowledge gap identification
   - Progress prediction models
   - Media effectiveness tracking

3. **Social Features**
   - Shared decks with graph inheritance
   - Collaborative learning paths
   - Knowledge graph comparisons
   - Media galleries and collections

4. **Enhanced Media Experience**
   - Interactive video annotations
   - Audio waveform visualization
   - Image hotspots for learning
   - AR/VR content support
