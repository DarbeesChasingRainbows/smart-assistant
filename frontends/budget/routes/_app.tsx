import { define } from "../utils.ts";

export default define.page(function App({ Component }) {
  return (
    <html data-theme="dark" class="bg-[#111111]">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>frontend</title>
      </head>
      <body class="bg-[#111111] text-[#e0e0e0]">
        <Component />
      </body>
    </html>
  );
});
