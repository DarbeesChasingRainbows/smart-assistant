import { asset } from "fresh/runtime";

export default function App({ Component }: { Component: () => any }) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>garage</title>
        <link rel="stylesheet" href={asset("/assets/client-entry-CKyOw2OF.css")} />
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
}
