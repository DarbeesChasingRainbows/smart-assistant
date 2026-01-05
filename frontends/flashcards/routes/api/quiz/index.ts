import { define } from "../../../utils.ts";
import { RetentionApiClient } from "../../../utils/api.ts";

const client = new RetentionApiClient();

export const handler = define.handlers({
  async POST(ctx) {
    const url = new URL(ctx.url);
    const difficulty = (url.searchParams.get("difficulty") || "Medium") as "Easy" | "Medium" | "Difficult" | "Expert";
    const count = Number(url.searchParams.get("count")) || 10;
    const deckId = url.searchParams.get("deckId") || null;

    try {
      const session = await client.generateQuiz(difficulty, count, deckId);
      return Response.json(session);
    } catch (error) {
      console.error("Error generating quiz:", error);
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
});
