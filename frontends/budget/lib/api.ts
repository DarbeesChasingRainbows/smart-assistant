/**
 * Budget API Client
 * Handles all communication with the .NET backend
 * Includes retry logic, offline detection, and request queuing
 */

import type {
  AddIncomeRequest,
  AssignMoneyRequest,
  BudgetAssignment,
  BudgetSummary,
  CategoryGroup,
  IncomeEntry,
  PayPeriod,
  User,
} from "../types/api.ts";
import { signal } from "@preact/signals";

// DYNAMIC BASE URL LOGIC
function getApiBase(): string {
  // Browser: Use relative path for Caddy proxy
  if (typeof document !== "undefined") {
    return "/api";
  }
  
  // Server (Deno): Use internal Docker DNS
  // We ignore VITE_API_URL here if it is relative (starts with /) 
  // because Deno fetch requires an absolute URL.
  const envUrl = Deno.env.get("VITE_API_URL");
  if (envUrl && envUrl.startsWith("http")) {
    return envUrl;
  }
  return "http://api:5120/api";
}

const API_BASE = getApiBase();

// ============================================
// Offline Detection & Request Queue
// ============================================

export const isOnline = signal(
  typeof navigator !== "undefined" ? navigator.onLine : true,
);

// Queue for failed requests to retry when back online
interface QueuedRequest {
  id: string;
  endpoint: string;
  options: RequestInit;
  retryCount: number;
}

const requestQueue = signal<QueuedRequest[]>([]);

// Set up online/offline listeners (client-side only)
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    isOnline.value = true;
    console.log("[API] Back online - processing queued requests");
    processRequestQueue();
  });

  window.addEventListener("offline", () => {
    isOnline.value = false;
    console.log("[API] Went offline");
  });
}

/**
 * Process queued requests when connection is restored
 */
async function processRequestQueue() {
  const queue = [...requestQueue.value];
  requestQueue.value = [];

  for (const req of queue) {
    try {
      await fetchApi(req.endpoint, req.options, { skipQueue: true });
      console.log(`[API] Successfully retried: ${req.endpoint}`);
    } catch (error) {
      console.error(`[API] Failed to retry: ${req.endpoint}`, error);
      // Re-queue if still failing and under retry limit
      if (req.retryCount < 3) {
        requestQueue.value = [
          ...requestQueue.value,
          { ...req, retryCount: req.retryCount + 1 },
        ];
      }
    }
  }
}

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

// ============================================
// API Error Classes
// ============================================

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message?: string,
  ) {
    super(message || `API Error: ${status} ${statusText}`);
    this.name = "ApiError";
  }
}

export class NetworkError extends Error {
  constructor(message = "Network request failed") {
    super(message);
    this.name = "NetworkError";
  }
}

// ============================================
// Retry Logic
// ============================================

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  skipQueue?: boolean;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determine if error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof NetworkError) return true;
  if (error instanceof ApiError) {
    // Retry on 5xx server errors and 429 rate limit
    return error.status >= 500 || error.status === 429;
  }
  return false;
}

/**
 * Enhanced fetch with retry logic and exponential backoff
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    skipQueue = false,
  } = retryOptions;

  let lastError: Error | null = null;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check if offline before making request
      if (!isOnline.value && !skipQueue) {
        throw new NetworkError("Device is offline");
      }

      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...getUserIdHeader(),
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new ApiError(response.status, response.statusText);
      }

      return await response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If offline and this is a write operation, queue it
      if (
        !isOnline.value &&
        !skipQueue &&
        (options.method === "POST" || options.method === "PUT" ||
          options.method === "PATCH" || options.method === "DELETE")
      ) {
        const queuedReq: QueuedRequest = {
          id: `${Date.now()}-${Math.random()}`,
          endpoint,
          options,
          retryCount: 0,
        };
        requestQueue.value = [...requestQueue.value, queuedReq];
        console.log(`[API] Queued request for later: ${endpoint}`);
      }

      // Don't retry if not retryable or if this is the last attempt
      if (!isRetryableError(lastError) || attempt === maxRetries) {
        break;
      }

      // Wait before retrying (exponential backoff)
      console.log(
        `[API] Retrying ${endpoint} in ${delay}ms (attempt ${
          attempt + 1
        }/${maxRetries})`,
      );
      await sleep(delay);
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  // All retries exhausted
  throw lastError || new Error("Request failed");
}

// ============================================
// API Client Methods
// ============================================

/**
 * Wrapper for GET requests (no retry queue)
 */
async function fetchApiGet<T>(endpoint: string): Promise<T> {
  return fetchApi<T>(endpoint, { method: "GET" });
}

/**
 * Wrapper for POST requests (with retry queue support)
 */
async function fetchApiPost<T>(
  endpoint: string,
  body: unknown,
): Promise<T> {
  return fetchApi<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ============================================
// User API
// ============================================

export function getUsers(): Promise<User[]> {
  return fetchApiGet<User[]>("/v1/budget/users");
}

export function getUserById(id: number): Promise<User> {
  return fetchApiGet<User>(`/v1/budget/users/${id}`);
}

// ============================================
// Pay Period API
// ============================================

export function getCurrentPeriod(): Promise<PayPeriod> {
  return fetchApiGet<PayPeriod>("/v1/budget/pay-periods/current");
}

export function getPayPeriods(): Promise<PayPeriod[]> {
  return fetchApiGet<PayPeriod[]>("/v1/budget/pay-periods");
}

export function getBudgetSummary(payPeriodId: string): Promise<BudgetSummary> {
  return fetchApiGet<BudgetSummary>(
    `/v1/budget/pay-periods/${payPeriodId}/summary`,
  );
}

// ============================================
// Category API
// ============================================

export function getCategories(): Promise<CategoryGroup[]> {
  return fetchApiGet<CategoryGroup[]>("/v1/budget/category-groups");
}

// ============================================
// Budget API
// ============================================

export function getAssignments(
  payPeriodId: string,
): Promise<BudgetAssignment[]> {
  return fetchApiGet<BudgetAssignment[]>(
    `/v1/budget/assignments?payPeriodKey=${payPeriodId}`,
  );
}

export function assignMoney(
  request: AssignMoneyRequest,
): Promise<BudgetAssignment> {
  return fetchApiPost<BudgetAssignment>(
    "/v1/budget/assignments/assign",
    request,
  );
}

export function getIncomeEntries(payPeriodId: string): Promise<IncomeEntry[]> {
  return fetchApiGet<IncomeEntry[]>(
    `/v1/budget/income?payPeriodKey=${payPeriodId}`,
  );
}

export function addIncome(request: AddIncomeRequest): Promise<IncomeEntry> {
  return fetchApiPost<IncomeEntry>("/v1/budget/income", request);
}

// ============================================
// Queue Management Utilities
// ============================================

/**
 * Get current request queue status
 */
export function getQueueStatus() {
  return {
    isOnline: isOnline.value,
    queuedRequests: requestQueue.value.length,
  };
}

/**
 * Clear all queued requests
 */
export function clearRequestQueue() {
  requestQueue.value = [];
}

/**
 * Manually retry queued requests
 */
export function retryQueuedRequests() {
  if (isOnline.value) {
    processRequestQueue();
  }
}
