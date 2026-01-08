// main.tsx
import { App, staticFiles } from "fresh";
import { type State, asset, url } from "./utils.ts"; // <-- Added 'asset' import

export const app = new App<State>({ basePath: "/flashcards" });

app.use(staticFiles());

// 1. The HTML Shell (App Wrapper)
// In Fresh 2.x, this takes a component function with 'Component' in the props
app.appWrapper(({ Component }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Flashcards | LifeOS</title>
        {/* MANUAL FIX: Use the asset helper to force the prefix.
          This solves the Fresh 2.x 'basePath' asset bug.
        */}
        <link rel="stylesheet" href={asset("/static/styles.css")} />
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
});

// 2. The UI Layout (Navigation/Branding)
app.layout("/*", (ctx) => {
  // Get current path to highlight active link
  const currentPath = ctx.url.pathname;

  return (
    <div class="min-h-screen bg-base-200">
      <nav class="navbar bg-primary text-primary-content">
        <div class="flex-1">
          {/* EXTERNAL LINK: Goes to Root LifeOS App (No helper needed) */}
          <a class="btn btn-ghost text-xl" href="/">LifeOS</a>
          
          {/* Badge distinct from Garage (using badge-secondary for pink/purple vs accent) */}
          <span class="badge badge-secondary ml-2">Flashcards</span>
        </div>
        <div class="flex-none">
          <ul class="menu menu-horizontal px-1">
            
            {/* INTERNAL LINK: Dashboard */}
            <li>
              <a href={url("/dashboard")} class={currentPath.startsWith(url("/dashboard")) ? "active" : ""}>
                Dashboard
              </a>
            </li>

            {/* INTERNAL LINK: Decks List */}
            <li>
              <a href={url("/decks")} class={currentPath.startsWith(url("/decks")) ? "active" : ""}>
                My Decks
              </a>
            </li>

            {/* INTERNAL LINK: Study Mode */}
            <li>
              <a href={url("/quiz/interleaved")} class={currentPath.startsWith(url("/quiz")) ? "active" : ""}>
                Study
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

app.fsRoutes();