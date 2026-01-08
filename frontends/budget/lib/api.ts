/**
 * Budget API Client
 * Handles all communication with the .NET backend
 */

import type {
  User,
  PayPeriod,
  CategoryGroup,
  BudgetAssignment,
  BudgetSummary,
  IncomeEntry,
  AssignMoneyRequest,
  AddIncomeRequest,
} from "../types/api.ts";

const API_BASE = Deno.env.get("VITE_API_URL") || "http://localhost:5120/api";

/**
 * Get the current user ID from cookie/header for Phase 1
 */
function getUserIdHeader(): HeadersInit {
  // Phase 1: Read from cookie or use default
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/X-Test-User-Id=(\d+)/);
    if (match) {
      return { "X-Test-User-Id": match[1] };
    }
  }
  return {};
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getUserIdHeader(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ============================================
// User API
// ============================================

export function getUsers(): Promise<User[]> {
  return fetchApi<User[]>("/v1/budget/users");
}

export function getUserById(id: number): Promise<User> {
  return fetchApi<User>(`/v1/budget/users/${id}`);
}

// ============================================
// Pay Period API
// ============================================

export function getCurrentPeriod(): Promise<PayPeriod> {
  return fetchApi<PayPeriod>("/v1/budget/pay-periods/current");
}

export function getPayPeriods(): Promise<PayPeriod[]> {
  return fetchApi<PayPeriod[]>("/v1/budget/pay-periods");
}

export function getBudgetSummary(payPeriodId: string): Promise<BudgetSummary> {
  return fetchApi<BudgetSummary>(`/v1/budget/pay-periods/${payPeriodId}/summary`);
}

// ============================================
// Category API
// ============================================

export function getCategories(): Promise<CategoryGroup[]> {
  return fetchApi<CategoryGroup[]>("/v1/budget/category-groups");
}

// ============================================
// Budget API
// ============================================

export function getAssignments(payPeriodId: string): Promise<BudgetAssignment[]> {
  return fetchApi<BudgetAssignment[]>(`/v1/budget/assignments?payPeriodKey=${payPeriodId}`);
}

export function assignMoney(request: AssignMoneyRequest): Promise<BudgetAssignment> {
  return fetchApi<BudgetAssignment>("/v1/budget/assignments/assign", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function getIncomeEntries(payPeriodId: string): Promise<IncomeEntry[]> {
  return fetchApi<IncomeEntry[]>(`/v1/budget/income?payPeriodKey=${payPeriodId}`);
}

export function addIncome(request: AddIncomeRequest): Promise<IncomeEntry> {
  return fetchApi<IncomeEntry>("/v1/budget/income", {
    method: "POST",
    body: JSON.stringify(request),
  });
}
