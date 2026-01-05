import { useComputed, useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type {
  ComponentDto,
  VehicleDto,
  VehicleMaintenanceDto,
} from "../../lib/api.ts";
import {
  api,
  getVehicleTypeDetails,
  getVehicleTypeIcon,
} from "../../lib/api.ts";

type ProTab = "overview" | "components" | "maintenance" | "history";

type HistoryCorrectionDraft = {
  incorrectEdgeId: string;
  reason: string;
  correctedVehicleId: string;
  correctedInstalledDate: string;
};

export default function ProfessionalGarageDashboard() {
  const vehicles = useSignal<VehicleDto[]>([]);
  const loadingVehicles = useSignal(true);
  const vehiclesError = useSignal<string | null>(null);

  const selectedVehicleId = useSignal<string | null>(null);
  const selectedVehicle = useComputed(() =>
    vehicles.value.find((v) => v.id === selectedVehicleId.value) ?? null
  );

  const search = useSignal("");
  const tab = useSignal<ProTab>("overview");

  const installedComponents = useSignal<ComponentDto[]>([]);
  const maintenanceHistory = useSignal<VehicleMaintenanceDto[]>([]);
  const loadingDetail = useSignal(false);
  const detailError = useSignal<string | null>(null);

  const showCorrectionModal = useSignal(false);
  const correctionDraft = useSignal<HistoryCorrectionDraft>({
    incorrectEdgeId: "",
    reason: "",
    correctedVehicleId: "",
    correctedInstalledDate: new Date().toISOString().slice(0, 10),
  });

  const filteredVehicles = useComputed(() => {
    const term = search.value.trim().toLowerCase();
    if (!term) return vehicles.value;
    return vehicles.value.filter((v) =>
      v.make.toLowerCase().includes(term) ||
      v.model.toLowerCase().includes(term) ||
      v.vin.toLowerCase().includes(term) ||
      (v.licensePlate?.toLowerCase().includes(term) ?? false)
    );
  });

  const activeVehicleCount = useComputed(() =>
    vehicles.value.filter((v) => v.isActive).length
  );

  const selectedMaintenanceYtdSpend = useComputed(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    return maintenanceHistory.value
      .filter((m) => {
        const d = new Date(m.date);
        return d >= start && d <= now;
      })
      .reduce((sum, m) => sum + (m.cost ?? 0), 0);
  });

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    if (!selectedVehicleId.value) return;
    loadSelectedVehicleDetail(selectedVehicleId.value);
  }, [selectedVehicleId.value]);

  async function loadVehicles() {
    loadingVehicles.value = true;
    vehiclesError.value = null;

    try {
      const list = await api.vehicles.getAll();
      vehicles.value = list;
      if (!selectedVehicleId.value && list.length > 0) {
        selectedVehicleId.value = list[0].id;
      }
    } catch (e) {
      vehiclesError.value = e instanceof Error
        ? e.message
        : "Failed to load vehicles";
    } finally {
      loadingVehicles.value = false;
    }
  }

  async function loadSelectedVehicleDetail(vehicleId: string) {
    loadingDetail.value = true;
    detailError.value = null;

    try {
      const [components, maintenance] = await Promise.all([
        api.components.getByVehicle(vehicleId),
        api.maintenance.listByVehicle(vehicleId),
      ]);
      installedComponents.value = components;
      maintenanceHistory.value = maintenance;

      if (!correctionDraft.value.correctedVehicleId) {
        correctionDraft.value = {
          ...correctionDraft.value,
          correctedVehicleId: vehicleId,
        };
      }
    } catch (e) {
      detailError.value = e instanceof Error
        ? e.message
        : "Failed to load vehicle details";
    } finally {
      loadingDetail.value = false;
    }
  }

  function openCorrectionModal(edgeId: string) {
    const vId = selectedVehicleId.value ?? "";
    correctionDraft.value = {
      incorrectEdgeId: edgeId,
      reason: "",
      correctedVehicleId: vId,
      correctedInstalledDate: new Date().toISOString().slice(0, 10),
    };
    showCorrectionModal.value = true;
  }

  function submitCorrection() {
    const draft = correctionDraft.value;

    if (!draft.incorrectEdgeId.trim()) {
      alert("Missing incorrect edge id");
      return;
    }

    if (!draft.reason.trim()) {
      alert("Reason is required");
      return;
    }

    if (!draft.correctedVehicleId.trim()) {
      alert("Correct vehicle is required");
      return;
    }

    const installedDate = new Date(draft.correctedInstalledDate + "T00:00:00");
    if (Number.isNaN(installedDate.valueOf())) {
      alert("Invalid installed date");
      return;
    }

    try {
      console.log("History correction draft", {
        incorrectEdgeId: draft.incorrectEdgeId,
        reason: draft.reason,
        correctedVehicleId: draft.correctedVehicleId,
        correctedInstalledDate: installedDate.toISOString(),
      });

      alert(
        "History correction captured (UI only). Next step: implement /api/v1/garage/history/corrections endpoint to invalidate old edge + insert corrected edge.",
      );

      showCorrectionModal.value = false;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to submit correction");
    }
  }

  return (
    <div class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          title="Vehicles"
          value={`${vehicles.value.length}`}
          subtitle="Total"
        />
        <KpiCard
          title="Active"
          value={`${activeVehicleCount.value}`}
          subtitle="In service"
        />
        <KpiCard
          title="Installed Components"
          value={`${installedComponents.value.length}`}
          subtitle={selectedVehicle.value
            ? `On ${selectedVehicle.value.make} ${selectedVehicle.value.model}`
            : "Select a vehicle"}
        />
        <KpiCard
          title="Maintenance Spend (YTD)"
          value={`$${
            selectedMaintenanceYtdSpend.value.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })
          }`}
          subtitle={selectedVehicle.value
            ? "Selected vehicle"
            : "Select a vehicle"}
        />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div class="lg:col-span-5">
          <div class="bg-white rounded-xl shadow-md overflow-hidden">
            <div class="p-4 border-b">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h2 class="text-lg font-bold text-gray-900">Vehicles</h2>
                  <p class="text-sm text-gray-500">
                    Select a vehicle for detailed operations
                  </p>
                </div>
                <button
                  type="button"
                  class="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  onClick={loadVehicles}
                  disabled={loadingVehicles.value}
                >
                  {loadingVehicles.value ? "Loading…" : "Refresh"}
                </button>
              </div>

              <div class="mt-3">
                <input
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Search VIN / make / model / plate"
                  value={search.value}
                  onInput={(
                    e,
                  ) => (search.value = (e.target as HTMLInputElement).value)}
                />
              </div>

              {vehiclesError.value
                ? (
                  <div class="mt-3 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                    {vehiclesError.value}
                  </div>
                )
                : null}
            </div>

            <div class="max-h-[520px] overflow-auto">
              {loadingVehicles.value
                ? <div class="p-6 text-gray-500">Loading vehicles…</div>
                : filteredVehicles.value.length === 0
                ? <div class="p-6 text-gray-500">No vehicles found</div>
                : (
                  <table class="min-w-full text-sm">
                    <thead class="sticky top-0 bg-white shadow-sm">
                      <tr class="text-left text-gray-500">
                        <th class="px-4 py-3 font-medium">Vehicle</th>
                        <th class="px-4 py-3 font-medium">VIN</th>
                        <th class="px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVehicles.value.map((v) => {
                        const selected = v.id === selectedVehicleId.value;
                        return (
                          <tr
                            key={v.id}
                            class={"border-t hover:bg-gray-50 cursor-pointer " +
                              (selected ? "bg-blue-50" : "")}
                            onClick={() => {
                              selectedVehicleId.value = v.id;
                              tab.value = "overview";
                            }}
                          >
                            <td class="px-4 py-3">
                              <div class="flex items-start gap-2">
                                <span class="text-xl">
                                  {getVehicleTypeIcon(v.vehicleType.type)}
                                </span>
                                <div>
                                  <div class="font-semibold text-gray-900">
                                    {v.year} {v.make} {v.model}
                                  </div>
                                  <div class="text-xs text-gray-500">
                                    {getVehicleTypeDetails(v.vehicleType)}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td class="px-4 py-3 font-mono text-xs text-gray-700">
                              {v.vin}
                            </td>
                            <td class="px-4 py-3">
                              <span
                                class={"px-2 py-1 rounded-full text-xs font-medium " +
                                  (v.isActive
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-600")}
                              >
                                {v.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
            </div>
          </div>
        </div>

        <div class="lg:col-span-7">
          <div class="bg-white rounded-xl shadow-md">
            <div class="p-4 border-b">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h2 class="text-lg font-bold text-gray-900">
                    Vehicle Workspace
                  </h2>
                  <p class="text-sm text-gray-500">
                    {selectedVehicle.value
                      ? `${selectedVehicle.value.year} ${selectedVehicle.value.make} ${selectedVehicle.value.model}`
                      : "Select a vehicle to begin"}
                  </p>
                </div>
                {selectedVehicle.value
                  ? (
                    <a
                      href={`/garage/vehicles/${selectedVehicle.value.id}`}
                      class="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      Open Detail
                    </a>
                  )
                  : null}
              </div>

              <div class="mt-4 flex gap-2 flex-wrap">
                <TabButton
                  active={tab.value === "overview"}
                  onClick={() => (tab.value = "overview")}
                >
                  Overview
                </TabButton>
                <TabButton
                  active={tab.value === "components"}
                  onClick={() => (tab.value = "components")}
                >
                  Components
                </TabButton>
                <TabButton
                  active={tab.value === "maintenance"}
                  onClick={() => (tab.value = "maintenance")}
                >
                  Maintenance
                </TabButton>
                <TabButton
                  active={tab.value === "history"}
                  onClick={() => (tab.value = "history")}
                >
                  Installation History
                </TabButton>
              </div>

              {detailError.value
                ? (
                  <div class="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                    {detailError.value}
                  </div>
                )
                : null}
            </div>

            <div class="p-4">
              {!selectedVehicle.value
                ? (
                  <div class="text-gray-500">
                    Select a vehicle to view professional details.
                  </div>
                )
                : loadingDetail.value
                ? <div class="text-gray-500">Loading details…</div>
                : tab.value === "overview"
                ? <OverviewPanel vehicle={selectedVehicle.value} />
                : tab.value === "components"
                ? (
                  <ComponentsPanel
                    vehicleId={selectedVehicle.value.id}
                    components={installedComponents.value}
                    onRefresh={() =>
                      loadSelectedVehicleDetail(selectedVehicle.value!.id)}
                  />
                )
                : tab.value === "maintenance"
                ? <MaintenancePanel maintenance={maintenanceHistory.value} />
                : (
                  <HistoryPanel
                    vehicle={selectedVehicle.value}
                    components={installedComponents.value}
                    onCorrectHistory={openCorrectionModal}
                  />
                )}
            </div>
          </div>
        </div>
      </div>

      {showCorrectionModal.value
        ? (
          <div class="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
            <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <h3 class="text-lg font-bold text-gray-900">
                    Correct Installation History
                  </h3>
                  <p class="text-sm text-gray-500">
                    Invalidate the incorrect record and create a corrected one.
                  </p>
                </div>
                <button
                  type="button"
                  class="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  onClick={() => (showCorrectionModal.value = false)}
                >
                  Close
                </button>
              </div>

              <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Incorrect Edge Id
                  </label>
                  <input
                    class="w-full px-3 py-2 border rounded-lg"
                    value={correctionDraft.value.incorrectEdgeId}
                    onInput={(
                      e,
                    ) => (correctionDraft.value = {
                      ...correctionDraft.value,
                      incorrectEdgeId: (e.target as HTMLInputElement).value,
                    })}
                  />
                  <p class="text-xs text-gray-500 mt-1">
                    Example: component_installations/vehicleId-componentId
                  </p>
                </div>

                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Reason
                  </label>
                  <textarea
                    class="w-full px-3 py-2 border rounded-lg min-h-[96px]"
                    value={correctionDraft.value.reason}
                    onInput={(
                      e,
                    ) => (correctionDraft.value = {
                      ...correctionDraft.value,
                      reason: (e.target as HTMLTextAreaElement).value,
                    })}
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Correct Vehicle
                  </label>
                  <select
                    class="w-full px-3 py-2 border rounded-lg"
                    value={correctionDraft.value.correctedVehicleId}
                    onInput={(
                      e,
                    ) => (correctionDraft.value = {
                      ...correctionDraft.value,
                      correctedVehicleId: (e.target as HTMLSelectElement).value,
                    })}
                  >
                    {vehicles.value.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.year} {v.make} {v.model} ({v.vin.slice(0, 6)}…)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Correct Installed Date
                  </label>
                  <input
                    type="date"
                    class="w-full px-3 py-2 border rounded-lg"
                    value={correctionDraft.value.correctedInstalledDate}
                    onInput={(
                      e,
                    ) => (correctionDraft.value = {
                      ...correctionDraft.value,
                      correctedInstalledDate:
                        (e.target as HTMLInputElement).value,
                    })}
                  />
                </div>
              </div>

              <div class="mt-6 flex gap-2">
                <button
                  type="button"
                  class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  onClick={submitCorrection}
                >
                  Invalidate + Create Corrected Record
                </button>
                <button
                  type="button"
                  class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  onClick={() => (showCorrectionModal.value = false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
        : null}
    </div>
  );
}

function KpiCard(props: { title: string; value: string; subtitle: string }) {
  return (
    <div class="bg-white rounded-xl shadow-md p-4">
      <div class="text-sm text-gray-500">{props.title}</div>
      <div class="text-2xl font-bold text-gray-900 mt-1">{props.value}</div>
      <div class="text-xs text-gray-500 mt-1">{props.subtitle}</div>
    </div>
  );
}

function TabButton(
  props: { active: boolean; onClick: () => void; children: string },
) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      class={"px-3 py-2 rounded-lg text-sm font-medium transition-colors " +
        (props.active
          ? "bg-blue-600 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200")}
    >
      {props.children}
    </button>
  );
}

function OverviewPanel(props: { vehicle: VehicleDto }) {
  const v = props.vehicle;
  return (
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="border rounded-xl p-4">
        <div class="flex items-start gap-3">
          <span class="text-3xl">{getVehicleTypeIcon(v.vehicleType.type)}</span>
          <div>
            <div class="font-bold text-gray-900">
              {v.year} {v.make} {v.model}
            </div>
            <div class="text-sm text-gray-500">
              {getVehicleTypeDetails(v.vehicleType)}
            </div>
          </div>
        </div>
        <dl class="mt-4 space-y-2 text-sm">
          <div class="flex justify-between">
            <dt class="text-gray-500">VIN</dt>
            <dd class="font-mono text-xs">{v.vin}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-gray-500">Plate</dt>
            <dd class="font-semibold">{v.licensePlate ?? "—"}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-gray-500">Mileage</dt>
            <dd>{v.currentMileage.toLocaleString()} mi</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-gray-500">Status</dt>
            <dd>{v.isActive ? "Active" : "Inactive"}</dd>
          </div>
        </dl>
      </div>

      <div class="border rounded-xl p-4">
        <div class="font-bold text-gray-900">Professional Notes</div>
        <div class="text-sm text-gray-600 mt-2">
          Use Installation History to correct auto-generated data. Prefer
          corrections (invalidate + new record) over rewriting history.
        </div>
        <div class="mt-4">
          <a
            href={`/garage/vehicles/${v.id}`}
            class="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            Open Vehicle Detail (full actions)
          </a>
        </div>
      </div>
    </div>
  );
}

function ComponentsPanel(
  props: {
    vehicleId: string;
    components: ComponentDto[];
    onRefresh: () => void;
  },
) {
  return (
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div>
          <div class="font-bold text-gray-900">Installed Components</div>
          <div class="text-sm text-gray-500">
            Current snapshot for this vehicle
          </div>
        </div>
        <button
          type="button"
          class="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          onClick={props.onRefresh}
        >
          Refresh
        </button>
      </div>

      {props.components.length === 0
        ? <div class="text-gray-500">No components installed.</div>
        : (
          <div class="space-y-2">
            {props.components.map((c) => (
              <div
                key={c.id}
                class="border rounded-lg p-3 flex items-start justify-between gap-4"
              >
                <div>
                  <div class="font-semibold text-gray-900">{c.name}</div>
                  <div class="text-sm text-gray-500">{c.category}</div>
                  <div class="text-xs text-gray-500">
                    {c.partNumber ? `P/N: ${c.partNumber}` : "P/N: —"}
                  </div>
                </div>
                <div class="text-xs text-gray-500">
                  {c.location?.type === "InstalledOn"
                    ? "Installed"
                    : "In Storage"}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

function MaintenancePanel(props: { maintenance: VehicleMaintenanceDto[] }) {
  if (props.maintenance.length === 0) {
    return <div class="text-gray-500">No maintenance records.</div>;
  }

  return (
    <div class="space-y-3">
      {props.maintenance.map((m) => (
        <div key={m.id} class="border rounded-lg p-3">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="font-semibold text-gray-900">{m.description}</div>
              <div class="text-sm text-gray-500">
                {new Date(m.date).toLocaleDateString()} •{" "}
                {m.mileage ? `${m.mileage.toLocaleString()} mi` : "—"}
                {m.cost != null ? ` • $${m.cost.toLocaleString()}` : ""}
              </div>
            </div>
            <div class="text-xs text-gray-500">{m.performedBy ?? ""}</div>
          </div>
          {m.items?.length
            ? (
              <div class="mt-2 space-y-1">
                {m.items.map((it, idx) => (
                  <div key={idx} class="text-sm text-gray-600">
                    {it.type}: {it.name}
                  </div>
                ))}
              </div>
            )
            : null}
        </div>
      ))}
    </div>
  );
}

function HistoryPanel(
  props: {
    vehicle: VehicleDto;
    components: ComponentDto[];
    onCorrectHistory: (edgeId: string) => void;
  },
) {
  const v = props.vehicle;

  return (
    <div class="space-y-3">
      <div>
        <div class="font-bold text-gray-900">
          Installation History (corrections-first)
        </div>
        <div class="text-sm text-gray-500">
          This view is designed for correcting bad auto-generated history. The
          backend endpoint will invalidate the incorrect edge and append a
          corrected edge.
        </div>
      </div>

      {props.components.length === 0
        ? (
          <div class="text-gray-500">
            No installed components to infer history from.
          </div>
        )
        : (
          <div class="space-y-2">
            {props.components.map((c) => {
              const inferredEdgeId = `component_installations/${v.id}-${c.id}`;
              return (
                <div
                  key={c.id}
                  class="border rounded-lg p-3 flex items-start justify-between gap-4"
                >
                  <div>
                    <div class="font-semibold text-gray-900">{c.name}</div>
                    <div class="text-sm text-gray-500">{c.category}</div>
                    <div class="text-xs text-gray-500">
                      Inferred edge: {inferredEdgeId}
                    </div>
                  </div>
                  <button
                    type="button"
                    class="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200"
                    onClick={() => props.onCorrectHistory(inferredEdgeId)}
                  >
                    Correct History
                  </button>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}
