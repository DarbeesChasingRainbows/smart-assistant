import { define } from "../../../../utils.ts";
import { RetentionApiClient } from "../../../../utils/api.ts";

const client = new RetentionApiClient();

export const handler = define.handlers({
  async GET(ctx) {
    const deckId = ctx.params.deckId;
    try {
      const refs = await client.getCrossReferences(deckId);
      return Response.json(refs);
    } catch (error) {
      console.error("Error fetching cross-references:", error);
      return Response.json([], { status: 500 });
    }
  },
});
