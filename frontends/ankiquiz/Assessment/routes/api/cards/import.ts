import { define } from "../../../utils.ts";

export const handler = define.handlers({
  async POST(ctx) {
    try {
      const formData = await ctx.req.formData();
      const file = formData.get("file") as File;
      
      if (!file) {
        return new Response(JSON.stringify({ error: "No file provided" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const base64Content = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      const response = await fetch("http://localhost:5000/api/v1/flashcards/import-anki", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          base64Content,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const result = await response.json();
      return Response.json(result);
    } catch (error) {
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
});
