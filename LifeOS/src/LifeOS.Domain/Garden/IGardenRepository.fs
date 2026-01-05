namespace LifeOS.Domain.Garden

open LifeOS.Domain.Common
open System
open System.Threading.Tasks

// ISpeciesRepository - Port for Species persistence
type ISpeciesRepository =
    abstract member GetByIdAsync : SpeciesId -> Task<Species option>
    abstract member GetAllAsync : unit -> Task<Species seq>
    abstract member AddAsync : Species -> Task<Species>
    abstract member UpdateAsync : Species -> Task<Species>
    abstract member DeleteAsync : SpeciesId -> Task<bool>
    abstract member GetByPlantTypeAsync : PlantType -> Task<Species seq>
    abstract member GetBySeasonAsync : Season -> Task<Species seq>
    abstract member SearchAsync : string -> Task<Species seq>

// ISpeciesMonographRepository - Port for Species Monograph persistence
type ISpeciesMonographRepository =
    abstract member GetSpeciesMonographAsync : SpeciesId -> Task<SpeciesMonograph option>
    abstract member GetAllSpeciesMonographsAsync : unit -> Task<SpeciesMonograph seq>
    abstract member SearchSpeciesMonographsAsync : string -> Task<SpeciesMonograph seq>
    abstract member SaveSpeciesMonographAsync : SpeciesMonograph -> Task<unit>
    abstract member DeleteSpeciesMonographAsync : SpeciesId -> Task<bool>
    abstract member GetSpeciesByUSDAZoneAsync : int -> Task<SpeciesMonograph seq>
    abstract member GetEdibleSpeciesAsync : unit -> Task<SpeciesMonograph seq>
    abstract member GetMedicinalSpeciesAsync : unit -> Task<SpeciesMonograph seq>
    abstract member GetInvasiveSpeciesAsync : unit -> Task<SpeciesMonograph seq>

// IGardenBedRepository - Port for GardenBed persistence
type IGardenBedRepository =
    abstract member GetByIdAsync : GardenBedId -> Task<GardenBed option>
    abstract member GetAllAsync : unit -> Task<GardenBed seq>
    abstract member AddAsync : GardenBed -> Task<GardenBed>
    abstract member UpdateAsync : GardenBed -> Task<GardenBed>
    abstract member DeleteAsync : GardenBedId -> Task<bool>
    abstract member GetActiveBedsAsync : unit -> Task<GardenBed seq>
    abstract member GetBySoilTypeAsync : SoilType -> Task<GardenBed seq>
    abstract member GetByLocationAsync : string -> Task<GardenBed seq>

// ICropBatchRepository - Port for CropBatch persistence
type ICropBatchRepository =
    abstract member GetByIdAsync : CropBatchId -> Task<CropBatch option>
    abstract member GetAllAsync : unit -> Task<CropBatch seq>
    abstract member AddAsync : CropBatch -> Task<CropBatch>
    abstract member UpdateAsync : CropBatch -> Task<CropBatch>
    abstract member DeleteAsync : CropBatchId -> Task<bool>
    abstract member GetBySpeciesIdAsync : SpeciesId -> Task<CropBatch seq>
    abstract member GetByGardenBedIdAsync : GardenBedId -> Task<CropBatch seq>
    abstract member GetByStatusAsync : CropStatus -> Task<CropBatch seq>
    abstract member GetActiveBatchesAsync : unit -> Task<CropBatch seq>
    abstract member GetHarvestableBatchesAsync : unit -> Task<CropBatch seq>

// IFinancialRepository - Port for financial tracking
type IFinancialRepository =
    abstract member GetResourceConsumptionByBatchAsync : CropBatchId -> Task<ResourceConsumption seq>
    abstract member GetLaborRecordsByBatchAsync : CropBatchId -> Task<LaborRecord seq>
    abstract member AddResourceConsumptionAsync : ResourceConsumption -> Task<ResourceConsumption>
    abstract member AddLaborRecordAsync : LaborRecord -> Task<LaborRecord>
    abstract member GetTotalCostByBatchAsync : CropBatchId -> Task<decimal>

// Combined garden repository interface
type IGardenRepository =
    inherit ISpeciesRepository
    inherit ISpeciesMonographRepository
    inherit IGardenBedRepository
    inherit ICropBatchRepository
    inherit IFinancialRepository

// Extension methods for garden repository operations
[<RequireQualifiedAccess>]
module GardenRepository =
    
    // Get species compatible with a garden bed
    let GetCompatibleSpeciesAsync (speciesRepo: ISpeciesRepository) (bed: GardenBed) (season: Season) =
        async {
            let! allSpecies = speciesRepo.GetAllAsync() |> Async.AwaitTask
            return GardenBed.getOptimalSpeciesForBed bed allSpecies season
        }
    
    // Get active batches in a garden bed
    let GetActiveBatchesInBedAsync (batchRepo: ICropBatchRepository) (bedId: GardenBedId) =
        async {
            let! batches = batchRepo.GetByGardenBedIdAsync bedId |> Async.AwaitTask
            return 
                batches
                |> Seq.filter (fun b -> not b.IsCompleted)
                |> Seq.toList
        }
    
    // Calculate total garden value
    let GetTotalGardenValueAsync (batchRepo: ICropBatchRepository) (financialRepo: IFinancialRepository) =
        async {
            let! activeBatches = batchRepo.GetActiveBatchesAsync() |> Async.AwaitTask
            
            let! totalValues = 
                activeBatches
                |> Seq.map (fun batch -> async {
                    let! cost = financialRepo.GetTotalCostByBatchAsync batch.Id |> Async.AwaitTask
                    return (batch.Id, cost)
                })
                |> Async.Sequential
            
            return totalValues |> Seq.sumBy snd
        }
    
    // Get species monographs by USDA zone
    let GetSpeciesMonographsByZoneAsync (monographRepo: ISpeciesMonographRepository) (zone: int) =
        monographRepo.GetSpeciesByUSDAZoneAsync zone |> Async.AwaitTask
    
    // Search species monographs with edible filter
    let SearchEdibleSpeciesMonographsAsync (monographRepo: ISpeciesMonographRepository) (query: string) =
        async {
            let! edibleSpecies = monographRepo.GetEdibleSpeciesAsync() |> Async.AwaitTask
            if String.IsNullOrEmpty(query) then
                return edibleSpecies
            else
                return 
                    edibleSpecies
                    |> Seq.filter (fun m -> 
                        m.Taxonomy.CommonNames |> List.exists (fun name -> name.Contains(query, StringComparison.OrdinalIgnoreCase)) ||
                        m.ScientificName.Contains(query, StringComparison.OrdinalIgnoreCase))
        }
