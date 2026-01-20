import { define } from "../../../utils.ts";
import { db } from "../../../services/database.ts";
import { ValidationError, Validator } from "../../../utils/validation.ts";

export const handler = define.handlers({
  // GET vehicle by ID
  async GET(ctx) {
    try {
      const { id } = ctx.params;
      const vehicle = await db.getVehicleById(id);

      if (!vehicle) {
        return new Response(
          JSON.stringify({ error: "Vehicle not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify(vehicle),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    } catch (error) {
      console.error("Get vehicle error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to get vehicle" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  },

  // PUT update vehicle
  async PUT(ctx) {
    try {
      const { id } = ctx.params;
      const body = await ctx.req.json();

      // Validate vehicle exists
      const vehicle = await db.getVehicleById(id);
      if (!vehicle) {
        return new Response(
          JSON.stringify({ error: "Vehicle not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }

      // Validate and sanitize inputs
      const updates: Record<string, unknown> = {};

      if (body.vin !== undefined) {
        updates.vin = Validator.validateVin(body.vin);
      }
      if (body.currentMileage !== undefined) {
        updates.currentMileage = Validator.validateMileage(
          String(body.currentMileage),
        );
      }
      if (body.licensePlate !== undefined) {
        updates.licensePlate = Validator.validateLicensePlate(
          body.licensePlate,
        );
      }
      if (body.color !== undefined) {
        updates.color = Validator.validateColor(body.color);
      }

      if (Object.keys(updates).length === 0) {
        return new Response(
          JSON.stringify({ error: "No valid updates provided" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      await db.updateVehicle(id, updates);

      // Get updated vehicle
      const updatedVehicle = await db.getVehicleById(id);

      return new Response(
        JSON.stringify(updatedVehicle),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    } catch (error) {
      console.error("Update vehicle error:", error);

      if (error instanceof ValidationError) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to update vehicle" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  },

  // DELETE vehicle
  async DELETE(ctx) {
    try {
      const { id } = ctx.params;

      // Validate vehicle exists
      const vehicle = await db.getVehicleById(id);
      if (!vehicle) {
        return new Response(
          JSON.stringify({ error: "Vehicle not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }

      await db.deleteVehicle(id);

      return new Response(
        JSON.stringify({ success: true, message: "Vehicle deleted" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    } catch (error) {
      console.error("Delete vehicle error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to delete vehicle" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  },
});
