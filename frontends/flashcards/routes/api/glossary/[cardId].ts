import { define } from "../../../utils.ts";
import { RetentionApiClient } from "../../../utils/api.ts";

const client = new RetentionApiClient();

export const handler = define.handlers({
  async GET(ctx) {
    const cardId = ctx.params.cardId;
    try {
      const terms = await client.getGlossaryForCard(cardId);
      return Response.json(terms);
    } catch (error) {
      console.error("Error fetching glossary:", error);
      return Response.json([], { status: 500 });
    }
  },
});
