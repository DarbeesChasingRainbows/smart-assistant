// ArangoDB Initialization Script
// Run this script to set up the LifeOS database and collections

const db = require("@arangodb").db;
const dbName = "lifeos";

// Create database if it doesn't exist
if (!db._databases().includes(dbName)) {
  db._createDatabase(dbName);
  console.log(`Created database: ${dbName}`);
} else {
  console.log(`Database ${dbName} already exists`);
}

// Switch to the lifeos database
db._useDatabase(dbName);

// Document Collections (Vertices)
const documentCollections = [
  "vehicles",
  "components",
  "inventory_skus",
  "inventory_assets",
  "inventory_lots",
  "inventory_movements",
  "inventory_locations",
  "inventory_bins",
  "inventory_stock_levels",
  "users",
  "people_employments",
  "maintenance_records",
  "habits",
  "goals",
  "visions",
  "plants",
  "garden_beds",
  "courses",
  "lessons",
  // Garden collections
  "species",
  "crop_batches",
  "medicinal_actions",
  "active_constituents",
  // Finance collections
  "financial_accounts",
  "financial_merchants",
  "financial_transactions",
  "financial_journal_entries",
  "financial_receipts",
  "financial_reconciliations",
  "financial_budgets",
  "financial_categories",
  "pay_period_config",
  // Budget domain collections (pay-period based zero-based budgeting)
  "budget_pay_periods",
  "budget_category_groups",
  "budget_categories",
  "budget_assignments",
  "budget_income_entries",
  "budget_accounts",
  "budget_bills",
  "budget_goals",
  "budget_transactions",
  // Additional collections
  "tasks",
  "skills",
  "identities",
  "kras",
  "kpis",
];

documentCollections.forEach((name) => {
  if (!db._collection(name)) {
    db._createDocumentCollection(name);
    console.log(`Created document collection: ${name}`);
  } else {
    console.log(`Collection ${name} already exists`);
  }
});

// Seed default inventory location
(() => {
  const locations = db._collection("inventory_locations");
  if (locations) {
    const key = "main";
    const existing = locations.firstExample({ _key: key });
    if (!existing) {
      locations.save({
        _key: key,
        name: "Main",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log("Seeded default inventory location: main");
    }
  }
})();

// Edge Collections (Relationships)
const edgeCollections = [
  "installed_on", // Component -> Vehicle
  "asset_installations", // Vehicle -> InventoryAsset
  "serviced", // Component -> MaintenanceRecord
  "people_relationships", // Person -> Person
  "belongs_to", // Various -> User
  "planted_in", // Plant -> GardenBed
  "supports", // Goal -> Vision
  "builds", // Habit -> Goal
  "enrolled_in", // User -> Course
  "completed", // User -> Lesson
];

edgeCollections.forEach((name) => {
  if (!db._collection(name)) {
    db._createEdgeCollection(name);
    console.log(`Created edge collection: ${name}`);
  } else {
    console.log(`Edge collection ${name} already exists`);
  }
});

// Additional edge collections for garden and other domains
const additionalEdgeCollections = [
  "worked_on",
  "consumed",
  "performed",
  "contributes_to",
  "measures",
  "owned_by",
  "has_medicinal_action",
  "contains_constituent",
  "treats_indication",
  // Budget domain edges
  "budget_assigned_to",      // BudgetAssignment -> BudgetCategory
  "budget_in_period",        // BudgetAssignment -> PayPeriod
  "budget_category_in_group", // BudgetCategory -> CategoryGroup
  "budget_transaction_in",   // Transaction -> Account
  "budget_bill_paid_from",   // Bill -> Account
  "budget_goal_funded_by",   // Goal -> Category
];

additionalEdgeCollections.forEach((name) => {
  if (!db._collection(name)) {
    db._createEdgeCollection(name);
    console.log(`Created edge collection: ${name}`);
  } else {
    console.log(`Edge collection ${name} already exists`);
  }
});

// Create indexes for common queries
console.log("Creating indexes...");

// Vehicle indexes
const vehicles = db._collection("vehicles");
vehicles.ensureIndex({ type: "persistent", fields: ["vin"], unique: true });
vehicles.ensureIndex({ type: "persistent", fields: ["isActive"] });
vehicles.ensureIndex({ type: "persistent", fields: ["make", "model"] });

// Component indexes
const components = db._collection("components");
components.ensureIndex({ type: "persistent", fields: ["partNumber"] });
components.ensureIndex({ type: "persistent", fields: ["category"] });

// Inventory SKU indexes
const inventorySkus = db._collection("inventory_skus");
inventorySkus.ensureIndex({ type: "persistent", fields: ["domain"] });
inventorySkus.ensureIndex({
  type: "persistent",
  fields: ["partNumber"],
  sparse: true,
});
inventorySkus.ensureIndex({ type: "persistent", fields: ["category"] });

// Inventory Asset indexes
const inventoryAssets = db._collection("inventory_assets");
inventoryAssets.ensureIndex({ type: "persistent", fields: ["skuKey"] });
inventoryAssets.ensureIndex({
  type: "persistent",
  fields: ["partNumber"],
  sparse: true,
});
inventoryAssets.ensureIndex({ type: "persistent", fields: ["category"] });
inventoryAssets.ensureIndex({ type: "persistent", fields: ["location.type"] });
inventoryAssets.ensureIndex({
  type: "persistent",
  fields: ["location.vehicleId"],
  sparse: true,
});

// Inventory Lot indexes
const inventoryLots = db._collection("inventory_lots");
inventoryLots.ensureIndex({ type: "persistent", fields: ["skuKey"] });

// Inventory Movement indexes
const inventoryMovements = db._collection("inventory_movements");
inventoryMovements.ensureIndex({ type: "persistent", fields: ["skuKey"] });
inventoryMovements.ensureIndex({ type: "persistent", fields: ["occurredAt"] });
inventoryMovements.ensureIndex({
  type: "persistent",
  fields: ["locationKey"],
  sparse: true,
});
inventoryMovements.ensureIndex({
  type: "persistent",
  fields: ["binKey"],
  sparse: true,
});
inventoryMovements.ensureIndex({ type: "persistent", fields: ["type"] });
inventoryMovements.ensureIndex({
  type: "persistent",
  fields: ["locationKey", "skuKey"],
  sparse: true,
});

// Inventory Locations indexes
const inventoryLocations = db._collection("inventory_locations");
inventoryLocations.ensureIndex({
  type: "persistent",
  fields: ["name"],
  unique: true,
});
inventoryLocations.ensureIndex({ type: "persistent", fields: ["isActive"] });

// Inventory Bins indexes
const inventoryBins = db._collection("inventory_bins");
inventoryBins.ensureIndex({ type: "persistent", fields: ["locationKey"] });
inventoryBins.ensureIndex({
  type: "persistent",
  fields: ["locationKey", "name"],
  unique: true,
});
inventoryBins.ensureIndex({ type: "persistent", fields: ["isActive"] });

// Inventory Stock Levels indexes
const inventoryStockLevels = db._collection("inventory_stock_levels");
inventoryStockLevels.ensureIndex({
  type: "persistent",
  fields: ["locationKey"],
});
inventoryStockLevels.ensureIndex({ type: "persistent", fields: ["skuKey"] });
inventoryStockLevels.ensureIndex({
  type: "persistent",
  fields: ["locationKey", "skuKey"],
  unique: true,
});

// User indexes
const users = db._collection("users");
users.ensureIndex({ type: "persistent", fields: ["Email"], unique: true });
users.ensureIndex({ type: "persistent", fields: ["Username"], unique: true });
users.ensureIndex({ type: "persistent", fields: ["IsActive"] });

(() => {
  if (!users) return;
  if (users.count() > 0) return;

  const now = new Date().toISOString();

  const dad = {
    _key: "dad",
    Key: "11111111-1111-1111-1111-111111111111",
    Email: "dad@family.local",
    Username: "Dad",
    Role: "Parent",
    IsActive: true,
    CreatedAt: now,
    UpdatedAt: now,
  };

  const mom = {
    _key: "mom",
    Key: "22222222-2222-2222-2222-222222222222",
    Email: "mom@family.local",
    Username: "Mom",
    Role: "Parent",
    IsActive: true,
    CreatedAt: now,
    UpdatedAt: now,
  };

  const child = {
    _key: "child",
    Key: "33333333-3333-3333-3333-333333333333",
    Email: "child@family.local",
    Username: "Child",
    Role: "Child",
    IsActive: true,
    CreatedAt: now,
    UpdatedAt: now,
  };

  users.save(dad);
  users.save(mom);
  users.save(child);

  const rels = db._collection("people_relationships");
  if (rels) {
    const spouse = {
      _key: "dad-mom-spouse",
      _from: "users/dad",
      _to: "users/mom",
      type: "Spouse",
      isValid: true,
      createdAt: now,
      updatedAt: now,
    };

    const parent = {
      _key: "dad-child-parent",
      _from: "users/dad",
      _to: "users/child",
      type: "Parent",
      isValid: true,
      createdAt: now,
      updatedAt: now,
    };

    rels.save(spouse);
    rels.save(parent);
  }
})();

// People employment indexes
const peopleEmployments = db._collection("people_employments");
peopleEmployments.ensureIndex({ type: "persistent", fields: ["personId"] });
peopleEmployments.ensureIndex({ type: "persistent", fields: ["employer"] });
peopleEmployments.ensureIndex({ type: "persistent", fields: ["isCurrent"] });

// Vehicle maintenance log indexes
const maintenanceRecords = db._collection("maintenance_records");
maintenanceRecords.ensureIndex({ type: "persistent", fields: ["vehicleId"] });
maintenanceRecords.ensureIndex({ type: "persistent", fields: ["date"] });
maintenanceRecords.ensureIndex({
  type: "persistent",
  fields: ["vehicleId", "idempotencyKey"],
  unique: true,
  sparse: true,
});

// Habit indexes
const habits = db._collection("habits");
habits.ensureIndex({ type: "persistent", fields: ["userId"] });
habits.ensureIndex({ type: "persistent", fields: ["isActive"] });

// Financial Accounts indexes
const financialAccounts = db._collection("financial_accounts");
financialAccounts.ensureIndex({ type: "persistent", fields: ["type"] });
financialAccounts.ensureIndex({ type: "persistent", fields: ["isActive"] });
financialAccounts.ensureIndex({
  type: "persistent",
  fields: ["name"],
  unique: true,
});

// Financial Merchants indexes
const financialMerchants = db._collection("financial_merchants");
financialMerchants.ensureIndex({ type: "persistent", fields: ["name"] });
financialMerchants.ensureIndex({
  type: "persistent",
  fields: ["defaultCategoryKey"],
  sparse: true,
});

// Financial Categories indexes
const financialCategories = db._collection("financial_categories");
financialCategories.ensureIndex({
  type: "persistent",
  fields: ["parentKey"],
  sparse: true,
});
financialCategories.ensureIndex({ type: "persistent", fields: ["type"] });
financialCategories.ensureIndex({ type: "persistent", fields: ["name"] });

// Financial Transactions indexes
const financialTransactions = db._collection("financial_transactions");
financialTransactions.ensureIndex({
  type: "persistent",
  fields: ["accountKey"],
});
financialTransactions.ensureIndex({
  type: "persistent",
  fields: ["merchantKey"],
  sparse: true,
});
financialTransactions.ensureIndex({
  type: "persistent",
  fields: ["categoryKey"],
  sparse: true,
});
financialTransactions.ensureIndex({ type: "persistent", fields: ["postedAt"] });
financialTransactions.ensureIndex({ type: "persistent", fields: ["status"] });
financialTransactions.ensureIndex({
  type: "persistent",
  fields: ["accountKey", "postedAt"],
});
financialTransactions.ensureIndex({
  type: "persistent",
  fields: ["externalId"],
  unique: true,
  sparse: true,
});

// Financial Journal Entries indexes (double-entry ledger)
const financialJournalEntries = db._collection("financial_journal_entries");
financialJournalEntries.ensureIndex({
  type: "persistent",
  fields: ["transactionKey"],
});
financialJournalEntries.ensureIndex({
  type: "persistent",
  fields: ["accountKey"],
});
financialJournalEntries.ensureIndex({
  type: "persistent",
  fields: ["entryDate"],
});
financialJournalEntries.ensureIndex({
  type: "persistent",
  fields: ["accountKey", "entryDate"],
});

// Financial Receipts indexes
const financialReceipts = db._collection("financial_receipts");
financialReceipts.ensureIndex({
  type: "persistent",
  fields: ["transactionKey"],
  sparse: true,
});
financialReceipts.ensureIndex({
  type: "persistent",
  fields: ["merchantKey"],
  sparse: true,
});
financialReceipts.ensureIndex({ type: "persistent", fields: ["uploadedAt"] });

// Financial Reconciliations indexes
const financialReconciliations = db._collection("financial_reconciliations");
financialReconciliations.ensureIndex({
  type: "persistent",
  fields: ["accountKey"],
});
financialReconciliations.ensureIndex({
  type: "persistent",
  fields: ["statementDate"],
});
financialReconciliations.ensureIndex({
  type: "persistent",
  fields: ["status"],
});

// Financial Budgets indexes
const financialBudgets = db._collection("financial_budgets");
financialBudgets.ensureIndex({ type: "persistent", fields: ["year", "month"] });
financialBudgets.ensureIndex({ type: "persistent", fields: ["categoryKey"] });
financialBudgets.ensureIndex({
  type: "persistent",
  fields: ["year", "month", "categoryKey"],
  unique: true,
});

// Budget Pay Periods indexes
const budgetPayPeriods = db._collection("budget_pay_periods");
budgetPayPeriods.ensureIndex({ type: "persistent", fields: ["familyId"] });
budgetPayPeriods.ensureIndex({ type: "persistent", fields: ["startDate"] });
budgetPayPeriods.ensureIndex({ type: "persistent", fields: ["endDate"] });
budgetPayPeriods.ensureIndex({ type: "persistent", fields: ["isActive"] });
budgetPayPeriods.ensureIndex({
  type: "persistent",
  fields: ["familyId", "startDate", "endDate"],
  unique: true,
});

// Budget Category Groups indexes
const budgetCategoryGroups = db._collection("budget_category_groups");
budgetCategoryGroups.ensureIndex({ type: "persistent", fields: ["familyId"] });
budgetCategoryGroups.ensureIndex({ type: "persistent", fields: ["sortOrder"] });
budgetCategoryGroups.ensureIndex({
  type: "persistent",
  fields: ["familyId", "name"],
  unique: true,
});

// Budget Categories indexes
const budgetCategories = db._collection("budget_categories");
budgetCategories.ensureIndex({ type: "persistent", fields: ["familyId"] });
budgetCategories.ensureIndex({ type: "persistent", fields: ["groupKey"] });
budgetCategories.ensureIndex({ type: "persistent", fields: ["sortOrder"] });
budgetCategories.ensureIndex({ type: "persistent", fields: ["isHidden"] });

// Budget Assignments indexes (zero-based budgeting core)
const budgetAssignments = db._collection("budget_assignments");
budgetAssignments.ensureIndex({ type: "persistent", fields: ["payPeriodKey"] });
budgetAssignments.ensureIndex({ type: "persistent", fields: ["categoryKey"] });
budgetAssignments.ensureIndex({
  type: "persistent",
  fields: ["payPeriodKey", "categoryKey"],
  unique: true,
});

// Budget Income Entries indexes
const budgetIncomeEntries = db._collection("budget_income_entries");
budgetIncomeEntries.ensureIndex({ type: "persistent", fields: ["payPeriodKey"] });
budgetIncomeEntries.ensureIndex({ type: "persistent", fields: ["receivedDate"] });

// Budget Accounts indexes
const budgetAccounts = db._collection("budget_accounts");
budgetAccounts.ensureIndex({ type: "persistent", fields: ["familyId"] });
budgetAccounts.ensureIndex({ type: "persistent", fields: ["type"] });
budgetAccounts.ensureIndex({ type: "persistent", fields: ["isActive"] });
budgetAccounts.ensureIndex({
  type: "persistent",
  fields: ["familyId", "name"],
  unique: true,
});

// Budget Bills indexes
const budgetBills = db._collection("budget_bills");
budgetBills.ensureIndex({ type: "persistent", fields: ["familyId"] });
budgetBills.ensureIndex({ type: "persistent", fields: ["categoryKey"] });
budgetBills.ensureIndex({ type: "persistent", fields: ["dueDay"] });
budgetBills.ensureIndex({ type: "persistent", fields: ["isActive"] });

// Budget Goals indexes
const budgetGoals = db._collection("budget_goals");
budgetGoals.ensureIndex({ type: "persistent", fields: ["familyId"] });
budgetGoals.ensureIndex({ type: "persistent", fields: ["categoryKey"] });
budgetGoals.ensureIndex({ type: "persistent", fields: ["targetDate"], sparse: true });
budgetGoals.ensureIndex({ type: "persistent", fields: ["isCompleted"] });

// Budget Transactions indexes
const budgetTransactions = db._collection("budget_transactions");
budgetTransactions.ensureIndex({ type: "persistent", fields: ["accountKey"] });
budgetTransactions.ensureIndex({ type: "persistent", fields: ["categoryKey"], sparse: true });
budgetTransactions.ensureIndex({ type: "persistent", fields: ["payPeriodKey"], sparse: true });
budgetTransactions.ensureIndex({ type: "persistent", fields: ["date"] });
budgetTransactions.ensureIndex({ type: "persistent", fields: ["isCleared"] });
budgetTransactions.ensureIndex({
  type: "persistent",
  fields: ["accountKey", "date"],
});

console.log("Indexes created successfully");

// Create graph definitions
const graphModule = require("@arangodb/general-graph");

const graphs = [
  {
    name: "garage_graph",
    edgeDefinitions: [
      {
        collection: "installed_on",
        from: ["components"],
        to: ["vehicles"],
      },
      {
        collection: "asset_installations",
        from: ["vehicles"],
        to: ["inventory_assets"],
      },
      {
        collection: "serviced",
        from: ["components"],
        to: ["vehicles"],
      },
    ],
  },
  {
    name: "people_graph",
    edgeDefinitions: [
      {
        collection: "people_relationships",
        from: ["users"],
        to: ["users"],
      },
    ],
  },
  {
    name: "dojo_graph",
    edgeDefinitions: [
      {
        collection: "builds",
        from: ["habits"],
        to: ["goals"],
      },
      {
        collection: "supports",
        from: ["goals"],
        to: ["visions"],
      },
    ],
  },
  {
    name: "budget_graph",
    edgeDefinitions: [
      {
        collection: "budget_assigned_to",
        from: ["budget_assignments"],
        to: ["budget_categories"],
      },
      {
        collection: "budget_in_period",
        from: ["budget_assignments"],
        to: ["budget_pay_periods"],
      },
      {
        collection: "budget_category_in_group",
        from: ["budget_categories"],
        to: ["budget_category_groups"],
      },
      {
        collection: "budget_transaction_in",
        from: ["budget_transactions"],
        to: ["budget_accounts"],
      },
      {
        collection: "budget_bill_paid_from",
        from: ["budget_bills"],
        to: ["budget_accounts"],
      },
      {
        collection: "budget_goal_funded_by",
        from: ["budget_goals"],
        to: ["budget_categories"],
      },
    ],
  },
];

graphs.forEach((graphDef) => {
  if (!graphModule._exists(graphDef.name)) {
    graphModule._create(graphDef.name, graphDef.edgeDefinitions);
    console.log(`Created graph: ${graphDef.name}`);
  } else {
    console.log(`Graph ${graphDef.name} already exists`);
  }
});

console.log("ArangoDB initialization complete!");
