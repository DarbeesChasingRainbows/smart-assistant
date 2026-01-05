# Use the official Deno runtime as a parent image
FROM denoland/deno:2.3.0 AS base
WORKDIR /app
EXPOSE 8000
ENV DENO_NODE_MODULES_DIR=auto
ENV NODE_PATH=/app/node_modules

# Development stage with all dependencies
FROM base AS development
COPY deno.json deno.lock ./
RUN deno cache --lock=deno.lock --node-modules-dir=auto deno.json
COPY . .
RUN deno install --allow-scripts
CMD ["deno", "task", "dev"]

# Build stage
FROM base AS build
COPY deno.json deno.lock ./
RUN deno cache --lock=deno.lock --node-modules-dir=auto deno.json
COPY . .
RUN deno cache --lock=deno.lock --node-modules-dir=auto vite.config.ts
RUN deno cache --lock=deno.lock --node-modules-dir=auto main.ts
RUN deno install --allow-scripts
RUN deno task build

# Production stage
FROM base AS production
WORKDIR /app
COPY --from=build /app/_fresh ./_fresh
COPY --from=build /app/deno.json ./
COPY --from=build /app/static ./static

# Set environment variables
ENV DENO_DEPLOYMENT_ID=production
ENV DENO_ENV=production

# Start the production server
CMD ["deno", "task", "start"]
