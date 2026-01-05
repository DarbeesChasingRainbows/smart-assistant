import { PageProps, page } from "fresh";
import { Head } from "fresh/runtime";
import { define } from "../../utils.ts";
import { db } from "../../services/database.ts";
import { ValidationError, Validator } from "../../utils/validation.ts";
import AddVehicleForm from "../../islands/AddVehicleForm.tsx";

interface AddVehicleData {
  error?: string;
}

export const handler = define.handlers<AddVehicleData>({
  GET(_ctx) {
    return page<AddVehicleData>({});
  },

  async POST(ctx) {
    try {
      const formData = await ctx.req.formData();

      // Validate and sanitize all inputs
      const vin = Validator.validateVin(formData.get("vin") as string);
      const vehicleType = Validator.validateVehicleType(
        formData.get("vehicleType") as string,
      );
      const make = Validator.validateMake(formData.get("make") as string);
      const model = Validator.validateModel(formData.get("model") as string);
      const year = Validator.validateYear(formData.get("year") as string);
      const trim = Validator.validateText(
        formData.get("trim") as string,
        "Trim",
        100,
      );
      const engine = Validator.validateText(
        formData.get("engine") as string,
        "Engine",
        100,
      );
      const transmission = Validator.validateText(
        formData.get("transmission") as string,
        "Transmission",
        100,
      );
      const licensePlate = Validator.validateLicensePlate(
        formData.get("licensePlate") as string,
      );
      const color = Validator.validateColor(formData.get("color") as string);
      const purchaseDate = Validator.validateDate(
        formData.get("purchaseDate") as string,
      );
      const purchaseMileage = Validator.validateMileage(
        formData.get("purchaseMileage") as string,
      );
      const currentMileage = Validator.validateMileage(
        formData.get("currentMileage") as string,
      );

      // Create vehicle
      const vehicleId = await db.createVehicle({
        vin: vin || undefined,
        vehicleType,
        make,
        model,
        year,
        trim: trim || undefined,
        engine: engine || undefined,
        transmission: transmission || undefined,
        licensePlate: licensePlate || undefined,
        color: color || undefined,
        purchaseDate: purchaseDate || undefined,
        purchaseMileage: purchaseMileage || undefined,
        currentMileage: currentMileage || 0,
      });

      // Initialize maintenance schedules
      await db.initializeVehicleSchedules(
        vehicleId,
        vehicleType,
        make,
        model,
        year,
      );

      // Redirect to vehicle details
      return new Response("", {
        status: 303,
        headers: { Location: `/vehicles/${vehicleId}` },
      });
    } catch (error) {
      console.error("Failed to create vehicle:", error);

      if (error instanceof ValidationError) {
        return page<AddVehicleData>({ error: error.message });
      }

      return page<AddVehicleData>({
        error: "Failed to create vehicle. Please try again.",
      });
    }
  },
});

export default define.page(
  function AddVehiclePage(_ctx: PageProps<AddVehicleData>) {
    return (
      <>
        <Head>
          <title>Add Vehicle - Vehicle Maintenance</title>
        </Head>

        <div class="px-4 py-8 mx-auto min-h-screen bg-gray-50">
          <div class="max-w-2xl mx-auto">
            {/* Header */}
            <div class="mb-8">
              <a href="/vehicles" class="text-blue-600 hover:text-blue-700 text-sm">
                ← Back to Vehicles
              </a>
              <h1 class="text-3xl font-bold text-gray-900 mt-2">Add New Vehicle</h1>
              <p class="text-gray-600 mt-2">
                Enter vehicle details manually or lookup by VIN
              </p>
            </div>

            {/* Interactive Add Vehicle Form with VIN Lookup */}
            <AddVehicleForm />
          </div>
        </div>
      </>
    );
  },
);
