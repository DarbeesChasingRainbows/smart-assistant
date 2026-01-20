import { define } from "../../../utils.ts";
import { RetentionApiClient } from "../../../utils/api.ts";

const client = new RetentionApiClient();

export const handler = define.handlers({
  async GET(ctx) {
    const id = ctx.params.id;
    try {
      const card = await client.getCard(id);
      return Response.json(card);
    } catch (error) {
      console.error(`Error fetching card ${id}:`, error);
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
