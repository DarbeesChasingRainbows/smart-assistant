import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import {
  api,
  type CreatePeopleEmploymentRequest,
  type CreatePeopleRelationshipRequest,
  type CreatePersonRequest,
  type PeopleEmploymentDto,
  type PeopleRelationshipDto,
  type PersonDto,
} from "../../lib/api.ts";
import { firstError, zodToFieldErrors } from "../../lib/forms.ts";
import {
  createPeopleEmploymentSchema,
  createPeopleRelationshipSchema,
  createPersonSchema,
} from "../../lib/peopleSchemas.ts";
import FormModal from "../../components/forms/FormModal.tsx";
import FormField from "../../components/forms/FormField.tsx";
import FormErrorSummary from "../../components/forms/FormErrorSummary.tsx";

export default function PeopleListIsland() {
  const people = useSignal<PersonDto[]>([]);
  const loading = useSignal(true);
  const error = useSignal<string | null>(null);

  const searchQuery = useSignal("");

  const showAddPerson = useSignal(false);
  const saving = useSignal(false);

  const personFieldErrors = useSignal<Record<string, string[]>>({});
  const personFormErrors = useSignal<string[]>([]);

  const selectedPersonId = useSignal<string>("");
  const relationships = useSignal<PeopleRelationshipDto[]>([]);
  const employment = useSignal<PeopleEmploymentDto[]>([]);
  const employers = useSignal<string[]>([]);

  const loadingDetails = useSignal(false);

  const showAddRelationship = useSignal(false);
  const relationshipFieldErrors = useSignal<Record<string, string[]>>({});
  const relationshipFormErrors = useSignal<string[]>([]);

  const showAddEmployment = useSignal(false);
  const employmentFieldErrors = useSignal<Record<string, string[]>>({});
  const employmentFormErrors = useSignal<string[]>([]);

  // Create person form
  const email = useSignal("");
  const username = useSignal("");
  const role = useSignal("Guest");

  // Relationship form
  const relatedPersonId = useSignal("");
  const relationshipType = useSignal("");

  // Employment form
  const employer = useSignal("");
  const jobTitle = useSignal("");
  const employmentType = useSignal("");
  const startDate = useSignal("");
  const endDate = useSignal("");
  const isCurrent = useSignal(true);

  useEffect(() => {
    loadPeople();
  }, []);

  async function loadPeople() {
    loading.value = true;
    error.value = null;
    try {
      people.value = await api.people.getAll();
      if (people.value.length > 0 && !selectedPersonId.value) {
        selectedPersonId.value = people.value[0].id;
      }
      await loadEmployers();
      await loadSelectedPersonDetails();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load people";
    } finally {
      loading.value = false;
    }
  }

  async function loadEmployers() {
    try {
      employers.value = await api.people.getEmployers();
    } catch {
      employers.value = [];
    }
  }

  async function loadSelectedPersonDetails() {
    if (!selectedPersonId.value) return;
    loadingDetails.value = true;
    try {
      const [rels, jobs] = await Promise.all([
        api.people.getRelationships(selectedPersonId.value),
        api.people.getEmployment(selectedPersonId.value),
      ]);
      relationships.value = rels;
      employment.value = jobs;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load details";
    } finally {
      loadingDetails.value = false;
    }
  }

  function resetForm() {
    email.value = "";
    username.value = "";
    role.value = "Guest";
    personFieldErrors.value = {};
    personFormErrors.value = [];
  }

  function resetRelationshipForm() {
    relatedPersonId.value = "";
    relationshipType.value = "";
    relationshipFieldErrors.value = {};
    relationshipFormErrors.value = [];
  }

  function resetEmploymentForm() {
    employer.value = "";
    jobTitle.value = "";
    employmentType.value = "";
    startDate.value = "";
    endDate.value = "";
    isCurrent.value = true;
    employmentFieldErrors.value = {};
    employmentFormErrors.value = [];
  }

  async function submitPerson() {
    saving.value = true;
    error.value = null;

    personFieldErrors.value = {};
    personFormErrors.value = [];

    const parsed = createPersonSchema.safeParse({
      email: email.value,
      username: username.value,
      role: role.value,
    });

    if (!parsed.success) {
      const mapped = zodToFieldErrors(parsed.error);
      personFieldErrors.value = mapped.fieldErrors;
      personFormErrors.value = mapped.formErrors;
      saving.value = false;
      return;
    }

    try {
      const req: CreatePersonRequest = {
        email: parsed.data.email,
        username: parsed.data.username,
        role: parsed.data.role,
      };

      await api.people.create(req);
      showAddPerson.value = false;
      resetForm();
      await loadPeople();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to add person";
    } finally {
      saving.value = false;
    }
  }

  async function deletePerson(personId: string) {
    if (!confirm("Are you sure you want to delete this person?")) return;
    try {
      await api.people.delete(personId);
      await loadPeople();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to delete person";
    }
  }

  async function submitRelationship() {
    if (!selectedPersonId.value) return;

    error.value = null;
    relationshipFieldErrors.value = {};
    relationshipFormErrors.value = [];

    const parsed = createPeopleRelationshipSchema.safeParse({
      toPersonId: relatedPersonId.value,
      type: relationshipType.value,
    });

    if (!parsed.success) {
      const mapped = zodToFieldErrors(parsed.error);
      relationshipFieldErrors.value = mapped.fieldErrors;
      relationshipFormErrors.value = mapped.formErrors;
      return;
    }

    try {
      const req: CreatePeopleRelationshipRequest = {
        toPersonId: parsed.data.toPersonId,
        type: parsed.data.type,
      };
      await api.people.createRelationship(selectedPersonId.value, req);
      showAddRelationship.value = false;
      resetRelationshipForm();
      await loadSelectedPersonDetails();
    } catch (e) {
      error.value = e instanceof Error
        ? e.message
        : "Failed to create relationship";
    }
  }

  async function submitEmployment() {
    if (!selectedPersonId.value) return;

    error.value = null;
    employmentFieldErrors.value = {};
    employmentFormErrors.value = [];

    const resolvedEmployer = employer.value === "__custom__" ? "" : employer.value;
    const parsed = createPeopleEmploymentSchema.safeParse({
      employer: resolvedEmployer,
      title: jobTitle.value,
      employmentType: employmentType.value,
      startDate: startDate.value,
      endDate: endDate.value,
      isCurrent: isCurrent.value,
    });

    if (!parsed.success) {
      const mapped = zodToFieldErrors(parsed.error);
      employmentFieldErrors.value = mapped.fieldErrors;
      employmentFormErrors.value = mapped.formErrors;
      return;
    }

    try {
      const req: CreatePeopleEmploymentRequest = {
        employer: parsed.data.employer,
        title: parsed.data.title?.trim() || null,
        employmentType: parsed.data.employmentType?.trim() || null,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate?.trim() || null,
        isCurrent: parsed.data.isCurrent,
        location: null,
        notes: null,
      };
      await api.people.createEmployment(selectedPersonId.value, req);

      showAddEmployment.value = false;
      resetEmploymentForm();
      await loadEmployers();
      await loadSelectedPersonDetails();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to add employment";
    }
  }

  if (loading.value) {
    return (
      <div class="flex items-center justify-center py-12">
        <div class="text-gray-500">Loading people...</div>
      </div>
    );
  }

  const selectedPerson = people.value.find((p) => p.id === selectedPersonId.value) ?? null;
  const q = searchQuery.value.trim().toLowerCase();
  const filteredPeople = q.length === 0
    ? people.value
    : people.value.filter((p) => {
      const haystack = `${p.username} ${p.email ?? ""} ${p.role}`.toLowerCase();
      return haystack.includes(q);
    });

  return (
    <div class="space-y-6">
      {error.value && (
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error.value}
        </div>
      )}

      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">Directory</h2>
            <p class="text-sm text-slate-500">Search, select, and manage relationships and work history.</p>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-sm"
              onClick={() => {
                showAddPerson.value = true;
                resetForm();
              }}
            >
              + Add person
            </button>
            <button
              type="button"
              class="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
              onClick={loadPeople}
            >
              Refresh
            </button>
          </div>
        </div>

        <div class="mt-4">
          <label class="relative block">
            <span class="sr-only">Search people</span>
            <input
              value={searchQuery.value}
              onInput={(e) => searchQuery.value = (e.target as HTMLInputElement).value}
              class="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search by name, email, or role..."
              type="search"
            />
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
              </svg>
            </span>
          </label>
        </div>
      </div>

      {people.value.length === 0
        ? (
          <div class="bg-white rounded-xl shadow-md p-8 text-center">
            <span class="text-5xl">👨‍👩‍👧‍👦</span>
            <p class="text-gray-500 mt-4">
              No family members added yet.
            </p>
            <button
              type="button"
              class="inline-block mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
              onClick={() => {
                showAddPerson.value = true;
                resetForm();
              }}
            >
              + Add your first person
            </button>
          </div>
        )
        : (
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-1">
              <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <div class="text-sm font-medium text-slate-700">
                    People ({filteredPeople.length})
                  </div>
                </div>
                <div class="divide-y">
                  {filteredPeople.map((person) => {
                    const isSelected = person.id === selectedPersonId.value;
                    return (
                      <button
                        key={person.id}
                        type="button"
                        class={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${isSelected ? "bg-blue-50" : "bg-white"}`}
                        onClick={async () => {
                          selectedPersonId.value = person.id;
                          await loadSelectedPersonDetails();
                        }}
                      >
                        <div class="flex items-center justify-between gap-3">
                          <div>
                            <div class="font-semibold text-slate-900">{person.username}</div>
                            <div class="text-xs text-slate-500">
                              {person.role} • {person.isActive ? "Active" : "Inactive"}
                            </div>
                          </div>
                          <div class="text-xs text-slate-400">›</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div class="lg:col-span-2 space-y-4">
              <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <div class="text-sm text-slate-600">Selected person</div>
                    <div class="text-xl font-semibold text-slate-900">
                      {selectedPerson?.username ?? "—"}
                    </div>
                    <div class="text-sm text-slate-600">{selectedPerson?.email ?? ""}</div>
                  </div>
                  {selectedPerson && (
                    <div class="flex items-center gap-2">
                      <a
                        href={`/people/${selectedPerson.id}`}
                        class="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-sm"
                      >
                        View profile
                      </a>
                      <button
                        type="button"
                        class="px-3 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 transition-colors text-sm"
                        onClick={() => deletePerson(selectedPerson.id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div class="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 class="text-lg font-semibold text-slate-900">👨‍👩‍👧‍👦 Genealogy</h3>
                    <p class="text-sm text-slate-500">Relationships and family links</p>
                  </div>
                  <button
                    type="button"
                    class="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
                    onClick={() => {
                      showAddRelationship.value = true;
                      resetRelationshipForm();
                    }}
                  >
                    + Add relationship
                  </button>
                </div>

                <div class="mt-2">
                  {loadingDetails.value
                    ? <div class="text-slate-500">Loading relationships…</div>
                    : relationships.value.length === 0
                    ? (
                      <div class="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
                        No relationships yet.
                      </div>
                    )
                    : (
                      <div class="space-y-2">
                        {relationships.value.map((r) => {
                          const toName = people.value.find((p) => p.id === r.toPersonId)?.username ?? r.toPersonId;
                          return (
                            <div
                              key={r.key}
                              class={`p-3 rounded-xl border ${
                                r.isValid
                                  ? "border-blue-100 bg-white hover:bg-blue-50 transition-colors"
                                  : "border-slate-200 bg-slate-50 opacity-60"
                              }`}
                            >
                              <div class="flex items-start justify-between gap-3">
                                <div>
                                  <div class="font-semibold text-slate-900">{r.type}</div>
                                  <div class="text-sm text-slate-600">To: {toName}</div>
                                  {!r.isValid && (
                                    <div class="text-sm text-slate-500 mt-1">Invalidated: {r.invalidatedReason}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                </div>
              </div>

              <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div class="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 class="text-lg font-semibold text-slate-900">💼 Employment</h3>
                    <p class="text-sm text-slate-500">Work history and employers</p>
                  </div>
                  <button
                    type="button"
                    class="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
                    onClick={() => {
                      showAddEmployment.value = true;
                      resetEmploymentForm();
                    }}
                  >
                    + Add employment
                  </button>
                </div>

                <div class="mt-2">
                  {loadingDetails.value
                    ? <div class="text-slate-500">Loading employment…</div>
                    : employment.value.length === 0
                    ? (
                      <div class="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
                        No employment records yet.
                      </div>
                    )
                    : (
                      <div class="space-y-2">
                        {employment.value.map((j) => (
                          <div
                            key={j.key}
                            class={`p-3 rounded-xl border ${
                              j.isCurrent
                                ? "border-green-200 bg-green-50"
                                : "border-slate-200 bg-slate-50"
                            }`}
                          >
                            <div class="flex items-center justify-between gap-3">
                              <div>
                                <div class="font-semibold text-slate-900">
                                  {j.employer}{j.title ? ` — ${j.title}` : ""}
                                </div>
                                <div class="text-sm text-slate-600">
                                  {j.startDate}
                                  {j.endDate ? ` → ${j.endDate}` : ""}
                                  {j.isCurrent ? " (current)" : ""}
                                </div>
                              </div>
                              {j.isCurrent && (
                                <span class="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                  Current
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        )}

      {showAddPerson.value && (
        <FormModal
          title="Add Person"
          subtitle="Minimal details first"
          onClose={() => {
            if (saving.value) return;
            showAddPerson.value = false;
            resetForm();
          }}
          disableClose={saving.value}
          footer={(
            <>
              <button
                type="button"
                class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                onClick={() => {
                  if (saving.value) return;
                  showAddPerson.value = false;
                  resetForm();
                }}
                disabled={saving.value}
              >
                Cancel
              </button>
              <button
                type="button"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                disabled={saving.value}
                onClick={submitPerson}
              >
                {saving.value ? "Saving..." : "Add"}
              </button>
            </>
          )}
        >
          <FormErrorSummary errors={personFormErrors.value} />

          <FormField
            label="Email"
            error={firstError(personFieldErrors.value, "email")}
          >
            <input
              type="email"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg"
              value={email.value}
              onInput={(e) =>
                email.value = (e.target as HTMLInputElement).value}
            />
          </FormField>

          <FormField
            label="Username"
            error={firstError(personFieldErrors.value, "username")}
          >
            <input
              class="w-full px-3 py-2 border border-gray-300 rounded-lg"
              value={username.value}
              onInput={(e) =>
                username.value = (e.target as HTMLInputElement).value}
            />
          </FormField>

          <FormField label="Role" error={firstError(personFieldErrors.value, "role")}>
            <select
              class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              value={role.value}
              onChange={(e) =>
                role.value = (e.target as HTMLSelectElement).value}
            >
              <option value="Admin">Admin</option>
              <option value="Parent">Parent</option>
              <option value="Child">Child</option>
              <option value="Guest">Guest</option>
            </select>
          </FormField>
        </FormModal>
      )}

      {showAddRelationship.value && (
        <FormModal
          title="Add relationship"
          subtitle="Family & genealogy"
          onClose={() => {
            showAddRelationship.value = false;
            resetRelationshipForm();
          }}
          footer={(
            <>
              <button
                type="button"
                class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                onClick={() => {
                  showAddRelationship.value = false;
                  resetRelationshipForm();
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={submitRelationship}
              >
                Add
              </button>
            </>
          )}
        >
          <FormErrorSummary errors={relationshipFormErrors.value} />

          <FormField
            label="Related person"
            error={firstError(relationshipFieldErrors.value, "toPersonId")}
          >
            <select
              class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              value={relatedPersonId.value}
              onChange={(e) =>
                relatedPersonId.value = (e.target as HTMLSelectElement).value}
            >
              <option value="" disabled>Pick a person</option>
              {people.value
                .filter((p) => p.id !== selectedPersonId.value)
                .map((p) => (
                  <option key={p.id} value={p.id}>{p.username}</option>
                ))}
            </select>
          </FormField>

          <FormField
            label="Relationship type"
            error={firstError(relationshipFieldErrors.value, "type")}
          >
            <select
              class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              value={relationshipType.value}
              onChange={(e) =>
                relationshipType.value = (e.target as HTMLSelectElement).value}
            >
              <option value="" disabled>Pick type</option>
              <option value="Parent">Parent</option>
              <option value="Child">Child</option>
              <option value="Spouse">Spouse</option>
              <option value="Sibling">Sibling</option>
              <option value="Guardian">Guardian</option>
              <option value="Partner">Partner</option>
              <option value="Other">Other</option>
            </select>
          </FormField>
        </FormModal>
      )}

      {showAddEmployment.value && (
        <FormModal
          title="Add employment"
          subtitle="Work history"
          onClose={() => {
            showAddEmployment.value = false;
            resetEmploymentForm();
          }}
          footer={(
            <>
              <button
                type="button"
                class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                onClick={() => {
                  showAddEmployment.value = false;
                  resetEmploymentForm();
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={submitEmployment}
              >
                Add
              </button>
            </>
          )}
        >
          <FormErrorSummary errors={employmentFormErrors.value} />

          <FormField
            label="Employer"
            error={firstError(employmentFieldErrors.value, "employer")}
          >
            <select
              class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              value={employer.value}
              onChange={(e) =>
                employer.value = (e.target as HTMLSelectElement).value}
            >
              <option value="" disabled>Pick an employer</option>
              {employers.value.map((em) => (
                <option key={em} value={em}>{em}</option>
              ))}
              <option value="__custom__">(Custom… type below)</option>
            </select>
          </FormField>

          <FormField label="Employer (custom)" error={null} hint="Optional">
            <input
              class="w-full px-3 py-2 border border-gray-300 rounded-lg"
              disabled={employer.value !== "__custom__"}
              value={employer.value === "__custom__" ? "" : employer.value}
              onInput={(e) => {
                if (employer.value === "__custom__") {
                  employer.value = (e.target as HTMLInputElement).value;
                }
              }}
            />
          </FormField>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Title" error={firstError(employmentFieldErrors.value, "title")} hint="Optional">
              <input
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={jobTitle.value}
                onInput={(e) =>
                  jobTitle.value = (e.target as HTMLInputElement).value}
              />
            </FormField>

            <FormField
              label="Employment type"
              error={firstError(employmentFieldErrors.value, "employmentType")}
              hint="Optional"
            >
              <input
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={employmentType.value}
                onInput={(e) =>
                  employmentType.value = (e.target as HTMLInputElement).value}
              />
            </FormField>

            <FormField
              label="Start date"
              error={firstError(employmentFieldErrors.value, "startDate")}
            >
              <input
                type="date"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={startDate.value}
                onInput={(e) =>
                  startDate.value = (e.target as HTMLInputElement).value}
              />
            </FormField>

            <FormField
              label="End date"
              error={firstError(employmentFieldErrors.value, "endDate")}
              hint="Optional"
            >
              <input
                type="date"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={endDate.value}
                onInput={(e) =>
                  endDate.value = (e.target as HTMLInputElement).value}
              />
            </FormField>
          </div>

          <label class="label cursor-pointer justify-start gap-2">
            <input
              type="checkbox"
              class="checkbox"
              checked={isCurrent.value}
              onChange={(e) =>
                isCurrent.value = (e.target as HTMLInputElement).checked}
            />
            <span class="label-text">Current job</span>
          </label>
        </FormModal>
      )}
    </div>
  );
}
