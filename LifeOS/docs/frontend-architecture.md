# LifeOS Frontend Architecture

## Overview

This document outlines the frontend architecture for LifeOS, designed to mirror our domain-driven backend structure using Deno Fresh with proper separation of concerns and domain-specific UI components.

## Current State & Migration Strategy

### Existing Projects Integration

We have two existing frontend projects that are being retrofitted to integrate with our graph database architecture:

#### 1. VehicleMaintenance → Garage Domain 🚗
**Current Location**: `@frontends/VehicleMaintenence`
**Target Domain**: Garage
**Migration Path**: 
- Retrofit existing vehicle maintenance UI to use ArangoDB graph database
- Integrate with new Garage domain services and repositories
- Enhance with real-time telemetry and component inventory features
- Align with Garage domain types and workflows

#### 2. AnkiQuiz → Academy Domain 🎓
**Current Location**: `@frontends/ankiquiz`  
**Target Domain**: Academy
**Migration Path**:
- Integrate quiz system with Academy domain's skill development framework
- Connect learning progress tracking to domain services
- Align quiz content with skill trees and learning paths
- Implement persistent quiz data in ArangoDB

### Migration Principles (context7 Best Practices)

1. **Graph-First Integration**: Migrate from existing data stores to ArangoDB graph structure
2. **Domain Alignment**: Reorganize UI components to match domain boundaries
3. **Type Safety**: Implement TypeScript types generated from F# domain definitions
4. **Incremental Migration**: Preserve existing functionality while adding new capabilities
5. **API Consistency**: Align with hexagonal architecture patterns

## Domain-Driven Frontend Structure

### Core Principles

1. **Domain Alignment**: Each frontend module directly corresponds to a backend domain
2. **Hexagonal Architecture**: UI components are isolated from infrastructure concerns  
3. **Island Architecture**: Server components for data, client islands for interactivity
4. **Type Safety**: Full TypeScript integration with F# domain types
5. **Progressive Enhancement**: Server-first with client-side enhancement
6. **Graph Integration**: All domains leverage ArangoDB for data persistence and relationships

### Domain Modules

#### 1. Academy Domain 🎓
**Purpose**: Learning management, skill development, training programs
**Existing Project**: `@frontends/ankiquiz` (AnkiQuiz system)

**Components**:
- `AcademyDashboard.tsx` - Overview of learning progress
- `SkillTracker.tsx` - Skill development tracking  
- `TaskManager.tsx` - Learning task management
- `CourseViewer.tsx` - Course content display
- `QuizManager.tsx` - **Existing AnkiQuiz integration** for knowledge assessment
- `ProgressTracker.tsx` - Learning path visualization

**Migration from AnkiQuiz**:
- Integrate spaced repetition algorithms with Academy skill trees
- Connect quiz performance to skill level progression
- Migrate quiz data to ArangoDB graph structure
- Align quiz categories with Academy domain knowledge areas
- Implement cross-domain learning analytics

**Routes**:
- `/academy` - Main dashboard
- `/academy/skills` - Skill management
- `/academy/tasks` - Learning tasks
- `/academy/courses/[id]` - Course details
- `/academy/quiz` - **Migrated AnkiQuiz system**
- `/academy/progress` - Learning analytics

#### 2. Boardroom Domain 📊
**Purpose**: Business metrics, KPIs, strategic planning

**Components**:
- `KPIDashboard.tsx` - Real-time KPI display
- `KRATracker.tsx` - Key Result Area management
- `VisionViewer.tsx` - Strategic vision display
- `MetricsCharts.tsx` - Data visualization

**Routes**:
- `/boardroom` - Executive dashboard
- `/boardroom/kpis` - KPI management
- `/boardroom/kras` - Strategic objectives
- `/boardroom/vision` - Vision and strategy

#### 3. Dojo Domain 🥋
**Purpose**: Personal development, habits, identity management

**Components**:
- `HabitTracker.tsx` - Daily habit tracking
- `IdentityManager.tsx` - Personal identity aspects
- `ProgressDashboard.tsx` - Personal growth metrics
- `MeditationTimer.tsx` - Mindfulness practices

**Routes**:
- `/dojo` - Personal dashboard
- `/dojo/habits` - Habit management
- `/dojo/identity` - Identity aspects
- `/dojo/practices` - Daily practices

#### 4. Finance Domain 💰
**Purpose**: Financial management, budgeting, transactions

**Components**:
- `AccountDashboard.tsx` - Account overview
- `BudgetTracker.tsx` - Budget vs actual tracking
- `TransactionManager.tsx` - Transaction entry and categorization
- `ReceiptManager.tsx` - Receipt upload and management
- `ReconciliationView.tsx` - Account reconciliation

**Routes**:
- `/finance` - Financial dashboard
- `/finance/accounts` - Account management
- `/finance/budgets` - Budget tracking
- `/finance/transactions` - Transaction management
- `/finance/receipts` - Receipt management
- `/finance/reconciliation` - Account reconciliation

#### 5. Garage Domain 🚗
**Purpose**: Vehicle management, maintenance, components
**Existing Project**: `@frontends/VehicleMaintenence` (Vehicle maintenance system)

**Components**:
- `VehicleDashboard.tsx` - Vehicle overview
- `MaintenanceTracker.tsx` - **Existing VehicleMaintenance integration** for maintenance scheduling and history
- `ComponentManager.tsx` - Component inventory and tracking
- `VehicleTelemetry.tsx` - Real-time vehicle data (gRPC integration)
- `ServiceHistory.tsx` - **Migrated maintenance records** with graph relationships
- `PartsInventory.tsx` - Integration with Inventory domain for garage parts

**Migration from VehicleMaintenance**:
- Retrofit existing maintenance UI to use Garage domain services
- Integrate with new Inventory domain for parts management
- Connect maintenance records to vehicle graph relationships
- Enhance with real-time telemetry and predictive maintenance
- Implement component lifecycle tracking with Inventory integration
- Add vehicle-to-inventory allocation workflows

**Enhanced Features**:
- **Real-time telemetry** streaming from vehicle sensors
- **Predictive maintenance** based on usage patterns
- **Inventory integration** for parts allocation and tracking
- **Graph-based maintenance history** with vehicle relationships
- **Mobile-friendly** maintenance workflows

**Routes**:
- `/garage` - Garage dashboard
- `/garage/vehicles` - Vehicle management
- `/garage/maintenance` - **Migrated VehicleMaintenance system**
- `/garage/components` - Component inventory
- `/garage/telemetry` - Live vehicle data
- `/garage/service-history` - Maintenance records
- `/garage/parts` - Parts inventory integration

#### 6. Garden Domain 🌱
**Purpose**: Garden management, crop tracking, bed planning

**Components**:
- `GardenDashboard.tsx` - Garden overview
- `CropBatchManager.tsx` - Crop batch tracking
- `BedManager.tsx` - Garden bed planning
- `SpeciesCatalog.tsx` - Plant species reference
- `HarvestTracker.tsx` - Harvest planning and tracking

**Routes**:
- `/garden` - Garden dashboard
- `/garden/crops` - Crop management
- `/garden/beds` - Bed planning
- `/garden/species` - Plant reference
- `/garden/harvests` - Harvest tracking

#### 7. Home Domain 🏠
**Purpose**: Household management, chores, calendar

**Components**:
- `HouseholdDashboard.tsx` - Home overview
- `ChoreManager.tsx` - Chore assignment and tracking
- `CalendarView.tsx` - Family calendar
- `TaskManager.tsx` - Household task management

**Routes**:
- `/home` - Home dashboard
- `/home/chores` - Chore management
- `/home/calendar` - Family calendar
- `/home/tasks` - Household tasks

#### 8. Inventory Domain 📦
**Purpose**: Asset tracking, stock management, warehouse operations

**Components**:
- `InventoryDashboard.tsx` - Stock overview
- `AssetTracker.tsx` - Asset lifecycle management
- `StockManager.tsx` - Stock level tracking
- `LocationManager.tsx` - Storage location management
- `TruckInventory.tsx` - Vehicle-loaded inventory

**Routes**:
- `/inventory` - Inventory dashboard
- `/inventory/assets` - Asset management
- `/inventory/stock` - Stock levels
- `/inventory/locations` - Storage locations
- `/inventory/trucks` - Vehicle inventory

## Technical Architecture

### Framework Stack
- **Runtime**: Deno
- **Framework**: Fresh 2.x
- **UI Library**: Preact
- **Styling**: Tailwind CSS + DaisyUI
- **State Management**: Preact Signals
- **Type Safety**: TypeScript with F# type generation

### Directory Structure
```
frontend/
├── components/           # Shared UI components
│   ├── ui/              # Base UI components (buttons, forms, etc.)
│   ├── layout/          # Layout components (header, sidebar, etc.)
│   └── charts/          # Data visualization components
├── domains/             # Domain-specific components
│   ├── academy/
│   ├── boardroom/
│   ├── dojo/
│   ├── finance/
│   ├── garage/
│   ├── garden/
│   ├── home/
│   └── inventory/
├── islands/             # Client-side interactive components
├── routes/              # File-based routing
├── static/              # Static assets
├── utils/               # Utility functions
├── types/               # TypeScript type definitions
│   ├── academy.ts
│   ├── boardroom.ts
│   ├── dojo.ts
│   ├── finance.ts
│   ├── garage.ts
│   ├── garden.ts
│   ├── home.ts
│   └── inventory.ts
└── services/            # API service layers
    ├── academy.ts
    ├── boardroom.ts
    ├── dojo.ts
    ├── finance.ts
    ├── garage.ts
    ├── garden.ts
    ├── home.ts
    └── inventory.ts
```

### Component Architecture

#### Server Components (Default)
- Handle data fetching and business logic
- Render on the server for optimal performance
- Direct database access through API routes
- SEO-friendly and fast initial load

#### Islands (Client Components)
- Interactive UI elements requiring client-side state
- Real-time updates (gRPC for vehicle telemetry)
- Complex user interactions (drag-and-drop, charts)
- Marked with `*.island.tsx` naming convention

### Data Flow Patterns

#### 1. Server-First Data Loading
```typescript
// Server component fetches data
export default function VehicleDashboard() {
  const vehicles = await getVehicles();
  return <VehicleList vehicles={vehicles} />;
}
```

#### 2. Progressive Enhancement
```typescript
// Island for client-side interactivity
export default function VehicleTelemetryIsland() {
  const telemetry = useSignal<VehicleTelemetry | null>(null);
  
  // gRPC connection for real-time data
  useEffect(() => {
    const stream = subscribeToVehicleTelemetry();
    stream.on('data', (data) => telemetry.value = data);
  }, []);
  
  return <TelemetryDisplay data={telemetry.value} />;
}
```

#### 3. Type-Safe API Integration
```typescript
// Generated from F# domain types
interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  status: 'Active' | 'Maintenance' | 'Retired';
}

// Service layer with type safety
export const vehicleService = {
  async getAll(): Promise<Vehicle[]> {
    return await fetch('/api/vehicles').then(r => r.json());
  },
  
  async updateMaintenance(id: string, data: MaintenanceData): Promise<Vehicle> {
    return await fetch(`/api/vehicles/${id}/maintenance`, {
      method: 'POST',
      body: JSON.stringify(data)
    }).then(r => r.json());
  }
};
```

## UI/UX Design System

### Design Principles
1. **Consistency**: Unified design language across all domains
2. **Accessibility**: WCAG 2.1 AA compliance
3. **Responsive**: Mobile-first responsive design
4. **Performance**: Optimized for fast loading and interaction
5. **Intuitive**: Domain-specific metaphors and workflows

### Component Library
- **Base Components**: Button, Input, Card, Modal, etc.
- **Domain Components**: VehicleCard, BudgetChart, HabitTracker, etc.
- **Layout Components**: Dashboard, Sidebar, Header, etc.
- **Chart Components**: LineChart, BarChart, PieChart, etc.

### Theming
- **Light/Dark Mode**: System preference with manual override
- **Domain Colors**: Color coding for different domains
- **Status Indicators**: Visual status representation
- **Data Visualization**: Consistent chart styling

## Integration Patterns

### API Integration
- **RESTful APIs**: Standard CRUD operations
- **gRPC Streaming**: Real-time vehicle telemetry
- **WebSocket**: Live updates for collaborative features
- **File Upload**: Receipt and document management

### Real-Time Features
- **Vehicle Telemetry**: gRPC streaming for sensor data
- **Collaborative Editing**: WebSocket for shared tasks
- **Notifications**: Server-sent events for alerts
- **Live Updates**: Real-time inventory and financial data

### Offline Support
- **Service Workers**: Cache critical data
- **IndexedDB**: Local data storage
- **Sync Strategy**: Conflict resolution for offline changes
- **Progressive Web App**: Installable experience

## Performance Optimization

### Loading Strategies
- **Code Splitting**: Per-domain lazy loading
- **Image Optimization**: Responsive images with WebP
- **Font Loading**: Optimized font loading strategy
- **Critical CSS**: Inline critical path CSS

### Caching Strategy
- **Static Assets**: Long-term caching
- **API Responses**: Intelligent cache invalidation
- **Service Worker**: Offline-first caching
- **CDN**: Global content delivery

### Monitoring
- **Performance Metrics**: Core Web Vitals tracking
- **Error Tracking**: Comprehensive error monitoring
- **User Analytics**: Privacy-focused usage tracking
- **API Performance**: Response time monitoring

## Security Considerations

### Authentication & Authorization
- **JWT Tokens**: Secure authentication
- **Role-Based Access**: Domain-specific permissions
- **Session Management**: Secure session handling
- **API Security**: Rate limiting and validation

### Data Protection
- **Input Validation**: Client and server validation
- **XSS Prevention**: Content Security Policy
- **CSRF Protection**: Token-based protection
- **Data Encryption**: Sensitive data protection

## Development Workflow

### Type Generation
- **F# to TypeScript**: Automated type generation
- **API Contracts**: OpenAPI specification generation
- **Validation Schemas**: Zod schema generation
- **Mock Data**: Type-safe mock data generation

### Testing Strategy
- **Unit Tests**: Component testing with Vitest
- **Integration Tests**: API integration testing
- **E2E Tests**: Playwright for critical user flows
- **Visual Testing**: Chromatic for UI consistency

### Deployment
- **Static Generation**: Pre-rendered pages where possible
- **Edge Deployment**: Global CDN deployment
- **Environment Management**: Multi-environment support
- **CI/CD Pipeline**: Automated testing and deployment

## Next Steps

### Phase 0: Migration of Existing Projects
1. **VehicleMaintenance → Garage Domain**
   - Analyze existing VehicleMaintenance codebase and dependencies
   - Map current data structures to Garage domain types
   - Implement ArangoDB migration scripts for maintenance data
   - Retrofit UI components to use Garage domain services
   - Add Inventory domain integration for parts management

2. **AnkiQuiz → Academy Domain**
   - Analyze existing AnkiQuiz algorithms and data structures
   - Map quiz categories to Academy skill trees
   - Implement ArangoDB migration for quiz progress data
   - Integrate spaced repetition with skill progression
   - Add cross-domain learning analytics

### Phase 1: Foundation
1. Set up Deno Fresh project structure
2. Implement base component library
3. Create type definitions from F# domains
4. Set up routing and navigation
5. Establish ArangoDB connection patterns

### Phase 2: Core Domains (Priority Order)
1. **Garage Domain** (VehicleMaintenance migration + enhancements)
2. **Academy Domain** (AnkiQuiz migration + skill integration)
3. **Finance Domain** (highest business value)
4. **Inventory Domain** (asset tracking + garage integration)
5. **Home Domain** (household management)

### Phase 3: Advanced Features
1. Implement real-time features (telemetry, notifications)
2. Add offline support and PWA capabilities
3. Implement advanced data visualization
4. Add mobile app capabilities

### Phase 4: Optimization
1. Performance optimization and monitoring
2. Accessibility improvements
3. Advanced security features
4. Analytics and reporting

This architecture provides a solid foundation for building a comprehensive, domain-driven frontend that mirrors our backend structure while providing excellent user experience and maintainability.
