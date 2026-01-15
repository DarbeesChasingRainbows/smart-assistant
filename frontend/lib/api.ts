/**
 * API Client for LifeOS Backend
 * Connects Deno Fresh frontend to .NET API
 */

function getApiBaseUrl(): string {
  // 1. Browser Environment (Client Side)
  // Always use the relative path so requests go through Caddy
  if (typeof document !== "undefined") {
    return "/api";
  }

  // 2. Deno Server Environment (SSR)
  if (typeof Deno !== "undefined" && Deno.env?.get) {
    // If explicitly set to an absolute URL (e.g. external host), use it
    const envUrl = Deno.env.get("VITE_API_URL");
    if (envUrl && envUrl.startsWith("http")) {
      return envUrl;
    }
    
    // Otherwise, assume we are inside Docker and need to reach the 'api' service directly
    // This handles the case where VITE_API_URL is set to "/api" or is missing
    return "http://api:5120/api";
  }

  // Fallback
  return "http://localhost:5120/api";
}

const API_BASE_URL = `${getApiBaseUrl()}/v1`;

// ... rest of the file remains exactly the same ...
// (Do not remove the interfaces or api object below)
export interface VehicleDto {

  id: string;
  vin: string;
  licensePlate: string | null;
  make: string;
  model: string;
  year: number;
  vehicleType: VehicleTypeDto;
  currentMileage: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleTypeDto {
  type: "Truck" | "RV" | "Car" | "Motorcycle";
  payloadCapacity?: number;
  length?: number;
  slideOuts?: number;
  bodyStyle?: string;
  engineCC?: number;
}

export interface CreateVehicleRequest {
  vin: string;
  licensePlate?: string;
  make: string;
  model: string;
  year: number;
  vehicleType: VehicleTypeDto;
}

export interface UpdateVehicleRequest {
  licensePlate?: string;
  currentMileage?: number;
  isActive?: boolean;
  make?: string;
  model?: string;
  year?: number;
  vehicleType?: VehicleTypeDto;
}

export interface VehicleListResponse {
  vehicles: VehicleDto[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  error: string;
  details?: string;
}

// Finance DTOs
export interface FinancialAccountDto {
  key: string;
  name: string;
  type: string;
  institution?: string | null;
  accountNumber?: string | null;
  currency: string;
  openingBalance: number;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFinancialAccountRequest {
  name: string;
  type: string;
  institution?: string;
  accountNumber?: string;
  currency?: string;
  openingBalance: number;
}

export interface UpdateFinancialAccountRequest {
  name?: string;
  institution?: string;
  accountNumber?: string;
  isActive?: boolean;
}

export interface FinancialMerchantDto {
  key: string;
  name: string;
  defaultCategoryKey?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  website?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFinancialMerchantRequest {
  name: string;
  defaultCategoryKey?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  phone?: string;
  website?: string;
  notes?: string;
}

export interface UpdateFinancialMerchantRequest {
  name?: string;
  defaultCategoryKey?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  phone?: string;
  website?: string;
  notes?: string;
}

export interface FinancialCategoryDto {
  key: string;
  name: string;
  type: string;
  parentKey?: string | null;
  icon?: string | null;
  color?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFinancialCategoryRequest {
  name: string;
  type: string;
  parentKey?: string;
  icon?: string;
  color?: string;
}

export interface FinancialTransactionDto {
  key: string;
  accountKey: string;
  merchantKey?: string | null;
  categoryKey?: string | null;
  amount: number;
  description: string;
  memo?: string | null;
  postedAt: string;
  authorizedAt?: string | null;
  status: string;
  externalId?: string | null;
  checkNumber?: string | null;
  tags: string[];
  receiptKey?: string | null;
  reconciliationKey?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFinancialTransactionRequest {
  accountKey: string;
  merchantKey?: string;
  categoryKey?: string;
  amount: number;
  description: string;
  memo?: string;
  postedAt?: string;
  authorizedAt?: string;
  checkNumber?: string;
  tags?: string[];
}

export interface UpdateFinancialTransactionRequest {
  merchantKey?: string;
  categoryKey?: string;
  amount?: number;
  description?: string;
  memo?: string;
  postedAt?: string;
  status?: string;
  checkNumber?: string;
  tags?: string[];
}

export interface CreateFinancialTransferRequest {
  fromAccountKey: string;
  toAccountKey: string;
  amount: number;
  description?: string;
  postedAt?: string;
}

export interface FinancialJournalEntryDto {
  key: string;
  transactionKey: string;
  accountKey: string;
  debit: number;
  credit: number;
  entryDate: string;
  memo?: string | null;
  createdAt: string;
}

export interface FinancialReceiptDto {
  key: string;
  transactionKey?: string | null;
  merchantKey?: string | null;
  fileName: string;
  contentType: string;
  fileSize: number;
  storageKey: string;
  receiptDate?: string | null;
  totalAmount?: number | null;
  taxAmount?: number | null;
  notes?: string | null;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFinancialReceiptRequest {
  transactionKey?: string;
  merchantKey?: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  receiptDate?: string;
  totalAmount?: number;
  taxAmount?: number;
  notes?: string;
}

export interface UpdateFinancialReceiptRequest {
  transactionKey?: string;
  merchantKey?: string;
  receiptDate?: string;
  totalAmount?: number;
  taxAmount?: number;
  notes?: string;
}

export interface ReceiptUploadUrlResponse {
  receiptKey: string;
  uploadUrl: string;
  storageKey: string;
  expiresInSeconds: number;
}

export interface AttachReceiptToTransactionRequest {
  receiptKey: string;
}

export interface FinancialReconciliationDto {
  key: string;
  accountKey: string;
  statementDate: string;
  statementBalance: number;
  clearedBalance: number;
  difference: number;
  status: string;
  matchedTransactionKeys: string[];
  notes?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFinancialReconciliationRequest {
  accountKey: string;
  statementDate: string;
  statementBalance: number;
}

export interface MatchTransactionsRequest {
  transactionKeys: string[];
}

export interface CompleteReconciliationRequest {
  notes?: string;
}

export interface FinancialBudgetDto {
  key: string;
  // Legacy month-based fields
  year: number;
  month: number;
  // New flexible period fields
  periodType: string; // Monthly, Weekly, BiWeekly, SemiMonthly, Custom, PayPeriod
  startDate?: string | null;
  endDate?: string | null;
  periodKey?: string | null;
  categoryKey: string;
  budgetedAmount: number;
  spentAmount: number;
  rolloverAmount: number;
  availableAmount: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Legacy summary (kept for backward compatibility)
export interface BudgetSummaryDto {
  year: number;
  month: number;
  totalBudgeted: number;
  totalSpent: number;
  totalAvailable: number;
  categories: FinancialBudgetDto[];
}

// New flexible period summary
export interface PeriodBudgetSummaryDto {
  periodType: string;
  startDate: string;
  endDate: string;
  periodKey?: string | null;
  totalBudgeted: number;
  totalSpent: number;
  totalAvailable: number;
  categories: FinancialBudgetDto[];
}

// Legacy request (kept for backward compatibility)
export interface CreateOrUpdateBudgetRequest {
  categoryKey: string;
  budgetedAmount: number;
  rolloverAmount?: number;
  notes?: string;
}

// New flexible period budget request
export interface CreateOrUpdatePeriodBudgetRequest {
  periodType: string; // Monthly, Weekly, BiWeekly, SemiMonthly, Custom, PayPeriod
  startDate: string;
  endDate: string;
  categoryKey: string;
  budgetedAmount: number;
  rolloverAmount?: number;
  notes?: string;
}

// Pay period configuration
export interface PayPeriodConfigDto {
  key: string;
  anchorDate: string;
  periodLengthDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrUpdatePayPeriodConfigRequest {
  anchorDate: string;
  periodLengthDays: number;
}

// Inventory DTOs
export interface InventorySkuDto {
  key: string;
  domain: string;
  kind: string;
  name: string;
  category: string;
  partNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryLocationDto {
  key: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventoryLocationRequest {
  name: string;
}

export interface InventoryBinDto {
  key: string;
  locationKey: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventoryBinRequest {
  locationKey: string;
  name: string;
}

export interface InventoryStockLevelDto {
  key: string;
  locationKey: string;
  skuKey: string;
  onHand: number;
  reserved: number;
  available: number;
  updatedAt: string;
}

export interface CreateInventoryAdjustmentRequest {
  locationKey: string;
  skuKey: string;
  quantityDelta: number;
  reason: string;
  occurredAt?: string;
}

export interface CreateInventoryTransferRequest {
  fromLocationKey: string;
  toLocationKey: string;
  skuKey: string;
  quantity: number;
  reason?: string;
  occurredAt?: string;
}

export interface MaintenanceItemDto {
  type: string;
  name: string;
  url?: string | null;
  quantity?: number | null;
  unit?: string | null;
}

export interface VehicleMaintenanceDto {
  id: string;
  vehicleId: string;
  date: string;
  mileage?: number | null;
  description: string;
  cost?: number | null;
  performedBy?: string | null;
  items: MaintenanceItemDto[];
}

export interface CreateVehicleMaintenanceRequest {
  date: string;
  mileage?: number | null;
  description: string;
  cost?: number | null;
  performedBy?: string | null;
  items: MaintenanceItemDto[];
}

export interface ComponentLocationDto {
  type: string;
  storageLocation?: string | null;
  vehicleId?: string | null;
  installedDate?: string | null;
}

export interface ComponentDto {
  id: string;
  name: string;
  partNumber?: string | null;
  category: string;
  location: ComponentLocationDto;
  purchaseDate?: string | null;
  purchaseCost?: number | null;
  warrantyExpiry?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateComponentRequest {
  name: string;
  partNumber?: string | null;
  category?: string;
  purchaseDate?: string | null;
  purchaseCost?: number | null;
  warrantyExpiry?: string | null;
  notes?: string | null;
}

export interface InstallComponentRequest {
  vehicleId: string;
}

export interface UpdateComponentRequest {
  name?: string;
  partNumber?: string;
  category?: string;
  purchaseDate?: string | null;
  purchaseCost?: number | null;
  warrantyExpiry?: string | null;
  notes?: string | null;
}

export interface PersonDto {
  id: string;
  email: string;
  username: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePersonRequest {
  email: string;
  username: string;
  role?: string;
}

export interface UpdatePersonRequest {
  role?: string;
  isActive?: boolean;
}

export interface PeopleRelationshipDto {
  key: string;
  fromPersonId: string;
  toPersonId: string;
  type: string;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  isValid: boolean;
  invalidatedAt?: string | null;
  invalidatedReason?: string | null;
  createdAt: string;
}

export interface CreatePeopleRelationshipRequest {
  toPersonId: string;
  type: string;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
}

export interface InvalidatePeopleRelationshipRequest {
  reason: string;
}

export interface PeopleEmploymentDto {
  key: string;
  personId: string;
  employer: string;
  title?: string | null;
  employmentType?: string | null;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
  location?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePeopleEmploymentRequest {
  employer: string;
  title?: string | null;
  employmentType?: string | null;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
  location?: string | null;
  notes?: string | null;
}

export interface UpdatePeopleEmploymentRequest {
  employer?: string;
  title?: string | null;
  employmentType?: string | null;
  startDate?: string;
  endDate?: string | null;
  isCurrent?: boolean;
  location?: string | null;
  notes?: string | null;
}

// Garden DTOs

// Medicinal Properties Types
export interface MedicinalPropertiesDto {
  actions: string[]; // MedicinalActionId GUIDs
  constituents: string[]; // ConstituentId GUIDs
  primaryIndications: string[];
  partsUsed: string[];
  contraindications: string[];
  precautions: string[];
  adverseEffects: string[];
  overdosage?: string | null;
  drugInteractions: string[];
  safetyClass: "Class1" | "Class2a" | "Class2b" | "Class2c" | "Class2d" | "Class3" | "Unknown";
  standardDosage?: string | null;
  preparations: ("Infusion" | "Decoction" | "Tincture" | "Capsule" | "Tablet" | "Oil" | "Salve" | "Compress" | "Syrup" | "Oxymel" | { Other: string })[];
}

export interface UsesAndPropertiesDto {
  edible?: boolean | null;
  medicinal?: boolean | null;
  culinary: string[];
  traditional: string[];
  medicinalData?: MedicinalPropertiesDto | null;
}

export interface SpeciesDto {
  id: string;
  name: string;
  scientificName?: string | null;
  variety?: string | null;
  plantType: string;
  growthHabit: string;
  sunRequirement: string;
  waterNeed: string;
  preferredSoilType: string;
  daysToMaturity?: number | null;
  spacingRequirement?: number | null;
  depthRequirement?: number | null;
  germinationRate?: number | null;
  frostTolerance: boolean;
  plantingSeasons: string[];
  harvestSeasons: string[];
  medicinalData?: MedicinalPropertiesDto | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSpeciesRequest {
  name: string;
  scientificName?: string | null;
  variety?: string | null;
  plantType?: string;
  growthHabit?: string;
  sunRequirement?: string;
  waterNeed?: string;
  preferredSoilType?: string;
  daysToMaturity?: number | null;
  spacingRequirement?: number | null;
  depthRequirement?: number | null;
  germinationRate?: number | null;
  frostTolerance?: boolean;
  plantingSeasons?: string[];
  harvestSeasons?: string[];
  medicinalData?: MedicinalPropertiesDto | null;
  notes?: string | null;
}

export interface GardenBedDto {
  id: string;
  name: string;
  location?: string | null;
  area: number;
  soilType: string;
  hasIrrigation: boolean;
  hasCover?: boolean | null;
  isActive: boolean;
  plantedSpecies: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateGardenBedRequest {
  name: string;
  location?: string | null;
  area: number;
  soilType?: string;
  hasIrrigation?: boolean;
  hasCover?: boolean | null;
}

export interface UpdateGardenBedRequest {
  name?: string;
  location?: string | null;
  area?: number;
  soilType?: string;
  hasIrrigation?: boolean;
  hasCover?: boolean | null;
  isActive?: boolean;
}

export interface CropBatchDto {
  id: string;
  speciesId: string;
  gardenBedId?: string | null;
  batchName: string;
  status: string;
  quantity: number;
  unit: string;
  dateSeeded?: string | null;
  dateHarvested?: string | null;
  expectedYield?: number | null;
  actualYield?: number | null;
  quality?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCropBatchRequest {
  speciesId: string;
  gardenBedId?: string | null;
  batchName: string;
  quantity: number;
  unit?: string;
  expectedYield?: number | null;
  notes?: string | null;
}

// API Client
export const api = {
  finance: {
    accounts: {
      async list(isActive?: boolean): Promise<FinancialAccountDto[]> {
        const qs = isActive === undefined ? "" : `?isActive=${isActive}`;
        const res = await fetch(`${API_BASE_URL}/finance/accounts${qs}`);
        if (!res.ok) throw new Error("Failed to fetch accounts");
        return res.json();
      },

      async getByKey(key: string): Promise<FinancialAccountDto> {
        const res = await fetch(`${API_BASE_URL}/finance/accounts/${key}`);
        if (!res.ok) throw new Error("Account not found");
        return res.json();
      },

      async create(
        req: CreateFinancialAccountRequest,
      ): Promise<FinancialAccountDto> {
        const res = await fetch(`${API_BASE_URL}/finance/accounts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.error ?? "Failed to create account");
        }
        return res.json();
      },

      async update(
        key: string,
        req: UpdateFinancialAccountRequest,
      ): Promise<FinancialAccountDto> {
        const res = await fetch(`${API_BASE_URL}/finance/accounts/${key}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.error ?? "Failed to update account");
        }
        return res.json();
      },
    },

    merchants: {
      async list(search?: string): Promise<FinancialMerchantDto[]> {
        const qs = search ? `?search=${encodeURIComponent(search)}` : "";
        const res = await fetch(`${API_BASE_URL}/finance/merchants${qs}`);
        if (!res.ok) throw new Error("Failed to fetch merchants");
        return res.json();
      },

      async create(
        req: CreateFinancialMerchantRequest,
      ): Promise<FinancialMerchantDto> {
        const res = await fetch(`${API_BASE_URL}/finance/merchants`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.error ?? "Failed to create merchant");
        }
        return res.json();
      },

      async update(
        key: string,
        req: UpdateFinancialMerchantRequest,
      ): Promise<FinancialMerchantDto> {
        const res = await fetch(`${API_BASE_URL}/finance/merchants/${key}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.error ?? "Failed to update merchant");
        }
        return res.json();
      },

      async delete(key: string): Promise<void> {
        const res = await fetch(`${API_BASE_URL}/finance/merchants/${key}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.error ?? "Failed to delete merchant");
        }
      },
    },

    categories: {
      async list(type?: string): Promise<FinancialCategoryDto[]> {
        const qs = type ? `?type=${encodeURIComponent(type)}` : "";
        const res = await fetch(`${API_BASE_URL}/finance/categories${qs}`);
        if (!res.ok) throw new Error("Failed to fetch categories");
        return res.json();
      },

      async create(
        req: CreateFinancialCategoryRequest,
      ): Promise<FinancialCategoryDto> {
        const res = await fetch(`${API_BASE_URL}/finance/categories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.error ?? "Failed to create category");
        }
        return res.json();
      },
    },

    transactions: {
      async list(params?: {
        accountKey?: string;
        categoryKey?: string;
        startDate?: string;
        endDate?: string;
        status?: string;
        limit?: number;
        offset?: number;
      }): Promise<FinancialTransactionDto[]> {
        const p = new URLSearchParams();
        if (params?.accountKey) p.set("accountKey", params.accountKey);
        if (params?.categoryKey) p.set("categoryKey", params.categoryKey);
        if (params?.startDate) p.set("startDate", params.startDate);
        if (params?.endDate) p.set("endDate", params.endDate);
        if (params?.status) p.set("status", params.status);
        if (params?.limit !== undefined) p.set("limit", String(params.limit));
        if (params?.offset !== undefined) {
          p.set("offset", String(params.offset));
        }

        const qs = p.toString() ? `?${p.toString()}` : "";
        const res = await fetch(`${API_BASE_URL}/finance/transactions${qs}`);
        if (!res.ok) throw new Error("Failed to fetch transactions");
        return res.json();
      },

      async create(
        req: CreateFinancialTransactionRequest,
      ): Promise<FinancialTransactionDto> {
        const res = await fetch(`${API_BASE_URL}/finance/transactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.error ?? "Failed to create transaction");
        }
        return res.json();
      },

      async update(
        key: string,
        req: UpdateFinancialTransactionRequest,
      ): Promise<FinancialTransactionDto> {
        const res = await fetch(`${API_BASE_URL}/finance/transactions/${key}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.error ?? "Failed to update transaction");
        }
        return res.json();
      },

      async transfer(req: CreateFinancialTransferRequest): Promise<unknown> {
        const res = await fetch(
          `${API_BASE_URL}/finance/transactions/transfer`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req),
          },
        );
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.error ?? "Failed to create transfer");
        }
        return res.json();
      },

      async journalEntries(key: string): Promise<FinancialJournalEntryDto[]> {
        const res = await fetch(
          `${API_BASE_URL}/finance/transactions/${key}/journal-entries`,
        );
        if (!res.ok) throw new Error("Failed to fetch journal entries");
        return res.json();
      },

      async attachReceipt(
        key: string,
        req: AttachReceiptToTransactionRequest,
      ): Promise<FinancialTransactionDto> {
        const res = await fetch(
          `${API_BASE_URL}/finance/transactions/${key}/attach-receipt`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req),
          },
        );
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.error ?? "Failed to attach receipt");
        }
        return res.json();
      },
    },

    receipts: {
      async list(
        params?: { transactionKey?: string; limit?: number },
      ): Promise<FinancialReceiptDto[]> {
        const p = new URLSearchParams();
        if (params?.transactionKey) {
          p.set("transactionKey", params.transactionKey);
        }
        if (params?.limit !== undefined) p.set("limit", String(params.limit));
        const qs = p.toString() ? `?${p.toString()}` : "";
        const res = await fetch(`${API_BASE_URL}/finance/receipts${qs}`);
        if (!res.ok) throw new Error("Failed to fetch receipts");
        return res.json();
      },

      async getByKey(key: string): Promise<FinancialReceiptDto> {
        const res = await fetch(`${API_BASE_URL}/finance/receipts/${key}`);
        if (!res.ok) throw new Error("Receipt not found");
        return res.json();
      },

      async getUploadUrl(
        req: CreateFinancialReceiptRequest,
      ): Promise<ReceiptUploadUrlResponse> {
        const res = await fetch(`${API_BASE_URL}/finance/receipts/upload-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.error ?? "Failed to create receipt upload URL");
        }
        return res.json();
      },

      async create(
        req: CreateFinancialReceiptRequest,
      ): Promise<FinancialReceiptDto> {
        const res = await fetch(`${API_BASE_URL}/finance/receipts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.error ?? "Failed to create receipt");
        }
        return res.json();
      },

      async downloadUrl(
        key: string,
      ): Promise<{ downloadUrl: string; expiresInSeconds: number }> {
        const res = await fetch(
          `${API_BASE_URL}/finance/receipts/${key}/download-url`,
        );
        if (!res.ok) throw new Error("Failed to get download URL");
        return res.json();
      },

      async update(
        key: string,
        req: UpdateFinancialReceiptRequest,
      ): Promise<FinancialReceiptDto> {
        const res = await fetch(`${API_BASE_URL}/finance/receipts/${key}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.error ?? "Failed to update receipt");
        }
        return res.json();
      },
    },

    reconciliations: {
      async list(
        params?: { accountKey?: string; status?: string },
      ): Promise<FinancialReconciliationDto[]> {
        const p = new URLSearchParams();
        if (params?.accountKey) p.set("accountKey", params.accountKey);
        if (params?.status) p.set("status", params.status);
        const qs = p.toString() ? `?${p.toString()}` : "";
        const res = await fetch(`${API_BASE_URL}/finance/reconciliations${qs}`);
        if (!res.ok) throw new Error("Failed to fetch reconciliations");
        return res.json();
      },

      async create(
        req: CreateFinancialReconciliationRequest,
      ): Promise<FinancialReconciliationDto> {
        const res = await fetch(`${API_BASE_URL}/finance/reconciliations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.error ?? "Failed to create reconciliation");
        }
        return res.json();
      },

      async match(
        key: string,
        req: MatchTransactionsRequest,
      ): Promise<FinancialReconciliationDto> {
        const res = await fetch(
          `${API_BASE_URL}/finance/reconciliations/${key}/match`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req),
          },
        );
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.error ?? "Failed to match transactions");
        }
        return res.json();
      },

      async complete(
        key: string,
        req: CompleteReconciliationRequest,
      ): Promise<FinancialReconciliationDto> {
        const res = await fetch(
          `${API_BASE_URL}/finance/reconciliations/${key}/complete`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req),
          },
        );
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.error ?? "Failed to complete reconciliation");
        }
        return res.json();
      },
    },

    budgets: {
      // Legacy month-based
      async getSummary(year: number, month: number): Promise<BudgetSummaryDto> {
        const res = await fetch(
          `${API_BASE_URL}/finance/budgets/${year}/${month}`,
        );
        if (!res.ok) throw new Error("Failed to fetch budget");
        return res.json();
      },

      async upsert(
        year: number,
        month: number,
        req: CreateOrUpdateBudgetRequest,
      ): Promise<FinancialBudgetDto> {
        const res = await fetch(
          `${API_BASE_URL}/finance/budgets/${year}/${month}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req),
          },
        );
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.error ?? "Failed to save budget");
        }
        return res.json();
      },

      // New flexible period-based
      async getPeriodSummary(
        startDate: string,
        endDate: string,
        periodType?: string,
      ): Promise<PeriodBudgetSummaryDto> {
        const params = new URLSearchParams({
          startDate,
          endDate,
        });
        if (periodType) params.set("periodType", periodType);

        const res = await fetch(
          `${API_BASE_URL}/finance/budgets/period?${params.toString()}`,
        );
        if (!res.ok) throw new Error("Failed to fetch period budget");
        return res.json();
      },

      async upsertPeriod(
        req: CreateOrUpdatePeriodBudgetRequest,
      ): Promise<FinancialBudgetDto> {
        const res = await fetch(`${API_BASE_URL}/finance/budgets/period`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.error ?? "Failed to save period budget");
        }
        return res.json();
      },
    },

    payPeriodConfig: {
      async get(): Promise<PayPeriodConfigDto> {
        const res = await fetch(`${API_BASE_URL}/finance/pay-period-config`);
        if (!res.ok) throw new Error("Failed to fetch pay period config");
        return res.json();
      },

      async upsert(
        req: CreateOrUpdatePayPeriodConfigRequest,
      ): Promise<PayPeriodConfigDto> {
        const res = await fetch(`${API_BASE_URL}/finance/pay-period-config`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.error ?? "Failed to save pay period config");
        }
        return res.json();
      },
    },
  },

  inventory: {
    skus: {
      async list(): Promise<InventorySkuDto[]> {
        const res = await fetch(`${API_BASE_URL}/inventory/skus`);
        if (!res.ok) throw new Error("Failed to fetch SKUs");
        return res.json();
      },
    },

    locations: {
      async list(): Promise<InventoryLocationDto[]> {
        const res = await fetch(`${API_BASE_URL}/inventory/locations`);
        if (!res.ok) throw new Error("Failed to fetch locations");
        return res.json();
      },

      async create(
        req: CreateInventoryLocationRequest,
      ): Promise<InventoryLocationDto> {
        const res = await fetch(`${API_BASE_URL}/inventory/locations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.error ?? "Failed to create location");
        }
        return res.json();
      },
    },

    bins: {
      async list(locationKey?: string): Promise<InventoryBinDto[]> {
        const qs = locationKey
          ? `?locationKey=${encodeURIComponent(locationKey)}`
          : "";
        const res = await fetch(`${API_BASE_URL}/inventory/bins${qs}`);
        if (!res.ok) throw new Error("Failed to fetch bins");
        return res.json();
      },

      async create(req: CreateInventoryBinRequest): Promise<InventoryBinDto> {
        const res = await fetch(`${API_BASE_URL}/inventory/bins`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.error ?? "Failed to create bin");
        }
        return res.json();
      },
    },

    stock: {
      async list(params?: {
        skuKey?: string;
        locationKey?: string;
      }): Promise<InventoryStockLevelDto[]> {
        const p = new URLSearchParams();
        if (params?.skuKey) p.set("skuKey", params.skuKey);
        if (params?.locationKey) p.set("locationKey", params.locationKey);
        const qs = p.toString() ? `?${p.toString()}` : "";

        const res = await fetch(`${API_BASE_URL}/inventory/stock${qs}`);
        if (!res.ok) throw new Error("Failed to fetch stock levels");
        return res.json();
      },
    },

    ops: {
      async adjustment(
        req: CreateInventoryAdjustmentRequest,
      ): Promise<unknown> {
        const res = await fetch(`${API_BASE_URL}/inventory/ops/adjustments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.error ?? "Failed to create adjustment");
        }
        return res.json();
      },

      async transfer(req: CreateInventoryTransferRequest): Promise<unknown> {
        const res = await fetch(`${API_BASE_URL}/inventory/ops/transfers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
        });
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.error ?? "Failed to create transfer");
        }
        return res.json();
      },
    },
  },

  vehicles: {
    async getAll(): Promise<VehicleDto[]> {
      const res = await fetch(`${API_BASE_URL}/vehicles`);
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      return res.json();
    },

    async getById(id: string): Promise<VehicleDto> {
      const res = await fetch(`${API_BASE_URL}/vehicles/${id}`);
      if (!res.ok) throw new Error("Vehicle not found");
      return res.json();
    },

    async getActive(): Promise<VehicleDto[]> {
      const res = await fetch(`${API_BASE_URL}/vehicles/active`);
      if (!res.ok) throw new Error("Failed to fetch active vehicles");
      return res.json();
    },

    async getPaged(
      page: number,
      pageSize: number,
    ): Promise<VehicleListResponse> {
      const res = await fetch(
        `${API_BASE_URL}/vehicles/paged?page=${page}&pageSize=${pageSize}`,
      );
      if (!res.ok) throw new Error("Failed to fetch vehicles");
      return res.json();
    },

    async search(term: string): Promise<VehicleDto[]> {
      const res = await fetch(
        `${API_BASE_URL}/vehicles/search?term=${encodeURIComponent(term)}`,
      );
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },

    async create(vehicle: CreateVehicleRequest): Promise<VehicleDto> {
      const res = await fetch(`${API_BASE_URL}/vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vehicle),
      });
      if (!res.ok) {
        const error: ApiError = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },

    async update(
      id: string,
      updates: UpdateVehicleRequest,
    ): Promise<VehicleDto> {
      const res = await fetch(`${API_BASE_URL}/vehicles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const error: ApiError = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },

    async delete(id: string): Promise<void> {
      const res = await fetch(`${API_BASE_URL}/vehicles/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete vehicle");
    },
  },

  maintenance: {
    async listByVehicle(vehicleId: string): Promise<VehicleMaintenanceDto[]> {
      const res = await fetch(
        `${API_BASE_URL}/vehicles/${vehicleId}/maintenance`,
      );
      if (!res.ok) throw new Error("Failed to fetch maintenance history");
      return res.json();
    },

    async createForVehicle(
      vehicleId: string,
      req: CreateVehicleMaintenanceRequest,
      idempotencyKey: string,
    ): Promise<VehicleMaintenanceDto> {
      const res = await fetch(
        `${API_BASE_URL}/vehicles/${vehicleId}/maintenance`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify(req),
        },
      );
      if (!res.ok) {
        const error: ApiError = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },

    async delete(vehicleId: string, maintenanceId: string): Promise<void> {
      const res = await fetch(
        `${API_BASE_URL}/vehicles/${vehicleId}/maintenance/${maintenanceId}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok && res.status !== 204) {
        const error: ApiError = await res.json();
        throw new Error(error.error);
      }
    },
  },

  components: {
    async getByVehicle(vehicleId: string): Promise<ComponentDto[]> {
      const res = await fetch(
        `${API_BASE_URL}/components/vehicle/${vehicleId}`,
      );
      if (!res.ok) throw new Error("Failed to fetch components for vehicle");
      return res.json();
    },

    async create(component: CreateComponentRequest): Promise<ComponentDto> {
      const res = await fetch(`${API_BASE_URL}/components`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(component),
      });
      if (!res.ok) {
        const error: ApiError = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },

    async install(
      componentId: string,
      request: InstallComponentRequest,
    ): Promise<ComponentDto> {
      const res = await fetch(
        `${API_BASE_URL}/components/${componentId}/install`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        },
      );
      if (!res.ok) {
        const error: ApiError = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },

    async update(
      componentId: string,
      updates: UpdateComponentRequest,
    ): Promise<ComponentDto> {
      const res = await fetch(`${API_BASE_URL}/components/${componentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const error: ApiError = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },

    async delete(componentId: string): Promise<void> {
      const res = await fetch(`${API_BASE_URL}/components/${componentId}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        const error: ApiError = await res.json();
        throw new Error(error.error);
      }
    },

    async uninstall(componentId: string): Promise<ComponentDto> {
      const res = await fetch(
        `${API_BASE_URL}/components/${componentId}/uninstall`,
        {
          method: "POST",
        },
      );
      if (!res.ok) {
        const error: ApiError = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },
  },

  people: {
    async getAll(): Promise<PersonDto[]> {
      const res = await fetch(`${API_BASE_URL}/people`);
      if (!res.ok) throw new Error("Failed to fetch people");
      return res.json();
    },

    async getById(id: string): Promise<PersonDto> {
      const res = await fetch(`${API_BASE_URL}/people/${id}`);
      if (!res.ok) throw new Error("Person not found");
      return res.json();
    },

    async create(person: CreatePersonRequest): Promise<PersonDto> {
      const res = await fetch(`${API_BASE_URL}/people`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(person),
      });
      if (!res.ok) {
        const error: ApiError = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },

    async update(id: string, updates: UpdatePersonRequest): Promise<PersonDto> {
      const res = await fetch(`${API_BASE_URL}/people/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const error: ApiError = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },

    async delete(id: string): Promise<void> {
      const res = await fetch(`${API_BASE_URL}/people/${id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        const error: ApiError = await res.json();
        throw new Error(error.error);
      }
    },

    async getRelationships(personId: string): Promise<PeopleRelationshipDto[]> {
      const res = await fetch(
        `${API_BASE_URL}/people/${personId}/relationships`,
      );
      if (!res.ok) throw new Error("Failed to fetch relationships");
      return res.json();
    },

    async createRelationship(
      personId: string,
      req: CreatePeopleRelationshipRequest,
    ): Promise<void> {
      const res = await fetch(
        `${API_BASE_URL}/people/${personId}/relationships`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
        },
      );
      if (!res.ok) {
        const error: ApiError = await res.json();
        throw new Error(error.error);
      }
    },

    async invalidateRelationship(
      edgeKey: string,
      req: InvalidatePeopleRelationshipRequest,
    ): Promise<void> {
      const res = await fetch(
        `${API_BASE_URL}/people/relationships/${edgeKey}/invalidate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
        },
      );
      if (!res.ok) {
        const error: ApiError = await res.json();
        throw new Error(error.error);
      }
    },

    async getEmployment(personId: string): Promise<PeopleEmploymentDto[]> {
      const res = await fetch(`${API_BASE_URL}/people/${personId}/employment`);
      if (!res.ok) throw new Error("Failed to fetch employment");
      return res.json();
    },

    async createEmployment(
      personId: string,
      req: CreatePeopleEmploymentRequest,
    ): Promise<void> {
      const res = await fetch(`${API_BASE_URL}/people/${personId}/employment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.ok) {
        const error: ApiError = await res.json();
        throw new Error(error.error);
      }
    },

    async updateEmployment(
      employmentKey: string,
      req: UpdatePeopleEmploymentRequest,
    ): Promise<void> {
      const res = await fetch(
        `${API_BASE_URL}/people/employment/${employmentKey}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
        },
      );
      if (!res.ok) {
        const error: ApiError = await res.json();
        throw new Error(error.error);
      }
    },

    async deleteEmployment(employmentKey: string): Promise<void> {
      const res = await fetch(
        `${API_BASE_URL}/people/employment/${employmentKey}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok && res.status !== 204) {
        const error: ApiError = await res.json();
        throw new Error(error.error);
      }
    },

    async getEmployers(): Promise<string[]> {
      const res = await fetch(`${API_BASE_URL}/people/employers`);
      if (!res.ok) throw new Error("Failed to fetch employers");
      return res.json();
    },
  },

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const res = await fetch(`${API_BASE_URL.replace("/api/v1", "")}/health`);
    if (!res.ok) throw new Error("API is not healthy");
    return res.json();
  },

  garden: {
    species: {
      async getAll(): Promise<SpeciesDto[]> {
        const res = await fetch(`${API_BASE_URL}/garden/species`);
        if (!res.ok) throw new Error("Failed to fetch species");
        return res.json();
      },
      async getById(id: string): Promise<SpeciesDto> {
        const res = await fetch(`${API_BASE_URL}/garden/species/${id}`);
        if (!res.ok) throw new Error("Species not found");
        return res.json();
      },
      async create(species: CreateSpeciesRequest): Promise<SpeciesDto> {
        const res = await fetch(`${API_BASE_URL}/garden/species`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(species),
        });
        if (!res.ok) {
          const e: ApiError = await res.json();
          throw new Error(e.error);
        }
        return res.json();
      },
      async delete(id: string): Promise<void> {
        const res = await fetch(`${API_BASE_URL}/garden/species/${id}`, {
          method: "DELETE",
        });
        if (!res.ok && res.status !== 204) {
          const e: ApiError = await res.json();
          throw new Error(e.error);
        }
      },
    },
    beds: {
      async getAll(): Promise<GardenBedDto[]> {
        const res = await fetch(`${API_BASE_URL}/garden/beds`);
        if (!res.ok) throw new Error("Failed to fetch garden beds");
        return res.json();
      },
      async getActive(): Promise<GardenBedDto[]> {
        const res = await fetch(`${API_BASE_URL}/garden/beds/active`);
        if (!res.ok) throw new Error("Failed to fetch active beds");
        return res.json();
      },
      async getById(id: string): Promise<GardenBedDto> {
        const res = await fetch(`${API_BASE_URL}/garden/beds/${id}`);
        if (!res.ok) throw new Error("Garden bed not found");
        return res.json();
      },
      async create(bed: CreateGardenBedRequest): Promise<GardenBedDto> {
        const res = await fetch(`${API_BASE_URL}/garden/beds`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bed),
        });
        if (!res.ok) {
          const e: ApiError = await res.json();
          throw new Error(e.error);
        }
        return res.json();
      },
      async update(
        id: string,
        updates: UpdateGardenBedRequest,
      ): Promise<GardenBedDto> {
        const res = await fetch(`${API_BASE_URL}/garden/beds/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (!res.ok) {
          const e: ApiError = await res.json();
          throw new Error(e.error);
        }
        return res.json();
      },
      async delete(id: string): Promise<void> {
        const res = await fetch(`${API_BASE_URL}/garden/beds/${id}`, {
          method: "DELETE",
        });
        if (!res.ok && res.status !== 204) {
          const e: ApiError = await res.json();
          throw new Error(e.error);
        }
      },
    },
    batches: {
      async getAll(): Promise<CropBatchDto[]> {
        const res = await fetch(`${API_BASE_URL}/garden/batches`);
        if (!res.ok) throw new Error("Failed to fetch crop batches");
        return res.json();
      },
      async getActive(): Promise<CropBatchDto[]> {
        const res = await fetch(`${API_BASE_URL}/garden/batches/active`);
        if (!res.ok) throw new Error("Failed to fetch active batches");
        return res.json();
      },
      async getHarvestable(): Promise<CropBatchDto[]> {
        const res = await fetch(`${API_BASE_URL}/garden/batches/harvestable`);
        if (!res.ok) throw new Error("Failed to fetch harvestable batches");
        return res.json();
      },
      async getById(id: string): Promise<CropBatchDto> {
        const res = await fetch(`${API_BASE_URL}/garden/batches/${id}`);
        if (!res.ok) throw new Error("Crop batch not found");
        return res.json();
      },
      async create(batch: CreateCropBatchRequest): Promise<CropBatchDto> {
        const res = await fetch(`${API_BASE_URL}/garden/batches`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(batch),
        });
        if (!res.ok) {
          const e: ApiError = await res.json();
          throw new Error(e.error);
        }
        return res.json();
      },
      async seed(
        id: string,
        quantity: number,
        date?: string,
      ): Promise<CropBatchDto> {
        const res = await fetch(`${API_BASE_URL}/garden/batches/${id}/seed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity, date }),
        });
        if (!res.ok) {
          const e: ApiError = await res.json();
          throw new Error(e.error);
        }
        return res.json();
      },
      async harvest(
        id: string,
        actualYield: number,
        quality?: string,
      ): Promise<CropBatchDto> {
        const res = await fetch(
          `${API_BASE_URL}/garden/batches/${id}/harvest`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ actualYield, quality }),
          },
        );
        if (!res.ok) {
          const e: ApiError = await res.json();
          throw new Error(e.error);
        }
        return res.json();
      },
      async delete(id: string): Promise<void> {
        const res = await fetch(`${API_BASE_URL}/garden/batches/${id}`, {
          method: "DELETE",
        });
        if (!res.ok && res.status !== 204) {
          const e: ApiError = await res.json();
          throw new Error(e.error);
        }
      },
    },
  },
};

// Vehicle type display helpers
export function getVehicleTypeIcon(type: string): string {
  switch (type) {
    case "Truck":
      return "🚛";
    case "RV":
      return "🚐";
    case "Car":
      return "🚗";
    case "Motorcycle":
      return "🏍️";
    default:
      return "🚙";
  }
}

export function getVehicleTypeDetails(vehicleType: VehicleTypeDto): string {
  switch (vehicleType.type) {
    case "Truck":
      return `Payload: ${
        vehicleType.payloadCapacity?.toLocaleString() ?? 0
      } lbs`;
    case "RV":
      return `${vehicleType.length ?? 0}ft, ${
        vehicleType.slideOuts ?? 0
      } slide-outs`;
    case "Car":
      return vehicleType.bodyStyle ?? "Sedan";
    case "Motorcycle":
      return `${vehicleType.engineCC ?? 0}cc`;
    default:
      return "";
  }
}
