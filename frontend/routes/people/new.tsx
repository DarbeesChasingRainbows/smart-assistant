import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import { api, type CreatePersonRequest } from "../../lib/api.ts";

interface PageData {
  error?: string;
  success?: boolean;
  fieldErrors?: Record<string, string>;
}

export const handler = define.handlers({
  GET(_ctx) {
    return { data: {} as PageData };
  },

  async POST(ctx) {
    const form = await ctx.req.formData();
    const username = form.get("username")?.toString()?.trim() || "";
    const email = form.get("email")?.toString()?.trim() || "";
    const role = form.get("role")?.toString() || "Parent";

    const fieldErrors: Record<string, string> = {};

    if (!username) {
      fieldErrors.username = "Name is required";
    }
    if (!email) {
      fieldErrors.email = "Email is required";
    } else if (!email.includes("@")) {
      fieldErrors.email = "Please enter a valid email";
    }

    if (Object.keys(fieldErrors).length > 0) {
      return { data: { fieldErrors } as PageData };
    }

    try {
      const request: CreatePersonRequest = {
        username,
        email,
        role,
      };

      const person = await api.people.create(request);

      // Redirect to the new person's detail page
      return new Response(null, {
        status: 303,
        headers: { location: `/people/${person.id}` },
      });
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed to add family member";
      return { data: { error: errorMsg } as PageData };
    }
  },
});

export default define.page<typeof handler>(function AddFamilyMemberPage(props) {
  const { error, fieldErrors } = props.data;

  return (
    <div class="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Head>
        <title>Add Family Member - LifeOS</title>
      </Head>

      <header class="bg-white shadow-sm border-b">
        <div class="max-w-3xl mx-auto px-4 py-6">
          <div class="flex items-center gap-4">
            <a
              href="/people"
              class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Back to People"
            >
              <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </a>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Add Family Member</h1>
              <p class="text-sm text-gray-500">Add someone to your household</p>
            </div>
          </div>
        </div>
      </header>

      <main class="max-w-3xl mx-auto px-4 py-8">
        {error && (
          <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}

        <form method="post" class="space-y-8">
          {/* Basic Info Card */}
          <div class="bg-white rounded-2xl shadow-lg p-8">
            <div class="flex items-center gap-3 mb-6">
              <span class="text-3xl">👤</span>
              <h2 class="text-xl font-semibold text-gray-900">Basic Information</h2>
            </div>

            <div class="space-y-6">
              {/* Name Field */}
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2" for="username">
                  Name <span class="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  placeholder="e.g., John, Mom, Dad, Sarah"
                  class={`w-full px-4 py-3 rounded-xl border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    fieldErrors?.username ? "border-red-300 bg-red-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                  required
                />
                {fieldErrors?.username && (
                  <p class="mt-2 text-sm text-red-600">{fieldErrors.username}</p>
                )}
                <p class="mt-2 text-sm text-gray-500">
                  This is how they'll appear in the app. Use a friendly name like "Mom" or their first name.
                </p>
              </div>

              {/* Email Field */}
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2" for="email">
                  Email <span class="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="name@example.com"
                  class={`w-full px-4 py-3 rounded-xl border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    fieldErrors?.email ? "border-red-300 bg-red-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                  required
                />
                {fieldErrors?.email && (
                  <p class="mt-2 text-sm text-red-600">{fieldErrors.email}</p>
                )}
                <p class="mt-2 text-sm text-gray-500">
                  Used for identification. For kids without email, use something like kid@family.local
                </p>
              </div>

              {/* Role Field */}
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2" for="role">
                  Role in Family
                </label>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { value: "Parent", emoji: "👨‍👩", label: "Parent" },
                    { value: "Child", emoji: "🧒", label: "Child" },
                    { value: "Admin", emoji: "⚙️", label: "Admin" },
                    { value: "Guest", emoji: "👋", label: "Guest" },
                  ].map((option) => (
                    <label
                      key={option.value}
                      class="relative flex flex-col items-center p-4 rounded-xl border-2 border-gray-200 hover:border-blue-300 cursor-pointer transition-all has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
                    >
                      <input
                        type="radio"
                        name="role"
                        value={option.value}
                        class="sr-only"
                        checked={option.value === "Parent"}
                      />
                      <span class="text-2xl mb-1">{option.emoji}</span>
                      <span class="text-sm font-medium text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
                <p class="mt-3 text-sm text-gray-500">
                  Parents can manage budgets and settings. Children have limited access. Admins have full control.
                </p>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div class="bg-blue-50 rounded-2xl p-6 border border-blue-100">
            <div class="flex gap-3">
              <span class="text-2xl">💡</span>
              <div>
                <h3 class="font-medium text-blue-900">What happens next?</h3>
                <p class="text-sm text-blue-700 mt-1">
                  After adding this person, you can set up their relationships (spouse, parent, child), 
                  add them to budgets, and track their activities. You'll be able to see all their 
                  connections in a graph view.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div class="flex items-center justify-between pt-4">
            <a
              href="/people"
              class="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Cancel
            </a>
            <button
              type="submit"
              class="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-lg shadow-blue-500/25"
            >
              Add Family Member
            </button>
          </div>
        </form>
      </main>
    </div>
  );
});
