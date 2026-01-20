import { Head } from "fresh/runtime";
import { define, url } from "../utils.ts";

interface PickerUser {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
}

interface PageData {
  users: PickerUser[];
  error?: string;
}

// Server-side data loading
export const handler = define.handlers({
  async GET(ctx) {
    const requestId = crypto.randomUUID();
    const startedAt = Date.now();

    const rawApiUrl = Deno.env.get("VITE_API_URL");
    // Server-side fetch requires absolute URL - relative paths don't work
    const apiUrl = (rawApiUrl && rawApiUrl.startsWith("http")) 
      ? rawApiUrl 
      : "http://api:5120/api";
    const endpoint = "v1/people";
    const normalizedBase = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;
    const fullUrl = `${normalizedBase}/${endpoint}`;

    const logBase = {
      requestId,
      route: "/",
      method: ctx.req.method,
      requestUrl: ctx.req.url,
      resolvedApiUrl: apiUrl,
      endpoint,
      fullUrl,
      env: {
        hasViteApiUrl: Boolean(rawApiUrl),
      },
    };

    console.log(
      JSON.stringify({
        level: "info",
        msg: "budget:index:fetch_users:start",
        ...logBase,
      }),
    );

    const abortController = new AbortController();
    const timeoutMs = 8000;
    const timeoutId = setTimeout(
      () => abortController.abort(new Error(`timeout_after_${timeoutMs}ms`)),
      timeoutMs,
    );

    try {
      const response = await fetch(fullUrl, {
        headers: {
          Accept: "application/json",
          "X-Request-Id": requestId,
        },
        signal: abortController.signal,
      });

      const elapsedMs = Date.now() - startedAt;
      console.log(
        JSON.stringify({
          level: "info",
          msg: "budget:index:fetch_users:response",
          ...logBase,
          elapsedMs,
          status: response.status,
          statusText: response.statusText,
        }),
      );

      if (!response.ok) {
        const bodyText = await response.text().catch(() => "<unreadable>");
        console.error(
          JSON.stringify({
            level: "error",
            msg: "budget:index:fetch_users:non_ok",
            ...logBase,
            elapsedMs,
            status: response.status,
            statusText: response.statusText,
            bodyPreview: bodyText.slice(0, 2000),
          }),
        );
        return {
          data: {
            users: [],
            error: `Backend error (${response.status}) calling ${endpoint}`,
          },
        };
      }

      const people: Array<
        { id: string; username: string; role: string; isActive: boolean }
      > = await response.json();
      const users: PickerUser[] = people.map((p) => ({
        id: p.id,
        name: p.username,
        role: p.role,
        isActive: p.isActive,
      }));
      console.log(
        JSON.stringify({
          level: "info",
          msg: "budget:index:fetch_users:success",
          ...logBase,
          elapsedMs,
          userCount: users.length,
        }),
      );
      return { data: { users } };
    } catch (error) {
      const elapsedMs = Date.now() - startedAt;
      const err = error as Error;
      console.error(
        JSON.stringify({
          level: "error",
          msg: "budget:index:fetch_users:failed",
          ...logBase,
          elapsedMs,
          errorName: err?.name,
          errorMessage: err?.message,
          errorStack: err?.stack,
        }),
      );
      return {
        data: {
          users: [],
          error: `Could not connect to backend (requestId: ${requestId})`,
        },
      };
    } finally {
      clearTimeout(timeoutId);
    }
  },
});

// Get avatar emoji based on role
function getAvatar(user: PickerUser): string {
  switch (user.role) {
    case "Parent":
      return user.name === "Mom" ? "👩" : "👨";
    case "Child":
      return "🧒";
    default:
      return "👤";
  }
}

// Get card color based on role
function getCardColor(user: PickerUser): string {
  switch (user.role) {
    case "Parent":
      return user.name === "Mom"
        ? "bg-pink-100 hover:bg-pink-200"
        : "bg-blue-100 hover:bg-blue-200";
    case "Child":
      return "bg-green-100 hover:bg-green-200";
    default:
      return "bg-gray-100 hover:bg-gray-200";
  }
}

export default define.page<typeof handler>(function UserPicker(props) {
  const { users, error } = props.data as PageData;

  return (
    <div class="min-h-screen bg-linear-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center p-8">
      <Head>
        <title>Budget - Who's Budgeting?</title>
        <link
          href="https://cdn.jsdelivr.net/npm/daisyui@5.0.0/daisyui.css"
          rel="stylesheet"
          type="text/css"
        />
      </Head>

      <div class="text-center mb-12">
        <h1 class="text-5xl font-bold text-white mb-4">
          💰 Budget
        </h1>
        <p class="text-xl text-slate-300">
          Who's budgeting today?
        </p>
      </div>

      {error && (
        <div class="alert alert-error mb-8 max-w-md">
          <span>{error}</span>
        </div>
      )}

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
        {users.map((user: PickerUser) => (
          <a
            key={user.id}
            href={url(`/dashboard?userId=${encodeURIComponent(user.id)}`)}
            class={`card ${
              getCardColor(user)
            } shadow-xl cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-2xl`}
          >
            <div class="card-body items-center text-center py-12">
              <div class="text-7xl mb-4">
                {getAvatar(user)}
              </div>
              <h2 class="card-title text-2xl text-slate-800">
                {user.name}
              </h2>
              <p class="text-slate-600">
                {user.role}
              </p>
            </div>
          </a>
        ))}
      </div>

      <div class="mt-12 text-slate-500 text-sm">
        Phase 1: Auth-Less Development Mode
      </div>
    </div>
  );
});
