using LifeOS.Domain.Common;
using LifeOS.Domain.Garden;
using LifeOS.Application.Common;
using Microsoft.FSharp.Core;
using Microsoft.FSharp.Collections;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace LifeOS.Application.Garden
{
    public interface ISpeciesMonographService
    {
        Task<Result<SpeciesMonograph, DomainError>> CreateSpeciesMonographAsync(
            string name,
            string scientificName,
            Kingdom kingdom,
            string family,
            string genus,
            string species);

        Task<Result<SpeciesMonograph, DomainError>> GetSpeciesMonographAsync(SpeciesId id);
        Task<Result<IEnumerable<SpeciesMonograph>, DomainError>> SearchSpeciesMonographsAsync(string query);
        Task<Result<SpeciesMonograph, DomainError>> UpdateTaxonomyAsync(SpeciesId id, Taxonomy taxonomy);
        Task<Result<SpeciesMonograph, DomainError>> AddSourceAsync(SpeciesId id, Source source);
        Task<Result<SpeciesMonograph, DomainError>> AddImageAsync(SpeciesId id, Image image);
        Task<Result<SpeciesMonograph, DomainError>> VerifySpeciesAsync(SpeciesId id, string verifiedBy);
        Task<Result<IEnumerable<SpeciesMonograph>, DomainError>> GetSpeciesByUSDAZoneAsync(int zone);
        Task<Result<IEnumerable<SpeciesMonograph>, DomainError>> GetEdibleSpeciesAsync();
        Task<Result<IEnumerable<SpeciesMonograph>, DomainError>> GetMedicinalSpeciesAsync();
        Task<Result<IEnumerable<SpeciesMonograph>, DomainError>> GetInvasiveSpeciesAsync();
    }

    public class SpeciesMonographService : ISpeciesMonographService
    {
        private readonly IGardenRepository _repository;

        public SpeciesMonographService(IGardenRepository repository)
        {
            _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        }

        public async Task<Result<SpeciesMonograph, DomainError>> CreateSpeciesMonographAsync(
            string name,
            string scientificName,
            Kingdom kingdom,
            string family,
            string genus,
            string species)
        {
            try
            {
                // Validate input
                if (string.IsNullOrWhiteSpace(name))
                {
                    return Result.Error<SpeciesMonograph, DomainError>(
                        DomainError.NewValidationError("Species name is required"));
                }

                if (string.IsNullOrWhiteSpace(scientificName))
                {
                    return Result.Error<SpeciesMonograph, DomainError>(
                        DomainError.NewValidationError("Scientific name is required"));
                }

                // Create new species monograph
                var monograph = SpeciesMonographModule.create(
                    kingdom,
                    string.Empty, // phylum
                    string.Empty, // class
                    string.Empty, // order
                    family,
                    genus,
                    species,
                    ListModule.OfSeq(new[] { name }),
                    ListModule.OfSeq(new List<string>()),
                    // Default values for other fields
                    new BotanicalDescription(
                        lifeForm: string.Empty,
                        height: string.Empty,
                        description: string.Empty),
                    new NativeHabitat(
                        nativeRange: ListModule.OfSeq(new List<string>()),
                        climate: string.Empty,
                        soilConditions: ListModule.OfSeq(new List<string>())),
                    new HorticulturalRequirements(
                        uSDAZones: Tuple.Create(1, 12),
                        waterNeeds: string.Empty,
                        sunRequirements: string.Empty,
                        soilType: ListModule.OfSeq(new List<string>())),
                    new LifeOS.Domain.Garden.UsesAndProperties(
                        FSharpOption<bool>.None,
                        FSharpOption<bool>.None,
                        ListModule.OfSeq(new List<string>()),
                        ListModule.OfSeq(new List<string>()),
                        FSharpOption<LifeOS.Domain.Garden.MedicinalProperties>.None),
                    new ConservationEcology(
                        status: string.Empty,
                        threats: ListModule.OfSeq(new List<string>()),
                        conservation: ListModule.OfSeq(new List<string>())),
                    new CultivationHistory(
                        domesticated: false,
                        history: ListModule.OfSeq(new List<string>()),
                        culturalSignificance: ListModule.OfSeq(new List<string>())),
                    new Metadata(
                        createdAt: System.DateTime.UtcNow,
                        updatedAt: System.DateTime.UtcNow,
                        verifiedBy: null,
                        verificationStatus: VerificationStatus.Pending,
                        sources: ListModule.OfSeq(new List<Source>()),
                        images: ListModule.OfSeq(new List<Image>()),
                        notes: ListModule.OfSeq(new List<string>())));

                // Save to repository
                await _repository.SaveSpeciesMonographAsync(monograph);

                return Result.Ok<SpeciesMonograph, DomainError>(monograph);
            }
            catch (Exception ex)
            {
                return Result.Error<SpeciesMonograph, DomainError>(
                    DomainError.NewValidationError(
                        $"Failed to create species monograph: {ex.Message}")
                );
            }
        }

        public async Task<Result<SpeciesMonograph, DomainError>> GetSpeciesMonographAsync(SpeciesId id)
        {
            try
            {
                var monograph = await _repository.GetSpeciesMonographAsync(id);

                if (!FSharpOption<SpeciesMonograph>.get_IsSome(monograph))
                {
                    return Result.Error<SpeciesMonograph, DomainError>(
                        DomainError.NewNotFoundError($"Species monograph with ID {id} not found"));
                }

                return Result.Ok<SpeciesMonograph, DomainError>(monograph.Value);
            }
            catch (Exception ex)
            {
                return Result.Error<SpeciesMonograph, DomainError>(
                    DomainError.NewValidationError($"Failed to retrieve species monograph: {ex.Message}"));
            }
        }

        public async Task<Result<IEnumerable<SpeciesMonograph>, DomainError>> SearchSpeciesMonographsAsync(string query)
        {
            try
            {
                var monographs = await _repository.SearchSpeciesMonographsAsync(query);
                return Result.Ok<IEnumerable<SpeciesMonograph>, DomainError>(monographs);
            }
            catch (Exception ex)
            {
                return Result.Error<IEnumerable<SpeciesMonograph>, DomainError>(
                    DomainError.NewValidationError($"Failed to search species monographs: {ex.Message}"));
            }
        }

        public async Task<Result<SpeciesMonograph, DomainError>> UpdateTaxonomyAsync(SpeciesId id, Taxonomy taxonomy)
        {
            try
            {
                var monograph = await _repository.GetSpeciesMonographAsync(id);

                if (!FSharpOption<SpeciesMonograph>.get_IsSome(monograph))
                {
                    return Result.Error<SpeciesMonograph, DomainError>(
                        DomainError.NewNotFoundError($"Species monograph with ID {id} not found"));
                }

                // Update taxonomy
                var updatedMonograph = monograph.Value.UpdateTaxonomy(taxonomy);

                // Save changes
                await _repository.SaveSpeciesMonographAsync(updatedMonograph);

                return Result.Ok<SpeciesMonograph, DomainError>(updatedMonograph);
            }
            catch (Exception ex)
            {
                return Result.Error<SpeciesMonograph, DomainError>(
                    DomainError.NewValidationError($"Failed to update taxonomy: {ex.Message}"));
            }
        }

        public async Task<Result<SpeciesMonograph, DomainError>> AddSourceAsync(SpeciesId id, Source source)
        {
            try
            {
                var monograph = await _repository.GetSpeciesMonographAsync(id);

                if (!FSharpOption<SpeciesMonograph>.get_IsSome(monograph))
                {
                    return Result.Error<SpeciesMonograph, DomainError>(
                        DomainError.NewNotFoundError($"Species monograph with ID {id} not found"));
                }

                // Add source
                var updatedMonograph = monograph.Value.AddSource(source);

                // Save changes
                await _repository.SaveSpeciesMonographAsync(updatedMonograph);

                return Result.Ok<SpeciesMonograph, DomainError>(updatedMonograph);
            }
            catch (Exception ex)
            {
                return Result.Error<SpeciesMonograph, DomainError>(
                    DomainError.NewValidationError($"Failed to add source: {ex.Message}"));
            }
        }

        public async Task<Result<SpeciesMonograph, DomainError>> AddImageAsync(SpeciesId id, Image image)
        {
            try
            {
                var monograph = await _repository.GetSpeciesMonographAsync(id);

                if (!FSharpOption<SpeciesMonograph>.get_IsSome(monograph))
                {
                    return Result.Error<SpeciesMonograph, DomainError>(
                        DomainError.NewNotFoundError($"Species monograph with ID {id} not found"));
                }

                // Add image
                var updatedMonograph = monograph.Value.AddImage(image);

                // Save changes
                await _repository.SaveSpeciesMonographAsync(updatedMonograph);

                return Result.Ok<SpeciesMonograph, DomainError>(updatedMonograph);
            }
            catch (Exception ex)
            {
                return Result.Error<SpeciesMonograph, DomainError>(
                    DomainError.NewValidationError($"Failed to add image: {ex.Message}"));
            }
        }

        public async Task<Result<SpeciesMonograph, DomainError>> VerifySpeciesAsync(SpeciesId id, string verifiedBy)
        {
            try
            {
                var monograph = await _repository.GetSpeciesMonographAsync(id);

                if (!FSharpOption<SpeciesMonograph>.get_IsSome(monograph))
                {
                    return Result.Error<SpeciesMonograph, DomainError>(
                        DomainError.NewNotFoundError($"Species monograph with ID {id} not found"));
                }

                // Verify species
                var updatedMonograph = monograph.Value.Verify(verifiedBy);

                // Save changes
                await _repository.SaveSpeciesMonographAsync(updatedMonograph);

                return Result.Ok<SpeciesMonograph, DomainError>(updatedMonograph);
            }
            catch (Exception ex)
            {
                return Result.Error<SpeciesMonograph, DomainError>(
                    DomainError.NewValidationError($"Failed to verify species: {ex.Message}"));
            }
        }

        public async Task<Result<IEnumerable<SpeciesMonograph>, DomainError>> GetSpeciesByUSDAZoneAsync(int zone)
        {
            try
            {
                var monographs = await _repository.GetSpeciesByUSDAZoneAsync(zone);
                return Result.Ok<IEnumerable<SpeciesMonograph>, DomainError>(monographs);
            }
            catch (Exception ex)
            {
                return Result.Error<IEnumerable<SpeciesMonograph>, DomainError>(
                    DomainError.NewValidationError(
                        $"Failed to get species by USDA zone: {ex.Message}")
                );
            }
        }

        public async Task<Result<IEnumerable<SpeciesMonograph>, DomainError>> GetEdibleSpeciesAsync()
        {
            try
            {
                var monographs = await _repository.GetEdibleSpeciesAsync();
                return Result.Ok<IEnumerable<SpeciesMonograph>, DomainError>(monographs);
            }
            catch (Exception ex)
            {
                return Result.Error<IEnumerable<SpeciesMonograph>, DomainError>(
                    DomainError.NewValidationError($"Failed to get edible species: {ex.Message}"));
            }
        }

        public async Task<Result<IEnumerable<SpeciesMonograph>, DomainError>> GetMedicinalSpeciesAsync()
        {
            try
            {
                var monographs = await _repository.GetMedicinalSpeciesAsync();
                return Result.Ok<IEnumerable<SpeciesMonograph>, DomainError>(monographs);
            }
            catch (Exception ex)
            {
                return Result.Error<IEnumerable<SpeciesMonograph>, DomainError>(
                    DomainError.NewValidationError($"Failed to get medicinal species: {ex.Message}"));
            }
        }

        public async Task<Result<IEnumerable<SpeciesMonograph>, DomainError>> GetInvasiveSpeciesAsync()
        {
            try
            {
                var monographs = await _repository.GetInvasiveSpeciesAsync();
                return Result.Ok<IEnumerable<SpeciesMonograph>, DomainError>(monographs);
            }
            catch (Exception ex)
            {
                return Result.Error<IEnumerable<SpeciesMonograph>, DomainError>(
                    DomainError.NewValidationError($"Failed to get invasive species: {ex.Message}"));
            }
        }
    }
}
