# AnkiQuiz Deep Dive Analysis & Migration Plan

## Executive Summary

AnkiQuiz is a sophisticated flashcard learning system with **10,000+ questions** across 7 major collections and specialized subjects. The system implements advanced spaced repetition algorithms using the SM-2 method and features a comprehensive microservices architecture with Deno Fresh frontend and .NET backend.

## Current Architecture Analysis

### 🏗️ **System Architecture**

#### **Frontend (Assessment Service)**
- **Framework**: Deno Fresh 2.x with Preact
- **Styling**: Tailwind CSS + DaisyUI
- **State Management**: Preact Signals for island reactivity
- **Testing**: Playwright for E2E testing
- **Key Features**: 
  - Interactive quiz interface with audio support
  - Flashcard management with bulk operations
  - Deck sharing and collaboration
  - Real-time progress tracking

#### **Backend (Retention Service)**
- **Framework**: .NET with Clean Architecture
- **Database**: PostgreSQL with Dapper ORM
- **Architecture**: Hexagonal/Clean Architecture with DDD
- **Scheduling**: SM-2 spaced repetition algorithm
- **Key Features**:
  - Advanced scheduling engine
  - Quiz generation with difficulty levels
  - Cross-reference system (Obsidian-like)
  - Glossary integration

### 📊 **Content Collections**

#### **Major Collections (9,644 questions)**
1. **Horticulture & Permaculture** (777q) - FCHP, PDC, ASHS certifications
2. **Cybersecurity** (1,000+q) - Security+, CEH, CISSP preparation
3. **Linux Administration** (1,636q) - Linux+, RHCSA, DevOps
4. **Windows Administration** (1,465q) - Microsoft certs, A+/Network+
5. **First Aid** (1,184q) - Red Cross, EMT-Basic, CPR/AED
6. **Circuit Analysis** (1,081q) - Electrical engineering, PE/EE prep
7. **Basic Sciences** (2,501q) - Biology, Chemistry, Physics foundation

#### **Specialized Subjects (~1,500 questions)**
- **Biblical Hebrew** (~800q) - Religious studies, biblical languages
- **Latin** (232q) - Classical education, language foundations
- **Botany** (~250q) - Plant sciences, horticulture complement
- **Elementary Spelling** (~300q) - Grade 3-5 language arts

### 🧠 **Domain Model Analysis**

#### **Core Entities**
```csharp
// Flashcard Entity
public class Flashcard : Entity<Guid>
{
    public Guid DeckId { get; private set; }
    public string Question { get; private set; }
    public string Answer { get; private set; }
    public QuestionMetadata Metadata { get; private set; }
    public SchedulingData Scheduling { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }
    
    // Rich content support
    public IReadOnlyList<GlossaryTerm> GlossaryTerms { get; }
    public IReadOnlyList<CrossReference> CrossReferences { get; }
}

// Deck Entity
public class Deck : Entity<Guid>
{
    public string Name { get; private set; }
    public string Description { get; private set; }
    public string Category { get; private set; }
    public string Subcategory { get; private set; }
    public DifficultyLevel DifficultyLevel { get; private set; }
    public string? ShareToken { get; private set; }
    public IReadOnlyList<Flashcard> Flashcards { get; }
}

// Scheduling Algorithm
public record SchedulingData
{
    public DateTime NextReviewDate { get; init; }
    public int Interval { get; init; } // Days
    public int Repetitions { get; init; }
    public double EaseFactor { get; init; } // SM-2 algorithm default
}
```

#### **Advanced Features**
- **Cross-Reference System**: Obsidian-like linking between cards, decks, and glossary terms
- **Glossary Integration**: Per-card glossary with pronunciation guides and etymology
- **Question Types**: Simple, multiple choice, scenario-based, multi-part questions
- **Spaced Repetition**: SM-2 algorithm with customizable parameters
- **Deck Sharing**: Public sharing via tokens with clone functionality

### 🔧 **Technical Implementation**

#### **Database Schema**
- **Primary Keys**: UUIDv7 for time-ordered sorting
- **Relationships**: Proper foreign key constraints with cascading deletes
- **Indexing**: Optimized for quiz generation and scheduling queries
- **JSONB Support**: For complex question metadata and options

#### **API Architecture**
- **RESTful Design**: Standard HTTP methods with proper status codes
- **Error Handling**: Circuit breakers, retries, and timeout handling
- **Authentication**: JWT-based with secure token management
- **Performance**: Connection pooling and query optimization

#### **Frontend Components**
- **QuizInterface**: Interactive quiz with audio pronunciation support
- **FlashcardManager**: CRUD operations with bulk actions
- **GlossaryPanel**: Context-sensitive glossary display
- **CrossReferencePanel**: Related content navigation

## 🎯 **Academy Domain Integration Analysis**

### **Alignment with Academy Domain**

#### **Current Academy Domain Structure**
```fsharp
// Academy Domain Types
type Skill = {
    Id: SkillId
    Name: string
    Description: string
    Category: string
    DifficultyLevel: SkillLevel
    Prerequisites: SkillId list
    LearningObjectives: string list
}

type Task = {
    Id: TaskId
    SkillId: SkillId
    Title: string
    Description: string
    TaskType: TaskType
    Difficulty: TaskDifficulty
    Content: TaskContent
}

type LearningPath = {
    Id: LearningPathId
    Name: string
    Description: string
    Skills: SkillId list
    Prerequisites: SkillId list
    EstimatedDuration: TimeSpan
}
```

#### **Integration Opportunities**

1. **Quiz as Task Assessment**
   - Map AnkiQuiz decks to Academy skills
   - Use quiz performance for skill level evaluation
   - Integrate spaced repetition with learning paths

2. **Content Enrichment**
   - Leverage 10,000+ questions for skill development
   - Map existing categories to Academy skill categories
   - Use cross-references for prerequisite relationships

3. **Progress Tracking**
   - Connect scheduling data to skill progression
   - Use difficulty levels for skill assessment
   - Implement adaptive learning paths based on performance

### **Data Migration Strategy**

#### **Phase 1: Schema Mapping**
```sql
-- Academy Domain Tables
CREATE TABLE academy_skills (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    difficulty_level VARCHAR(20),
    source_deck_id UUID REFERENCES decks(id), -- Migration reference
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE academy_skill_assessments (
    id UUID PRIMARY KEY,
    skill_id UUID REFERENCES academy_skills(id),
    flashcard_id UUID REFERENCES flashcards(id),
    assessment_type VARCHAR(50), -- 'quiz', 'practice', 'evaluation'
    performance_score DECIMAL(5,2),
    assessed_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **Phase 2: Data Transformation**
- Map existing deck categories to Academy skill categories
- Transform difficulty levels to Academy skill levels
- Create skill-assessment relationships from quiz performance
- Migrate cross-references to skill prerequisites

## 📋 **Comprehensive Migration Todo List**

### **Phase 0: Analysis & Planning** ✅
- [x] Deep dive analysis of AnkiQuiz architecture
- [x] Documentation of current domain models
- [x] Integration opportunity identification
- [x] Migration strategy development

### **Phase 1: Domain Model Enhancement**

#### **Academy Domain Extensions**
- [ ] **Extend Academy Types**
  ```fsharp
  type QuizAssessment = {
      Id: AssessmentId
      SkillId: SkillId
      DeckId: DeckId
      PerformanceMetrics: PerformanceMetrics
      NextReviewDate: DateTime
      SpacedRepetitionData: SchedulingData
  }
  
  type LearningContent = {
      Flashcards: Flashcard list
      GlossaryTerms: GlossaryTerm list
      CrossReferences: CrossReference list
  }
  ```

- [ ] **Create Academy-Quiz Integration Service**
  ```fsharp
  type IAcademyQuizService =
      abstract member GetSkillAssessments: SkillId -> QuizAssessment list
      abstract member UpdateSkillProgress: SkillId -> AssessmentResult -> unit
      abstract member GenerateLearningPath: SkillId -> LearningPath option
      abstract member GetRecommendedContent: SkillId -> LearningContent option
  ```

#### **Retention Service Integration**
- [ ] **Add Academy Domain References**
  - Add Academy skill IDs to flashcard metadata
  - Create skill-assessment mapping tables
  - Implement cross-domain queries

- [ ] **Enhance Scheduling Algorithm**
  - Integrate with skill progression logic
  - Adapt intervals based on skill improvement
  - Implement skill-specific difficulty scaling

### **Phase 2: Database Migration**

#### **Schema Creation**
- [ ] **Create Academy Integration Tables**
  ```sql
  -- Skill-Deck Mapping
  CREATE TABLE academy_skill_decks (
      id UUID PRIMARY KEY,
      skill_id UUID NOT NULL,
      deck_id UUID NOT NULL,
      mapping_type VARCHAR(50), -- 'primary', 'supplementary', 'assessment'
      relevance_weight DECIMAL(3,2) DEFAULT 1.0,
      created_at TIMESTAMPTZ DEFAULT NOW()
  );
  
  -- Skill Assessment Tracking
  CREATE TABLE academy_skill_assessments (
      id UUID PRIMARY KEY,
      skill_id UUID NOT NULL,
      user_id UUID,
      flashcard_id UUID,
      quiz_session_id UUID,
      performance_rating INTEGER, -- 1-5 scale
      time_to_answer_ms INTEGER,
      assessment_date TIMESTAMPTZ DEFAULT NOW()
  );
  ```

- [ ] **Create Migration Scripts**
  - Map existing deck categories to Academy skills
  - Transform flashcard content to skill assessments
  - Migrate cross-references to skill prerequisites

#### **Data Migration**
- [ ] **Category Mapping Script**
  ```sql
  -- Map Horticulture -> Botany Skill
  INSERT INTO academy_skills (name, description, category, source_deck_id)
  SELECT 'Horticulture Fundamentals', 
         'Comprehensive plant cultivation and sustainable design',
         'Botany',
         id
  FROM decks 
  WHERE category = 'Horticulture & Permaculture';
  ```

- [ ] **Content Association**
  - Link flashcards to appropriate skills
  - Create skill assessment records
  - Migrate glossary terms to skill resources

### **Phase 3: API Integration**

#### **Academy Service Extensions**
- [ ] **Create Academy Quiz Controller**
  ```csharp
  [ApiController]
  [Route("api/v1/academy/quiz")]
  public class AcademyQuizController : ControllerBase
  {
      [HttpGet("skills/{skillId}/assessment")]
      public async Task<ActionResult<SkillAssessmentDto>> GetSkillAssessment(Guid skillId);
      
      [HttpPost("skills/{skillId}/evaluate")]
      public async Task<ActionResult<EvaluationResultDto>> EvaluateSkillPerformance(Guid skillId, EvaluationRequestDto request);
      
      [HttpGet("skills/{skillId}/recommended-content")]
      public async Task<ActionResult<LearningContentDto>> GetRecommendedContent(Guid skillId);
  }
  ```

- [ ] **Enhance Existing Controllers**
  - Add Academy context to quiz generation
  - Include skill progression in responses
  - Implement cross-domain reporting

#### **Frontend Integration**
- [ ] **Create Academy Quiz Components**
  ```typescript
  interface SkillAssessmentProps {
    skillId: string;
    onProgressUpdate: (progress: SkillProgress) => void;
  }
  
  export function SkillAssessmentQuiz({ skillId, onProgressUpdate }: SkillAssessmentProps) {
    // Integration with existing QuizInterface
    // Skill-specific content loading
    // Progress tracking for skill development
  }
  ```

- [ ] **Enhance Dashboard Components**
  - Add skill progression visualization
  - Integrate quiz performance with skill metrics
  - Create learning path recommendations

### **Phase 4: Content Organization**

#### **Skill Mapping**
- [ ] **Map Existing Collections to Skills**
  ```
  Cybersecurity → Cybersecurity Fundamentals, Network Security, Ethical Hacking
  Linux Administration → System Administration, Scripting, DevOps Fundamentals
  First Aid → Medical Emergency Response, CPR/AED, Basic Life Support
  Circuit Analysis → Electrical Engineering, Circuit Design, PE Preparation
  Basic Sciences → Biology, Chemistry, Physics Foundations
  ```

- [ ] **Create Learning Paths**
  - Beginner → Intermediate → Advanced progressions
  - Certification-focused paths
  - Cross-disciplinary connections

#### **Content Enhancement**
- [ ] **Add Skill Context**
  - Learning objectives for each skill
  - Prerequisite relationships
  - Career relevance and applications

- [ ] **Implement Adaptive Learning**
  - Difficulty adjustment based on performance
  - Personalized content recommendations
  - Intelligent review scheduling

### **Phase 5: Testing & Validation**

#### **Integration Testing**
- [ ] **Cross-Domain Tests**
  - Academy skill creation from deck content
  - Quiz performance affecting skill progression
  - Learning path generation based on assessment

- [ ] **Data Integrity Tests**
  - Migration accuracy validation
  - Cross-reference consistency
  - Performance regression testing

#### **User Acceptance Testing**
- [ ] **Learning Experience Validation**
  - Skill progression visualization
  - Quiz effectiveness for skill assessment
  - Content relevance and quality

- [ ] **Performance Validation**
  - Quiz generation speed with Academy integration
  - Cross-domain query performance
  - Scalability testing

### **Phase 6: Deployment & Monitoring**

#### **Gradual Rollout**
- [ ] **Feature Flags**
  - Academy integration toggle
  - Progressive content migration
  - User cohort testing

- [ ] **Monitoring Setup**
  - Cross-domain performance metrics
  - Skill progression analytics
  - User engagement tracking

#### **Documentation & Training**
- [ ] **Technical Documentation**
  - Integration architecture diagrams
  - API documentation updates
  - Migration runbooks

- [ ] **User Documentation**
  - Academy feature guides
  - Skill development workflows
  - Best practices for integrated learning

## 🎯 **Success Metrics**

### **Technical Metrics**
- **Migration Accuracy**: >95% data integrity preservation
- **Performance**: <200ms response time for Academy-integrated queries
- **Availability**: >99.9% uptime during migration

### **Learning Metrics**
- **Skill Progression**: 30% faster skill acquisition with spaced repetition
- **Content Engagement**: 50% increase in user interaction with skill-aligned content
- **Learning Effectiveness**: 25% improvement in assessment performance

### **User Experience Metrics**
- **Navigation**: <3 clicks to access skill-specific content
- **Discovery**: 40% increase in content discovery through cross-references
- **Satisfaction**: >4.5/5 user rating for integrated learning experience

## 🚀 **Next Steps**

1. **Immediate**: Begin Phase 1 domain model enhancements
2. **Week 1-2**: Implement database schema changes
3. **Week 3-4**: Develop API integration layer
4. **Week 5-6**: Create frontend components
5. **Week 7-8**: Content migration and organization
6. **Week 9-10**: Testing and validation
7. **Week 11-12**: Deployment and monitoring

This comprehensive migration plan ensures that AnkiQuiz's sophisticated learning capabilities become a cornerstone of the Academy domain, providing users with an unparalleled skill development experience powered by proven spaced repetition algorithms and extensive content libraries.
