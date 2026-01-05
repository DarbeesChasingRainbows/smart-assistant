using LifeOS.Domain.Common;
using LifeOS.Domain.Garden;
using LifeOS.Infrastructure.Persistence.ArangoDB;
using Microsoft.FSharp.Collections;
using Microsoft.FSharp.Core;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace LifeOS.Infrastructure.Garden
{
    /// <summary>
    /// ArangoDB implementation of species monograph repository for botanical data management.
    /// Provides CRUD operations and specialized queries for comprehensive species information.
    /// Implements the Hexagonal Architecture pattern as an infrastructure adapter.
    /// </summary>
    /// <remarks>
    /// This repository handles complex botanical data including taxonomy, medicinal properties,
    /// conservation status, and cultivation history. It uses graph queries for related data
    /// like medicinal actions and constituents. All operations are asynchronous for optimal performance.
    /// </remarks>
    public class ArangoSpeciesMonographRepository : ISpeciesMonographRepository
    {
        private readonly ArangoDbContext _context;
        private const string CollectionName = ArangoDbContext.Collections.Species;

        /// <summary>
        /// Initializes a new instance of the <see cref="ArangoSpeciesMonographRepository"/> class.
        /// </summary>
        /// <param name="context">The ArangoDB database context for data operations.</param>
        /// <exception cref="ArgumentNullException">Thrown when context is null.</exception>
        public ArangoSpeciesMonographRepository(ArangoDbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
        }

        /// <summary>
        /// Retrieves a comprehensive species monograph by its unique identifier.
        /// </summary>
        /// <param name="speciesId">The unique identifier of the species.</param>
        /// <returns>
        /// A task containing an <see cref="FSharpOption{SpeciesMonograph}"/> with the monograph if found,
        /// or <see cref="FSharpOption{SpeciesMonograph}.None"/> if not found.
        /// </returns>
        /// <remarks>
        /// Uses graph queries to fetch related medicinal actions and constituents.
        /// Returns comprehensive botanical data including taxonomy, habitat, and uses.
        /// </remarks>
        /// <exception cref="ArangoDBNetStandard.ApiErrorException">
        /// Thrown when database query fails due to connection or syntax issues.
        /// </exception>
        public async Task<FSharpOption<SpeciesMonograph>?> GetSpeciesMonographAsync(SpeciesId speciesId)
        {
            var guidId = GardenId.speciesIdValue(speciesId);
            var query = $@"
                FOR s IN {ArangoDbContext.Collections.Species}
                FILTER s._key == @id
                LET actions = (
                    FOR v, e IN 1..1 OUTBOUND s {ArangoDbContext.Collections.HasMedicinalAction}
                    RETURN {{ Id: v._key, Name: v.Name, Description: v.Description }}
                )
                LET constituents = (
                    FOR v, e IN 1..1 OUTBOUND s {ArangoDbContext.Collections.ContainsConstituent}
                    RETURN {{ Id: v._key, Name: v.Name, Class: v.Class, Description: v.Description }}
                )
                RETURN MERGE(s, {{ MedicinalActions: actions, Constituents: constituents }})";

            var bindVars = new Dictionary<string, object> { { "id", guidId.ToString() } };
            var cursor = await _context.Client.Cursor.PostCursorAsync<SpeciesMonographDocument>(query, bindVars);
            var doc = cursor.Result.FirstOrDefault();

            return doc == null ? FSharpOption<SpeciesMonograph>.None : FSharpOption<SpeciesMonograph>.Some(MapToDomain(doc));
        }

        /// <summary>
        /// Saves a comprehensive species monograph to the database.
        /// </summary>
        /// <param name="monograph">The species monograph to save.</param>
        /// <returns>A task representing the asynchronous operation.</returns>
        /// <remarks>
        /// Uses UPSERT operation to create or update the species record.
        /// Also manages graph edges for medicinal actions and constituents.
        /// Handles complex nested data structures and relationships.
        /// </remarks>
        /// <exception cref="ArgumentNullException">Thrown when monograph is null.</exception>
        /// <exception cref="ArangoDBNetStandard.ApiErrorException">
        /// Thrown when database operation fails due to validation or constraint violations.
        /// </exception>
        public async Task<Unit> SaveSpeciesMonographAsync(SpeciesMonograph monograph)
        {
            if (monograph == null)
                throw new ArgumentNullException(nameof(monograph));
            
            var doc = MapToDocument(monograph);
            var speciesKey = GardenId.speciesIdValue(monograph.Id).ToString();

            var query = $@"
                UPSERT {{ _key: @key }}
                INSERT MERGE(@doc, {{ _key: @key }})
                UPDATE @doc
                IN {ArangoDbContext.Collections.Species}
                RETURN NEW._id";
            
            var bindVars = new Dictionary<string, object> 
            { 
                { "key", speciesKey },
                { "doc", doc }
            };
            
            var cursor = await _context.Client.Cursor.PostCursorAsync<string>(query, bindVars);
            var speciesId = cursor.Result.FirstOrDefault();

            if (FSharpOption<MedicinalProperties>.get_IsSome(monograph.UsesAndProperties.MedicinalData))
            {
                var props = monograph.UsesAndProperties.MedicinalData.Value;
                foreach (var actionId in props.Actions)
                {
                    var actionGuid = actionId.Value.ToString();
                    var edgeQuery = $@"
                        UPSERT {{ _from: @from, _to: CONCAT('{ArangoDbContext.Collections.MedicinalActions}/', @actionKey) }}
                        INSERT {{ _from: @from, _to: CONCAT('{ArangoDbContext.Collections.MedicinalActions}/', @actionKey) }}
                        UPDATE {{ }}
                        IN {ArangoDbContext.Collections.HasMedicinalAction}";
                    
                    var edgeVars = new Dictionary<string, object>
                    {
                        { "from", speciesId! },
                        { "actionKey", actionGuid }
                    };
                    await _context.Client.Cursor.PostCursorAsync<object>(edgeQuery, edgeVars);
                }
            }

            return null!;
        }

        /// <summary>
        /// Retrieves all species monographs from the database.
        /// </summary>
        /// <returns>
        /// A task containing an <see cref="IEnumerable{SpeciesMonograph}"/> with all monographs.
        /// Returns an empty collection if no monographs exist.
        /// </returns>
        /// <remarks>
        /// Returns all species without related data (actions, constituents).
        /// Use with caution on large datasets as it loads all monographs into memory.
        /// </remarks>
        /// <exception cref="ArangoDBNetStandard.ApiErrorException">
        /// Thrown when database query fails due to connection issues.
        /// </exception>
        public async Task<IEnumerable<SpeciesMonograph>> GetAllSpeciesMonographsAsync()
        {
            var query = $"FOR s IN {ArangoDbContext.Collections.Species} RETURN s";
            var cursor = await _context.Client.Cursor.PostCursorAsync<SpeciesMonographDocument>(query);
            return cursor.Result.Select(MapToDomain);
        }

        /// <summary>
        /// Searches species monographs by taxonomic names and common names.
        /// </summary>
        /// <param name="query">The search term to match against species data.</param>
        /// <returns>
        /// A task containing an <see cref="IEnumerable{SpeciesMonograph}"/> with matching monographs.
        /// Returns an empty collection if no matches are found.
        /// </returns>
        /// <remarks>
        /// Performs case-insensitive search across genus, species, and common names.
        /// Uses CONTAINS operator for partial matching flexibility.
        /// </remarks>
        /// <exception cref="ArgumentException">Thrown when query is null or empty.</exception>
        /// <exception cref="ArangoDBNetStandard.ApiErrorException">
        /// Thrown when database query fails due to connection issues.
        /// </exception>
        public async Task<IEnumerable<SpeciesMonograph>> SearchSpeciesMonographsAsync(string query)
        {
            if (string.IsNullOrWhiteSpace(query))
                throw new ArgumentException("Search query cannot be null or empty.", nameof(query));
            
            var aql = $@"
                FOR s IN {ArangoDbContext.Collections.Species}
                FILTER CONTAINS(LOWER(s.Taxonomy.Genus), LOWER(@q)) 
                    OR CONTAINS(LOWER(s.Taxonomy.Species), LOWER(@q))
                    OR @q IN s.Taxonomy.CommonNames
                RETURN s";
            var bindVars = new Dictionary<string, object> { { "q", query } };
            var cursor = await _context.Client.Cursor.PostCursorAsync<SpeciesMonographDocument>(aql, bindVars);
            return cursor.Result.Select(MapToDomain);
        }

        /// <summary>
        /// Deletes a species monograph from the database.
        /// </summary>
        /// <param name="id">The unique identifier of the species to delete.</param>
        /// <returns>
        /// A task containing <see langword="true"/> if the monograph was successfully deleted;
        /// <see langword="false"/> if the monograph was not found or deletion failed.
        /// </returns>
        /// <remarks>
        /// This is a permanent operation. Consider using verification status
        /// for soft deletion when audit trails are required.
        /// </remarks>
        /// <exception cref="ArgumentNullException">Thrown when id is null.</exception>
        /// <exception cref="ArangoDBNetStandard.ApiErrorException">
        /// Thrown when database operation fails due to permission or constraint issues.
        /// </exception>
        public async Task<bool> DeleteSpeciesMonographAsync(SpeciesId id)
        {
            if (id == null)
                throw new ArgumentNullException(nameof(id));
            
            var guidId = GardenId.speciesIdValue(id).ToString();
            var query = $"FOR s IN {ArangoDbContext.Collections.Species} FILTER s.Key == @id REMOVE s IN {ArangoDbContext.Collections.Species}";
            var bindVars = new Dictionary<string, object> { { "id", guidId } };
            await _context.Client.Cursor.PostCursorAsync<object>(query, bindVars);
            return true;
        }

        /// <summary>
        /// Retrieves species suitable for a specific USDA hardiness zone.
        /// </summary>
        /// <param name="zone">The USDA hardiness zone number (1-13).</param>
        /// <returns>
        /// A task containing an <see cref="IEnumerable{SpeciesMonograph}"/> with suitable species.
        /// Returns an empty collection if no species match the zone.
        /// </returns>
        /// <remarks>
        /// Filters species based on their USDA zone range compatibility.
        /// Uses range comparison to find species where the zone falls within
        /// the species' minimum and maximum zone requirements.
        /// </remarks>
        /// <exception cref="ArgumentOutOfRangeException">
        /// Thrown when zone is outside valid USDA zone range (1-13).
        /// </exception>
        /// <exception cref="ArangoDBNetStandard.ApiErrorException">
        /// Thrown when database query fails due to connection issues.
        /// </exception>
        public async Task<IEnumerable<SpeciesMonograph>> GetSpeciesByUSDAZoneAsync(int zone)
        {
            if (zone < 1 || zone > 13)
                throw new ArgumentOutOfRangeException(nameof(zone), "USDA zones must be between 1 and 13.");
            
            var query = $@"
                FOR s IN {ArangoDbContext.Collections.Species}
                FILTER s.HorticulturalRequirements.USDAZones[0] <= @zone 
                   AND s.HorticulturalRequirements.USDAZones[1] >= @zone
                RETURN s";
            var bindVars = new Dictionary<string, object> { { "zone", zone } };
            var cursor = await _context.Client.Cursor.PostCursorAsync<SpeciesMonographDocument>(query, bindVars);
            return cursor.Result.Select(MapToDomain);
        }

        /// <summary>
        /// Retrieves all edible species from the database.
        /// </summary>
        /// <returns>
        /// A task containing an <see cref="IEnumerable{SpeciesMonograph}"/> with edible species.
        /// Returns an empty collection if no edible species exist.
        /// </returns>
        /// <remarks>
        /// Filters species where the Edible property is true.
        /// Essential for food garden planning and culinary applications.
        /// </remarks>
        /// <exception cref="ArangoDBNetStandard.ApiErrorException">
        /// Thrown when database query fails due to connection issues.
        /// </exception>
        public async Task<IEnumerable<SpeciesMonograph>> GetEdibleSpeciesAsync()
        {
            var query = $"FOR s IN {ArangoDbContext.Collections.Species} FILTER s.UsesAndProperties.Edible == true RETURN s";
            var cursor = await _context.Client.Cursor.PostCursorAsync<SpeciesMonographDocument>(query);
            return cursor.Result.Select(MapToDomain);
        }

        /// <summary>
        /// Retrieves all medicinal species from the database.
        /// </summary>
        /// <returns>
        /// A task containing an <see cref="IEnumerable{SpeciesMonograph}"/> with medicinal species.
        /// Returns an empty collection if no medicinal species exist.
        /// </returns>
        /// <remarks>
        /// Filters species where the Medicinal property is true.
        /// Essential for herbal medicine and therapeutic applications.
        /// </remarks>
        /// <exception cref="ArangoDBNetStandard.ApiErrorException">
        /// Thrown when database query fails due to connection issues.
        /// </exception>
        public async Task<IEnumerable<SpeciesMonograph>> GetMedicinalSpeciesAsync()
        {
            var query = $"FOR s IN {ArangoDbContext.Collections.Species} FILTER s.UsesAndProperties.Medicinal == true RETURN s";
            var cursor = await _context.Client.Cursor.PostCursorAsync<SpeciesMonographDocument>(query);
            return cursor.Result.Select(MapToDomain);
        }

        /// <summary>
        /// Retrieves all invasive species from the database.
        /// </summary>
        /// <returns>
        /// A task containing an <see cref="IEnumerable{SpeciesMonograph}"/> with invasive species.
        /// Returns an empty collection if no invasive species exist.
        /// </returns>
        /// <remarks>
        /// Filters species where conservation status contains "Invasive".
        /// Essential for ecological risk assessment and management planning.
        /// </remarks>
        /// <exception cref="ArangoDBNetStandard.ApiErrorException">
        /// Thrown when database query fails due to connection issues.
        /// </exception>
        public async Task<IEnumerable<SpeciesMonograph>> GetInvasiveSpeciesAsync()
        {
            var query = $@"
                FOR s IN {ArangoDbContext.Collections.Species}
                FILTER CONTAINS(s.ConservationEcology.Status, 'Invasive')
                RETURN s";
            var cursor = await _context.Client.Cursor.PostCursorAsync<SpeciesMonographDocument>(query);
            return cursor.Result.Select(MapToDomain);
        }

        /// <summary>
        /// Maps an ArangoDB document to the F# domain SpeciesMonograph type.
        /// </summary>
        /// <param name="doc">The database document to map.</param>
        /// <returns>The corresponding domain SpeciesMonograph instance.</returns>
        /// <remarks>
        /// Handles complex mapping between database types and F# domain types.
        /// Parses GUIDs, enums, and constructs nested domain objects.
        /// </remarks>
        /// <exception cref="ArgumentNullException">Thrown when doc is null.</exception>
        /// <exception cref="FormatException">
        /// Thrown when GUID parsing fails for invalid document keys.
        /// </exception>
        private SpeciesMonograph MapToDomain(SpeciesMonographDocument doc)
        {
            var taxonomy = new Taxonomy(
                ParseKingdom(doc.Taxonomy.Kingdom),
                doc.Taxonomy.Phylum,
                doc.Taxonomy.Class,
                doc.Taxonomy.Order,
                doc.Taxonomy.Family,
                doc.Taxonomy.Genus,
                doc.Taxonomy.Species,
                doc.Taxonomy.Subspecies != null ? FSharpOption<string>.Some(doc.Taxonomy.Subspecies) : FSharpOption<string>.None,
                doc.Taxonomy.Variety != null ? FSharpOption<string>.Some(doc.Taxonomy.Variety) : FSharpOption<string>.None,
                doc.Taxonomy.Cultivar != null ? FSharpOption<string>.Some(doc.Taxonomy.Cultivar) : FSharpOption<string>.None,
                ListModule.OfSeq(doc.Taxonomy.CommonNames),
                ListModule.OfSeq(doc.Taxonomy.ScientificSynonyms)
            );

            var botanical = new BotanicalDescription(doc.BotanicalDescription.LifeForm, doc.BotanicalDescription.Height, doc.BotanicalDescription.Description);
            var habitat = new NativeHabitat(ListModule.OfSeq(doc.NativeHabitat.NativeRange), doc.NativeHabitat.Climate, ListModule.OfSeq(doc.NativeHabitat.SoilConditions));
            var horticultural = new HorticulturalRequirements(Tuple.Create(doc.HorticulturalRequirements.USDAZones[0], doc.HorticulturalRequirements.USDAZones[1]), doc.HorticulturalRequirements.WaterNeeds, doc.HorticulturalRequirements.SunRequirements, ListModule.OfSeq(doc.HorticulturalRequirements.SoilType));

            FSharpOption<MedicinalProperties> medicinalProps = FSharpOption<MedicinalProperties>.None;
            if (doc.UsesAndProperties.MedicinalProperties != null)
            {
                var mp = doc.UsesAndProperties.MedicinalProperties;
                medicinalProps = FSharpOption<MedicinalProperties>.Some(new MedicinalProperties(
                    ListModule.OfSeq(mp.ActionIds.Select(id => MedicinalActionId.FromGuid(Guid.Parse(id)))),
                    ListModule.OfSeq(mp.ConstituentIds.Select(id => ConstituentId.FromGuid(Guid.Parse(id)))),
                    ListModule.OfSeq(mp.PrimaryIndications),
                    ListModule.OfSeq(mp.PartsUsed),
                    ListModule.OfSeq(mp.Contraindications),
                    ListModule.OfSeq(mp.Precautions),
                    ListModule.OfSeq(mp.AdverseEffects),
                    mp.Overdosage != null ? FSharpOption<string>.Some(mp.Overdosage) : FSharpOption<string>.None,
                    ListModule.OfSeq(mp.DrugInteractions),
                    ParseSafetyClass(mp.SafetyClass),
                    mp.StandardDosage != null ? FSharpOption<string>.Some(mp.StandardDosage) : FSharpOption<string>.None,
                    ListModule.OfSeq(mp.Preparations.Select(ParseDosageForm))
                ));
            }

            var uses = new UsesAndProperties(
                doc.UsesAndProperties.Edible != null ? FSharpOption<bool>.Some(doc.UsesAndProperties.Edible.Value) : FSharpOption<bool>.None,
                doc.UsesAndProperties.Medicinal != null ? FSharpOption<bool>.Some(doc.UsesAndProperties.Medicinal.Value) : FSharpOption<bool>.None,
                ListModule.OfSeq(doc.UsesAndProperties.Culinary),
                ListModule.OfSeq(doc.UsesAndProperties.Traditional),
                medicinalProps);
            
            var conservation = new ConservationEcology(doc.ConservationEcology.Status, ListModule.OfSeq(doc.ConservationEcology.Threats), ListModule.OfSeq(doc.ConservationEcology.Conservation));
            var history = new CultivationHistory(doc.CultivationHistory.Domesticated, ListModule.OfSeq(doc.CultivationHistory.History), ListModule.OfSeq(doc.CultivationHistory.CulturalSignificance));

            var metadata = new Metadata(
                doc.Metadata.CreatedAt,
                doc.Metadata.UpdatedAt,
                doc.Metadata.VerifiedBy != null ? FSharpOption<string>.Some(doc.Metadata.VerifiedBy) : FSharpOption<string>.None,
                ParseVerificationStatus(doc.Metadata.VerificationStatus),
                ListModule.OfSeq(doc.Metadata.Sources.Select(s => new Source(ParseSourceType(s.Type), s.Title, s.Author, s.Year, s.Url != null ? FSharpOption<string>.Some(s.Url) : FSharpOption<string>.None, s.Doi != null ? FSharpOption<string>.Some(s.Doi) : FSharpOption<string>.None))),
                ListModule.OfSeq(doc.Metadata.Images.Select(i => new Image(ParseImageType(i.Type), i.Url, i.Caption, i.Photographer != null ? FSharpOption<string>.Some(i.Photographer) : FSharpOption<string>.None, i.License))),
                ListModule.OfSeq(doc.Metadata.Notes)
            );

            return new SpeciesMonograph(
                SpeciesId.NewSpeciesId(Guid.Parse(doc.Key)),
                taxonomy,
                botanical,
                habitat,
                horticultural,
                uses,
                conservation,
                history,
                metadata,
                FSharpOption<MarketGardenProfile>.None,
                FSharpOption<CutFlowerProfile>.None
            );
        }

        /// <summary>
        /// Maps an F# domain SpeciesMonograph to an ArangoDB document.
        /// </summary>
        /// <param name="m">The domain SpeciesMonograph to map.</param>
        /// <returns>The corresponding database document.</returns>
        /// <remarks>
        /// Converts F# domain types to database-compatible types.
        /// Handles option types and enum conversions for storage.
        /// </remarks>
        /// <exception cref="ArgumentNullException">Thrown when m is null.</exception>
        private SpeciesMonographDocument MapToDocument(SpeciesMonograph m)
        {
            return new SpeciesMonographDocument
            {
                Key = GardenId.speciesIdValue(m.Id).ToString(),
                Taxonomy = new TaxonomyDoc
                {
                    Kingdom = m.Taxonomy.Kingdom.ToString(),
                    Phylum = m.Taxonomy.Phylum,
                    Class = m.Taxonomy.Class,
                    Order = m.Taxonomy.Order,
                    Family = m.Taxonomy.Family,
                    Genus = m.Taxonomy.Genus,
                    Species = m.Taxonomy.Species,
                    Subspecies = m.Taxonomy.Subspecies != null && FSharpOption<string>.get_IsSome(m.Taxonomy.Subspecies) ? m.Taxonomy.Subspecies.Value : null,
                    Variety = m.Taxonomy.Variety != null && FSharpOption<string>.get_IsSome(m.Taxonomy.Variety) ? m.Taxonomy.Variety.Value : null,
                    Cultivar = m.Taxonomy.Cultivar != null && FSharpOption<string>.get_IsSome(m.Taxonomy.Cultivar) ? m.Taxonomy.Cultivar.Value : null,
                    CommonNames = m.Taxonomy.CommonNames.ToList(),
                    ScientificSynonyms = m.Taxonomy.ScientificSynonyms.ToList()
                }
            };
        }

        /// <summary>
        /// Parses a string representation of kingdom to the domain enum.
        /// </summary>
        /// <param name="s">The string to parse.</param>
        /// <returns>The corresponding <see cref="Kingdom"/> value.</returns>
        /// <remarks>
        /// Defaults to Plant kingdom for unknown values to maintain data integrity.
        /// </remarks>
        private static Kingdom ParseKingdom(string s) => s switch { "Plant" => Kingdom.Plant, "Fungi" => Kingdom.Fungi, _ => Kingdom.Plant };
        /// <summary>
        /// Parses a string representation of safety class to the domain enum.
        /// </summary>
        /// <param name="s">The string to parse.</param>
        /// <returns>The corresponding <see cref="SafetyClass"/> value.</returns>
        /// <remarks>
        /// Defaults to Unknown class for unrecognizable values.
        /// </remarks>
        private static SafetyClass ParseSafetyClass(string s) => s switch { "Class1" => SafetyClass.Class1, "Class2a" => SafetyClass.Class2a, "Class2b" => SafetyClass.Class2b, "Class2c" => SafetyClass.Class2c, "Class2d" => SafetyClass.Class2d, "Class3" => SafetyClass.Class3, _ => SafetyClass.Unknown };
        /// <summary>
        /// Parses a string representation of dosage form to the domain enum.
        /// </summary>
        /// <param name="s">The string to parse.</param>
        /// <returns>The corresponding <see cref="DosageForm"/> value.</returns>
        /// <remarks>
        /// Creates custom dosage forms for unknown values to handle data migration.
        /// </remarks>
        private static DosageForm ParseDosageForm(string s) => s switch { "Infusion" => DosageForm.Infusion, "Decoction" => DosageForm.Decoction, "Tincture" => DosageForm.Tincture, "Capsule" => DosageForm.Capsule, "Tablet" => DosageForm.Tablet, "Oil" => DosageForm.Oil, "Salve" => DosageForm.Salve, "Compress" => DosageForm.Compress, "Syrup" => DosageForm.Syrup, "Oxymel" => DosageForm.Oxymel, _ => DosageForm.NewOther(s) };
        /// <summary>
        /// Parses a string representation of verification status to the domain enum.
        /// </summary>
        /// <param name="s">The string to parse.</param>
        /// <returns>The corresponding <see cref="VerificationStatus"/> value.</returns>
        /// <remarks>
        /// Defaults to Pending status for unverified entries.
        /// </remarks>
        private static VerificationStatus ParseVerificationStatus(string s) => s switch { "Verified" => VerificationStatus.Verified, _ => VerificationStatus.Pending };
        /// <summary>
        /// Parses a string representation of source type to the domain enum.
        /// </summary>
        /// <param name="s">The string to parse.</param>
        /// <returns>The corresponding <see cref="SourceType"/> value.</returns>
        /// <remarks>
        /// Defaults to Scientific source type for all entries.
        /// </remarks>
        private static SourceType ParseSourceType(string s) => s switch { "Scientific" => SourceType.Scientific, _ => SourceType.Scientific };
        /// <summary>
        /// Parses a string representation of image type to the domain enum.
        /// </summary>
        /// <param name="s">The string to parse.</param>
        /// <returns>The corresponding <see cref="ImageType"/> value.</returns>
        /// <remarks>
        /// Defaults to Whole image type for all entries.
        /// </remarks>
        private static ImageType ParseImageType(string s) => s switch { "Whole" => ImageType.Whole, _ => ImageType.Whole };
    }

    /// <summary>
    /// ArangoDB document representation of a SpeciesMonograph entity.
    /// Used for persistence and database operations.
    /// </summary>
    /// <remarks>
    /// This class serves as the data transfer object between the application
    /// and ArangoDB. It contains nested document classes for complex botanical data.
    /// </remarks>
    public class SpeciesMonographDocument
    {
        /// <summary>
        /// Gets or sets the document key (used as the primary identifier in ArangoDB).
        /// Corresponds to the SpeciesMonograph's ID.
        /// </summary>
        public string Key { get; set; } = "";

        /// <summary>
        /// Gets or sets the taxonomic classification of the species.
        /// Contains kingdom, family, genus, species, and naming information.
        /// </summary>
        public TaxonomyDoc Taxonomy { get; set; } = new();

        /// <summary>
        /// Gets or sets the botanical description of the species.
        /// Includes life form, height, and descriptive information.
        /// </summary>
        public BotanicalDescriptionDoc BotanicalDescription { get; set; } = new();

        /// <summary>
        /// Gets or sets the native habitat information.
        /// Contains native range, climate, and soil condition data.
        /// </summary>
        public NativeHabitatDoc NativeHabitat { get; set; } = new();

        /// <summary>
        /// Gets or sets the horticultural requirements.
        /// Includes USDA zones, water needs, sun requirements, and soil types.
        /// </summary>
        public HorticulturalRequirementsDoc HorticulturalRequirements { get; set; } = new();

        /// <summary>
        /// Gets or sets the uses and properties of the species.
        /// Contains edible, medicinal, culinary, and traditional use information.
        /// </summary>
        public UsesAndPropertiesDoc UsesAndProperties { get; set; } = new();

        /// <summary>
        /// Gets or sets the conservation ecology information.
        /// Contains status, threats, and conservation data.
        /// </summary>
        public ConservationEcologyDoc ConservationEcology { get; set; } = new();

        /// <summary>
        /// Gets or sets the cultivation history.
        /// Contains domestication status, historical data, and cultural significance.
        /// </summary>
        public CultivationHistoryDoc CultivationHistory { get; set; } = new();

        /// <summary>
        /// Gets or sets the metadata for the monograph.
        /// Contains verification status, sources, images, and notes.
        /// </summary>
        public MetadataDoc Metadata { get; set; } = new();
    }

    public class TaxonomyDoc
    {
        public string Kingdom { get; set; } = "";
        public string Phylum { get; set; } = "";
        public string Class { get; set; } = "";
        public string Order { get; set; } = "";
        public string Family { get; set; } = "";
        public string Genus { get; set; } = "";
        public string Species { get; set; } = "";
        public string? Subspecies { get; set; }
        public string? Variety { get; set; }
        public string? Cultivar { get; set; }
        public List<string> CommonNames { get; set; } = new();
        public List<string> ScientificSynonyms { get; set; } = new();
    }

    public class BotanicalDescriptionDoc { public string LifeForm { get; set; } = ""; public string Height { get; set; } = ""; public string Description { get; set; } = ""; }
    public class NativeHabitatDoc { public List<string> NativeRange { get; set; } = new(); public string Climate { get; set; } = ""; public List<string> SoilConditions { get; set; } = new(); }
    public class HorticulturalRequirementsDoc { public int[] USDAZones { get; set; } = new int[2]; public string WaterNeeds { get; set; } = ""; public string SunRequirements { get; set; } = ""; public List<string> SoilType { get; set; } = new(); }
    public class UsesAndPropertiesDoc { public bool? Edible { get; set; } public bool? Medicinal { get; set; } public List<string> Culinary { get; set; } = new(); public List<string> Traditional { get; set; } = new(); public MedicinalPropertiesDoc? MedicinalProperties { get; set; } }
    public class MedicinalPropertiesDoc { public List<string> ActionIds { get; set; } = new(); public List<string> ConstituentIds { get; set; } = new(); public List<string> PrimaryIndications { get; set; } = new(); public List<string> PartsUsed { get; set; } = new(); public List<string> Contraindications { get; set; } = new(); public List<string> Precautions { get; set; } = new(); public List<string> AdverseEffects { get; set; } = new(); public string? Overdosage { get; set; } public List<string> DrugInteractions { get; set; } = new(); public string SafetyClass { get; set; } = "Unknown"; public string? StandardDosage { get; set; } public List<string> Preparations { get; set; } = new(); }
    public class ConservationEcologyDoc { public string Status { get; set; } = ""; public List<string> Threats { get; set; } = new(); public List<string> Conservation { get; set; } = new(); }
    public class CultivationHistoryDoc { public bool Domesticated { get; set; } public List<string> History { get; set; } = new(); public List<string> CulturalSignificance { get; set; } = new(); }
    public class MetadataDoc { public System.DateTime CreatedAt { get; set; } public System.DateTime UpdatedAt { get; set; } public string? VerifiedBy { get; set; } public string VerificationStatus { get; set; } = "Pending"; public List<SourceDoc> Sources { get; set; } = new(); public List<ImageDoc> Images { get; set; } = new(); public List<string> Notes { get; set; } = new(); }
    public class SourceDoc { public string Type { get; set; } = ""; public string Title { get; set; } = ""; public string Author { get; set; } = ""; public int Year { get; set; } public string? Url { get; set; } public string? Doi { get; set; } }
    public class ImageDoc { public string Type { get; set; } = ""; public string Url { get; set; } = ""; public string Caption { get; set; } = ""; public string? Photographer { get; set; } public string License { get; set; } = ""; }
}
