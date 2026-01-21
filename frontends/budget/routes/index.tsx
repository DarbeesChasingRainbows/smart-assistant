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
        ? "border-[#00ff88]/30 hover:border-[#00ff88] bg-[#00ff88]/5"
        : "border-[#00d9ff]/30 hover:border-[#00d9ff] bg-[#00d9ff]/5";
    case "Child":
      return "border-[#ffb000]/30 hover:border-[#ffb000] bg-[#ffb000]/5";
    default:
      return "border-[#333] hover:border-[#888] bg-[#1a1a1a]";
  }
}

// Get text color based on role
function getTextColor(user: PickerUser): string {
  switch (user.role) {
    case "Parent":
      return user.name === "Mom" ? "text-[#00ff88]" : "text-[#00d9ff]";
    case "Child":
      return "text-[#ffb000]";
    default:
      return "text-white";
  }
}

export default define.page<typeof handler>(function UserPicker(props) {
  const { users, error } = props.data as PageData;

  return (
    <div class="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-8">
      <Head>
        <title>Budget - ACCESS SELECTION</title>
        <link
          href="https://cdn.jsdelivr.net/npm/daisyui@5.0.0/daisyui.css"
          rel="stylesheet"
          type="text/css"
        />
      </Head>

      <div class="text-center mb-12">
        <h1 class="text-5xl md:text-6xl font-bold text-white mb-4 font-mono tracking-tighter">
          <span class="text-[#00d9ff]">$</span>
          <span>BUDGET</span>
        </h1>
        <p class="text-xs md:text-sm text-[#888] font-mono uppercase tracking-[0.3em]">
          IDENTIFY OPERATOR FOR SYSTEM ACCESS
        </p>
      </div>

      {error && (
        <div class="alert bg-red-500/10 border border-red-500 mb-8 max-w-md font-mono text-xs text-red-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            class="stroke-current shrink-0 w-6 h-6"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            >
            </path>
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 max-w-5xl w-full">
        {users.map((user: PickerUser) => (
          <a
            key={user.id}
            href={url(`/dashboard?userId=${encodeURIComponent(user.id)}`)}
            class={`card border-2 ${
              getCardColor(user)
            } cursor-pointer transition-all duration-300 group overflow-hidden`}
          >
            <div class="card-body items-center text-center py-12 relative">
              {/* HUD scanline effect */}
              <div class="absolute inset-0 bg-linear-to-b from-transparent via-white/5 to-transparent h-[200%] -top-full group-hover:top-0 transition-all duration-1000 pointer-events-none opacity-20">
              </div>

              <div class="text-7xl mb-6 grayscale group-hover:grayscale-0 transition-all duration-500 scale-90 group-hover:scale-110">
                {getAvatar(user)}
              </div>
              <h2
                class={`card-title text-2xl font-mono font-bold uppercase tracking-tight ${
                  getTextColor(user)
                }`}
              >
                {user.name}
              </h2>
              <p class="text-[#666] font-mono text-[10px] tracking-widest uppercase mt-1">
                {user.role}
              </p>

              <div class="mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span
                  class={`text-[10px] font-mono font-bold py-1 px-3 border rounded ${
                    getCardColor(user).includes("ff88")
                      ? "border-[#00ff88] text-[#00ff88]"
                      : getCardColor(user).includes("d9ff")
                      ? "border-[#00d9ff] text-[#00d9ff]"
                      : "border-[#ffb000] text-[#ffb000]"
                  }`}
                >
                  INITIALIZE ACCESS
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>

      <div class="mt-16 text-[#444] font-mono text-[10px] tracking-[0.2em] uppercase">
        SYSTEM STATUS: ONLINE | PHASE 4.3 READY
      </div>
    </div>
  );
});
