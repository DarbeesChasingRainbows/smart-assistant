namespace LifeOS.Domain.Garden

open LifeOS.Domain.Common
open System

// GardenBed Aggregate - Physical location for planting
type GardenBed = {
    Id: GardenBedId
    Name: string
    Location: string option // GPS coordinates or descriptive location
    Geo: GeoReference option
    Area: Area
    SoilType: SoilType
    HasIrrigation: bool
    HasCover: bool option // Greenhouse, cold frame, etc.
    IsActive: bool
    PlantedSpecies: SpeciesId list // Current species planted
    CreatedAt: DateTime
    UpdatedAt: DateTime
} with
    member this.CanPlantSpecies (speciesId: SpeciesId) =
        if not this.IsActive then
            Error (BusinessRuleViolation "Cannot plant in an inactive garden bed")
        elif this.PlantedSpecies |> List.contains speciesId then
            Error (BusinessRuleViolation "This species is already planted in this bed")
        else
            Ok ()
    
    member this.PlantSpecies (speciesId: SpeciesId) =
        match this.CanPlantSpecies speciesId with
        | Ok () ->
            Ok
                { this with
                    PlantedSpecies = speciesId :: this.PlantedSpecies
                    UpdatedAt = DateTime.utcNow()
                }
        | Error e -> Error e
    
    member this.RemoveSpecies (speciesId: SpeciesId) =
        if not (this.PlantedSpecies |> List.contains speciesId) then
            Error (ValidationError "Species is not planted in this bed")
        else
            Ok
                { this with
                    PlantedSpecies =
                        this.PlantedSpecies |> List.filter ((<>) speciesId)
                    UpdatedAt = DateTime.utcNow()
                }
    
    member this.ClearBed () =
        Ok
            { this with
                PlantedSpecies = []
                UpdatedAt = DateTime.utcNow()
            }
    
    member this.Deactivate () =
        Ok
            { this with
                IsActive = false
                UpdatedAt = DateTime.utcNow()
            }
    
    member this.Activate () =
        Ok
            { this with
                IsActive = true
                UpdatedAt = DateTime.utcNow()
            }
    
    member this.GetAvailableArea (speciesList: Species seq) =
        // Calculate area used by current plantings based on spacing requirements
        let totalAreaUsed = 
            this.PlantedSpecies
            |> List.sumBy (fun speciesId ->
                speciesList
                |> Seq.tryFind (fun s -> s.Id = speciesId)
                |> Option.bind (fun s -> s.SpacingRequirement)
                |> Option.map Area.value
                |> Option.defaultValue 0m)
        
        Area.value this.Area - totalAreaUsed

// GardenBed Module for factory methods
module GardenBed =
    let create name location area soilType hasIrrigation hasCover =
        result {
            if String.IsNullOrEmpty(name) then
                return! Error (ValidationError "Garden bed name is required")
            
            let! validatedArea = Area.create area
            
            return {
                Id = GardenId.createGardenBedId()
                Name = name
                Location = location
                Geo = None
                Area = validatedArea
                SoilType = soilType
                HasIrrigation = hasIrrigation
                HasCover = hasCover
                IsActive = true
                PlantedSpecies = []
                CreatedAt = DateTime.utcNow()
                UpdatedAt = DateTime.utcNow()
            }
        }
    
    // Business rules
    let canPlantSpeciesTogether (bed: GardenBed) (species1: Species) (species2: Species) =
        // Check if species are compatible
        if not (Species.canPlantTogether species1 species2) then
            false
        // Check if bed has enough space
        elif bed.GetAvailableArea [species1; species2] < 0m then
            false
        // Check soil type compatibility
        elif species1.PreferredSoilType <> bed.SoilType || species2.PreferredSoilType <> bed.SoilType then
            false
        else
            true
    
    let getOptimalSpeciesForBed (bed: GardenBed) (allSpecies: Species seq) (season: Season) =
        allSpecies
        |> Seq.filter (fun s -> 
            s.CanPlantInSeason season &&
            s.PreferredSoilType = bed.SoilType &&
            (match s.SpacingRequirement with
             | Some spacing -> Area.value spacing <= bed.GetAvailableArea allSpecies
             | None -> true))
        |> Seq.toList
    
    let calculateWaterRequirement (bed: GardenBed) (plantedSpecies: Species seq) =
        plantedSpecies
        |> Seq.filter (fun s -> bed.PlantedSpecies |> List.contains s.Id)
        |> Seq.sumBy (fun s ->
            match (s.WaterNeed: WaterNeed) with
            | WaterNeed.Low -> 1.0m
            | WaterNeed.Moderate -> 2.0m
            | WaterNeed.High -> 3.0m
            | WaterNeed.VeryHigh -> 4.0m)
