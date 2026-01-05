import { createDefine } from "fresh";

/**
 * Global Server State interface.
 * This type defines the shape of `ctx.state` available in all middlewares and routes.
 * Use this to pass data (e.g., user sessions, db connections, config) through the request lifecycle.
 */
export interface State {
  shared: string;
}

/**
 * Type-safe helper for defining Fresh middlewares, routes, and layouts.
 * Usage: export const handler = define.handlers({ GET: (ctx) => ... });
 */
export const define = createDefine<State>();
