import { type PageProps } from "fresh";

export default function App({ Component }: PageProps) {
  return (
    <html data-theme="dim">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>LifeOS | Garage</title>
        
        {/* NOTE: Since you are using Vite (fresh-plugin-vite), 
           your CSS is likely injected automatically via 'client.ts'.
           If you see unstyled content, you can uncomment the line below 
           to force-load the static file.
        */}
        {/* <link rel="stylesheet" href="/styles.css" /> */}
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
}