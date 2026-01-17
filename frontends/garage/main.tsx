import { App, staticFiles } from "fresh";
import { asset, type State, url } from "./utils.ts";

// 1. Set the Base Path for internal routing
export const app = new App<State>({ basePath: "/garage" });

app.use(staticFiles());

// 2. The HTML Shell (App Wrapper) - Manual CSS Injection
app.appWrapper(({ Component }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Garage | LifeOS</title>
        {/* MANUAL FIX: Inject CSS with the /garage prefix */}
        <link
          rel="stylesheet"
          href={asset("/assets/client-entry-DDm9qb59.css")}
        />
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
});

// 3. The UI Layout (Shared Nav Bar)
app.layout("/*", (ctx) => {
  // Get current path to highlight active link (optional polish)
  const currentPath = ctx.url.pathname;

  return (
    <div class="min-h-screen bg-base-200">
      <nav class="navbar bg-primary text-primary-content">
        <div class="flex-1">
          {/* EXTERNAL LINK: Goes to Root LifeOS App (No helper) */}
          <a class="btn btn-ghost text-xl" href="/">LifeOS</a>
          <span class="badge badge-accent ml-2">Garage</span>
        </div>
        <div class="flex-none">
          <ul class="menu menu-horizontal px-1">
            {/* INTERNAL LINK: Use url() helper */}
            <li>
              <a
                href={url("/")}
                class={currentPath === url("/") ? "active" : ""}
              >
                Dashboard
              </a>
            </li>
            <li>
              <a
                href={url("/vehicles")}
                class={currentPath.startsWith(url("/vehicles")) ? "active" : ""}
              >
                Vehicles
              </a>
            </li>
            <li>
              <a
                href={url("/maintenance")}
                class={currentPath.startsWith(url("/maintenance"))
                  ? "active"
                  : ""}
              >
                Maintenance
              </a>
            </li>
          </ul>
        </div>
      </nav>
      <main class="p-4">
        <ctx.Component />
      </main>
    </div>
  );
});

// Optional: Keep your middleware if you need it
app.use(async (ctx) => {
  ctx.state.shared = "hello";
  return await ctx.next();
});

// Include file-system based routes
app.fsRoutes();
