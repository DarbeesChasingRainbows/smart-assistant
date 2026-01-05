namespace LifeOS.Domain.Garden

open LifeOS.Domain.Common
open System
open System.Threading.Tasks

// Domain Services for Garden operations
type IGardenDomainService =
    abstract member PlantCropBatchAsync : CropBatch -> GardenBed -> Task<Result<CropBatch * GardenBed, DomainError>>
    abstract member CalculateBatchProfitabilityAsync : CropBatch -> Task<Result<decimal option, DomainError>>
    abstract member GetGardenHealthReportAsync : unit -> Task<GardenHealthReport>

type GardenDomainService(
    speciesRepo: ISpeciesRepository,
    bedRepo: IGardenBedRepository,
    batchRepo: ICropBatchRepository,
    financialRepo: IFinancialRepository) =
    
    interface IGardenDomainService with
        
        member _.PlantCropBatchAsync batch bed =
            async {
                // Validate batch can be planted
                match CropBatch.canPlantInBed batch bed with
                | Ok () ->
                    // Update batch with garden bed
                    let updatedBatch = { batch with GardenBedId = Some bed.Id }
                    
                    // Plant species in bed
                    match bed.PlantSpecies batch.SpeciesId with
                    | Ok updatedBed ->
                        // Save changes
                        let! savedBatch = batchRepo.UpdateAsync updatedBatch |> Async.AwaitTask
                        let! savedBed = bedRepo.UpdateAsync updatedBed |> Async.AwaitTask
                        
                        return Ok (savedBatch, savedBed)
                    | Error e -> return Error e
                | Error e -> return Error e
            } |> Async.StartAsTask
        
        member _.CalculateBatchProfitabilityAsync batch =
            async {
                let! resourceCost = financialRepo.GetTotalCostByBatchAsync batch.Id |> Async.AwaitTask
                let! resourceConsumption = financialRepo.GetResourceConsumptionByBatchAsync batch.Id |> Async.AwaitTask
                let! laborRecords = financialRepo.GetLaborRecordsByBatchAsync batch.Id |> Async.AwaitTask
                
                let totalCost = resourceCost + (laborRecords |> Seq.sumBy (fun l -> l.TotalCost))
                
                // If harvested, calculate actual profitability
                match batch.Status, batch.ActualYield with
                | Harvested, Some actualYield ->
                    // Would need market price from external service
                    // For now, return cost only
                    return Ok (Some (-totalCost))
                | _ ->
                    return Ok (Some (-totalCost))
            } |> Async.StartAsTask
        
        member _.GetGardenHealthReportAsync () =
            async {
                let! allBeds = bedRepo.GetAllAsync() |> Async.AwaitTask
                let! allBatches = batchRepo.GetAllAsync() |> Async.AwaitTask
                
                let activeBeds = allBeds |> Seq.filter (fun b -> b.IsActive)
                let activeBatches = allBatches |> Seq.filter (fun b -> not b.IsCompleted)
                
                let failedBatches = allBatches |> Seq.filter (fun b -> b.Status = Failed)
                let harvestedBatches = allBatches |> Seq.filter (fun b -> b.Status = Harvested)
                
                return {
                    TotalBeds = Seq.length allBeds
                    ActiveBeds = Seq.length activeBeds
                    TotalBatches = Seq.length allBatches
                    ActiveBatches = Seq.length activeBatches
                    FailedBatches = Seq.length failedBatches
                    HarvestedBatches = Seq.length harvestedBatches
                    SuccessRate = 
                        if Seq.length allBatches > 0 then
                            decimal (Seq.length harvestedBatches) / decimal (Seq.length allBatches) * 100m
                        else
                            0m
                }
            } |> Async.StartAsTask

// Additional domain services
type IPlantingService =
    abstract member GetOptimalPlantingScheduleAsync : Season -> Task<PlantingSchedule list>
    abstract member ValidateCompanionPlantingAsync : SpeciesId list -> Task<Result<bool, DomainError>>

type PlantingService(
    speciesRepo: ISpeciesRepository,
    bedRepo: IGardenBedRepository) =
    
    interface IPlantingService with
        
        member _.GetOptimalPlantingScheduleAsync season =
            async {
                let! allSpecies = speciesRepo.GetBySeasonAsync season |> Async.AwaitTask
                let! activeBeds = bedRepo.GetActiveBedsAsync() |> Async.AwaitTask
                
                let schedule = 
                    activeBeds
                    |> Seq.collect (fun bed ->
                        let compatibleSpecies = GardenBed.getOptimalSpeciesForBed bed allSpecies season
                        compatibleSpecies |> List.map (fun species -> {
                            GardenBedId = bed.Id
                            GardenBedName = bed.Name
                            SpeciesId = species.Id
                            SpeciesName = species.Name
                            PlantingDate = DateTime.utcNow()
                            ExpectedHarvestDate = 
                                species.DaysToMaturity 
                                |> Option.map (fun days -> DateTime.utcNow().AddDays(float days))
                        }))
                    |> Seq.toList
                
                return schedule
            } |> Async.StartAsTask
        
        member _.ValidateCompanionPlantingAsync speciesIds =
            async {
                let! allSpecies = speciesRepo.GetAllAsync() |> Async.AwaitTask
                
                let speciesList = 
                    speciesIds
                    |> List.map (fun id -> 
                        allSpecies |> Seq.tryFind (fun s -> s.Id = id))
                    |> List.choose id
                
                if List.length speciesList < List.length speciesIds then
                    return Error (NotFoundError "One or more species not found")
                else
                    // Check all pairs for compatibility
                    let mutable isValid = true
                    let mutable errorMessages = []
                    
                    for i in 0 .. List.length speciesList - 1 do
                        for j in i + 1 .. List.length speciesList - 1 do
                            let species1 = speciesList.[i]
                            let species2 = speciesList.[j]
                            
                            if not (Species.canPlantTogether species1 species2) then
                                isValid <- false
                                errorMessages <- 
                                    sprintf "%s and %s are incompatible" species1.Name species2.Name 
                                    :: errorMessages
                    
                    if isValid then
                        return Ok true
                    else
                        return Error (BusinessRuleViolation (String.concat "; " errorMessages))
            } |> Async.StartAsTask

// Factory for creating garden domain services
module GardenServiceFactory =
    let createGardenDomainService speciesRepo bedRepo batchRepo financialRepo =
        GardenDomainService(speciesRepo, bedRepo, batchRepo, financialRepo) :> IGardenDomainService
    let createPlantingService speciesRepo bedRepo =
        PlantingService(speciesRepo, bedRepo) :> IPlantingService
