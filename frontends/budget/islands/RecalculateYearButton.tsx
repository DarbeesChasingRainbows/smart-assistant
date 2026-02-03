import { useSignal } from "@preact/signals";
import { toast } from "./Toast.tsx";

interface Props {
  payPeriodKey: string;
}

const API_BASE = globalThis.location?.pathname?.startsWith("/budget")
  ? "/budget/api/v1/budget"
  : "/api/v1/budget";

export default function RecalculateYearButton({ payPeriodKey }: Props) {
  const isRecalculating = useSignal(false);

  const recalculateYear = async () => {
    if (!payPeriodKey) {
      toast.error("No active pay period");
      return;
    }

    const confirmed = globalThis.confirm(
      "Recalculate carryovers for the entire year? This will update all category balances based on historical data.",
    );
    if (!confirmed) return;

    isRecalculating.value = true;
    try {
      const res = await fetch(
        `${API_BASE}/pay-periods/${payPeriodKey}/recalculate-year`,
        { method: "POST" },
      );

      if (res.ok) {
        toast.success("Year recalculated! Refreshing...");
        setTimeout(() => globalThis.location?.reload(), 1000);
      } else {
        const error = await res.text();
        toast.error(`Recalculation failed: ${error}`);
      }
    } catch (error) {
      console.error("Error recalculating year:", error);
      toast.error("Error recalculating year");
    } finally {
      isRecalculating.value = false;
    }
  };

  return (
    <button
      type="button"
      class="btn btn-sm min-h-[44px] btn-ghost border border-[#333] hover:border-[#ffb000] text-[#888] hover:text-[#ffb000] font-mono"
      onClick={recalculateYear}
      disabled={isRecalculating.value}
      title="Recalculate all carryovers for the year"
    >
      {isRecalculating.value
        ? <span class="loading loading-spinner loading-xs"></span>
        : "↻ RECALC YEAR"}
    </button>
  );
}
