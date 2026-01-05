import { define } from "../utils.ts";

// Extend State to include userId
declare module "../utils.ts" {
  interface State {
    userId: string;
  }
}

// Helper to parse cookies from request
function getCookie(req: Request, name: string): string | undefined {
  const cookies = req.headers.get("cookie");
  if (!cookies) return undefined;
  
  const match = cookies.split(";")
    .map(c => c.trim())
    .find(c => c.startsWith(`${name}=`));
  
  return match?.split("=")[1];
}

// Middleware to ensure anonymous user ID cookie exists
// In Fresh 2.x, middleware exports a single function using define.middleware()
export default define.middleware(async (ctx) => {
  const existingUserId = getCookie(ctx.req, "aq_uid");
  const userId = existingUserId || crypto.randomUUID();
  
  // Attach userId to context state for easy access
  ctx.state.userId = userId;
  
  const resp = await ctx.next();
  
  // Set cookie if not present
  if (!existingUserId) {
    resp.headers.append("Set-Cookie", 
      `aq_uid=${userId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${365 * 24 * 60 * 60}`
    );
  }
  
  return resp;
});
