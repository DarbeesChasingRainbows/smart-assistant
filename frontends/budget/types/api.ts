/**
 * TypeScript interfaces for Budget API
 * Generated from .NET Domain Entities
 */

// ============================================
// User Domain
// ============================================

export interface User {
  id: number;
  familyId: number;
  name: string;
  email: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface Family {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
}

// ============================================
// Pay Period Domain
// ============================================

export interface PayPeriod {
  // LifeOS shape
  key?: string;
  familyId?: string;
  // Legacy shape
  id?: number;
  familyIdNumber?: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isClosed: boolean;
  totalIncome: number;
  expectedIncome: number;
  createdAt: string;
  updatedAt: string;
  isCurrent?: boolean;
}

// ============================================
// Category Domain
// ============================================

export interface CategoryGroup {
  // LifeOS shape
  key?: string;
  familyId?: string;
  // Legacy shape
  id?: number;
  familyIdNumber?: number;
  name: string;
  sortOrder: number;
  isSystem: boolean;
  createdAt: string;
  categories: Category[];
}

export interface Category {
  // LifeOS shape
  key?: string;
  groupKey?: string;
  familyId?: string;
  // Legacy shape
  id?: number;
  categoryGroupId?: number;
  familyIdNumber?: number;
  name: string;
  targetAmount: number;
  sortOrder: number;
  isHidden: boolean;
  createdAt: string;
}

// ============================================
// Budget Assignment Domain
// ============================================

export interface BudgetAssignment {
  id: number;
  payPeriodId: number;
  categoryId: number;
  assignedAmount: number;
  createdByUserId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface IncomeEntry {
  id: number;
  payPeriodId: number;
  description: string;
  amount: number;
  receivedDate: string | null;
  createdByUserId: number | null;
  createdAt: string;
}

// ============================================
// Budget Summary (Computed)
// ============================================

export interface BudgetSummary {
  payPeriodId: number;
  payPeriodName: string;
  totalIncome: number;
  totalAssigned: number;
  unassigned: number;
  isFullyAllocated: boolean;
}

// ============================================
// API Request Types
// ============================================

export interface AssignMoneyRequest {
  payPeriodId: number;
  categoryId: number;
  amount: number;
}

export interface AddIncomeRequest {
  payPeriodId: number;
  description: string;
  amount: number;
  receivedDate?: string;
}

// ============================================
// Account Domain
// ============================================

export interface Account {
  id: number;
  familyId: number;
  name: string;
  accountType: string;
  institution: string | null;
  lastFour: string | null;
  currentBalance: number;
  clearedBalance: number;
  isOnBudget: boolean;
  isClosed: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Bill Domain
// ============================================

export interface Bill {
  id: number;
  familyId: number;
  categoryId: number | null;
  accountId: number | null;
  name: string;
  amount: number;
  dueDay: number;
  frequency: string;
  isAutoPay: boolean;
  reminderDays: number;
  isActive: boolean;
  lastPaidDate: string | null;
  nextDueDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Transaction Domain
// ============================================

export interface Transaction {
  id: number;
  familyId: number;
  accountId: number;
  categoryId: number | null;
  payPeriodId: number | null;
  payee: string | null;
  memo: string | null;
  amount: number;
  transactionDate: string;
  clearedStatus: string;
  isTransfer: boolean;
  transferAccountId: number | null;
  billId: number | null;
  isOpeningBalance: boolean;
  createdByUserId: number | null;
  createdAt: string;
  updatedAt: string;
  splits?: TransactionSplit[];
  receipt?: Receipt | null; // Linked receipt (two-way access)
  accountName?: string; // For display in unified list
}

export interface TransactionSplit {
  id: number;
  transactionId: number;
  categoryId: number | null;
  amount: number;
  memo: string | null;
  createdAt: string;
  categoryName?: string;
}

// ============================================
// Receipt Domain
// ============================================

export interface Receipt {
  id: number;
  transactionId: number | null;
  familyId: number;
  fileName: string;
  filePath: string;
  fileSize: number | null;
  mimeType: string | null;
  ocrText: string | null;
  ocrAmount: number | null;
  ocrDate: string | null;
  ocrMerchant: string | null;
  isProcessed: boolean;
  storeName: string | null;
  storeNumber: string | null;
  storeAddress: string | null;
  storeCity: string | null;
  storeState: string | null;
  storeZip: string | null;
  storePhone: string | null;
  registerNumber: string | null;
  cashierName: string | null;
  receiptNumber: string | null;
  subtotal: number | null;
  taxTotal: number | null;
  discountTotal: number | null;
  total: number | null;
  paymentMethod: string | null;
  paymentLastFour: string | null;
  paymentAccountId: number | null; // Link payment to account
  receiptDate: string | null;
  receiptTime: string | null;
  uploadedByUserId: number | null;
  createdAt: string;
  items?: ReceiptItem[];
  taxes?: ReceiptTax[];
}

export interface ReceiptItem {
  id: number;
  receiptId: number;
  transactionSplitId: number | null;
  description: string;
  quantity: number;
  unitPrice: number | null;
  extendedPrice: number;
  discountAmount: number;
  discountType: string | null;
  discountDescription: string | null;
  taxAmount: number;
  taxRate: number | null;
  taxCategory: string | null;
  isTaxable: boolean;
  sku: string | null;
  upc: string | null;
  itemNumber: string | null;
  department: string | null;
  categoryId: number | null;
  isVoided: boolean;
  isReturn: boolean;
  weight: number | null;
  weightUnit: string | null;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface CategoryBalance {
  categoryId: number;
  categoryName: string;
  groupName: string;
  assigned: number;
  spent: number;
  available: number;
}

export interface ReceiptTax {
  id: number;
  receiptId: number;
  taxName: string;
  taxJurisdiction: string | null;
  taxRate: number | null;
  taxableAmount: number | null;
  taxAmount: number;
  sortOrder: number;
  createdAt: string;
}

export interface PaymentMethod {
  id: number;
  familyId: number;
  name: string;
  accountId: number | null;
  lastFour: string | null;
  isDefault: boolean;
  createdAt: string;
  accountName?: string;
}

export interface Store {
  id: number;
  familyId: number;
  name: string;
  storeNumber: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  defaultCategoryId: number | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Goal Domain
// ============================================

export interface Goal {
  id: number;
  familyId: number;
  categoryId: number | null;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  goalType: string;
  priority: number;
  isCompleted: boolean;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  percentComplete?: number;
  amountRemaining?: number;
  monthlyContributionNeeded?: number;
}

// ============================================
// API Request Types - Extended
// ============================================

export interface CreateAccountRequest {
  name: string;
  accountType: string;
  institution?: string;
  lastFour?: string;
  initialBalance: number;
  isOnBudget: boolean;
}

export interface CreateBillRequest {
  name: string;
  amount: number;
  dueDay: number;
  categoryId?: number;
  accountId?: number;
  frequency: string;
  isAutoPay: boolean;
  reminderDays: number;
  notes?: string;
}

export interface CreateTransactionRequest {
  accountId: number;
  categoryId?: number;
  payPeriodId?: number;
  payee?: string;
  memo?: string;
  amount: number;
  transactionDate: string;
  isCleared: boolean;
  isTransfer: boolean;
  transferAccountId?: number;
  billId?: number;
}

export interface CreateGoalRequest {
  name: string;
  targetAmount: number;
  currentAmount: number;
  categoryId?: number;
  targetDate?: string;
  goalType: string;
  priority: number;
  notes?: string;
}
