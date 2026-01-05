import { define } from "../../../utils.ts";
import { RetentionApiClient } from "../../../utils/api.ts";

const client = new RetentionApiClient();

export const handler = define.handlers({
  async POST(ctx) {
    const userId = (ctx.state as { userId?: string }).userId;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing anonymous user ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await ctx.req.json() as {
        deckId: string;
        flashcardId: string;
        isCorrect: boolean;
        difficulty: string;
        rawAnswer?: string;
      };

      const payload = {
        userId,
        deckId: body.deckId,
        flashcardId: body.flashcardId,
        isCorrect: body.isCorrect,
        difficulty: body.difficulty,
        rawAnswer: body.rawAnswer ?? null,
      };

      await fetch(`${client.baseUrl}/api/v1/flashcards/quiz-results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      return Response.json({ success: true });
    } catch (error) {
      console.error("Error recording quiz result:", error);
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
});
