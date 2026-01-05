using System.Linq;
using System.Threading.Tasks;
using LifeOS.Application.Garden;
using LifeOS.Domain.Common;
using LifeOS.Domain.Garden;
using LifeOS.Infrastructure.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.FSharp.Collections;
using Microsoft.FSharp.Core;

namespace LifeOS.API.Garden
{
    // Taxonomic classification enums to match F# discriminated unions
    public enum Kingdom
    {
        Plant,
        Fungi,
        Protista,
        Bacteria,
        Archaea,
    }

    internal static class DomainErrorApi
    {
        public static string Message(DomainError error) => error switch
        {
            DomainError.ValidationError msg => msg.Item,
            DomainError.NotFoundError msg => msg.Item,
            DomainError.BusinessRuleViolation msg => msg.Item,
            DomainError.ConcurrencyError msg => msg.Item,
            _ => "Unknown error",
        };

        public static bool IsNotFound(DomainError error) => error is DomainError.NotFoundError;
    }

    [ApiController]
    [Route("api/v1/garden/species-monograph")]
    public class SpeciesMonographController : ControllerBase
    {
        private readonly ISpeciesMonographService _speciesMonographService;

        public SpeciesMonographController(ISpeciesMonographService speciesMonographService)
        {
            _speciesMonographService =
                speciesMonographService
                ?? throw new ArgumentNullException(nameof(speciesMonographService));
        }

        [HttpPost]
        public async Task<ActionResult<SpeciesMonographDto>> CreateSpeciesMonograph(
            [FromBody] CreateSpeciesMonographRequest request
        )
        {
            var result = await _speciesMonographService.CreateSpeciesMonographAsync(
                request.Name,
                request.ScientificName,
                FSharpInterop.ToFSharpKingdom(request.Kingdom),
                request.Family,
                request.Genus,
                request.Species
            );

            if (result.IsError)
            {
                return BadRequest(new { error = DomainErrorApi.Message(result.Error) });
            }

            var monograph = result.Value;
            return CreatedAtAction(
                nameof(GetSpeciesMonograph),
                new { id = monograph.Id.Value },
                SpeciesMonographDto.FromDomain(monograph)
            );
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<SpeciesMonographDto>> GetSpeciesMonograph(Guid id)
        {
            var speciesId = SpeciesId.FromGuid(id);
            var result = await _speciesMonographService.GetSpeciesMonographAsync(speciesId);

            if (result.IsError)
            {
                if (DomainErrorApi.IsNotFound(result.Error))
                {
                    return NotFound(new { error = DomainErrorApi.Message(result.Error) });
                }
                return BadRequest(new { error = DomainErrorApi.Message(result.Error) });
            }

            return Ok(SpeciesMonographDto.FromDomain(result.Value));
        }

        [HttpGet]
        public async Task<
            ActionResult<IEnumerable<SpeciesMonographSummaryDto>>
        > SearchSpeciesMonographs([FromQuery] string query = "")
        {
            var result = await _speciesMonographService.SearchSpeciesMonographsAsync(query);

            if (result.IsError)
            {
                return BadRequest(new { error = DomainErrorApi.Message(result.Error) });
            }

            var summaries = new List<SpeciesMonographSummaryDto>();
            foreach (var monograph in result.Value)
            {
                summaries.Add(SpeciesMonographSummaryDto.FromDomain(monograph));
            }

            return Ok(summaries);
        }

        [HttpPut("{id}/taxonomy")]
        public async Task<ActionResult<SpeciesMonographDto>> UpdateTaxonomy(
            Guid id,
            [FromBody] TaxonomyDto taxonomyDto
        )
        {
            var speciesId = SpeciesId.FromGuid(id);
            var taxonomy = TaxonomyDto.ToDomain(taxonomyDto);

            var result = await _speciesMonographService.UpdateTaxonomyAsync(speciesId, taxonomy);

            if (result.IsError)
            {
                if (DomainErrorApi.IsNotFound(result.Error))
                {
                    return NotFound(new { error = DomainErrorApi.Message(result.Error) });
                }
                return BadRequest(new { error = DomainErrorApi.Message(result.Error) });
            }

            return Ok(SpeciesMonographDto.FromDomain(result.Value));
        }

        [HttpPost("{id}/sources")]
        public async Task<ActionResult<SpeciesMonographDto>> AddSource(
            Guid id,
            [FromBody] SourceDto sourceDto
        )
        {
            var speciesId = SpeciesId.FromGuid(id);
            var source = SourceDto.ToDomain(sourceDto);

            var result = await _speciesMonographService.AddSourceAsync(speciesId, source);

            if (result.IsError)
            {
                if (DomainErrorApi.IsNotFound(result.Error))
                {
                    return NotFound(new { error = DomainErrorApi.Message(result.Error) });
                }
                return BadRequest(new { error = DomainErrorApi.Message(result.Error) });
            }

            return Ok(SpeciesMonographDto.FromDomain(result.Value));
        }

        [HttpPost("{id}/images")]
        public async Task<ActionResult<SpeciesMonographDto>> AddImage(
            Guid id,
            [FromBody] ImageDto imageDto
        )
        {
            var speciesId = SpeciesId.FromGuid(id);
            var image = ImageDto.ToDomain(imageDto);

            var result = await _speciesMonographService.AddImageAsync(speciesId, image);

            if (result.IsError)
            {
                if (DomainErrorApi.IsNotFound(result.Error))
                {
                    return NotFound(new { error = DomainErrorApi.Message(result.Error) });
                }
                return BadRequest(new { error = DomainErrorApi.Message(result.Error) });
            }

            return Ok(SpeciesMonographDto.FromDomain(result.Value));
        }

        [HttpPost("{id}/verify")]
        public async Task<ActionResult<SpeciesMonographDto>> VerifySpecies(
            Guid id,
            [FromBody] VerifySpeciesRequest request
        )
        {
            var speciesId = SpeciesId.FromGuid(id);

            var result = await _speciesMonographService.VerifySpeciesAsync(
                speciesId,
                request.VerifiedBy
            );

            if (result.IsError)
            {
                if (DomainErrorApi.IsNotFound(result.Error))
                {
                    return NotFound(new { error = DomainErrorApi.Message(result.Error) });
                }
                return BadRequest(new { error = DomainErrorApi.Message(result.Error) });
            }

            return Ok(SpeciesMonographDto.FromDomain(result.Value));
        }

        [HttpGet("by-zone/{zone}")]
        public async Task<
            ActionResult<IEnumerable<SpeciesMonographSummaryDto>>
        > GetSpeciesByUSDAZone(int zone)
        {
            var result = await _speciesMonographService.GetSpeciesByUSDAZoneAsync(zone);

            if (result.IsError)
            {
                return BadRequest(new { error = DomainErrorApi.Message(result.Error) });
            }

            var summaries = new List<SpeciesMonographSummaryDto>();
            foreach (var monograph in result.Value)
            {
                summaries.Add(SpeciesMonographSummaryDto.FromDomain(monograph));
            }

            return Ok(summaries);
        }

        [HttpGet("edible")]
        public async Task<ActionResult<IEnumerable<SpeciesMonographSummaryDto>>> GetEdibleSpecies()
        {
            var result = await _speciesMonographService.GetEdibleSpeciesAsync();

            if (result.IsError)
            {
                return BadRequest(new { error = DomainErrorApi.Message(result.Error) });
            }

            var summaries = new List<SpeciesMonographSummaryDto>();
            foreach (var monograph in result.Value)
            {
                summaries.Add(SpeciesMonographSummaryDto.FromDomain(monograph));
            }

            return Ok(summaries);
        }

        [HttpGet("medicinal")]
        public async Task<
            ActionResult<IEnumerable<SpeciesMonographSummaryDto>>
        > GetMedicinalSpecies()
        {
            var result = await _speciesMonographService.GetMedicinalSpeciesAsync();

            if (result.IsError)
            {
                return BadRequest(new { error = DomainErrorApi.Message(result.Error) });
            }

            var summaries = new List<SpeciesMonographSummaryDto>();
            foreach (var monograph in result.Value)
            {
                summaries.Add(SpeciesMonographSummaryDto.FromDomain(monograph));
            }

            return Ok(summaries);
        }

        [HttpGet("invasive")]
        public async Task<
            ActionResult<IEnumerable<SpeciesMonographSummaryDto>>
        > GetInvasiveSpecies()
        {
            var result = await _speciesMonographService.GetInvasiveSpeciesAsync();

            if (result.IsError)
            {
                return BadRequest(new { error = DomainErrorApi.Message(result.Error) });
            }

            var summaries = new List<SpeciesMonographSummaryDto>();
            foreach (var monograph in result.Value)
            {
                summaries.Add(SpeciesMonographSummaryDto.FromDomain(monograph));
            }

            return Ok(summaries);
        }
    }

    // DTOs for API requests and responses

    public class CreateSpeciesMonographRequest
    {
        public string Name { get; set; } = string.Empty;
        public string ScientificName { get; set; } = string.Empty;
        public Kingdom Kingdom { get; set; }
        public string Family { get; set; } = string.Empty;
        public string Genus { get; set; } = string.Empty;
        public string Species { get; set; } = string.Empty;
    }

    public class VerifySpeciesRequest
    {
        public string VerifiedBy { get; set; } = string.Empty;
    }

    public class SpeciesMonographDto
    {
        public Guid Id { get; set; }
        public TaxonomyDto Taxonomy { get; set; } = new();
        public BotanicalDescriptionDto BotanicalDescription { get; set; } = new();
        public NativeHabitatDto NativeHabitat { get; set; } = new();
        public HorticulturalRequirementsDto HorticulturalRequirements { get; set; } = new();
        public UsesAndPropertiesDto UsesAndProperties { get; set; } = new();
        public ConservationEcologyDto ConservationEcology { get; set; } = new();
        public CultivationHistoryDto CultivationHistory { get; set; } = new();
        public MetadataDto Metadata { get; set; } = new();

        public static SpeciesMonographDto FromDomain(SpeciesMonograph monograph)
        {
            return new SpeciesMonographDto
            {
                Id = monograph.Id.Value,
                Taxonomy = TaxonomyDto.FromDomain(monograph.Taxonomy),
                BotanicalDescription = BotanicalDescriptionDto.FromDomain(
                    monograph.BotanicalDescription
                ),
                NativeHabitat = NativeHabitatDto.FromDomain(monograph.NativeHabitat),
                HorticulturalRequirements = HorticulturalRequirementsDto.FromDomain(
                    monograph.HorticulturalRequirements
                ),
                UsesAndProperties = UsesAndPropertiesDto.FromDomain(monograph.UsesAndProperties),
                ConservationEcology = ConservationEcologyDto.FromDomain(
                    monograph.ConservationEcology
                ),
                CultivationHistory = CultivationHistoryDto.FromDomain(monograph.CultivationHistory),
                Metadata = MetadataDto.FromDomain(monograph.Metadata),
            };
        }
    }

    public class SpeciesMonographSummaryDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string ScientificName { get; set; } = string.Empty;
        public string Family { get; set; } = string.Empty;
        public string PrimaryCommonName { get; set; } = string.Empty;
        public bool IsEdible { get; set; }
        public bool IsMedicinal { get; set; }
        public bool IsInvasive { get; set; }
        public (int Min, int Max) USDAZoneRange { get; set; }
        public VerificationStatus VerificationStatus { get; set; } = default!;

        public static SpeciesMonographSummaryDto FromDomain(SpeciesMonograph monograph)
        {
            return new SpeciesMonographSummaryDto
            {
                Id = monograph.Id.Value,
                Name = monograph.Taxonomy.CommonNames.FirstOrDefault() ?? "",
                ScientificName = monograph.ScientificName,
                Family = monograph.Taxonomy.Family,
                PrimaryCommonName = monograph.PrimaryCommonName,
                IsEdible = monograph.IsEdible,
                IsMedicinal = monograph.IsMedicinal,
                IsInvasive = monograph.IsInvasive,
                USDAZoneRange = (monograph.USDAZoneRange.Item1, monograph.USDAZoneRange.Item2),
                VerificationStatus = monograph.Metadata.VerificationStatus,
            };
        }
    }

    // Additional DTO classes would be implemented here for all the complex types
    // For brevity, I'm showing the key ones. In a real implementation, you would need:
    // - TaxonomyDto
    // - BotanicalDescriptionDto
    // - NativeHabitatDto
    // - HorticulturalRequirementsDto
    // - UsesAndPropertiesDto
    // - ConservationEcologyDto
    // - CultivationHistoryDto
    // - MetadataDto
    // - SourceDto
    // - ImageDto
    // And all their nested types...

    public class TaxonomyDto
    {
        public Kingdom Kingdom { get; set; }
        public string Phylum { get; set; } = string.Empty;
        public string Class { get; set; } = string.Empty;
        public string TaxonomicOrder { get; set; } = string.Empty;
        public string Family { get; set; } = string.Empty;
        public string Genus { get; set; } = string.Empty;
        public string Species { get; set; } = string.Empty;
        public string? Subspecies { get; set; }
        public string? Variety { get; set; }
        public string? Cultivar { get; set; }
        public List<string> CommonNames { get; set; } = new();
        public List<string> ScientificSynonyms { get; set; } = new();

        public static TaxonomyDto FromDomain(LifeOS.Domain.Garden.Taxonomy taxonomy)
        {
            return new TaxonomyDto
            {
                Kingdom = Enum.Parse<Kingdom>(FSharpInterop.KingdomToCSharpString(taxonomy.Kingdom)),
                Phylum = taxonomy.Phylum,
                Class = taxonomy.Class,
                TaxonomicOrder = taxonomy.Order,
                Family = taxonomy.Family,
                Genus = taxonomy.Genus,
                Species = taxonomy.Species,
                Subspecies = FSharpInterop.ToNullable(taxonomy.Subspecies),
                Variety = FSharpInterop.ToNullable(taxonomy.Variety),
                Cultivar = FSharpInterop.ToNullable(taxonomy.Cultivar),
                CommonNames = taxonomy.CommonNames.ToList(),
                ScientificSynonyms = taxonomy.ScientificSynonyms.ToList(),
            };
        }

        public static LifeOS.Domain.Garden.Taxonomy ToDomain(TaxonomyDto dto)
        {
            return new LifeOS.Domain.Garden.Taxonomy(
                FSharpInterop.ToFSharpKingdom(dto.Kingdom),
                dto.Phylum,
                dto.Class,
                dto.TaxonomicOrder,
                dto.Family,
                dto.Genus,
                dto.Species,
                FSharpInterop.ToFSharpOption(dto.Subspecies),
                FSharpInterop.ToFSharpOption(dto.Variety),
                FSharpInterop.ToFSharpOption(dto.Cultivar),
                FSharpInterop.ToFSharpList(dto.CommonNames),
                FSharpInterop.ToFSharpList(dto.ScientificSynonyms)
            );
        }
    }

    // Placeholder DTO classes - in a real implementation these would be fully implemented
    public class BotanicalDescriptionDto
    {
        public string LifeForm { get; set; } = string.Empty;
        public string Height { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;

        public static BotanicalDescriptionDto FromDomain(
            LifeOS.Domain.Garden.BotanicalDescription description
        )
        {
            return new BotanicalDescriptionDto
            {
                LifeForm = description.LifeForm,
                Height = description.Height,
                Description = description.Description,
            };
        }

        public static LifeOS.Domain.Garden.BotanicalDescription ToDomain(
            BotanicalDescriptionDto dto
        ) => new(dto.LifeForm, dto.Height, dto.Description);
    }

    public class NativeHabitatDto
    {
        public List<string> NativeRange { get; set; } = new();
        public string Climate { get; set; } = string.Empty;
        public List<string> SoilConditions { get; set; } = new();

        public static NativeHabitatDto FromDomain(LifeOS.Domain.Garden.NativeHabitat habitat) =>
            new()
            {
                NativeRange = habitat.NativeRange.ToList(),
                Climate = habitat.Climate,
                SoilConditions = habitat.SoilConditions.ToList(),
            };

        public static LifeOS.Domain.Garden.NativeHabitat ToDomain(NativeHabitatDto dto) =>
            new(
                FSharpInterop.ToFSharpList(dto.NativeRange),
                dto.Climate,
                FSharpInterop.ToFSharpList(dto.SoilConditions)
            );
    }

    public class HorticulturalRequirementsDto
    {
        public (int Min, int Max) USDAZones { get; set; }
        public string WaterNeeds { get; set; } = string.Empty;
        public string SunRequirements { get; set; } = string.Empty;
        public List<string> SoilType { get; set; } = new();

        public static HorticulturalRequirementsDto FromDomain(
            LifeOS.Domain.Garden.HorticulturalRequirements requirements
        )
        {
            return new HorticulturalRequirementsDto
            {
                USDAZones = (requirements.USDAZones.Item1, requirements.USDAZones.Item2),
                WaterNeeds = requirements.WaterNeeds,
                SunRequirements = requirements.SunRequirements,
                SoilType = requirements.SoilType.ToList(),
            };
        }

        public static LifeOS.Domain.Garden.HorticulturalRequirements ToDomain(
            HorticulturalRequirementsDto dto
        )
        {
            return new LifeOS.Domain.Garden.HorticulturalRequirements(
                Tuple.Create(dto.USDAZones.Min, dto.USDAZones.Max),
                dto.WaterNeeds,
                dto.SunRequirements,
                FSharpInterop.ToFSharpList(dto.SoilType)
            );
        }
    }

    public class UsesAndPropertiesDto
    {
        public bool? Edible { get; set; }
        public bool? Medicinal { get; set; }
        public List<string> Culinary { get; set; } = new();
        public List<string> Traditional { get; set; } = new();

        public static UsesAndPropertiesDto FromDomain(
            LifeOS.Domain.Garden.UsesAndProperties properties
        )
        {
            return new UsesAndPropertiesDto
            {
                Edible = FSharpInterop.ToNullable(properties.Edible),
                Medicinal = FSharpInterop.ToNullable(properties.Medicinal),
                Culinary = properties.Culinary.ToList(),
                Traditional = properties.Traditional.ToList(),
            };
        }

        public static LifeOS.Domain.Garden.UsesAndProperties ToDomain(UsesAndPropertiesDto dto)
        {
            return new LifeOS.Domain.Garden.UsesAndProperties(
                dto.Edible.HasValue ? FSharpOption<bool>.Some(dto.Edible.Value) : FSharpOption<bool>.None,
                dto.Medicinal.HasValue ? FSharpOption<bool>.Some(dto.Medicinal.Value) : FSharpOption<bool>.None,
                FSharpInterop.ToFSharpList(dto.Culinary),
                FSharpInterop.ToFSharpList(dto.Traditional),
                FSharpOption<LifeOS.Domain.Garden.MedicinalProperties>.None
            );
        }
    }

    public class ConservationEcologyDto
    {
        public string Status { get; set; } = string.Empty;
        public List<string> Threats { get; set; } = new();
        public List<string> Conservation { get; set; } = new();

        public static ConservationEcologyDto FromDomain(
            LifeOS.Domain.Garden.ConservationEcology ecology
        )
        {
            return new ConservationEcologyDto
            {
                Status = ecology.Status,
                Threats = ecology.Threats.ToList(),
                Conservation = ecology.Conservation.ToList(),
            };
        }

        public static LifeOS.Domain.Garden.ConservationEcology ToDomain(ConservationEcologyDto dto)
        {
            return new LifeOS.Domain.Garden.ConservationEcology(
                dto.Status,
                FSharpInterop.ToFSharpList(dto.Threats),
                FSharpInterop.ToFSharpList(dto.Conservation)
            );
        }
    }

    public class CultivationHistoryDto
    {
        public bool Domesticated { get; set; }
        public List<string> History { get; set; } = new();
        public List<string> CulturalSignificance { get; set; } = new();

        public static CultivationHistoryDto FromDomain(
            LifeOS.Domain.Garden.CultivationHistory history
        )
        {
            return new CultivationHistoryDto
            {
                Domesticated = history.Domesticated,
                History = history.History.ToList(),
                CulturalSignificance = history.CulturalSignificance.ToList(),
            };
        }

        public static LifeOS.Domain.Garden.CultivationHistory ToDomain(CultivationHistoryDto dto)
        {
            return new LifeOS.Domain.Garden.CultivationHistory(
                dto.Domesticated,
                FSharpInterop.ToFSharpList(dto.History),
                FSharpInterop.ToFSharpList(dto.CulturalSignificance)
            );
        }
    }

    public class MetadataDto
    {
        public System.DateTime CreatedAt { get; set; }
        public System.DateTime UpdatedAt { get; set; }
        public string? VerifiedBy { get; set; }
        public VerificationStatus VerificationStatus { get; set; } = default!;
        public List<SourceDto> Sources { get; set; } = new();
        public List<ImageDto> Images { get; set; } = new();
        public List<string> Notes { get; set; } = new();

        public static MetadataDto FromDomain(LifeOS.Domain.Garden.Metadata metadata)
        {
            return new MetadataDto
            {
                CreatedAt = metadata.CreatedAt,
                UpdatedAt = metadata.UpdatedAt,
                VerifiedBy = FSharpInterop.ToNullable(metadata.VerifiedBy),
                VerificationStatus = metadata.VerificationStatus,
                Sources = metadata.Sources.Select(SourceDto.FromDomain).ToList(),
                Images = metadata.Images.Select(ImageDto.FromDomain).ToList(),
                Notes = metadata.Notes.ToList(),
            };
        }
    }

    public class SourceDto
    {
        public SourceType Type { get; set; } = default!;
        public string Title { get; set; } = string.Empty;
        public string Author { get; set; } = string.Empty;
        public int Year { get; set; }
        public string? Url { get; set; }
        public string? Doi { get; set; }

        public static SourceDto FromDomain(LifeOS.Domain.Garden.Source source)
        {
            return new SourceDto
            {
                Type = source.Type,
                Title = source.Title,
                Author = source.Author,
                Year = source.Year,
                Url = FSharpInterop.ToNullable(source.Url),
                Doi = FSharpInterop.ToNullable(source.Doi),
            };
        }

        public static LifeOS.Domain.Garden.Source ToDomain(SourceDto dto)
        {
            return new LifeOS.Domain.Garden.Source(
                dto.Type,
                dto.Title,
                dto.Author,
                dto.Year,
                FSharpInterop.ToFSharpOption(dto.Url),
                FSharpInterop.ToFSharpOption(dto.Doi)
            );
        }
    }

    public class ImageDto
    {
        public ImageType Type { get; set; } = default!;
        public string Url { get; set; } = string.Empty;
        public string Caption { get; set; } = string.Empty;
        public string? Photographer { get; set; }
        public string License { get; set; } = string.Empty;

        public static ImageDto FromDomain(LifeOS.Domain.Garden.Image image)
        {
            return new ImageDto
            {
                Type = image.Type,
                Url = image.Url,
                Caption = image.Caption,
                Photographer = FSharpInterop.ToNullable(image.Photographer),
                License = image.License,
            };
        }

        public static LifeOS.Domain.Garden.Image ToDomain(ImageDto dto)
        {
            return new LifeOS.Domain.Garden.Image(
                dto.Type,
                dto.Url,
                dto.Caption,
                FSharpInterop.ToFSharpOption(dto.Photographer),
                dto.License
            );
        }
    }
}
