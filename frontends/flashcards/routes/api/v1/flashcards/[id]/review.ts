import { define } from "../../../../../utils.ts";
import { RetentionApiClient } from "../../../../../utils/api.ts";

const client = new RetentionApiClient();

export const handler = define.handlers({
  async PUT(ctx) {
    const { id } = ctx.params;

    try {
      const body = await ctx.req.json();
      const { rating } = body;

      const response = await fetch(
        `${client.baseUrl}/api/v1/flashcards/${id}/review`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to update card review: ${response.statusText}`);
      }

      const result = await response.json();
      return Response.json(result);
    } catch (error) {
      console.error("Error updating card review:", error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
});
