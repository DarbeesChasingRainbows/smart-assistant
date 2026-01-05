import { define } from "../utils.ts";

export default define.page(function App({ Component }) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>VehicleMaintenence</title>
      </head>
      <body>
        <header style="background:#0f172a;color:#e2e8f0;padding:12px 16px;display:flex;align-items:center;gap:12px;">
          <span style="font-weight:700;">Garage</span>
          <a href="http://localhost:8000" style="color:#93c5fd;text-decoration:none;font-weight:600;">← Back to LifeOS</a>
        </header>
        <Component />
      </body>
    </html>
  );
});
