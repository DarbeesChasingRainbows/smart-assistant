namespace LifeOS.Domain.Garden

open LifeOS.Domain.Common
open System

// Value Objects for Garden domain
type SpeciesId = SpeciesId of Guid
    with
        static member FromGuid(guid: Guid) = SpeciesId guid
        member this.Value = match this with SpeciesId id -> id

type GardenBedId = GardenBedId of Guid
    with
        static member FromGuid(guid: Guid) = GardenBedId guid
        member this.Value = match this with GardenBedId id -> id

type CropBatchId = CropBatchId of Guid
    with
        static member FromGuid(guid: Guid) = CropBatchId guid
        member this.Value = match this with CropBatchId id -> id

type MedicinalActionId = MedicinalActionId of Guid
    with
        static member FromGuid(guid: Guid) = MedicinalActionId guid
        member this.Value = match this with MedicinalActionId id -> id

type ConstituentId = ConstituentId of Guid
    with
        static member FromGuid(guid: Guid) = ConstituentId guid
        member this.Value = match this with ConstituentId id -> id

// Herbalism and Naturopathy domain types
type MedicinalAction = {
    Id: MedicinalActionId
    Name: string
    Description: string
}

type ActiveConstituent = {
    Id: ConstituentId
    Name: string
    Class: string // e.g. Alkaloid, Flavonoid
    Description: string option
}

type SafetyClass =
    | Class1 // Safe when used appropriately
    | Class2a // External use only
    | Class2b // Not for use in pregnancy
    | Class2c // Not for use while nursing
    | Class2d // Other specific restrictions
    | Class3 // Use only under supervision
    | Unknown

type DosageForm =
    | Infusion
    | Decoction
    | Tincture
    | Capsule
    | Tablet
    | Oil
    | Salve
    | Compress
    | Syrup
    | Oxymel
    | Other of string

type MedicinalProperties = {
    Actions: MedicinalActionId list
    Constituents: ConstituentId list
    PrimaryIndications: string list
    PartsUsed: string list // e.g. Root, Leaf, Flower
    Contraindications: string list
    Precautions: string list
    AdverseEffects: string list
    Overdosage: string option
    DrugInteractions: string list
    SafetyClass: SafetyClass
    StandardDosage: string option
    Preparations: DosageForm list
}

type YieldUnit =
    | Bunches
    | Pounds
    | Heads
    | Stems
    | Pieces

type YieldEstimate = {
    Unit: YieldUnit
    Min: decimal option
    Max: decimal option
}

type HarvestMethod =
    | OneCut
    | MultiPick
    | CutAndComeAgain

type StorageHumidity =
    | Low
    | Medium
    | High

type PackUnit =
    | Bunch
    | Bag
    | Clamshell
    | LooseByWeight
    | Box

type ShareRole =
    | Staple
    | Filler
    | Accent
    | Novelty
    | Herb
    | CookingGreen
    | Flower

type RowSpacing = {
    InRowInches: int option
    BetweenRowInches: int option
}

type SuccessionPlan = {
    IntervalDays: int
    Count: int
    Notes: string list
}

type ProductionPlanning = {
    DaysToMaturityDirectSeed: int option
    DaysToMaturityTransplant: int option
    Spacing: RowSpacing option
    RowsPerBed: int option
    Successions: SuccessionPlan option
    Yield: YieldEstimate option
}

type HarvestProfile = {
    Method: HarvestMethod
    HarvestWindowDays: int option
    CutsExpected: int option
    RegrowthDays: int option
    QualityRisks: string list
}

type PostHarvestProfile = {
    StorageTempF: int option
    StorageHumidity: StorageHumidity option
    ShelfLifeDays: int option
    CoolingMethods: string list
    HandlingNotes: string list
    PackUnit: PackUnit option
    TypicalPackWeightOz: int option
}

type CSAProfile = {
    ShareRoles: ShareRole list
    MemberFriendlyScore: int option
    Substitutions: SpeciesId list
    RecipeTags: string list
    PackingNotes: string list
}

type MarketGardenProfile = {
    ProductionPlanning: ProductionPlanning option
    Harvest: HarvestProfile option
    PostHarvest: PostHarvestProfile option
    CSA: CSAProfile option
}

type CutFlowerHarvestStage =
    | Bud
    | CrackingColor
    | HalfOpen
    | FullyOpen

type StemGrade = {
    MinStemLengthInches: int option
    StemStrength: string option
    BloomCount: int option
}

type VaseLife = {
    MinDays: int option
    MaxDays: int option
    Notes: string list
}

type CutFlowerProfile = {
    HarvestStage: CutFlowerHarvestStage option
    StemGrade: StemGrade option
    VaseLife: VaseLife option
    ConditioningSteps: string list
    StorageTempF: int option
    CommonDefects: string list
    BouquetPairings: SpeciesId list
}

// Main monograph value objects
type BotanicalDescription = {
    LifeForm: string
    Height: string
    Description: string
}

type NativeHabitat = {
    NativeRange: string list
    Climate: string
    SoilConditions: string list
}

type HorticulturalRequirements = {
    USDAZones: int * int
    WaterNeeds: string
    SunRequirements: string
    SoilType: string list
}

type UsesAndProperties = {
    Edible: bool option
    Medicinal: bool option
    Culinary: string list
    Traditional: string list
    MedicinalData: MedicinalProperties option
}

type ConservationEcology = {
    Status: string
    Threats: string list
    Conservation: string list
}

type CultivationHistory = {
    Domesticated: bool
    History: string list
    CulturalSignificance: string list
}

type SourceType = Scientific | Horticultural | Traditional | Government | Commercial

type Source = {
    Type: SourceType
    Title: string
    Author: string
    Year: int
    Url: string option
    Doi: string option
}

type ImageType = Whole | Leaf | Flower | Fruit | Seed | Root | Habitat

type Image = {
    Type: ImageType
    Url: string
    Caption: string
    Photographer: string option
    License: string
}

type VerificationStatus = Pending | Verified | Disputed

type Metadata = {
    CreatedAt: DateTime
    UpdatedAt: DateTime
    VerifiedBy: string option
    VerificationStatus: VerificationStatus
    Sources: Source list
    Images: Image list
    Notes: string list
}

// Module for creating IDs
module GardenId =
    let createSpeciesId () = SpeciesId (Guid.NewGuid())
    let createGardenBedId () = GardenBedId (Guid.NewGuid())
    let createCropBatchId () = CropBatchId (Guid.NewGuid())
    let createMedicinalActionId () = MedicinalActionId (Guid.NewGuid())
    let createConstituentId () = ConstituentId (Guid.NewGuid())
    
    let speciesIdValue (SpeciesId id) = id
    let gardenBedIdValue (GardenBedId id) = id
    let cropBatchIdValue (CropBatchId id) = id
    let medicinalActionIdValue (MedicinalActionId id) = id
    let constituentIdValue (ConstituentId id) = id

// Garden value objects
type Quantity = Quantity of decimal
type Area = Area of decimal // in square feet
type Depth = Depth of decimal // in inches
type Percentage = Percentage of decimal

// Geo types (for GardenBed location and future mapping)
type GeoPoint = {
    Latitude: decimal
    Longitude: decimal
}

type GeoJsonPoint = {
    Type: string
    Coordinates: decimal * decimal
}

type GeoReference = {
    Point: GeoPoint
    GeoJson: GeoJsonPoint
    ElevationMeters: decimal option
    Notes: string option
}

// Quantity utilities
module Quantity =
    let create (value: decimal) =
        if value < 0m then
            Error (ValidationError "Quantity cannot be negative")
        else
            Ok (Quantity value)
    
    let value (Quantity q) = q

// Area utilities
module Area =
    let create (value: decimal) =
        if value <= 0m then
            Error (ValidationError "Area must be positive")
        else
            Ok (Area value)
    
    let value (Area a) = a

// Depth utilities
module Depth =
    let create (value: decimal) =
        if value < 0m then
            Error (ValidationError "Depth cannot be negative")
        else
            Ok (Depth value)
    
    let value (Depth d) = d

// Percentage utilities
module Percentage =
    let create (value: decimal) =
        if value < 0m || value > 100m then
            Error (ValidationError "Percentage must be between 0 and 100")
        else
            Ok (Percentage value)
    
    let value (Percentage p) = p

// Plant type discriminated union
type PlantType =
    | Vegetable
    | Fruit
    | Herb
    | Flower
    | Grain
    | CoverCrop
    | Other of string

// Growth habit
type GrowthHabit =
    | Determinate
    | Indeterminate
    | Bush
    | Vine
    | Compact

// Sun requirements
type SunRequirement =
    | FullSun
    | PartialSun
    | PartialShade
    | FullShade

// Water needs
type WaterNeed =
    | Low
    | Moderate
    | High
    | VeryHigh

// Soil type
type SoilType =
    | Sandy
    | Clay
    | Loamy
    | Silt
    | Peaty
    | Chalky

// Season
type Season =
    | Spring
    | Summer
    | Fall
    | Winter
    | YearRound

// Crop status
type CropStatus =
    | Planned
    | Seeded
    | Germinated
    | Growing
    | Flowering
    | Fruiting
    | Harvested
    | Failed
    | Terminated

// Financial edge types for graph database
module FinancialEdges =
    let CONSUMED = "CONSUMED"      // Resources consumed (seeds, fertilizer, water)
    let WORKED_ON = "WORKED_ON"    // Labor performed
    let HARVESTED = "HARVESTED"    // Crop harvested
    let SOLD = "SOLD"              // Produce sold

// Financial transaction record
type FinancialTransaction = {
    Id: Guid
    Type: string
    Amount: decimal
    Date: DateTime
    Description: string
    Category: string
    RelatedEntityId: Guid option
}

// Resource consumption record
type ResourceConsumption = {
    Id: Guid
    ResourceName: string
    Quantity: Quantity
    UnitCost: decimal
    TotalCost: decimal
    Date: DateTime
    ConsumedBy: CropBatchId
}

// Labor record
type LaborRecord = {
    Id: Guid
    UserId: UserId
    Hours: decimal
    Rate: decimal
    TotalCost: decimal
    Date: DateTime
    WorkedOn: CropBatchId
    Description: string
}

// Garden health report
type GardenHealthReport = {
    TotalBeds: int
    ActiveBeds: int
    TotalBatches: int
    ActiveBatches: int
    FailedBatches: int
    HarvestedBatches: int
    SuccessRate: decimal
}

// Planting schedule record
type PlantingSchedule = {
    GardenBedId: GardenBedId
    GardenBedName: string
    SpeciesId: SpeciesId
    SpeciesName: string
    PlantingDate: DateTime
    ExpectedHarvestDate: DateTime option
}
