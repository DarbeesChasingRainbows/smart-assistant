import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type {
  ComponentDto,
  CreateComponentRequest,
  CreateVehicleMaintenanceRequest,
  MaintenanceItemDto,
  VehicleDto,
  VehicleMaintenanceDto,
} from "../../lib/api.ts";
import {
  api,
  getVehicleTypeDetails,
  getVehicleTypeIcon,
} from "../../lib/api.ts";

export default function VehicleDetailIsland(
  { vehicleId }: { vehicleId: string },
) {
  const vehicle = useSignal<VehicleDto | null>(null);
  const loading = useSignal(true);
  const error = useSignal<string | null>(null);
  const editingMileage = useSignal(false);
  const newMileage = useSignal(0);

  const installedComponents = useSignal<ComponentDto[]>([]);
  const maintenanceHistory = useSignal<VehicleMaintenanceDto[]>([]);
  const loadingComponents = useSignal(false);
  const loadingMaintenance = useSignal(false);

  const showAddComponent = useSignal(false);
  const showLogMaintenance = useSignal(false);

  // Add component form state
  const componentName = useSignal("");
  const componentCategory = useSignal("Other");
  const componentPartNumber = useSignal<string | null>(null);
  const componentSaving = useSignal(false);

  // Maintenance form state
  const maintenanceDate = useSignal(new Date().toISOString().slice(0, 10));
  const maintenanceMileage = useSignal<number | null>(null);
  const maintenanceDescription = useSignal("");
  const maintenanceSaving = useSignal(false);
  const maintenanceItems = useSignal<MaintenanceItemDto[]>([
    { type: "Part", name: "", url: null, quantity: null, unit: null },
  ]);

  useEffect(() => {
    loadVehicle();
  }, [vehicleId]);

  async function loadVehicle() {
    loading.value = true;
    error.value = null;
    try {
      vehicle.value = await api.vehicles.getById(vehicleId);
      newMileage.value = vehicle.value.currentMileage;
      maintenanceMileage.value = vehicle.value.currentMileage;
      await Promise.all([loadInstalledComponents(), loadMaintenanceHistory()]);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load vehicle";
    } finally {
      loading.value = false;
    }
  }

  async function loadInstalledComponents() {
    loadingComponents.value = true;
    try {
      installedComponents.value = await api.components.getByVehicle(vehicleId);
    } catch (e) {
      error.value = e instanceof Error
        ? e.message
        : "Failed to load components";
    } finally {
      loadingComponents.value = false;
    }
  }

  async function loadMaintenanceHistory() {
    loadingMaintenance.value = true;
    try {
      maintenanceHistory.value = await api.maintenance.listByVehicle(vehicleId);
    } catch (e) {
      error.value = e instanceof Error
        ? e.message
        : "Failed to load maintenance history";
    } finally {
      loadingMaintenance.value = false;
    }
  }

  function resetAddComponentForm() {
    componentName.value = "";
    componentCategory.value = "Other";
    componentPartNumber.value = null;
  }

  async function submitAddComponent() {
    if (!componentName.value.trim()) {
      error.value = "Component name is required";
      return;
    }

    componentSaving.value = true;
    error.value = null;
    try {
      const req: CreateComponentRequest = {
        name: componentName.value.trim(),
        category: componentCategory.value.trim() || "Other",
        partNumber: componentPartNumber.value?.trim() || null,
      };

      const created = await api.components.create(req);
      await api.components.install(created.id, { vehicleId });
      showAddComponent.value = false;
      resetAddComponentForm();
      await loadInstalledComponents();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to add component";
    } finally {
      componentSaving.value = false;
    }
  }

  function resetMaintenanceForm() {
    maintenanceDate.value = new Date().toISOString().slice(0, 10);
    maintenanceMileage.value = vehicle.value?.currentMileage ?? null;
    maintenanceDescription.value = "";
    maintenanceItems.value = [{
      type: "Part",
      name: "",
      url: null,
      quantity: null,
      unit: null,
    }];
  }

  function addMaintenanceItem() {
    maintenanceItems.value = [...maintenanceItems.value, {
      type: "Part",
      name: "",
      url: null,
      quantity: null,
      unit: null,
    }];
  }

  function removeMaintenanceItem(index: number) {
    maintenanceItems.value = maintenanceItems.value.filter((_, i) =>
      i !== index
    );
  }

  async function computeIdempotencyKey(
    payload: CreateVehicleMaintenanceRequest,
  ): Promise<string> {
    const material = `${vehicleId}|${payload.date}|${
      payload.mileage ?? ""
    }|${payload.description}|${JSON.stringify(payload.items)}`;
    const bytes = new TextEncoder().encode(material);
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    const hex = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `maint-${hex}`;
  }

  async function submitMaintenance() {
    if (!maintenanceDescription.value.trim()) {
      error.value = "Description is required";
      return;
    }

    maintenanceSaving.value = true;
    error.value = null;
    try {
      const items = maintenanceItems.value
        .map((i) => ({
          type: i.type?.trim() || "Part",
          name: i.name?.trim() || "",
          url: i.url?.trim() || null,
          quantity: i.quantity ?? null,
          unit: i.unit?.trim() || null,
        }))
        .filter((i) => i.name.length > 0);

      const payload: CreateVehicleMaintenanceRequest = {
        date: new Date(maintenanceDate.value + "T00:00:00").toISOString(),
        mileage: maintenanceMileage.value,
        description: maintenanceDescription.value.trim(),
        cost: null,
        performedBy: null,
        items,
      };

      const key = await computeIdempotencyKey(payload);
      await api.maintenance.createForVehicle(vehicleId, payload, key);
      showLogMaintenance.value = false;
      resetMaintenanceForm();
      await loadMaintenanceHistory();
    } catch (e) {
      error.value = e instanceof Error
        ? e.message
        : "Failed to log maintenance";
    } finally {
      maintenanceSaving.value = false;
    }
  }

  async function updateMileage() {
    if (!vehicle.value) return;
    try {
      const updated = await api.vehicles.update(vehicleId, {
        currentMileage: newMileage.value,
      });
      vehicle.value = updated;
      editingMileage.value = false;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to update mileage";
    }
  }

  async function toggleActive() {
    if (!vehicle.value) return;
    try {
      const updated = await api.vehicles.update(vehicleId, {
        isActive: !vehicle.value.isActive,
      });
      vehicle.value = updated;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to update status";
    }
  }

  async function deleteComponent(componentId: string) {
    if (!confirm("Are you sure you want to delete this component?")) return;
    try {
      await api.components.delete(componentId);
      await loadInstalledComponents();
    } catch (e) {
      error.value = e instanceof Error
        ? e.message
        : "Failed to delete component";
    }
  }

  async function uninstallComponent(componentId: string) {
    try {
      await api.components.uninstall(componentId);
      await loadInstalledComponents();
    } catch (e) {
      error.value = e instanceof Error
        ? e.message
        : "Failed to uninstall component";
    }
  }

  async function deleteMaintenance(maintenanceId: string) {
    if (!confirm("Are you sure you want to delete this maintenance record?")) {
      return;
    }
    try {
      await api.maintenance.delete(vehicleId, maintenanceId);
      await loadMaintenanceHistory();
    } catch (e) {
      error.value = e instanceof Error
        ? e.message
        : "Failed to delete maintenance record";
    }
  }

  async function deleteVehicle() {
    if (
      !confirm(
        "Are you sure you want to delete this vehicle? This action cannot be undone.",
      )
    ) return;
    try {
      await api.vehicles.delete(vehicleId);
      globalThis.location.href = "/garage";
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to delete vehicle";
    }
  }

  if (loading.value) {
    return (
      <div class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error.value || !vehicle.value) {
    return (
      <div class="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg">
        {error.value || "Vehicle not found"}
      </div>
    );
  }

  const v = vehicle.value;

  return (
    <div class="space-y-6">
      <div
        class={`bg-white rounded-xl shadow-lg overflow-hidden border-l-4 ${
          v.isActive ? "border-green-500" : "border-gray-400"
        }`}
      >
        <div class="p-6">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-4">
              <span class="text-5xl">
                {getVehicleTypeIcon(v.vehicleType.type)}
              </span>
              <div>
                <h1 class="text-3xl font-bold text-gray-900">
                  {v.year} {v.make} {v.model}
                </h1>
                <p class="text-lg text-gray-500">
                  {getVehicleTypeDetails(v.vehicleType)}
                </p>
              </div>
            </div>
            <div class="flex gap-2">
              <button
                type="button"
                onClick={toggleActive}
                class={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  v.isActive
                    ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                    : "bg-green-100 text-green-700 hover:bg-green-200"
                }`}
              >
                {v.isActive ? "Deactivate" : "Activate"}
              </button>
              <button
                type="button"
                onClick={deleteVehicle}
                class="px-4 py-2 rounded-lg font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white rounded-xl shadow-md p-6">
          <h2 class="text-xl font-bold text-gray-800 mb-4">
            Vehicle Information
          </h2>
          <dl class="space-y-3">
            <div class="flex justify-between py-2 border-b">
              <dt class="text-gray-500">VIN</dt>
              <dd class="font-mono text-sm">{v.vin}</dd>
            </div>
            <div class="flex justify-between py-2 border-b">
              <dt class="text-gray-500">License Plate</dt>
              <dd class="font-semibold">{v.licensePlate || "—"}</dd>
            </div>
            <div class="flex justify-between py-2 border-b">
              <dt class="text-gray-500">Status</dt>
              <dd>
                <span
                  class={`px-2 py-1 rounded-full text-xs font-medium ${
                    v.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {v.isActive ? "Active" : "Inactive"}
                </span>
              </dd>
            </div>
            <div class="flex justify-between py-2">
              <dt class="text-gray-500">Added</dt>
              <dd>{new Date(v.createdAt).toLocaleDateString()}</dd>
            </div>
          </dl>
        </div>

        <div class="bg-white rounded-xl shadow-md p-6">
          <h2 class="text-xl font-bold text-gray-800 mb-4">Mileage</h2>

          {editingMileage.value
            ? (
              <div class="space-y-4">
                <input
                  type="number"
                  min={v.currentMileage}
                  class="w-full px-4 py-3 text-2xl border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={newMileage.value}
                  onInput={(e) =>
                    newMileage.value =
                      parseInt((e.target as HTMLInputElement).value) || 0}
                />
                <div class="flex gap-2">
                  <button
                    type="button"
                    onClick={updateMileage}
                    class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      editingMileage.value = false;
                      newMileage.value = v.currentMileage;
                    }}
                    class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )
            : (
              <div class="text-center">
                <p class="text-4xl font-bold text-gray-900">
                  {v.currentMileage.toLocaleString()}
                </p>
                <p class="text-gray-500 mb-4">miles</p>
                <button
                  type="button"
                  onClick={() => editingMileage.value = true}
                  class="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                >
                  Update Mileage
                </button>
              </div>
            )}
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-md p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold text-gray-800">Installed Components</h2>
          <button
            type="button"
            onClick={() => {
              showAddComponent.value = true;
              resetAddComponentForm();
            }}
            class="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
          >
            + Add Component
          </button>
        </div>
        {loadingComponents.value
          ? <p class="text-gray-500 text-center py-8">Loading components…</p>
          : installedComponents.value.length === 0
          ? (
            <p class="text-gray-500 text-center py-8">
              No components installed yet
            </p>
          )
          : (
            <div class="space-y-3">
              {installedComponents.value.map((c) => (
                <div
                  key={c.id}
                  class="border rounded-lg p-4 flex items-start justify-between"
                >
                  <div>
                    <div class="font-semibold text-gray-900">{c.name}</div>
                    <div class="text-sm text-gray-500">{c.category}</div>
                    <div class="text-sm text-gray-500">
                      {c.partNumber ? `P/N: ${c.partNumber}` : "P/N: —"}
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-gray-500">
                      {c.location?.type === "InstalledOn"
                        ? "Installed"
                        : "In Storage"}
                    </span>
                    {c.location?.type === "InstalledOn" && (
                      <button
                        type="button"
                        onClick={() => uninstallComponent(c.id)}
                        class="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                      >
                        Uninstall
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteComponent(c.id)}
                      class="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

      <div class="bg-white rounded-xl shadow-md p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold text-gray-800">Maintenance History</h2>
          <button
            type="button"
            onClick={() => {
              showLogMaintenance.value = true;
              resetMaintenanceForm();
            }}
            class="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
          >
            + Log Maintenance
          </button>
        </div>
        {loadingMaintenance.value
          ? <p class="text-gray-500 text-center py-8">Loading maintenance…</p>
          : maintenanceHistory.value.length === 0
          ? (
            <p class="text-gray-500 text-center py-8">
              No maintenance records yet
            </p>
          )
          : (
            <div class="space-y-3">
              {maintenanceHistory.value.map((m) => (
                <div key={m.id} class="border rounded-lg p-4">
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <div class="font-semibold text-gray-900">
                        {m.description}
                      </div>
                      <div class="text-sm text-gray-500">
                        {new Date(m.date).toLocaleDateString()} •{" "}
                        {m.mileage ? `${m.mileage.toLocaleString()} mi` : "—"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        deleteMaintenance(m.id)}
                      class="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                  {m.items?.length
                    ? (
                      <div class="mt-3 space-y-1">
                        {m.items.map((it, idx) => (
                          <div key={idx} class="text-sm text-gray-600">
                            {it.type}: {it.name}
                            {it.quantity != null
                              ? ` (${it.quantity}${
                                it.unit ? ` ${it.unit}` : ""
                              })`
                              : ""}
                          </div>
                        ))}
                      </div>
                    )
                    : null}
                </div>
              ))}
            </div>
          )}
      </div>

      {showAddComponent.value
        ? (
          <div class="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
            <div class="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-bold text-gray-900">Add Component</h3>
                <button
                  type="button"
                  class="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg"
                  onClick={() => {
                    showAddComponent.value = false;
                    resetAddComponentForm();
                  }}
                >
                  Close
                </button>
              </div>

              <div class="space-y-3">
                <div>
                  <label class="block text-sm text-gray-600 mb-1">Name</label>
                  <input
                    class="w-full px-3 py-2 border rounded-lg"
                    value={componentName.value}
                    onInput={(e) =>
                      componentName.value =
                        (e.target as HTMLInputElement).value}
                  />
                </div>
                <div>
                  <label class="block text-sm text-gray-600 mb-1">
                    Category
                  </label>
                  <input
                    class="w-full px-3 py-2 border rounded-lg"
                    value={componentCategory.value}
                    onInput={(e) =>
                      componentCategory.value =
                        (e.target as HTMLInputElement).value}
                  />
                </div>
                <div>
                  <label class="block text-sm text-gray-600 mb-1">
                    Part Number (optional)
                  </label>
                  <input
                    class="w-full px-3 py-2 border rounded-lg"
                    value={componentPartNumber.value ?? ""}
                    onInput={(e) =>
                      componentPartNumber.value =
                        (e.target as HTMLInputElement).value}
                  />
                </div>
              </div>

              <div class="mt-6 flex gap-2">
                <button
                  type="button"
                  class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={componentSaving.value}
                  onClick={submitAddComponent}
                >
                  {componentSaving.value ? "Saving…" : "Create & Install"}
                </button>
              </div>
            </div>
          </div>
        )
        : null}

      {showLogMaintenance.value
        ? (
          <div class="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
            <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-bold text-gray-900">Log Maintenance</h3>
                <button
                  type="button"
                  class="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg"
                  onClick={() => {
                    showLogMaintenance.value = false;
                    resetMaintenanceForm();
                  }}
                >
                  Close
                </button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label class="block text-sm text-gray-600 mb-1">Date</label>
                  <input
                    type="date"
                    class="w-full px-3 py-2 border rounded-lg"
                    value={maintenanceDate.value}
                    onInput={(e) =>
                      maintenanceDate.value =
                        (e.target as HTMLInputElement).value}
                  />
                </div>
                <div>
                  <label class="block text-sm text-gray-600 mb-1">
                    Mileage
                  </label>
                  <input
                    type="number"
                    class="w-full px-3 py-2 border rounded-lg"
                    value={maintenanceMileage.value ?? ""}
                    onInput={(e) => {
                      const v = (e.target as HTMLInputElement).value;
                      maintenanceMileage.value = v ? parseInt(v) : null;
                    }}
                  />
                </div>
                <div class="md:col-span-3">
                  <label class="block text-sm text-gray-600 mb-1">
                    Description
                  </label>
                  <input
                    class="w-full px-3 py-2 border rounded-lg"
                    value={maintenanceDescription.value}
                    onInput={(e) =>
                      maintenanceDescription.value =
                        (e.target as HTMLInputElement).value}
                  />
                </div>
              </div>

              <div class="mt-4">
                <div class="flex items-center justify-between mb-2">
                  <h4 class="font-semibold text-gray-800">
                    Items (parts/fluids)
                  </h4>
                  <button
                    type="button"
                    class="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg"
                    onClick={addMaintenanceItem}
                  >
                    + Add Item
                  </button>
                </div>
                <div class="space-y-3">
                  {maintenanceItems.value.map((it, idx) => (
                    <div key={idx} class="border rounded-lg p-3">
                      <div class="grid grid-cols-1 md:grid-cols-6 gap-2">
                        <input
                          class="md:col-span-1 px-2 py-2 border rounded-lg"
                          placeholder="Type"
                          value={it.type}
                          onInput={(e) => {
                            const next = [...maintenanceItems.value];
                            next[idx] = {
                              ...next[idx],
                              type: (e.target as HTMLInputElement).value,
                            };
                            maintenanceItems.value = next;
                          }}
                        />
                        <input
                          class="md:col-span-3 px-2 py-2 border rounded-lg"
                          placeholder="Name"
                          value={it.name}
                          onInput={(e) => {
                            const next = [...maintenanceItems.value];
                            next[idx] = {
                              ...next[idx],
                              name: (e.target as HTMLInputElement).value,
                            };
                            maintenanceItems.value = next;
                          }}
                        />
                        <input
                          class="md:col-span-1 px-2 py-2 border rounded-lg"
                          placeholder="Qty"
                          value={it.quantity ?? ""}
                          onInput={(e) => {
                            const v = (e.target as HTMLInputElement).value;
                            const next = [...maintenanceItems.value];
                            next[idx] = {
                              ...next[idx],
                              quantity: v ? parseFloat(v) : null,
                            };
                            maintenanceItems.value = next;
                          }}
                        />
                        <input
                          class="md:col-span-1 px-2 py-2 border rounded-lg"
                          placeholder="Unit"
                          value={it.unit ?? ""}
                          onInput={(e) => {
                            const next = [...maintenanceItems.value];
                            next[idx] = {
                              ...next[idx],
                              unit: (e.target as HTMLInputElement).value,
                            };
                            maintenanceItems.value = next;
                          }}
                        />
                        <input
                          class="md:col-span-5 px-2 py-2 border rounded-lg"
                          placeholder="URL (optional)"
                          value={it.url ?? ""}
                          onInput={(e) => {
                            const next = [...maintenanceItems.value];
                            next[idx] = {
                              ...next[idx],
                              url: (e.target as HTMLInputElement).value,
                            };
                            maintenanceItems.value = next;
                          }}
                        />
                        <div class="md:col-span-1 flex">
                          <button
                            type="button"
                            class="w-full px-3 py-2 bg-gray-200 text-gray-700 rounded-lg"
                            onClick={() =>
                              removeMaintenanceItem(idx)}
                            disabled={maintenanceItems.value.length <= 1}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div class="mt-6 flex gap-2">
                <button
                  type="button"
                  class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={maintenanceSaving.value}
                  onClick={submitMaintenance}
                >
                  {maintenanceSaving.value ? "Saving…" : "Save Maintenance"}
                </button>
              </div>
            </div>
          </div>
        )
        : null}
    </div>
  );
}
