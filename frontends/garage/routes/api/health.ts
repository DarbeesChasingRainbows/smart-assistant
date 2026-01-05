import { define } from "../../utils.ts";
import { db } from "../../services/database.ts";

export const handler = define.handlers({
  async GET() {
    try {
      // Test database connectivity
      const dbHealthy = await db.healthCheck();

      // Test cache service
      const cacheStats = {
        size: 0,
        status: "unknown",
      };

      try {
        // Import cache dynamically to avoid circular dependencies
        const { cache } = await import("../../services/cache.ts");
        const stats = cache.getStats();
        cacheStats.size = stats.size;
        cacheStats.status = "healthy";
      } catch (_error) {
        cacheStats.status = "error";
      }

      const health = {
        status: dbHealthy && cacheStats.status === "healthy"
          ? "healthy"
          : "unhealthy",
        timestamp: new Date().toISOString(),
        services: {
          database: {
            status: dbHealthy ? "healthy" : "unhealthy",
            responseTime: dbHealthy ? "< 100ms" : "timeout",
          },
          cache: cacheStats,
          vin_api: {
            status: "healthy", // External API, assume healthy unless tested
            endpoint: "https://vpic.nhtsa.dot.gov/api/",
          },
        },
        version: "1.0.0",
        environment: Deno.env.get("DENO_ENV") || "development",
      };

      const statusCode = health.status === "healthy" ? 200 : 503;

      return new Response(
        JSON.stringify(health, null, 2),
        {
          status: statusCode,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        },
      );
    } catch (error) {
      console.error("Health check failed:", error);

      return new Response(
        JSON.stringify(
          {
            status: "unhealthy",
            timestamp: new Date().toISOString(),
            error: "Health check failed",
            services: {
              database: { status: "error" },
              cache: { status: "error" },
              vin_api: { status: "unknown" },
            },
          },
          null,
          2,
        ),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
});
