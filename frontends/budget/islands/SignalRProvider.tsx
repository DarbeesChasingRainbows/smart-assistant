import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { toast } from "./Toast.tsx";

interface Props {
  familyId?: string;
  children: preact.ComponentChildren;
}

// Connection state type
type ConnectionState = "Disconnected" | "Connecting" | "Connected" | "Reconnecting" | "Error";

/**
 * SignalR Provider Island - Manages real-time connection to the budget hub.
 * Wraps children and provides connection status indicator.
 */
export default function SignalRProvider({ familyId = "default", children }: Props) {
  const connectionState = useSignal<ConnectionState>("Disconnected");
  const lastEvent = useSignal<string | null>(null);

  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const initConnection = async () => {
      // Only run in browser
      if (typeof globalThis.document === "undefined") return;

      connectionState.value = "Connecting";

      try {
        // Dynamically import the SignalR client
        const signalRModule = await import("../lib/signalr.ts");
        
        // Connect to hub
        await signalRModule.connectToHub(familyId);
        connectionState.value = "Connected";
        
        // Subscribe to events and show toasts
        const unsubAssignment = signalRModule.subscribe(
          signalRModule.BudgetEvents.AssignmentUpdated,
          (payload) => {
            lastEvent.value = `Assignment updated: ${JSON.stringify(payload.data)}`;
            // Trigger a page refresh or state update
            toast.success("Budget assignment updated");
          }
        );

        const unsubTransaction = signalRModule.subscribe(
          signalRModule.BudgetEvents.TransactionCreated,
          (_payload) => {
            lastEvent.value = `Transaction created`;
            toast.success("New transaction recorded");
          }
        );

        const unsubBalance = signalRModule.subscribe(
          signalRModule.BudgetEvents.CategoryBalanceChanged,
          (_payload) => {
            lastEvent.value = `Balance changed`;
            // Could trigger a refresh of category balances
          }
        );

        const unsubBillAlert = signalRModule.subscribe(
          signalRModule.BudgetEvents.BillDueSoon,
          (payload) => {
            // deno-lint-ignore no-explicit-any
            const data = payload.data as any;
            if (data.isOverdue) {
              toast.error(`Bill overdue: ${data.billName}`);
            } else {
              toast.success(`Bill due soon: ${data.billName}`);
            }
          }
        );

        const unsubCarryover = signalRModule.subscribe(
          signalRModule.BudgetEvents.CarryoverRecalculated,
          () => {
            toast.success("Carryovers recalculated - refreshing...");
            setTimeout(() => globalThis.location?.reload(), 1500);
          }
        );

        cleanup = () => {
          unsubAssignment();
          unsubTransaction();
          unsubBalance();
          unsubBillAlert();
          unsubCarryover();
          signalRModule.disconnectFromHub();
        };

      } catch (error) {
        console.error("[SignalR] Connection error:", error);
        connectionState.value = "Error";
      }
    };

    initConnection();

    return () => {
      if (cleanup) cleanup();
    };
  }, [familyId]);

  // Connection status indicator
  const statusColor = {
    Disconnected: "bg-gray-500",
    Connecting: "bg-yellow-500 animate-pulse",
    Connected: "bg-green-500",
    Reconnecting: "bg-yellow-500 animate-pulse",
    Error: "bg-red-500",
  }[connectionState.value];

  return (
    <div class="relative">
      {/* Connection status indicator - small dot in corner */}
      <div
        class="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-[#1a1a1a] border border-[#333] rounded-full px-3 py-1.5 shadow-lg"
        title={`Real-time: ${connectionState.value}`}
      >
        <div class={`w-2 h-2 rounded-full ${statusColor}`} />
        <span class="text-[10px] font-mono text-[#888] uppercase">
          {connectionState.value === "Connected" ? "LIVE" : connectionState.value}
        </span>
      </div>
      {children}
    </div>
  );
}
