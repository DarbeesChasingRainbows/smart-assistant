import { Middleware } from "$fresh/server.ts";

interface State {
  path?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role?: string;
  };
}

export const stateMiddleware: Middleware<State> = async (req, ctx) => {
  const url = new URL(req.url);
  
  // Add current path to state
  ctx.state.path = url.pathname;
  
  // Simulate user context (in real app, this would come from auth)
  ctx.state.user = {
    id: "user-123",
    email: "user@example.com",
    name: "User",
    role: "user", // or "admin"
  };
  
  await ctx.next();
};
