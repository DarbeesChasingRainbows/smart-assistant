import { define } from "../../../utils.ts";

export const handler = define.handlers({
  async POST(ctx) {
    try {
      const { flashcards } = await ctx.req.json();
      
      const response = await fetch("http://localhost:5000/api/v1/flashcards/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ flashcards }),
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
