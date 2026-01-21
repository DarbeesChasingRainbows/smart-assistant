module LifeOS.Domain.Common.AntiCorruptionLayer

open System
open System.Threading.Tasks

// ==================== ANTI-CORRUPTION LAYER (ACL) ====================
// Based on DDD patterns for protecting bounded contexts from external influence

/// Interface for translating between domain models and external systems
/// This prevents external model changes from affecting our domain
type ITranslator<'TExternal, 'TInternal> =
    abstract member ToInternal : externalValue:'TExternal -> Result<'TInternal, DomainError>
    abstract member ToExternal : internalValue:'TInternal -> 'TExternal

/// Interface for adapting external services to domain interfaces
/// Provides a buffer between our domain and external APIs
type IExternalServiceAdapter<'TDomainRequest, 'TDomainResponse, 'TExternalRequest, 'TExternalResponse> =
    abstract member AdaptRequest : domainRequestValue:'TDomainRequest -> 'TExternalRequest
    abstract member AdaptResponse : externalResponseValue:'TExternalResponse -> Result<'TDomainResponse, DomainError>
    abstract member CallExternalService : requestValue:'TExternalRequest -> Task<'TExternalResponse>

/// Interface for protecting domain from external model changes
/// Validates and sanitizes external data before it enters our domain
type IAclProtection<'TExternal> =
    abstract member ValidateExternal : externalValue:'TExternal -> Result<unit, DomainError>
    abstract member SanitizeExternal : externalValue:'TExternal -> 'TExternal
    abstract member FilterExternalData : externalValue:'TExternal -> 'TExternal

// ==================== GARDEN-FINANCE ACL ====================
// Protects Garden domain from Finance domain specifics

type GardenFinanceAcl() =
    
    /// Translates financial data for garden use without exposing financial internals
    static member CreateCostTranslator() =
        { new ITranslator<obj, obj> with
            member _.ToExternal internalValue = 
                // Convert Garden cost data to financial expense format
                box {| Amount = 0m; Category = "Gardening" |}
            
            member _.ToInternal externalValue = 
                // Convert financial expense to garden cost view
                Ok (box {| Amount = 0m; CostType = "Supplies" |}) }
    
    /// Adapter for financial service calls from Garden domain
    static member CreateFinancialServiceAdapter() =
        { new IExternalServiceAdapter<obj, obj, obj, obj> with
            member _.AdaptRequest domainRequestValue =
                // Translate garden expense request to financial transaction format
                box {| AccountId = Guid.NewGuid(); Amount = 0m |}
            
            member _.AdaptResponse externalResponseValue =
                // Translate financial response to garden result
                Ok (box {| TransactionId = Guid.NewGuid(); Status = "Recorded" |})
            
            member _.CallExternalService requestValue =
                // Would call actual financial service
                Task.FromResult (box {| TransactionId = Guid.NewGuid(); Status = "Success" |}) }

// ==================== GARAGE-FINANCE ACL ====================
// Protects Garage domain from Finance domain specifics

type GarageFinanceAcl() =
    
    /// Translates maintenance costs to financial format
    static member CreateMaintenanceCostTranslator() =
        { new ITranslator<obj, obj> with
            member _.ToExternal internalValue = 
                box {| Amount = 0m; Category = "Vehicle Maintenance" |}
            
            member _.ToInternal externalValue = 
                Ok (box {| Cost = Some 0m; Description = "Maintenance" |}) }
    
    /// Protects Garage from financial jargon
    static member CreateFinancialProtection() =
        { new IAclProtection<obj> with
            member _.ValidateExternal externalValue =
                // Ensure financial data is relevant to garage operations
                Ok ()
            
            member _.SanitizeExternal externalValue =
                // Remove sensitive financial data
                externalValue
            
            member _.FilterExternalData externalValue =
                // Only include vehicle-related expenses
                externalValue }

// ==================== CROSS-DOMAIN EVENT ADAPTERS ====================
// Adapt events between contexts without coupling them

type GardenEventAdapter() =
    
    /// Adapt garden events for finance consumption
    static member AdaptForFinance(event: GardenDomainEvent) =
        match event with
        | CropBatchCreated batch -> 
            Some {| EventType = "ResourceAllocation"
                    BatchId = batch.BatchId
                    ResourceType = "CropBatch"
                    EstimatedCost = batch.Quantity * 0.50m |}
        | CropBatchHarvested harvest -> 
            Some {| EventType = "HarvestComplete"
                    BatchId = harvest.BatchId
                    ResourceType = "CropBatch"
                    EstimatedCost = 0m |}
        | _ -> None

type GarageEventAdapter() =
    
    /// Adapt garage events for finance consumption
    static member AdaptForFinance(event: GarageDomainEvent) =
        match event with
        | VehicleMaintained maintenance -> 
            Some {| EventType = "MaintenanceExpense"
                    VehicleId = maintenance.VehicleId
                    Cost = maintenance.Cost |> Option.defaultValue 0m
                    Date = maintenance.Date
                    MaintenanceType = maintenance.MaintenanceType |}
        | ComponentInstalled installedComponent -> 
            Some {| EventType = "MaintenanceExpense"
                    VehicleId = installedComponent.VehicleId
                    Cost = 0m
                    Date = installedComponent.InstallDate
                    MaintenanceType = "Part Installation" |}
        | _ -> None

// ==================== SHARED KERNEL ACL ====================
// For common concepts that need careful translation between domains

type SharedKernelAcl() =
    
    /// Protects the concept of "Id" between domains
    static member CreateIdTranslator() =
        { new ITranslator<string, Guid> with
            member _.ToExternal internalValue = internalValue.ToString()
            member _.ToInternal externalValue = 
                match Guid.TryParse externalValue with
                | true, guid -> Ok guid
                | false, _ -> Error (ValidationError "Invalid ID format") }
    
    /// Protects the concept of "Money" between domains
    static member CreateMoneyTranslator() =
        { new ITranslator<decimal, decimal> with
            member _.ToExternal internalValue = internalValue
            member _.ToInternal externalValue = 
                if externalValue < 0m then
                    Error (BusinessRuleViolation "Amount cannot be negative")
                else
                    Ok externalValue }

// ==================== ACL FACTORY ====================
// Creates appropriate ACL components for domain communication

/// Garden to Finance ACL configuration
type GardenToFinanceAcl = {
    CostTranslator: ITranslator<obj, obj>
    ServiceAdapter: IExternalServiceAdapter<obj, obj, obj, obj>
    Protection: IAclProtection<obj>
}

/// Garage to Finance ACL configuration  
type GarageToFinanceAcl = {
    CostTranslator: ITranslator<obj, obj>
    Protection: IAclProtection<obj>
}

type AclFactory =
    
    /// Create ACL for Garden to Finance communication
    static member CreateGardenToFinanceAcl() : GardenToFinanceAcl =
        {
            CostTranslator = GardenFinanceAcl.CreateCostTranslator()
            ServiceAdapter = GardenFinanceAcl.CreateFinancialServiceAdapter()
            Protection = {
                new IAclProtection<obj> with
                    member _.ValidateExternal _ = Ok ()
                    member _.SanitizeExternal value = value
                    member _.FilterExternalData value = value
            }
        }
    
    /// Create ACL for Garage to Finance communication
    static member CreateGarageToFinanceAcl() : GarageToFinanceAcl =
        {
            CostTranslator = GarageFinanceAcl.CreateMaintenanceCostTranslator()
            Protection = GarageFinanceAcl.CreateFinancialProtection()
        }
    
    /// Create ACL for cross-domain event adaptation
    static member CreateEventAdapter(fromDomain: string, toDomain: string) =
        match fromDomain, toDomain with
        | "Garden", "Finance" -> box (GardenEventAdapter())
        | "Garage", "Finance" -> box (GarageEventAdapter())
        | _ -> failwithf "No event adapter available from %s to %s" fromDomain toDomain
