# Multi-stage build for Garage (VehicleMaintenance) Fresh app
FROM denoland/deno:2.3.0 AS base
WORKDIR /app
EXPOSE 8000
ENV DENO_NODE_MODULES_DIR=auto
ENV NODE_PATH=/app/node_modules

# Install deps
COPY deno.json deno.lock ./
RUN deno cache --lock=deno.lock --node-modules-dir=auto deno.json

# Build stage
FROM base AS build
COPY . .
# Pre-cache entry points before build
RUN deno cache --lock=deno.lock --node-modules-dir=auto vite.config.ts
RUN deno cache --lock=deno.lock --node-modules-dir=auto main.ts
RUN deno install --allow-scripts
RUN deno task build

# Production stage
FROM base AS production
WORKDIR /app
COPY --from=build /app/_fresh ./_fresh
COPY --from=build /app/deno.json ./deno.json
COPY --from=build /app/static ./static
ENV DENO_ENV=production
CMD ["deno", "task", "start"]
