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

  return (
    <div class="space-y-6">
      {error.value && (
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error.value}
        </div>
      )}

      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold text-gray-800">All People</h2>
        <button
          type="button"
          onClick={() => {
            showAddPerson.value = true;
            resetForm();
          }}
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add Person
        </button>
      </div>

      {people.value.length === 0
        ? (
          <div class="bg-white rounded-xl shadow-md p-8 text-center">
            <p class="text-gray-500">
              No people added yet. Click "+ Add Person" to get started.
            </p>
          </div>
        )
        : (
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div class="lg:col-span-1 space-y-3">
              <label class="select w-full">
                <span class="label">Selected person</span>
                <select
                  value={selectedPersonId.value}
                  onChange={async (e) => {
                    selectedPersonId.value =
                      (e.target as HTMLSelectElement).value;
                    await loadSelectedPersonDetails();
                  }}
                >
                  {people.value.map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.username} ({p.role})
                    </option>
                  ))}
                </select>
              </label>

              <div class="bg-white rounded-xl shadow-md p-4">
                <div class="text-sm text-gray-600">Person</div>
                <div class="font-semibold">
                  {people.value.find((p) => p.id === selectedPersonId.value)
                    ?.username}
                </div>
                <div class="text-sm text-gray-600">
                  {people.value.find((p) => p.id === selectedPersonId.value)
                    ?.email}
                </div>
              </div>

              <div class="grid grid-cols-1 gap-3">
                {people.value.map((person) => (
                  <div
                    key={person.id}
                    class="bg-white rounded-xl shadow-md p-4 flex items-center justify-between"
                  >
                    <div>
                      <div class="font-semibold">{person.username}</div>
                      <div class="text-sm text-gray-500">
                        {person.role} •{" "}
                        {person.isActive ? "Active" : "Inactive"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => deletePerson(person.id)}
                      class="btn btn-ghost btn-sm text-error"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div class="lg:col-span-2 space-y-4">
              <div class="bg-white rounded-xl shadow-md p-6">
                <h3 class="font-bold text-gray-900 mb-4">Genealogy</h3>

                <div class="mt-3">
                  <button
                    type="button"
                    class="btn btn-primary"
                    onClick={() => {
                      showAddRelationship.value = true;
                      resetRelationshipForm();
                    }}
                  >
                    Add relationship
                  </button>
                </div>

                <div class="mt-6">
                  {loadingDetails.value
                    ? <div class="text-gray-500">Loading relationships…</div>
                    : relationships.value.length === 0
                    ? <div class="text-gray-500">No relationships yet.</div>
                    : (
                      <div class="space-y-2">
                        {relationships.value.map((r) => (
                          <div key={r.key} class="border rounded-lg p-3">
                            <div class="font-medium">{r.type}</div>
                            <div class="text-sm text-gray-600">
                              To: {people.value.find((p) =>
                                p.id === r.toPersonId
                              )
                                ?.username ?? r.toPersonId}
                            </div>
                            {!r.isValid && (
                              <div class="text-sm text-error">
                                Invalidated: {r.invalidatedReason}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </div>

              <div class="bg-white rounded-xl shadow-md p-6">
                <h3 class="font-bold text-gray-900 mb-4">Employment</h3>

                <div class="mt-3">
                  <button
                    type="button"
                    class="btn btn-primary"
                    onClick={() => {
                      showAddEmployment.value = true;
                      resetEmploymentForm();
                    }}
                  >
                    Add employment
                  </button>
                </div>

                <div class="mt-6">
                  {loadingDetails.value
                    ? <div class="text-gray-500">Loading employment…</div>
                    : employment.value.length === 0
                    ? (
                      <div class="text-gray-500">
                        No employment records yet.
                      </div>
                    )
                    : (
                      <div class="space-y-2">
                        {employment.value.map((j) => (
                          <div key={j.key} class="border rounded-lg p-3">
                            <div class="font-medium">
                              {j.employer}
                              {j.title ? ` — ${j.title}` : ""}
                            </div>
                            <div class="text-sm text-gray-600">
                              {j.startDate}
                              {j.endDate ? ` → ${j.endDate}` : ""}
                              {j.isCurrent ? " (current)" : ""}
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
