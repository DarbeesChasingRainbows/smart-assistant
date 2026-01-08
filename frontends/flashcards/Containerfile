FROM denoland/deno:latest AS base

ARG GIT_REVISION
ENV DENO_DEPLOYMENT_ID=${GIT_REVISION}
ENV DENO_NODE_MODULES_DIR=auto

WORKDIR /app

# Copy package files first for better caching
COPY deno.json deno.lock ./

# Copy entry points used by deno cache (must exist before caching)
COPY vite.config.ts main.tsx utils.ts ./

# Cache dependencies - use vite.config.ts and main.ts
RUN deno cache --lock=deno.lock --node-modules-dir=auto vite.config.ts
RUN deno cache --lock=deno.lock --node-modules-dir=auto main.tsx

# Install npm dependencies
RUN deno install --allow-scripts

# Copy source code
COPY . .

# Build the application
RUN deno task build

EXPOSE 8000

CMD ["deno", "serve", "-A", "_fresh/server.js"]
