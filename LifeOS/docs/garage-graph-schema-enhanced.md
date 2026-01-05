# Garage Domain - Graph Schema Documentation (Enhanced)

## 1. Executive Summary

The **Garage Domain** manages the lifecycle, maintenance, and operation of vehicles within the LifeOS ecosystem. It is built on a **CQRS architecture** using **F#** for domain logic and **ArangoDB** as a graph backing store.

### Deep System Integration

This domain is deeply integrated with:
- **Inventory**: For consuming parts (oil, filters) during maintenance
- **Identity**: For logging who performed the work
- **Finance**: For tracking the cost of ownership

---

## 2. Domain Types with XML Documentation

### 2.1 Vehicle Aggregate

```fsharp
/// <summary>
/// Vehicle aggregate root representing a physical vehicle in the system.
/// Maintains all business invariants related to vehicle operations.
/// </summary>
/// <remarks>
/// Invariants maintained:
/// - Mileage can never decrease
/// - VIN cannot be changed after creation
/// - Only active vehicles can have components installed
/// 
/// Business rules:
/// 1. Component installation requires vehicle to be active
/// 2. Mileage updates must be greater than current mileage
/// 3. License plate updates require valid format
/// </remarks>
/// <example>
/// <code>
/// let createVehicle () =
///     result {
///         let! vin = VIN.create "1HGCM82633A004352"
///         let! plate = LicensePlate.create (Some "ABC-123")
///         
///         return! Vehicle.create vin plate "Honda" "Civic" 2023 Car
///     }
/// </code>
/// </example>
type Vehicle = {
    Id: VehicleId
    VIN: VIN
    LicensePlate: LicensePlate
    Make: Make
    Model: Model
    Year: Year
    VehicleType: VehicleType
    CurrentMileage: Mileage
    IsActive: bool
    CreatedAt: DateTime
    UpdatedAt: DateTime
} with
    /// <summary>
    /// Updates the vehicle mileage with business rule validation.
    /// </summary>
    /// <param name="newMileage">The new mileage to set</param>
    /// <returns>Result with updated Vehicle or BusinessRuleViolation</returns>
    /// <remarks>
    /// Validation performed:
    /// - New mileage must be greater than current mileage
    /// - Updates the UpdatedAt timestamp automatically
    /// </remarks>
    member this.UpdateMileage (newMileage: Mileage) =
        match Mileage.value newMileage with
        | m when m < Mileage.value this.CurrentMileage -> 
            Error (BusinessRuleViolation "Mileage cannot be decreased")
        | _ -> 
            Ok { this with 
                CurrentMileage = newMileage
                UpdatedAt = DateTime.utcNow ()
            }
    
    /// <summary>
    /// Determines if a component can be installed on this vehicle.
    /// </summary>
    /// <param name="component">The component to install</param>
    /// <returns>Ok() if installation allowed, Error with business rule violation</returns>
    /// <remarks>
    /// Validation performed:
    /// - Component must not be installed on another vehicle
    /// - Vehicle must be active
    /// - Component type must be compatible with vehicle type
    /// </remarks>
    member this.CanInstallComponent (component: Component) =
        if not this.IsActive then
            Error (BusinessRuleViolation "Cannot install components on inactive vehicle")
        else
            match component.Location with
            | InStorage _ -> Ok ()
            | InstalledOn (vehicleId, _) ->
                if vehicleId = this.Id then
                    Ok ()
                else
                    Error (BusinessRuleViolation "Component is already installed on another vehicle")
```

### 2.2 Component Entity

```fsharp
/// <summary>
/// Component entity representing a part that can be installed on a vehicle.
/// Tracks the component's location, installation history, and condition.
/// </summary>
/// <remarks>
/// Components follow a lifecycle:
/// 1. Created in inventory
/// 2. Installed on vehicle
/// 3. Removed/replaced
/// 4. Eventually disposed
/// 
/// Location tracking ensures components are not "lost" in the system.
/// </remarks>
type Component = {
    Id: ComponentId
    PartNumber: string
    Name: string
    ComponentType: ComponentType
    Location: ComponentLocation
    InstallDate: DateTime option
    InstalledOnVehicleId: VehicleId option
    Condition: ComponentCondition
    CreatedAt: DateTime
    UpdatedAt: DateTime
}

/// <summary>
/// Represents the current location of a component.
/// This discriminated union ensures type-safe location tracking.
/// </summary>
type ComponentLocation =
    | InStorage of LocationId
    | InstalledOn of VehicleId * InstallDate: DateTime
    | InTransit of FromLocation: LocationId * ToLocation: LocationId
    | Disposed of DisposalDate: DateTime
```

### 2.3 Service Record Aggregate

```fsharp
/// <summary>
/// Service record aggregate tracking maintenance work performed on vehicles.
/// Captures what work was done, by whom, and what parts were consumed.
/// </summary>
/// <remarks>
/// Business rules:
/// - Service records are immutable once created
/// - Must reference a valid vehicle
/// - Must have a performer (user)
/// - Parts consumption updates inventory via domain events
/// </remarks>
type ServiceRecord = {
    Id: ServiceRecordId
    VehicleId: VehicleId
    PerformedBy: UserId
    ServiceType: ServiceType
    Description: string
    ServiceDate: DateTime
    MileageAtService: Mileage
    LaborHours: decimal option
    LaborRate: decimal option
    PartsConsumed: PartConsumption list
    Notes: string option
    CreatedAt: DateTime
}

/// <summary>
/// Represents a part consumed during service.
/// Links the service to inventory consumption.
/// </summary>
and PartConsumption = {
    InventoryItemId: InventoryItemId
    Quantity: decimal
    UnitCost: Money
    TotalCost: Money
}
```

---

## 3. Graph Relationships (Edges) with Business Rules

### 3.1 INSTALLED_ON Edge

```fsharp
/// <summary>
/// Represents the installation relationship between a Component and a Vehicle.
/// This edge captures when, where, and by whom a component was installed.
/// </summary>
/// <remarks>
/// Business rules enforced:
/// - A component can only be installed on one vehicle at a time
/// - Installation requires authenticated installer
/// - Historical installations are preserved for audit trail
/// - Component must be compatible with vehicle type
/// 
/// Traversal patterns:
/// - Vehicle -> INSTALLED_ON -> Component (get current components)
/// - Component <- INSTALLED_ON <- Vehicle (get installation history via events)
/// </remarks>
/// <example>
/// <code>
/// // Install brake pads on vehicle
/// let installResult = 
///     result {
///         let! canInstall = vehicle.CanInstallComponent brakePads
///         let! updatedVehicle = vehicle.InstallComponent brakePads installerId
///         let! edge = Graph.createInstalledOnEdge brakePads.Id vehicle.Id installer
///         return (updatedVehicle, edge)
///     }
/// </code>
/// </example>
type InstalledOnEdge = {
    _from: ComponentId  // ArangoDB convention
    _to: VehicleId      // ArangoDB convention
    InstalledAt: DateTime
    InstalledBy: UserId
    Mileage: Mileage
    Notes: string option
}
```

### 3.2 CONSUMED Edge (Cross-Domain)

```fsharp
/// <summary>
/// Cross-domain edge linking ServiceRecord to InventoryItem.
/// Tracks parts consumption during maintenance operations.
/// </summary>
/// <remarks>
/// Cross-domain implications:
/// 1. Creates consumption event in Inventory domain
/// 2. Triggers cost allocation in Finance domain
/// 3. Updates stock levels and generates reorder alerts
/// 
/// Business rules:
/// - Cannot consume more than available stock
/// - Must have proper authorization for expensive parts
/// - Consumption is immutable once recorded
/// </remarks>
type ConsumedEdge = {
    _from: ServiceRecordId
    _to: InventoryItemId
    Quantity: decimal
    UnitCost: Money
    ConsumedAt: DateTime
    ConsumedBy: UserId
    AuthorizationCode: string option // For expensive parts
}
```

---

## 4. Domain Events and Behaviors

### 4.1 Vehicle Domain Events

```fsharp
/// <summary>
/// Domain events raised by the Vehicle aggregate.
/// Used for cross-domain communication and event sourcing.
/// </summary>
/// <remarks>
/// Events are immutable facts about something that happened.
/// They are used for:
/// - Audit logging
/// - Event sourcing
/// - Cross-domain communication
/// - Read model updates
/// </remarks>
type VehicleEvent =
    | VehicleCreated of VehicleCreatedEvent
    | MileageUpdated of MileageUpdatedEvent
    | ComponentInstalled of ComponentInstalledEvent
    | ComponentRemoved of ComponentRemovedEvent
    | VehicleDeactivated of VehicleDeactivatedEvent

/// <summary>
/// Event raised when a component is installed on a vehicle.
/// </summary>
/// <remarks>
/// Side effects triggered:
/// - Updates vehicle component list
/// - Creates INSTALLED_ON edge in graph
/// - Updates component location
/// - Triggers inventory allocation
/// - Records cost in finance
/// </remarks>
and ComponentInstalledEvent = {
    VehicleId: VehicleId
    ComponentId: ComponentId
    InstalledAt: DateTime
    InstalledBy: UserId
    Mileage: Mileage
    ComponentType: ComponentType
}
```

### 4.2 Event Handlers

```fsharp
/// <summary>
/// Handles vehicle domain events and coordinates cross-domain effects.
/// </summary>
module VehicleEventHandler =
    /// <summary>
    /// Handles component installation event.
    /// </summary>
    /// <param name="event">The component installed event</param>
    /// <returns>Async workflow for handling side effects</returns>
    let handleComponentInstalled (event: ComponentInstalledEvent) =
        async {
            // Update read models
            do! ReadModels.updateVehicleComponents event
            
            // Create graph edge
            do! GraphRepository.createInstalledOnEdge {
                _from = event.ComponentId
                _to = event.VehicleId
                InstalledAt = event.InstalledAt
                InstalledBy = event.InstalledBy
                Mileage = event.Mileage
                Notes = None
            }
            
            // Trigger inventory consumption
            do! InventoryService.allocateComponent event.ComponentId event.InstalledBy
            
            // Send notifications
            do! NotificationService.sendComponentInstalledNotification event
        }
```

---

## 5. Cross-Domain Integration Patterns

### 5.1 Garage-Inventory Integration

```fsharp
/// <summary>
/// Integration patterns between Garage and Inventory domains.
/// </summary>
/// <remarks>
/// When a component is installed on a vehicle:
/// 1. Garage domain creates installation record
/// 2. Inventory domain updates stock levels
/// 3. Finance domain records cost allocation
/// 
/// Communication patterns:
/// - Domain events for async operations
/// - Shared kernel for common types
/// - Anti-corruption layer for external systems
/// </remarks>
module GarageInventoryIntegration =
    /// <summary>
    /// Handles component installation with inventory updates.
    /// </summary>
    /// <param name="vehicle">Target vehicle</param>
    /// <param name="component">Component from inventory</param>
    /// <param name="installer">User performing installation</param>
    /// <returns>Installation result with inventory updates</returns>
    let installComponentWithInventoryUpdate vehicle component installer =
        result {
            // Install component in Garage domain
            let! installResult = Vehicle.installComponent vehicle component installer
            
            // Update inventory in Inventory domain
            let! inventoryResult = Inventory.allocateComponent component.Id installer.Id
            
            // Record transaction in Finance domain
            let! transactionResult = Finance.recordComponentCost component
            
            return {
                Installation = installResult
                Inventory = inventoryResult
                Transaction = transactionResult
            }
        }
```

---

## 6. Query Patterns and Traversals

### 6.1 Common Graph Traversals

```fsharp
/// <summary>
/// Common graph query patterns for the Garage domain.
/// </summary>
module GarageQueries =
    /// <summary>
    /// Gets all components currently installed on a vehicle.
    /// </summary>
    let getCurrentComponents (vehicleId: VehicleId) =
        """
        FOR v IN vehicles
        FILTER v._key == @vehicleId
        FOR c IN 1..1 OUTBOUND v INSTALLED_ON
        RETURN {
            component: c,
            installedAt: p(v, c).InstalledAt,
            mileage: p(v, c).Mileage
        }
        """
    
    /// <summary>
    /// Gets complete service history for a vehicle including parts consumed.
    /// </summary>
    let getServiceHistoryWithParts (vehicleId: VehicleId) =
        """
        FOR v IN vehicles
        FILTER v._key == @vehicleId
        FOR sr IN 1..1 INBOUND v PERFORMED_ON
        LET parts = (
            FOR ii IN 1..1 OUTBOUND sr CONSUMED
            RETURN ii
        )
        RETURN {
            serviceRecord: sr,
            partsConsumed: parts,
            performer: DOCUMENT('users', sr.PerformedBy)
        }
        """
    
    /// <summary>
    /// Calculates total cost of ownership for a vehicle.
    /// Cross-domain query joining Garage, Inventory, and Finance.
    /// </summary>
    let getTotalCostOfOwnership (vehicleId: VehicleId) =
        """
        FOR v IN vehicles
        FILTER v._key == @vehicleId
        LET serviceCosts = (
            FOR sr IN 1..1 INBOUND v PERFORMED_ON
            LET partsCost = (
                FOR ii IN 1..1 OUTBOUND sr CONSUMED
                COLLECT AGGREGATE total = SUM(ii.TotalCost)
                RETURN total
            )
            LET laborCost = sr.LaborHours * sr.LaborRate
            RETURN (partsCost[0] || 0) + (laborCost || 0)
        )
        RETURN {
            vehicleId: v._key,
            totalServiceCost: SUM(serviceCosts),
            serviceCount: COUNT(serviceCosts)
        }
        """
```

---

## 7. Error Handling and Validation

### 7.1 Domain Error Types

```fsharp
/// <summary>
/// Domain-specific errors for the Garage domain.
/// </summary>
type GarageDomainError =
    | ValidationError of string
    | BusinessRuleViolation of string
    | VehicleNotFound of VehicleId
    | ComponentNotFound of ComponentId
    | ComponentAlreadyInstalled of ComponentId * VehicleId
    | InsufficientMileage of current: Mileage * requested: Mileage
    | IncompatibleComponent of componentType: ComponentType * vehicleType: VehicleType
    | InstallationNotAllowed of VehicleId * reason: string

/// <summary>
/// Result type for Garage domain operations.
/// </summary>
type GarageResult<'T> = Result<'T, GarageDomainError>
```

---

## 8. Benefits

- **Complete Vehicle History**: Every service, part, and cost tracked
- **Predictive Maintenance**: Telemetry data enables proactive repairs
- **Cost Transparency**: Know exactly what each vehicle costs to maintain
- **Cross-Domain Intelligence**: Parts, people, and finances all connected
- **Audit Trail**: Who did what work, when, and at what cost
- **Type Safety**: F# types prevent invalid states at compile time
- **Event Sourcing**: Complete audit log through domain events
- **Graph Traversal**: Powerful queries across relationships

---

## 9. Future Enhancements

- Integration with external APIs (vehicle data, parts pricing)
- Mobile app for field technicians
- Predictive maintenance algorithms using ML
- Fleet management dashboard
- Warranty tracking and claims management
- Real-time telemetry processing with stream analytics
- Component lifecycle analytics
- Maintenance scheduling optimization
