import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { api, type CreatePersonRequest, type PersonDto } from "../../lib/api.ts";
import { firstError, zodToFieldErrors } from "../../lib/forms.ts";
import { createPersonSchema } from "../../lib/peopleSchemas.ts";
import FormModal from "../../components/forms/FormModal.tsx";
import FormField from "../../components/forms/FormField.tsx";
import FormErrorSummary from "../../components/forms/FormErrorSummary.tsx";

export default function TeamMembersIsland() {
  const people = useSignal<PersonDto[]>([]);
  const loading = useSignal(true);
  const error = useSignal<string | null>(null);

  const showAdd = useSignal(false);
  const saving = useSignal(false);

  const email = useSignal("");
  const username = useSignal("");
  const role = useSignal("Guest");

  const fieldErrors = useSignal<Record<string, string[]>>({});
  const formErrors = useSignal<string[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      people.value = await api.people.getAll();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load team";
    } finally {
      loading.value = false;
    }
  }

  function resetForm() {
    email.value = "";
    username.value = "";
    role.value = "Guest";
    fieldErrors.value = {};
    formErrors.value = [];
  }

  async function submitCreate() {
    saving.value = true;
    error.value = null;
    fieldErrors.value = {};
    formErrors.value = [];

    const parsed = createPersonSchema.safeParse({
      email: email.value,
      username: username.value,
      role: role.value,
    });

    if (!parsed.success) {
      const mapped = zodToFieldErrors(parsed.error);
      fieldErrors.value = mapped.fieldErrors;
      formErrors.value = mapped.formErrors;
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
      showAdd.value = false;
      resetForm();
      await load();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to add team member";
    } finally {
      saving.value = false;
    }
  }

  if (loading.value) {
    return (
      <div class="flex items-center justify-center py-12">
        <div class="text-gray-500">Loading team…</div>
      </div>
    );
  }

  return (
    <div class="space-y-4">
      {error.value && (
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error.value}
        </div>
      )}

      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold text-gray-800">Team Members</h2>
        <button
          type="button"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          onClick={() => {
            showAdd.value = true;
            resetForm();
          }}
        >
          + Add member
        </button>
      </div>

      {people.value.length === 0 ? (
        <div class="bg-white rounded-xl shadow-md p-8 text-center">
          <p class="text-gray-500">No team members yet.</p>
        </div>
      ) : (
        <div class="bg-white rounded-xl shadow-md divide-y">
          {people.value.map((p) => (
            <div key={p.id} class="p-4 flex items-center justify-between">
              <div>
                <div class="font-semibold">{p.username}</div>
                <div class="text-sm text-gray-500">{p.email}</div>
              </div>
              <div class="text-sm text-gray-600">{p.role}</div>
            </div>
          ))}
        </div>
      )}

      {showAdd.value && (
        <FormModal
          title="Add team member"
          subtitle="Create a person record"
          onClose={() => {
            if (saving.value) return;
            showAdd.value = false;
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
                  showAdd.value = false;
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
                onClick={submitCreate}
              >
                {saving.value ? "Saving..." : "Add"}
              </button>
            </>
          )}
        >
          <FormErrorSummary errors={formErrors.value} />

          <FormField label="Email" error={firstError(fieldErrors.value, "email")}>
            <input
              type="email"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg"
              value={email.value}
              onInput={(e) => email.value = (e.target as HTMLInputElement).value}
            />
          </FormField>

          <FormField
            label="Username"
            error={firstError(fieldErrors.value, "username")}
          >
            <input
              class="w-full px-3 py-2 border border-gray-300 rounded-lg"
              value={username.value}
              onInput={(e) =>
                username.value = (e.target as HTMLInputElement).value}
            />
          </FormField>

          <FormField label="Role" error={firstError(fieldErrors.value, "role")}>
            <select
              class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
              value={role.value}
              onChange={(e) => role.value = (e.target as HTMLSelectElement).value}
            >
              <option value="Admin">Admin</option>
              <option value="Parent">Parent</option>
              <option value="Child">Child</option>
              <option value="Guest">Guest</option>
            </select>
          </FormField>
        </FormModal>
      )}
    </div>
  );
}
