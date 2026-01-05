namespace LifeOS.Domain.Garden

open LifeOS.Domain.Common
open System

// Species Aggregate - Catalog of plant types
type Species = {
    Id: SpeciesId
    Name: string
    ScientificName: string option
    Variety: string option
    PlantType: PlantType
    GrowthHabit: GrowthHabit
    SunRequirement: SunRequirement
    WaterNeed: WaterNeed
    PreferredSoilType: SoilType
    DaysToMaturity: int option
    SpacingRequirement: Area option // Space needed between plants
    DepthRequirement: Depth option // Seed planting depth
    GerminationRate: Percentage option
    FrostTolerance: bool
    CompanionPlants: SpeciesId list
    IncompatiblePlants: SpeciesId list
    PlantingSeasons: Season list
    HarvestSeasons: Season list
    MedicinalData: MedicinalProperties option
    Notes: string option
    CreatedAt: DateTime
    UpdatedAt: DateTime
} with
    member this.IsMedicinal = this.MedicinalData.IsSome
    
    member this.CanPlantInSeason (season: Season) =
        this.PlantingSeasons |> List.contains season
    
    member this.CanHarvestInSeason (season: Season) =
        this.HarvestSeasons |> List.contains season
    
    member this.IsCompatibleWith (speciesId: SpeciesId) =
        this.CompanionPlants |> List.contains speciesId
    
    member this.IsIncompatibleWith (speciesId: SpeciesId) =
        this.IncompatiblePlants |> List.contains speciesId
    
    member this.AddCompanionPlant (speciesId: SpeciesId) =
        if this.IsCompatibleWith speciesId then
            Error (BusinessRuleViolation "This species is already marked as a companion plant")
        elif this.IsIncompatibleWith speciesId then
            Error (BusinessRuleViolation "This species is marked as incompatible")
        else
            Ok { this with 
                    CompanionPlants = speciesId :: this.CompanionPlants
                    UpdatedAt = DateTime.utcNow()
            }
    
    member this.AddIncompatiblePlant (speciesId: SpeciesId) =
        if this.IsIncompatibleWith speciesId then
            Error (BusinessRuleViolation "This species is already marked as incompatible")
        elif this.IsCompatibleWith speciesId then
            Error (BusinessRuleViolation "This species is marked as a companion plant")
        else
            Ok { this with 
                    IncompatiblePlants = speciesId :: this.IncompatiblePlants
                    UpdatedAt = DateTime.utcNow()
            }

// Species Module for factory methods
module Species =
    let create name scientificName variety plantType growthHabit sunRequirement waterNeed preferredSoilType daysToMaturity spacingRequirement depthRequirement germinationRate frostTolerance medicinalData notes =
        if String.IsNullOrEmpty(name) then
            Error (ValidationError "Species name is required")
        else
            Ok {
                Id = GardenId.createSpeciesId()
                Name = name
                ScientificName = scientificName
                Variety = variety
                PlantType = plantType
                GrowthHabit = growthHabit
                SunRequirement = sunRequirement
                WaterNeed = waterNeed
                PreferredSoilType = preferredSoilType
                DaysToMaturity = daysToMaturity
                SpacingRequirement = spacingRequirement
                DepthRequirement = depthRequirement
                GerminationRate = germinationRate
                FrostTolerance = frostTolerance
                CompanionPlants = []
                IncompatiblePlants = []
                PlantingSeasons = [Spring; Summer] // Default seasons
                HarvestSeasons = [Summer; Fall] // Default seasons
                MedicinalData = medicinalData
                Notes = notes
                CreatedAt = DateTime.utcNow()
                UpdatedAt = DateTime.utcNow()
            }
    
    // Business rules
    let canPlantTogether (species1: Species) (species2: Species) =
        not (species1.IsIncompatibleWith species2.Id || species2.IsIncompatibleWith species1.Id)
    
    let getOptimalPlantingDate (species: Species) (currentDate: DateTime) =
        let currentSeason = 
            match currentDate.Month with
            | m when m >= 3 && m <= 5 -> Spring
            | m when m >= 6 && m <= 8 -> Summer
            | m when m >= 9 && m <= 11 -> Fall
            | _ -> Winter
        
        if species.CanPlantInSeason currentSeason then
            Some currentDate
        else
            // Find next suitable planting season
            species.PlantingSeasons
            |> List.tryFind (fun season -> 
                match season with
                | Spring -> currentDate.Month > 5
                | Summer -> currentDate.Month > 8
                | Fall -> currentDate.Month > 11
                | Winter -> true
                | YearRound -> true)
            |> Option.map (fun _ -> currentDate)
