import { define } from "../../utils.ts";
import { vinLookupService } from "../../services/vin.ts";

export const handler = define.handlers({
  async POST(ctx) {
    try {
      const body = await ctx.req.json();
      const { vin } = body;

      if (!vin) {
        return new Response(
          JSON.stringify({ error: "VIN is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const result = await vinLookupService.lookupVin(vin);

      if ("error" in result) {
        return new Response(
          JSON.stringify(result),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // Determine if this is an RV
      const isRv = vinLookupService.isRvVehicle(result);

      // Create a clean object without undefined values for JSON serialization
      const cleanResult: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(result)) {
        if (value !== undefined) {
          cleanResult[key] = value;
        }
      }

      return new Response(
        JSON.stringify({
          ...cleanResult,
          vehicleType: isRv ? "rv" : "car",
          isRv,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    } catch (error) {
      console.error("VIN lookup API error:", error);
      return new Response(
        JSON.stringify({
          error: "INTERNAL_ERROR",
          message: "Internal server error",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  },
});
