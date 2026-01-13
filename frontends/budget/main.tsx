import { App, staticFiles } from "fresh";
import { asset, type State, url } from "./utils.ts";

// 1. Set the Base Path for internal routing
export const app = new App<State>({ basePath: "/budget" });

app.use(staticFiles());

// 2. The HTML Shell (App Wrapper) - Manual CSS Injection
app.appWrapper(({ Component }) => {
  return (
    <html lang="en" data-theme="emerald">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Budget | LifeOS</title>
        {/* MANUAL FIX: Inject CSS with the /budget prefix */}
        <link rel="stylesheet" href={asset("/assets/styles.css")} />
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
});

// 3. The UI Layout (Shared Nav Bar)
app.layout("/*", (ctx) => {
  const currentPath = ctx.url.pathname;

  return (
    <div class="min-h-screen bg-base-200">
      <nav class="navbar bg-primary text-primary-content">
        <div class="flex-1">
          {/* EXTERNAL LINK: Goes to Root LifeOS App */}
          <a class="btn btn-ghost text-xl" href={url("/")}>LifeOS</a>
          <span class="badge badge-accent ml-2">Budget</span>
        </div>
        <div class="flex-none">
          <ul class="menu menu-horizontal px-1">
            {/* INTERNAL LINKS: Use url() helper */}
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
                href={url("/accounts")}
                class={currentPath.startsWith(url("/accounts")) ? "active" : ""}
              >
                Accounts
              </a>
            </li>
            <li>
              <a
                href={url("/transactions")}
                class={currentPath.startsWith(url("/transactions"))
                  ? "active"
                  : ""}
              >
                Transactions
              </a>
            </li>
            <li>
              <a
                href={url("/bills")}
                class={currentPath.startsWith(url("/bills")) ? "active" : ""}
              >
                Bills
              </a>
            </li>
            <li>
              <a
                href={url("/goals")}
                class={currentPath.startsWith(url("/goals")) ? "active" : ""}
              >
                Goals
              </a>
            </li>
            <li>
              <a
                href={url("/settings")}
                class={currentPath.startsWith(url("/settings")) ? "active" : ""}
              >
                Settings
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

// 4. Middleware for shared state
app.use(async (ctx) => {
  ctx.state.shared = "hello";
  ctx.state.familyId = "default"; // TODO: Get from session/cookie
  return await ctx.next();
});

// Include file-system based routes
app.fsRoutes();
