import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

interface Props {
  vehicleId: string;
  onSuccess?: () => void;
}

export default function AddMaintenanceForm({ vehicleId, onSuccess }: Props) {
  const description = useSignal("");
  const cost = useSignal<number | null>(null);
  const date = useSignal(new Date().toISOString().slice(0, 10));
  const submitting = useSignal(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    submitting.value = true;
    try {
      const res = await fetch(`/api/v1/vehicles/${vehicleId}/maintenance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          description: description.value,
          cost: cost.value,
          date: date.value,
        }),
      });
      if (!res.ok) throw new Error(res.statusText);
      // reset & notify parent
      description.value = "";
      cost.value = null;
      onSuccess?.();
    } catch (err) {
      console.error(err);
      alert("Failed to add maintenance entry.");
    } finally {
      submitting.value = false;
    }
  }

  return (
    <form onSubmit={handleSubmit} class="card bg-white shadow-md p-4 space-y-4">
      <h3 class="card-title text-lg">Add Maintenance Entry</h3>
      <label class="form-control">
        <span class="label label-text">Description</span>
        <textarea
          class="textarea textarea-bordered h-24"
          value={description.value}
          onInput={(e) => (description.value = (e.target as HTMLTextAreaElement).value)}
          required
        />
      </label>
      <label class="form-control">
        <span class="label label-text">Cost ($)</span>
        <input
          type="number"
          step="0.01"
          class="input input-bordered"
          value={cost.value ?? ""}
          onInput={(e) => (cost.value = Number((e.target as HTMLInputElement).value) || null)}
        />
      </label>
      <label class="form-control">
        <span class="label label-text">Date</span>
        <input
          type="date"
          class="input input-bordered"
          value={date.value}
          onInput={(e) => (date.value = (e.target as HTMLInputElement).value)}
          required
        />
      </label>
      <button
        type="submit"
        class="btn btn-primary btn-sm"
        disabled={submitting.value}
      >
        {submitting.value ? "Saving…" : "Save Entry"}
      </button>
    </form>
  );
}
