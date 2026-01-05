import { define } from "../../../utils.ts";

export const handler = define.handlers({
  async POST(ctx) {
    try {
      const { question, answer } = await ctx.req.json();
      
      const response = await fetch("http://localhost:5000/api/v1/flashcards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question, answer }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const flashcard = await response.json();
      return Response.json(flashcard);
    } catch (error) {
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
});
