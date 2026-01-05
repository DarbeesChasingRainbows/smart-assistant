export type GlossarySubject =
  | "Garage"
  | "Garden"
  | "Inventory"
  | "Finance"
  | "SharedKernel";

export interface GlossaryTerm {
  /** Stable identifier used for deep-links: /glossary#<id> */
  id: string;
  /** Display term */
  term: string;
  /** IPA or a simple pronunciation hint */
  pronunciation?: string;
  /** Short definition (markdown not supported yet) */
  definition: string;
  /** 1..n subject tags for grouping/filtering */
  subjects: GlossarySubject[];
  /** Alternate spellings / abbreviations that should also match */
  aliases?: string[];
}

export const glossaryTerms: GlossaryTerm[] = [
  // Garden Domain
  {
    id: "germination",
    term: "Germination",
    pronunciation: "jer-muh-nay-shun",
    definition: "The process by which a seed sprouts and begins to grow into a new plant.",
    subjects: ["Garden"],
    aliases: ["sprouting"],
  },
  {
    id: "photosynthesis",
    term: "Photosynthesis",
    pronunciation: "foh-toh-sin-thuh-sis",
    definition: "The process plants use to convert light energy into chemical energy (glucose) using CO2 and water.",
    subjects: ["Garden"],
  },
  {
    id: "pruning",
    term: "Pruning",
    pronunciation: "proon-ing",
    definition: "The selective removal of plant parts to improve health, shape, or yield.",
    subjects: ["Garden"],
    aliases: ["trimming"],
  },
  {
    id: "hardening-off",
    term: "Hardening Off",
    pronunciation: "har-dn-ing awf",
    definition: "Gradually acclimating seedlings to outdoor conditions to reduce transplant shock.",
    subjects: ["Garden"],
    aliases: ["hardening off"],
  },
  {
    id: "transplanting",
    term: "Transplanting",
    pronunciation: "trans-plan-ting",
    definition: "Moving a plant from one growing medium or location to another.",
    subjects: ["Garden"],
    aliases: ["transplant"],
  },
  {
    id: "mulching",
    term: "Mulching",
    pronunciation: "mul-ching",
    definition: "Applying a protective layer (organic or inorganic) to soil surface to retain moisture and suppress weeds.",
    subjects: ["Garden"],
  },
  {
    id: "composting",
    term: "Composting",
    pronunciation: "kom-poh-sting",
    definition: "The natural process of decomposing organic matter into nutrient-rich soil amendment.",
    subjects: ["Garden"],
  },
  {
    id: "ph-soil",
    term: "pH",
    pronunciation: "pee-aitch",
    definition: "A measure of soil acidity or alkalinity on a scale from 0 (acidic) to 14 (alkaline); most plants prefer 6.0–7.0.",
    subjects: ["Garden"],
    aliases: ["soil pH"],
  },
  {
    id: "npk",
    term: "NPK",
    pronunciation: "en-pee-kay",
    definition: "Nitrogen (N), Phosphorus (P), and Potassium (K) — the three primary macronutrients for plant growth.",
    subjects: ["Garden"],
    aliases: ["N-P-K"],
  },
  {
    id: "bolting",
    term: "Bolting",
    pronunciation: "bawl-ting",
    definition: "When a plant prematurely produces a flowering stem, often making leaves bitter.",
    subjects: ["Garden"],
  },

  // Garage Domain
  {
    id: "torque",
    term: "Torque",
    pronunciation: "tork",
    definition: "Rotational force applied to an object, measured in foot-pounds (ft-lb) or Newton-meters (Nm).",
    subjects: ["Garage"],
  },
  {
    id: "horsepower",
    term: "Horsepower",
    pronunciation: "hors-pow-er",
    definition: "A unit of power equal to 746 watts; historically the power needed to lift 550 pounds one foot in one second.",
    subjects: ["Garage"],
    aliases: ["hp"],
  },
  {
    id: "rpm",
    term: "RPM",
    pronunciation: "ar-pee-em",
    definition: "Revolutions Per Minute — a measure of rotational speed.",
    subjects: ["Garage"],
    aliases: ["revolutions per minute"],
  },
  {
    id: "compression-ratio",
    term: "Compression Ratio",
    pronunciation: "kom-presh-un ray-shee-oh",
    definition: "The ratio of maximum to minimum cylinder volume in an internal combustion engine.",
    subjects: ["Garage"],
  },
  {
    id: "displacement",
    term: "Displacement",
    pronunciation: "dis-playss-muhnt",
    definition: "The total volume of all cylinders in an engine, typically measured in liters or cubic centimeters (cc).",
    subjects: ["Garage"],
  },
  {
    id: "camshaft",
    term: "Camshaft",
    pronunciation: "kam-shaft",
    definition: "A shaft with cam lobes that open and close engine valves in sync with the crankshaft.",
    subjects: ["Garage"],
  },
  {
    id: "crankshaft",
    term: "Crankshaft",
    pronunciation: "krank-shaft",
    definition: "The engine component that converts linear piston motion into rotational motion.",
    subjects: ["Garage"],
  },
  {
    id: "timing-belt",
    term: "Timing Belt",
    pronunciation: "tahy-ming belt",
    definition: "A toothed belt that synchronizes the rotation of the crankshaft and camshaft.",
    subjects: ["Garage"],
    aliases: ["timing chain"],
  },
  {
    id: "obd-ii",
    term: "OBD-II",
    pronunciation: "oh-bee-dee-too",
    definition: "On-Board Diagnostics II — a standardized system for vehicle self-diagnostics and reporting.",
    subjects: ["Garage"],
    aliases: ["On-Board Diagnostics"],
  },
  {
    id: "payload",
    term: "Payload",
    pronunciation: "pay-load",
    definition: "The weight of passengers, cargo, and equipment that a vehicle can safely carry.",
    subjects: ["Garage"],
  },
  {
    id: "gvwr",
    term: "GVWR",
    pronunciation: "jee-vee-double-ar",
    definition: "Gross Vehicle Weight Rating — the maximum allowable total weight of a vehicle when fully loaded.",
    subjects: ["Garage"],
    aliases: ["Gross Vehicle Weight Rating"],
  },

  // Diesel Engine Specific
  {
    id: "compression-ignition",
    term: "Compression Ignition",
    pronunciation: "kom-presh-un ig-nish-un",
    definition: "Diesel engine ignition method where fuel auto-ignites from compressed air heat, without spark plugs.",
    subjects: ["Garage"],
    aliases: ["CI engine"],
  },
  {
    id: "glow-plugs",
    term: "Glow Plugs",
    pronunciation: "gloh pluhgs",
    definition: "Heating elements that aid cold starting in diesel engines by preheating the combustion chamber.",
    subjects: ["Garage"],
  },
  {
    id: "turbocharger",
    term: "Turbocharger",
    pronunciation: "tur-boh-char-jer",
    definition: "Exhaust-driven turbine that compresses intake air to increase engine power and efficiency.",
    subjects: ["Garage"],
    aliases: ["turbo"],
  },
  {
    id: "intercooler",
    term: "Intercooler",
    pronunciation: "in-ter-koo-ler",
    definition: "Heat exchanger that cools compressed air from a turbocharger before it enters the engine.",
    subjects: ["Garage"],
    aliases: ["charge air cooler"],
  },
  {
    id: "egr",
    term: "EGR",
    pronunciation: "ee-jee-ar",
    definition: "Exhaust Gas Recirculation — reduces NOx emissions by recirculating a portion of exhaust back into the intake.",
    subjects: ["Garage"],
    aliases: ["Exhaust Gas Recirculation"],
  },
  {
    id: "dpf",
    term: "DPF",
    pronunciation: "dee-pee-eff",
    definition: "Diesel Particulate Filter — captures soot/particulate matter from diesel exhaust to meet emissions standards.",
    subjects: ["Garage"],
    aliases: ["Diesel Particulate Filter"],
  },
  {
    id: "def",
    term: "DEF",
    pronunciation: "dee-ee-eff",
    definition: "Diesel Exhaust Fluid — urea-based fluid injected into exhaust to convert NOx into nitrogen and water in SCR systems.",
    subjects: ["Garage"],
    aliases: ["Diesel Exhaust Fluid", "AdBlue"],
  },
  {
    id: "scr",
    term: "SCR",
    pronunciation: "ess-see-ar",
    definition: "Selective Catalytic Reduction — emissions control system using DEF to reduce NOx in diesel exhaust.",
    subjects: ["Garage"],
    aliases: ["Selective Catalytic Reduction"],
  },
  {
    id: "common-rail",
    term: "Common Rail",
    pronunciation: "kom-un rayl",
    definition: "High-pressure fuel injection system where all injectors share a common fuel rail for precise timing.",
    subjects: ["Garage"],
    aliases: ["common rail injection"],
  },
  {
    id: "high-pressure-fuel-pump",
    term: "High-Pressure Fuel Pump",
    pronunciation: "hahy presh-yoor fuel puhmp",
    definition: "Pump that pressurizes diesel fuel to thousands of PSI for common rail injection systems.",
    subjects: ["Garage"],
    aliases: ["HPFP"],
  },

  // 2021 RAM 3500 6.7L Cummins 5th Gen Specific
  {
    id: "cummins-67l",
    term: "6.7L Cummins",
    pronunciation: "six-point-seven el kuhm-minz",
    definition: "6.7-liter inline-6 turbodiesel engine used in RAM 3500 trucks; 5th generation (2019+).",
    subjects: ["Garage"],
    aliases: ["6.7L", "Cummins 6.7"],
  },
  {
    id: "ram-3500-2021-specs",
    term: "2021 RAM 3500 Specs",
    pronunciation: "twen-tee-twenty-one ram thirty-five-hundred speks",
    definition: "2021 RAM 3500 6.7L Cummins: 370 hp, 800 lb-ft torque, 6-speed Aisin AS69RC transmission, 14,000 lb GCWR.",
    subjects: ["Garage"],
    aliases: ["RAM 3500 specs"],
  },
  {
    id: "cummins-torque-peak",
    term: "Cummins Peak Torque",
    pronunciation: "kuhm-minz peek tork",
    definition: "2021 6.7L Cummins produces 800 lb-ft of torque at 1,700 RPM (with high-output option).",
    subjects: ["Garage"],
  },
  {
    id: "cummins-hp-peak",
    term: "Cummins Peak Horsepower",
    pronunciation: "kuhm-minz peek hors-pow-er",
    definition: "2021 6.7L Cummins produces 370 hp at 2,800 RPM (standard; high-output 385 hp).",
    subjects: ["Garage"],
  },
  {
    id: "aisin-as69rc",
    term: "Aisin AS69RC",
    pronunciation: "eye-sin ay-ess-sixty-nine-ar-see",
    definition: "Heavy-duty 6-speed automatic transmission paired with 6.7L Cummins in RAM 3500.",
    subjects: ["Garage"],
    aliases: ["Aisin transmission"],
  },
  {
    id: "gcwr-ram-3500",
    term: "GCWR",
    pronunciation: "jee-see-double-ar",
    definition: "Gross Combined Weight Rating; 2021 RAM 3500 dually max GCWR is 35,100 lbs with 6.7L Cummins.",
    subjects: ["Garage"],
    aliases: ["Gross Combined Weight Rating"],
  },
  {
    id: "fifth-wheel-max",
    term: "Fifth Wheel Max",
    pronunciation: "fifth wheel maks",
    definition: "Maximum fifth-wheel trailer weight for 2021 RAM 3500: 22,570 lbs (dually, 6.7L Cummins).",
    subjects: ["Garage"],
  },
  {
    id: "rear-axle-ratio",
    term: "Rear Axle Ratio",
    pronunciation: "reer ak-sul ray-shee-oh",
    definition: "Gear ratio of rear differential; 2021 RAM 3500 offers 3.42, 3.73, or 4.10 ratios affecting towing and fuel economy.",
    subjects: ["Garage"],
  },
  {
    id: "cummins-aftertreatment",
    term: "Cummins Aftertreatment",
    pronunciation: "kuhm-minz af-ter-treet-muhnt",
    definition: "Combined emissions system on 2021 6.7L: EGR cooler, DPF, and SCR with DEF injection.",
    subjects: ["Garage"],
  },
  {
    id: "egr-cooler",
    term: "EGR Cooler",
    pronunciation: "ee-jee-ar koo-ler",
    definition: "Heat exchanger that cools exhaust gases before EGR recirculation to improve efficiency.",
    subjects: ["Garage"],
  },
  {
    id: "dpf-regeneration",
    term: "DPF Regeneration",
    pronunciation: "dee-pee-eff ree-jen-uh-ray-shun",
    definition: "Automatic process where DPF burns off accumulated soot at high temperature to maintain flow.",
    subjects: ["Garage"],
    aliases: ["DPF regen"],
  },
  {
    id: "def-tank-capacity",
    term: "DEF Tank Capacity",
    pronunciation: "dee-ee-eff tank kuh-pas-i-tee",
    definition: "2021 RAM 3500 DEF tank holds approximately 5 gallons; range ~5,000 miles between refills.",
    subjects: ["Garage"],
  },
  {
    id: "cummins-oil-capacity",
    term: "Cummins Oil Capacity",
    pronunciation: "kuhm-minz oil kuh-pas-i-tee",
    definition: "2021 6.7L Cummins engine oil capacity: 12 quarts with filter change.",
    subjects: ["Garage"],
  },
  {
    id: "cummins-fuel-filter",
    term: "Cummins Fuel Filter",
    pronunciation: "kuhm-minz fuel fil-tur",
    definition: "Secondary fuel filter on 6.7L Cummins; change interval ~15,000 miles or 12 months.",
    subjects: ["Garage"],
    aliases: ["fuel-water separator"],
  },

  // Finance Domain
  {
    id: "chart-of-accounts",
    term: "Chart of Accounts",
    pronunciation: "chart ov uh-kounts",
    definition: "A numbered index of all financial accounts used by an organization to record transactions.",
    subjects: ["Finance"],
    aliases: ["COA"],
  },
  {
    id: "ledger",
    term: "Ledger",
    pronunciation: "lej-er",
    definition: "A book or file containing bookkeeping entries organized by account.",
    subjects: ["Finance"],
  },
  {
    id: "journal",
    term: "Journal",
    pronunciation: "jurn-ul",
    definition: "A chronological record of all financial transactions before they are posted to ledger accounts.",
    subjects: ["Finance"],
  },
  {
    id: "trial-balance",
    term: "Trial Balance",
    pronunciation: "try-ul bal-uhns",
    definition: "A report listing the balances in all ledger accounts to verify that total debits equal total credits.",
    subjects: ["Finance"],
  },
  {
    id: "reconciliation",
    term: "Reconciliation",
    pronunciation: "rek-un-sil-ee-ay-shun",
    definition: "The process of comparing two sets of records to ensure they agree and are accurate.",
    subjects: ["Finance"],
    aliases: ["reconcile"],
  },
  {
    id: "accrual-basis",
    term: "Accrual Basis",
    pronunciation: "ak-roo-ul bay-sis",
    definition: "Accounting method that records revenues and expenses when they are earned or incurred, not when cash changes hands.",
    subjects: ["Finance"],
    aliases: ["accrual accounting"],
  },
  {
    id: "cash-basis",
    term: "Cash Basis",
    pronunciation: "kash bay-sis",
    definition: "Accounting method that records revenues and expenses only when cash is received or paid.",
    subjects: ["Finance"],
    aliases: ["cash accounting"],
  },
  {
    id: "double-entry",
    term: "Double-Entry",
    pronunciation: "duh-bul en-tree",
    definition: "Bookkeeping system where every transaction is recorded as both a debit and a credit in two different accounts.",
    subjects: ["Finance"],
    aliases: ["double-entry bookkeeping"],
  },
  {
    id: "depreciation",
    term: "Depreciation",
    pronunciation: "dih-pree-shee-ay-shun",
    definition: "The systematic allocation of an asset's cost over its useful life.",
    subjects: ["Finance"],
  },
  {
    id: "equity",
    term: "Equity",
    pronunciation: "ek-wi-tee",
    definition: "The owner's residual interest in the assets of an entity after deducting liabilities.",
    subjects: ["Finance"],
    aliases: ["owner's equity"],
  },

  // SharedKernel / Technical
  {
    id: "cropbatch",
    term: "CropBatch",
    pronunciation: "krahp-bach",
    definition:
      "A batch of crops tracked as a single unit through its lifecycle (planting, harvest, usage).",
    subjects: ["Garden"],
    aliases: ["Crop Batch"],
  },
  {
    id: "voyage",
    term: "Voyage",
    pronunciation: "voi-ij",
    definition:
      "A tracked journey/operation session; used instead of generic terms like trip.",
    subjects: ["Garage"],
  },
  {
    id: "locationid",
    term: "LocationId",
    pronunciation: "loh-kay-shun eye-dee",
    definition:
      "A strongly-typed identifier for an Inventory location (not a raw Guid).",
    subjects: ["Inventory"],
    aliases: ["Location ID"],
  },
  {
    id: "event-sourcing",
    term: "Event Sourcing",
    pronunciation: "ih-vent sor-sing",
    definition:
      "A persistence pattern where state is derived from an append-only stream of domain events.",
    subjects: ["SharedKernel"],
    aliases: ["event sourcing"],
  },
  {
    id: "hexagonal-architecture",
    term: "Hexagonal Architecture",
    pronunciation: "hek-sag-uh-nuhl ark-uh-tek-cher",
    definition: "Ports and Adapters pattern; isolates domain logic from infrastructure via explicit ports.",
    subjects: ["SharedKernel"],
    aliases: ["Ports and Adapters"],
  },
  {
    id: "cqrs",
    term: "CQRS",
    pronunciation: "see-kyoo-ar-ess",
    definition: "Command Query Responsibility Segregation — separates read (query) and write (command) operations.",
    subjects: ["SharedKernel"],
    aliases: ["Command Query Responsibility Segregation"],
  },
  {
    id: "aggregate-root",
    term: "Aggregate Root",
    pronunciation: "ag-ruh-git root",
    definition: "A cluster of domain objects treated as a single unit for data changes; the root entity controls access.",
    subjects: ["SharedKernel"],
    aliases: ["aggregate"],
  },
  {
    id: "domain-event",
    term: "Domain Event",
    pronunciation: "doh-main ih-vent",
    definition: "An event that represents something that happened in the domain that domain experts care about.",
    subjects: ["SharedKernel"],
  },
  {
    id: "event-store",
    term: "Event Store",
    pronunciation: "ih-vent stor",
    definition: "A persistence mechanism optimized for storing and retrieving event streams for event sourcing.",
    subjects: ["SharedKernel"],
  },
];

export function normalizeForMatch(s: string): string {
  return s.trim().toLowerCase();
}

export function getAllGlossaryPhrases(term: GlossaryTerm): string[] {
  return [term.term, ...(term.aliases ?? [])]
    .map((p) => p.trim())
    .filter(Boolean);
}
