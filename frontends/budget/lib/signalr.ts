/**
 * SignalR client for real-time budget updates.
 * Connects to the LifeOS API BudgetHub for live data synchronization.
 * 
 * This module is designed for client-side use only.
 */

// deno-lint-ignore no-explicit-any
let signalR: any = null;

// Lazy load SignalR on first use (client-side only)
async function getSignalR() {
  if (signalR) return signalR;
  if (typeof globalThis.document === "undefined") {
    throw new Error("SignalR client can only be used in browser");
  }
  // Dynamic import from esm.sh CDN
  signalR = await import("https://esm.sh/@microsoft/signalr@8.0.7");
  return signalR;
}

// deno-lint-ignore no-explicit-any
export type HubConnection = any;

// Event types matching backend BudgetEvents
export const BudgetEvents = {
  AssignmentUpdated: "AssignmentUpdated",
  TransactionCreated: "TransactionCreated",
  TransactionUpdated: "TransactionUpdated",
  TransactionDeleted: "TransactionDeleted",
  CategoryBalanceChanged: "CategoryBalanceChanged",
  BillPaid: "BillPaid",
  BillDueSoon: "BillDueSoon",
  GoalProgressUpdated: "GoalProgressUpdated",
  AccountBalanceChanged: "AccountBalanceChanged",
  PayPeriodChanged: "PayPeriodChanged",
  CarryoverRecalculated: "CarryoverRecalculated",
} as const;

export type BudgetEventType = (typeof BudgetEvents)[keyof typeof BudgetEvents];

// Payload types matching backend DTOs
export interface BudgetEventPayload<T = unknown> {
  eventType: string;
  familyId: string;
  data: T;
  timestamp: string;
}

export interface AssignmentUpdatedPayload {
  categoryKey: string;
  payPeriodKey: string;
  assignedAmount: number;
  available: number;
}

export interface TransactionEventPayload {
  transactionKey: string;
  categoryKey: string;
  accountKey: string;
  amount: number;
  description?: string;
}

export interface CategoryBalancePayload {
  categoryKey: string;
  categoryName: string;
  carryover: number;
  assigned: number;
  spent: number;
  available: number;
}

export interface AccountBalancePayload {
  accountKey: string;
  accountName: string;
  balance: number;
  clearedBalance: number;
}

export interface BillAlertPayload {
  billKey: string;
  billName: string;
  amount: number;
  dueDate: string;
  isOverdue: boolean;
}

export interface GoalProgressPayload {
  goalKey: string;
  goalName: string;
  currentAmount: number;
  targetAmount: number;
  percentComplete: number;
}

// Connection state
let connection: HubConnection | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Event handlers registry
type EventHandler<T = unknown> = (payload: BudgetEventPayload<T>) => void;
const eventHandlers: Map<string, Set<EventHandler>> = new Map();

/**
 * Get the SignalR hub URL based on environment
 */
function getHubUrl(): string {
  // In browser, use environment variable or default
  // For Docker, the API is at http://api:5120
  // For local dev, it's at http://localhost:5120
  // deno-lint-ignore no-explicit-any
  const apiHost = (globalThis as any).VITE_API_URL || "http://localhost:5120";
  return `${apiHost}/hubs/budget`;
}

/**
 * Initialize and start the SignalR connection
 */
export async function connectToHub(familyId: string = "default"): Promise<HubConnection> {
  const sr = await getSignalR();
  
  if (connection?.state === sr.HubConnectionState.Connected) {
    console.log("[SignalR] Already connected");
    return connection;
  }

  const hubUrl = getHubUrl();
  console.log("[SignalR] Connecting to:", hubUrl);

  connection = new sr.HubConnectionBuilder()
    .withUrl(hubUrl, {
      withCredentials: true,
    })
    .withAutomaticReconnect({
      // deno-lint-ignore no-explicit-any
      nextRetryDelayInMilliseconds: (retryContext: any) => {
        // Exponential backoff: 0, 2, 4, 8, 16 seconds
        if (retryContext.previousRetryCount >= MAX_RECONNECT_ATTEMPTS) {
          return null; // Stop reconnecting
        }
        return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 16000);
      },
    })
    .configureLogging(sr.LogLevel.Information)
    .build();

  // Set up connection lifecycle handlers
  // deno-lint-ignore no-explicit-any
  connection.onreconnecting((error: any) => {
    console.warn("[SignalR] Reconnecting...", error);
    reconnectAttempts++;
  });

  // deno-lint-ignore no-explicit-any
  connection.onreconnected((connectionId: any) => {
    console.log("[SignalR] Reconnected:", connectionId);
    reconnectAttempts = 0;
    // Rejoin family group after reconnect
    connection?.invoke("JoinFamily", familyId).catch(console.error);
  });

  // deno-lint-ignore no-explicit-any
  connection.onclose((error: any) => {
    console.warn("[SignalR] Connection closed:", error);
    connection = null;
  });

  // Register all event handlers
  for (const eventType of Object.values(BudgetEvents)) {
    connection.on(eventType, (payload: BudgetEventPayload) => {
      console.log(`[SignalR] Received ${eventType}:`, payload);
      const handlers = eventHandlers.get(eventType);
      if (handlers) {
        handlers.forEach((handler) => handler(payload));
      }
    });
  }

  try {
    await connection.start();
    console.log("[SignalR] Connected successfully");

    // Join family group
    await connection.invoke("JoinFamily", familyId);
    console.log(`[SignalR] Joined family: ${familyId}`);

    return connection;
  } catch (error) {
    console.error("[SignalR] Connection failed:", error);
    throw error;
  }
}

/**
 * Disconnect from the SignalR hub
 */
export async function disconnectFromHub(): Promise<void> {
  if (connection) {
    await connection.stop();
    connection = null;
    console.log("[SignalR] Disconnected");
  }
}

/**
 * Subscribe to a specific budget event
 */
export function subscribe<T = unknown>(
  eventType: BudgetEventType,
  handler: EventHandler<T>,
): () => void {
  if (!eventHandlers.has(eventType)) {
    eventHandlers.set(eventType, new Set());
  }
  eventHandlers.get(eventType)!.add(handler as EventHandler);

  // Return unsubscribe function
  return () => {
    eventHandlers.get(eventType)?.delete(handler as EventHandler);
  };
}

/**
 * Check if connected to the hub
 */
export function isConnected(): boolean {
  if (!signalR || !connection) return false;
  return connection?.state === signalR.HubConnectionState?.Connected;
}

/**
 * Get current connection state
 */
export function getConnectionState(): string {
  if (!connection) return "Disconnected";
  if (!signalR) return "Unknown";
  
  const states = signalR.HubConnectionState;
  switch (connection.state) {
    case states?.Connected:
      return "Connected";
    case states?.Connecting:
      return "Connecting";
    case states?.Reconnecting:
      return "Reconnecting";
    case states?.Disconnected:
      return "Disconnected";
    default:
      return "Unknown";
  }
}
