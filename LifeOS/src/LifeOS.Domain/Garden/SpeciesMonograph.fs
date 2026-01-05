namespace LifeOS.Domain.Garden

open LifeOS.Domain.Common
open System

// Taxonomic classification value objects
[<RequireQualifiedAccess>]
type Kingdom = Plant | Fungi | Protista | Bacteria | Archaea

type Taxonomy = {
    Kingdom: Kingdom
    Phylum: string
    Class: string
    Order: string
    Family: string
    Genus: string
    Species: string
    Subspecies: string option
    Variety: string option
    Cultivar: string option
    CommonNames: string list
    ScientificSynonyms: string list
}

// Main SpeciesMonograph type
type SpeciesMonograph = {
    Id: SpeciesId
    Taxonomy: Taxonomy
    BotanicalDescription: BotanicalDescription
    NativeHabitat: NativeHabitat
    HorticulturalRequirements: HorticulturalRequirements
    UsesAndProperties: UsesAndProperties
    ConservationEcology: ConservationEcology
    CultivationHistory: CultivationHistory
    Metadata: Metadata
    MarketGardenProfile: MarketGardenProfile option
    CutFlowerProfile: CutFlowerProfile option
} with
    member this.ScientificName = 
        let baseName = $"{this.Taxonomy.Genus} {this.Taxonomy.Species}"
        let subspeciesPart = 
            match this.Taxonomy.Subspecies with
            | Some subsp -> $" subsp. {subsp}"
            | None -> ""
        let varietyPart = 
            match this.Taxonomy.Variety with
            | Some var -> $" var. {var}"
            | None -> ""
        let cultivarPart = 
            match this.Taxonomy.Cultivar with
            | Some cult -> $" cv. {cult}"
            | None -> ""
        
        baseName + subspeciesPart + varietyPart + cultivarPart
    
    member this.PrimaryCommonName = 
        this.Taxonomy.CommonNames |> List.tryHead |> Option.defaultValue ""
    
    member this.IsEdible = 
        this.UsesAndProperties.Edible |> Option.defaultValue false
    
    member this.IsMedicinal = 
        this.UsesAndProperties.Medicinal |> Option.defaultValue false
    
    member this.IsInvasive = 
        this.ConservationEcology.Status.Contains("Invasive")
    
    member this.USDAZoneRange = 
        this.HorticulturalRequirements.USDAZones
    
    member this.UpdateTaxonomy (newTaxonomy: Taxonomy) =
        { this with 
            Taxonomy = newTaxonomy
            Metadata = { this.Metadata with UpdatedAt = DateTime.utcNow() } }
    
    member this.AddSource (source: Source) =
        { this with 
            Metadata = { 
                this.Metadata with 
                    Sources = source :: this.Metadata.Sources
                    UpdatedAt = DateTime.utcNow() 
            } }
    
    member this.AddImage (image: Image) =
        { this with 
            Metadata = { 
                this.Metadata with 
                    Images = image :: this.Metadata.Images
                    UpdatedAt = DateTime.utcNow() 
            } }
    
    member this.Verify (verifiedBy: string) =
        { this with 
            Metadata = { 
                this.Metadata with 
                    VerifiedBy = Some verifiedBy
                    VerificationStatus = Verified
                    UpdatedAt = DateTime.utcNow() 
            } }

// Factory method for creating new species monographs
[<RequireQualifiedAccess>]
module SpeciesMonograph =
    let create 
        (kingdom: Kingdom)
        (phylum: string)
        (class': string)
        (order: string)
        (family: string)
        (genus: string)
        (species: string)
        (commonNames: string list)
        (scientificSynonyms: string list)
        (botanicalDescription: BotanicalDescription)
        (nativeHabitat: NativeHabitat)
        (horticulturalRequirements: HorticulturalRequirements)
        (usesAndProperties: UsesAndProperties)
        (conservationEcology: ConservationEcology)
        (cultivationHistory: CultivationHistory)
        (metadata: Metadata) =
        
        let taxonomy = {
            Kingdom = kingdom
            Phylum = phylum
            Class = class'
            Order = order
            Family = family
            Genus = genus
            Species = species
            Subspecies = None
            Variety = None
            Cultivar = None
            CommonNames = commonNames
            ScientificSynonyms = scientificSynonyms
        }
        
        {
            Id = SpeciesId.FromGuid(Guid.NewGuid())
            Taxonomy = taxonomy
            BotanicalDescription = botanicalDescription
            NativeHabitat = nativeHabitat
            HorticulturalRequirements = horticulturalRequirements
            UsesAndProperties = usesAndProperties
            ConservationEcology = conservationEcology
            CultivationHistory = cultivationHistory
            Metadata = metadata
            MarketGardenProfile = None
            CutFlowerProfile = None
        }
