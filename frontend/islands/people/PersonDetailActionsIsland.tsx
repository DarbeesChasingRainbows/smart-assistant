import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import {
  api,
  type CreatePeopleEmploymentRequest,
  type CreatePeopleRelationshipRequest,
  type PersonDto,
} from "../../lib/api.ts";
import { firstError, zodToFieldErrors } from "../../lib/forms.ts";
import {
  createPeopleEmploymentSchema,
  createPeopleRelationshipSchema,
} from "../../lib/peopleSchemas.ts";
import FormErrorSummary from "../../components/forms/FormErrorSummary.tsx";
import FormField from "../../components/forms/FormField.tsx";
import FormModal from "../../components/forms/FormModal.tsx";

interface Props {
  personId: string;
  budgetHref: string;
  allPeople: PersonDto[];
}

export default function PersonDetailActionsIsland(
  { personId, budgetHref, allPeople }: Props,
) {
  const showAddRelationship = useSignal(false);
  const showAddEmployment = useSignal(false);

  const saving = useSignal(false);

  const relationshipFieldErrors = useSignal<Record<string, string[]>>({});
  const relationshipFormErrors = useSignal<string[]>([]);

  const employmentFieldErrors = useSignal<Record<string, string[]>>({});
  const employmentFormErrors = useSignal<string[]>([]);

  const relatedPersonId = useSignal("");
  const relationshipType = useSignal("");

  const employers = useSignal<string[]>([]);
  const employer = useSignal("");
  const jobTitle = useSignal("");
  const employmentType = useSignal("");
  const startDate = useSignal("");
  const endDate = useSignal("");
  const isCurrent = useSignal(true);

  useEffect(() => {
    loadEmployers();
  }, []);

  async function loadEmployers() {
    try {
      employers.value = await api.people.getEmployers();
    } catch {
      employers.value = [];
    }
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

  async function submitRelationship() {
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

    saving.value = true;
    try {
      const req: CreatePeopleRelationshipRequest = {
        toPersonId: parsed.data.toPersonId,
        type: parsed.data.type,
      };
      await api.people.createRelationship(personId, req);
      showAddRelationship.value = false;
      resetRelationshipForm();
      globalThis.location?.reload();
    } finally {
      saving.value = false;
    }
  }

  async function submitEmployment() {
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

    saving.value = true;
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
      await api.people.createEmployment(personId, req);
      showAddEmployment.value = false;
      resetEmploymentForm();
      globalThis.location?.reload();
    } finally {
      saving.value = false;
    }
  }

  return (
    <>
      <div class="flex flex-wrap items-center justify-end gap-2">
        <a
          href={budgetHref}
          class="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          💰 Budget
        </a>
        <button
          type="button"
          class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          onClick={() => {
            resetRelationshipForm();
            showAddRelationship.value = true;
          }}
        >
          🔗 Add relationship
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          onClick={() => {
            resetEmploymentForm();
            showAddEmployment.value = true;
          }}
        >
          💼 Add employment
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-xl bg-slate-100 text-slate-500 cursor-not-allowed"
          disabled
        >
          ✏️ Edit
        </button>
      </div>

      {showAddRelationship.value && (
        <FormModal
          title="Add relationship"
          subtitle="Family & genealogy"
          onClose={() => {
            if (saving.value) return;
            showAddRelationship.value = false;
            resetRelationshipForm();
          }}
          disableClose={saving.value}
          footer={(
            <>
              <button
                type="button"
                class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                onClick={() => {
                  if (saving.value) return;
                  showAddRelationship.value = false;
                  resetRelationshipForm();
                }}
                disabled={saving.value}
              >
                Cancel
              </button>
              <button
                type="button"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={submitRelationship}
                disabled={saving.value}
              >
                {saving.value ? "Saving..." : "Add"}
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
              {allPeople
                .filter((p) => p.id !== personId)
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
            if (saving.value) return;
            showAddEmployment.value = false;
            resetEmploymentForm();
          }}
          disableClose={saving.value}
          footer={(
            <>
              <button
                type="button"
                class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                onClick={() => {
                  if (saving.value) return;
                  showAddEmployment.value = false;
                  resetEmploymentForm();
                }}
                disabled={saving.value}
              >
                Cancel
              </button>
              <button
                type="button"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={submitEmployment}
                disabled={saving.value}
              >
                {saving.value ? "Saving..." : "Add"}
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
            <FormField
              label="Title"
              error={firstError(employmentFieldErrors.value, "title")}
              hint="Optional"
            >
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
    </>
  );
}
