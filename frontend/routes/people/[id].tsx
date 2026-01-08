import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import {
  api,
  type PersonDto,
  type PeopleRelationshipDto,
  type PeopleEmploymentDto,
} from "../../lib/api.ts";
import PersonDetailActionsIsland from "../../islands/people/PersonDetailActionsIsland.tsx";

interface GraphConnection {
  type: "relationship" | "employment" | "budget" | "task";
  label: string;
  description: string;
  targetId?: string;
  targetName?: string;
  href?: string;
  icon: string;
  color: string;
  createdAt: string;
}

interface PageData {
  person: PersonDto | null;
  relationships: PeopleRelationshipDto[];
  employment: PeopleEmploymentDto[];
  allPeople: PersonDto[];
  connections: GraphConnection[];
  error?: string;
}

export const handler = define.handlers({
  async GET(ctx) {
    const id = ctx.params.id;

    try {
      const [person, relationships, employment, allPeople] = await Promise.all([
        api.people.getById(id),
        api.people.getRelationships(id),
        api.people.getEmployment(id),
        api.people.getAll(),
      ]);

      // Build graph connections from relationships and employment
      const connections: GraphConnection[] = [];

      // Add relationship connections
      for (const rel of relationships) {
        const relatedPerson = allPeople.find((p) => p.id === rel.toPersonId);
        connections.push({
          type: "relationship",
          label: rel.type,
          description: relatedPerson
            ? `${rel.type} of ${relatedPerson.username}`
            : `${rel.type} relationship`,
          targetId: rel.toPersonId,
          targetName: relatedPerson?.username,
          href: `/people/${rel.toPersonId}`,
          icon: getRelationshipIcon(rel.type),
          color: rel.isValid ? "blue" : "gray",
          createdAt: rel.createdAt,
        });
      }

      // Add employment connections
      for (const job of employment) {
        connections.push({
          type: "employment",
          label: job.employer,
          description: job.title
            ? `${job.title} at ${job.employer}`
            : `Works at ${job.employer}`,
          icon: "💼",
          color: job.isCurrent ? "green" : "gray",
          createdAt: job.createdAt,
        });
      }

      return {
        data: {
          person,
          relationships,
          employment,
          allPeople,
          connections,
        } as PageData,
      };
    } catch (e) {
      return {
        data: {
          person: null,
          relationships: [],
          employment: [],
          allPeople: [],
          connections: [],
          error: e instanceof Error ? e.message : "Failed to load person",
        } as PageData,
      };
    }
  },
});

function getRelationshipIcon(type: string): string {
  switch (type.toLowerCase()) {
    case "parent":
      return "👨‍👩";
    case "child":
      return "🧒";
    case "spouse":
      return "💑";
    case "sibling":
      return "👫";
    case "guardian":
      return "🛡️";
    case "partner":
      return "❤️";
    default:
      return "🔗";
  }
}

function getRoleEmoji(role: string): string {
  switch (role) {
    case "Admin":
      return "⚙️";
    case "Parent":
      return "👨‍👩";
    case "Child":
      return "🧒";
    case "Guest":
      return "👋";
    default:
      return "👤";
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default define.page<typeof handler>(function PersonDetailPage(props) {
  const { person, relationships, employment, allPeople, connections, error } = props.data;

  if (error || !person) {
    return (
      <div class="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center px-4">
        <Head>
          <title>Person Not Found - LifeOS</title>
        </Head>
        <div class="bg-white rounded-3xl shadow-lg border border-slate-200 p-8 max-w-md w-full text-center">
          <div class="mx-auto w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl">
            😕
          </div>
          <h1 class="text-2xl font-bold text-slate-900 mt-5">Person Not Found</h1>
          <p class="text-slate-600 mt-2">{error || "This person doesn't exist."}</p>
          <a
            href="/people"
            class="inline-flex items-center justify-center mt-6 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            Back to People
          </a>
        </div>
      </div>
    );
  }

  return (
    <div class="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-100">
      <Head>
        <title>{person.username} - LifeOS</title>
      </Head>

      {/* Header */}
      <header class="bg-white/80 backdrop-blur border-b border-slate-200 sticky top-0 z-40">
        <div class="max-w-6xl mx-auto px-4 py-5">
          <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div class="flex items-start gap-4">
              <a
                href="/people"
                class="p-2 rounded-xl hover:bg-slate-100 transition-colors"
                title="Back to People"
              >
                <svg class="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </a>

              <div class="flex items-center gap-4">
                <div class="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-3xl shadow-sm">
                  {getRoleEmoji(person.role)}
                </div>
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <h1 class="text-2xl font-bold text-slate-900 leading-tight">{person.username}</h1>
                    <span
                      class={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        person.isActive
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      {person.isActive ? "Active" : "Inactive"}
                    </span>
                    <span class="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
                      {person.role}
                    </span>
                  </div>
                  <p class="text-slate-600 break-all">{person.email}</p>
                </div>
              </div>
            </div>

            <PersonDetailActionsIsland
              personId={person.id}
              budgetHref={`/budget?userId=${person.id}`}
              allPeople={allPeople}
            />
          </div>
        </div>
      </header>

      <main class="max-w-6xl mx-auto px-4 py-7">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Person Info */}
          <div class="space-y-6">
            {/* Quick Info Card */}
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 class="text-lg font-semibold text-slate-900 mb-4">Details</h2>
              <dl class="space-y-3">
                <div>
                  <dt class="text-sm text-slate-500">Member Since</dt>
                  <dd class="font-medium text-slate-900">{formatDate(person.createdAt)}</dd>
                </div>
                <div>
                  <dt class="text-sm text-slate-500">Last Updated</dt>
                  <dd class="font-medium text-slate-900">{formatDate(person.updatedAt)}</dd>
                </div>
                <div>
                  <dt class="text-sm text-slate-500">ID</dt>
                  <dd class="font-mono text-xs text-slate-500 break-all">{person.id}</dd>
                </div>
              </dl>
            </div>

            {/* Quick Actions */}
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 class="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
              <div class="space-y-2">
                <a
                  href={`/budget?userId=${person.id}`}
                  class="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <span class="text-xl">💰</span>
                  <span class="font-medium text-slate-700">View Budget</span>
                </a>
                <button
                  type="button"
                  class="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
                  disabled
                >
                  <span class="text-xl">✏️</span>
                  <span class="font-medium text-slate-400">Edit Profile (coming soon)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Graph Connections */}
          <div class="lg:col-span-2 space-y-6">
            {/* Connections Overview */}
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div class="flex items-center justify-between mb-6">
                <div>
                  <h2 class="text-lg font-semibold text-slate-900">Connections</h2>
                  <p class="text-sm text-slate-500">
                    Graph relationships and activity for {person.username}
                  </p>
                </div>
                <div class="text-3xl">🔗</div>
              </div>

              {connections.length === 0 ? (
                <div class="text-center py-10">
                  <div class="mx-auto w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl">
                    🌱
                  </div>
                  <p class="text-slate-600 mt-4 font-medium">No connections yet</p>
                  <p class="text-sm text-slate-400 mt-1">
                    Add relationships or employment to see them here.
                  </p>
                </div>
              ) : (
                <div class="space-y-3">
                  {connections.map((conn, idx) => (
                    <ConnectionCard key={idx} connection={conn} />
                  ))}
                </div>
              )}
            </div>

            {/* Relationships Section */}
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-semibold text-slate-900">
                  👨‍👩‍👧‍👦 Family Relationships
                </h2>
                <span class="text-sm text-slate-500">
                  {relationships.length} relationship{relationships.length !== 1 ? "s" : ""}
                </span>
              </div>

              {relationships.length === 0 ? (
                <div class="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
                  No family relationships defined yet.
                </div>
              ) : (
                <div class="space-y-2">
                  {relationships.map((rel) => {
                    const relatedPerson = allPeople.find((p) => p.id === rel.toPersonId);
                    return (
                      <a
                        key={rel.key}
                        href={`/people/${rel.toPersonId}`}
                        class={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                          rel.isValid
                            ? "hover:bg-blue-50 border border-blue-100 bg-white"
                            : "bg-slate-50 border border-slate-200 opacity-60"
                        }`}
                      >
                        <div class="flex items-center gap-3">
                          <span class="text-xl">{getRelationshipIcon(rel.type)}</span>
                          <div>
                            <div class="font-medium text-slate-900">
                              {relatedPerson?.username || "Unknown"}
                            </div>
                            <div class="text-sm text-slate-500">{rel.type}</div>
                          </div>
                        </div>
                        <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Employment Section */}
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-semibold text-slate-900">💼 Employment</h2>
                <span class="text-sm text-slate-500">
                  {employment.length} record{employment.length !== 1 ? "s" : ""}
                </span>
              </div>

              {employment.length === 0 ? (
                <div class="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
                  No employment records yet.
                </div>
              ) : (
                <div class="space-y-2">
                  {employment.map((job) => (
                    <div
                      key={job.key}
                      class={`p-3 rounded-xl border ${
                        job.isCurrent
                          ? "border-green-200 bg-green-50"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div class="flex items-center justify-between">
                        <div>
                          <div class="font-medium text-slate-900">{job.employer}</div>
                          {job.title && (
                            <div class="text-sm text-slate-600">{job.title}</div>
                          )}
                          <div class="text-xs text-slate-500 mt-1">
                            {formatDate(job.startDate)}
                            {job.endDate ? ` → ${formatDate(job.endDate)}` : ""}
                          </div>
                        </div>
                        {job.isCurrent && (
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

            {/* Activity Log / Audit Trail Placeholder */}
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-semibold text-slate-900">📋 Activity Log</h2>
                <span class="text-xs text-slate-400">Quasi-audit trail</span>
              </div>
              <div class="text-center py-6">
                <span class="text-4xl">🕐</span>
                <p class="text-slate-600 mt-3 font-medium">Activity tracking coming soon</p>
                <p class="text-sm text-slate-400 mt-1">
                  Budget assignments, transactions, and other activities will appear here
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
});

function ConnectionCard({ connection }: { connection: GraphConnection }) {
  const colorClasses: Record<string, string> = {
    blue: "border-blue-200 bg-blue-50 hover:bg-blue-100",
    green: "border-green-200 bg-green-50 hover:bg-green-100",
    gray: "border-gray-200 bg-gray-50 hover:bg-gray-100 opacity-60",
  };

  const content = (
    <div class="flex items-center gap-4">
      <span class="text-2xl">{connection.icon}</span>
      <div class="flex-1 min-w-0">
        <div class="font-medium text-gray-900">{connection.label}</div>
        <div class="text-sm text-gray-600 truncate">{connection.description}</div>
      </div>
      <div class="text-xs text-gray-400">{formatDate(connection.createdAt)}</div>
      {connection.href && (
        <svg class="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  );

  if (connection.href) {
    return (
      <a
        href={connection.href}
        class={`block p-4 rounded-xl border transition-colors ${colorClasses[connection.color] || colorClasses.gray}`}
      >
        {content}
      </a>
    );
  }

  return (
    <div class={`p-4 rounded-xl border ${colorClasses[connection.color] || colorClasses.gray}`}>
      {content}
    </div>
  );
}
