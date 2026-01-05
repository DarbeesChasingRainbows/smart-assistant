/**
 * Comprehensive plant species data model for monograph and horticultural information
 * Matches the F# Domain model in LifeOS.Domain.Garden.SpeciesMonograph
 */

// Enums that match F# discriminated unions
export type Kingdom = 'Plant' | 'Fungi' | 'Protista' | 'Bacteria' | 'Archaea';
export type LifeForm = 'Annual' | 'Biennial' | 'Perennial' | 'Shrub' | 'Tree' | 'Vine' | 'Grass' | 'Herb';
export type GrowthRate = 'Slow' | 'Moderate' | 'Fast' | 'VeryFast';
export type GrowthHabit = 'Erect' | 'Spreading' | 'Clumping' | 'Vining' | 'Creeping' | 'Mounding';
export type LeafArrangement = 'Alternate' | 'Opposite' | 'Whorled' | 'Basal' | 'Rosette';
export type LeafType = 'Simple' | 'Compound' | 'Lobed' | 'Dissected';
export type FlowerSymmetry = 'Actinomorphic' | 'Zygomorphic';
export type RootType = 'Fibrous' | 'Taproot' | 'Rhizome' | 'Tuber' | 'Bulb' | 'Corm' | 'Fleshy';
export type Distribution = 'Even' | 'Seasonal' | 'Monsoon' | 'Dry';
export type LightIntensity = 'FullSun' | 'PartialSun' | 'PartialShade' | 'FullShade';
export type PropagationMethod = 'Seed' | 'Cutting' | 'Division' | 'Layering' | 'Grafting' | 'Bulb' | 'Tuber';
export type ToleranceLevel = 'Low' | 'Moderate' | 'High' | 'VeryHigh';
export type WaterLogging = 'Sensitive' | 'Moderate' | 'Tolerant';
export type PestType = 'Insect' | 'Mite' | 'Nematode' | 'Mollusk' | 'Vertebrate';
export type DiseaseType = 'Fungal' | 'Bacterial' | 'Viral' | 'Physiological';
export type PollinatorType = 'Bee' | 'Butterfly' | 'Moth' | 'Bird' | 'Bat' | 'Wind' | 'Water';
export type DispersalAgent = 'Animal' | 'Wind' | 'Water' | 'Explosive';
export type Importance = 'Low' | 'Moderate' | 'High';
export type Trend = 'Improving' | 'Stable' | 'Declining' | 'Unknown';
export type Vulnerability = 'Low' | 'Moderate' | 'High';
export type SourceType = 'Scientific' | 'Horticultural' | 'Traditional' | 'Government' | 'Commercial';
export type ImageType = 'Whole' | 'Leaf' | 'Flower' | 'Fruit' | 'Seed' | 'Root' | 'Habitat';
export type UseCategory = 'Ornamental' | 'Industrial' | 'Craft' | 'Environmental' | 'Animal' | 'Soil';
export type ResearchLevel = 'Preliminary' | 'Moderate' | 'Established';
export type VerificationStatus = 'Pending' | 'Verified' | 'Disputed';

// Taxonomic classification
export interface Taxonomy {
  kingdom: Kingdom;
  phylum: string;
  class: string;
  order: string;
  family: string;
  genus: string;
  species: string;
  subspecies?: string;
  variety?: string;
  cultivar?: string;
  commonNames: string[];
  scientificSynonyms: string[];
}

// Botanical description
export interface LeafDescription {
  arrangement: LeafArrangement;
  type: LeafType;
  shape: string;
  size: {
    length: { min: number; max: number }; // cm
    width: { min: number; max: number }; // cm
  };
  colors: string[];
  texture: string;
  venation: string;
  margin: string;
  apex: string;
  base: string;
}

export interface FlowerDescription {
  inflorescence: string;
  symmetry: FlowerSymmetry;
  petals: number;
  sepals: number;
  stamens: number;
  pistils: number;
  colors: string[];
  size: { min: number; max: number }; // cm
  shape: string;
  fragrance: string;
  bloomingPeriod: {
    start: string; // month
    end: string; // month
    duration: number; // days
  };
}

export interface FruitDescription {
  type: string;
  size: { min: number; max: number }; // cm
  colors: string[];
  shape: string;
  texture: string;
  taste?: string;
  seedCount: { min: number; max: number };
}

export interface RootSystem {
  type: RootType;
  depth: { min: number; max: number }; // cm
  spread: { min: number; max: number }; // cm
  description: string;
}

export interface BotanicalDescription {
  lifeForm: LifeForm;
  height: { min: number; max: number; typical: number }; // cm
  spread: { min: number; max: number; typical: number }; // cm
  growthRate: GrowthRate;
  growthHabit: GrowthHabit;
  lifespan?: number; // years for perennials
  stemDescription?: string;
  leafDescription: LeafDescription;
  flowerDescription?: FlowerDescription;
  fruitDescription?: FruitDescription;
  rootSystem: RootSystem;
}

// Native habitat and distribution
export interface ClimateData {
  temperature: {
    min: number; // Celsius
    max: number; // Celsius
    optimal: { min: number; max: number }; // Celsius
  };
  humidity: {
    min: number; // percentage
    max: number; // percentage
    preferred: number; // percentage
  };
  rainfall: {
    annual: number; // mm
    distribution: Distribution;
    wetSeason: string[];
    drySeason: string[];
  };
}

export interface SoilConditions {
  types: string[];
  ph: { min: number; max: number; optimal: number };
  texture: string[];
  fertility: string[];
  drainage: string[];
  organicMatter: string[];
}

export interface LightRequirements {
  intensity: LightIntensity;
  hours: { min: number; max: number };
  quality: string;
}

export interface NativeHabitat {
  nativeRange: {
    continents: string[];
    countries: string[];
    regions: string[];
  };
  biomes: string[];
  elevation: { min: number; max: number; preferred: number }; // meters
  climate: ClimateData;
  soilConditions: SoilConditions;
  lightRequirements: LightRequirements;
  associatedSpecies: string[];
  ecologicalRole: string[];
}

// Horticultural requirements
export interface Stratification {
  required: boolean;
  period?: number; // days
}

export interface Scarification {
  required: boolean;
  method?: string;
}

export interface GerminationInfo {
  temperature: { min: number; max: number }; // Celsius
  time: { min: number; max: number }; // days
  rate: number; // percentage
  lightRequired: boolean;
}

export interface SeedInfo {
  stratification: Stratification;
  scarification: Scarification;
  germination: GerminationInfo;
  viability: number; // years
  sowingDepth: { min: number; max: number }; // mm
}

export interface CuttingInfo {
  type: string;
  season: string;
  rootingHormone: boolean;
  rootingTime: number; // days
  successRate: number; // percentage
}

export interface Propagation {
  methods: PropagationMethod[];
  seedInfo?: SeedInfo;
  cuttingInfo?: CuttingInfo;
}

export interface PlantingInfo {
  seasons: string[];
  spacing: { min: number; max: number }; // cm
  depth: { min: number; max: number }; // cm
  soilPreparation: string[];
  propagation: Propagation;
}

export interface WateringInfo {
  frequency: string;
  amount: string;
  season: string[];
  droughtTolerance: ToleranceLevel;
  waterLogging: WaterLogging;
}

export interface FertilizingInfo {
  requirements: ToleranceLevel;
  types: string[];
  frequency: string;
  season: string[];
  npRatio: { n: number; p: number; k: number };
  micronutrients: string[];
}

export interface PruningInfo {
  required: boolean;
  season: string[];
  frequency: string;
  methods: string[];
  reasons: string[];
}

export interface MulchingInfo {
  beneficial: boolean;
  materials: string[];
  depth: { min: number; max: number }; // cm
  season: string[];
}

export interface Care {
  watering: WateringInfo;
  fertilizing: FertilizingInfo;
  pruning: PruningInfo;
  mulching: MulchingInfo;
}

export interface PestInfo {
  name: string;
  type: PestType;
  damage: string;
  treatments: string[];
  prevention: string[];
}

export interface DiseaseInfo {
  name: string;
  type: DiseaseType;
  symptoms: string;
  treatments: string[];
  prevention: string[];
}

export interface PestAndDisease {
  commonPests: PestInfo[];
  commonDiseases: DiseaseInfo[];
  resistance: string[];
}

export interface CompanionPlanting {
  beneficial: Array<{
    species: string;
    benefit: string;
    mechanism: string;
  }>;
  antagonistic: Array<{
    species: string;
    issue: string;
    mechanism: string;
  }>;
}

export interface HorticulturalRequirements {
  usdaZones: { min: number; max: number; preferred: number[] };
  lightRequirements: LightRequirements;
  planting: PlantingInfo;
  care: Care;
  pestAndDisease: PestAndDisease;
  companionPlanting: CompanionPlanting;
}

// Uses and properties
export interface NutritionalValue {
  calories: number; // per 100g
  protein: number; // g per 100g
  carbohydrates: number; // g per 100g
  fat: number; // g per 100g
  fiber: number; // g per 100g
  vitamins: Array<{ name: string; amount: number; unit: string }>;
  minerals: Array<{ name: string; amount: number; unit: string }>;
}

export interface EdibleInfo {
  edibleParts: string[];
  culinaryUses: string[];
  nutritionalValue?: NutritionalValue;
  taste: string;
  preparation: string[];
  harvesting: {
    seasons: string[];
    method: string;
    frequency: string;
    storageLife: number; // days
  };
}

export interface ActiveCompound {
  name: string;
  part: string;
  effect: string;
  research: ResearchLevel;
}

export interface TraditionalUse {
  culture: string;
  use: string;
  preparation: string;
  dosage?: string;
}

export interface ModernResearch {
  study: string;
  findings: string;
  year: number;
}

export interface MedicinalInfo {
  traditionalUses: TraditionalUse[];
  activeCompounds: ActiveCompound[];
  modernResearch: ModernResearch[];
  precautions: string[];
}

export interface OtherUse {
  category: UseCategory;
  use: string;
  description: string;
}

export interface EconomicValue {
  commercial: boolean;
  markets: string[];
  priceRange?: string;
  demand: ToleranceLevel;
}

export interface UsesAndProperties {
  edible?: EdibleInfo;
  medicinal?: MedicinalInfo;
  otherUses: OtherUse[];
  economicValue: EconomicValue;
}

// Conservation and ecology
export interface ConservationStatus {
  global: string; // IUCN status
  national: string[];
  local: string[];
  trends: Trend;
  threats: string[];
}

export interface PollinatorInfo {
  species: string;
  type: PollinatorType;
  effectiveness: string;
}

export interface SeedDispersal {
  agent: DispersalAgent;
  type: string;
  description: string;
}

export interface WildlifeValue {
  species: string;
  use: string;
  importance: Importance;
}

export interface SoilInteractions {
  nitrogenFixing: boolean;
  mycorrhizal: boolean;
  soilStabilization: boolean;
  soilImprovement: string[];
}

export interface EcologicalInteractions {
  pollinators: PollinatorInfo[];
  seedDispersal: SeedDispersal[];
  wildlifeValue: WildlifeValue[];
  soilInteractions: SoilInteractions;
}

export interface InvasivePotential {
  invasive: boolean;
  regions: string[];
  impact: string;
  controlMethods: string[];
}

export interface ClimateChangeAdaptation {
  vulnerability: Vulnerability;
  adaptationStrategies: string[];
  futureOutlook: string;
}

export interface ConservationEcology {
  conservationStatus: ConservationStatus;
  ecologicalInteractions: EcologicalInteractions;
  invasivePotential: InvasivePotential;
  climateChangeAdaptation: ClimateChangeAdaptation;
}

// Cultivation history and culture
export interface DomesticationInfo {
  domesticated: boolean;
  period: string;
  region: string;
  wildAncestor?: string;
  selectionTraits: string[];
}

export interface CultivationHistory {
  period: string;
  region: string;
  methods: string[];
  significance: string;
}

export interface CulturalSignificance {
  culture: string;
  significance: string;
  uses: string[];
  traditions: string[];
  symbolism: string;
}

export interface Variety {
  name: string;
  origin: string;
  characteristics: string;
  use: string;
  availability: string;
}

export interface BreedingInfo {
  currentPrograms: string[];
  breedingGoals: string[];
  achievements: string[];
  challenges: string[];
}

export interface CultivationHistory {
  domestication: DomesticationInfo;
  cultivationHistory: CultivationHistory[];
  culturalSignificance: CulturalSignificance[];
  varieties: Variety[];
  breeding: BreedingInfo;
}

// Source and metadata
export interface Source {
  type: SourceType;
  title: string;
  author: string;
  year: number;
  url?: string;
  doi?: string;
}

export interface Image {
  type: ImageType;
  url: string;
  caption: string;
  photographer?: string;
  license: string;
}

export interface Metadata {
  createdAt: Date;
  updatedAt: Date;
  verifiedBy?: string;
  verificationStatus: VerificationStatus;
  sources: Source[];
  images: Image[];
  notes: string[];
}

// Main species interface
export interface PlantSpecies {
  id: string;
  taxonomy: Taxonomy;
  botanicalDescription: BotanicalDescription;
  nativeHabitat: NativeHabitat;
  horticulturalRequirements: HorticulturalRequirements;
  usesAndProperties: UsesAndProperties;
  conservationEcology: ConservationEcology;
  cultivationHistory: CultivationHistory;
  metadata: Metadata;
}

// Computed properties (these would be methods on the F# record)
export interface PlantSpeciesComputed {
  scientificName: string;
  primaryCommonName: string;
  isEdible: boolean;
  isMedicinal: boolean;
  isInvasive: boolean;
  usdaZoneRange: { min: number; max: number };
  canGrowInZone: (zone: number) => boolean;
}

// API DTOs
export interface CreateSpeciesMonographRequest {
  name: string;
  scientificName: string;
  kingdom: Kingdom;
  family: string;
  genus: string;
  species: string;
}

export interface SpeciesMonographDto extends PlantSpecies {}

export interface SpeciesMonographSummaryDto {
  id: string;
  name: string;
  scientificName: string;
  family: string;
  primaryCommonName: string;
  isEdible: boolean;
  isMedicinal: boolean;
  isInvasive: boolean;
  usdaZoneRange: { min: number; max: number };
  verificationStatus: VerificationStatus;
}

export interface VerifySpeciesRequest {
  verifiedBy: string;
}
