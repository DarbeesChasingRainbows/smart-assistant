import { define } from "../../utils.ts";

function getBackendApiBaseUrl(): string {
  return Deno.env.get("VITE_API_URL") || "http://localhost:5120/api";
}

type ProxyCtx = {
  req: Request;
  params: Record<string, string>;
};

async function proxy(ctx: ProxyCtx): Promise<Response> {
  const base = getBackendApiBaseUrl().replace(/\/$/, "");
  const path = ctx.params.path ?? "";
  const targetUrl = new URL(`${base}/${path.replace(/^\//, "")}`);

  const incomingUrl = new URL(ctx.req.url);
  targetUrl.search = incomingUrl.search;

  const reqInit: RequestInit = {
    method: ctx.req.method,
    headers: ctx.req.headers,
    body: ctx.req.method === "GET" || ctx.req.method === "HEAD" ? undefined : ctx.req.body,
    redirect: "manual",
  };

  const response = await fetch(targetUrl.toString(), reqInit);

  return response;
}

export const handler = define.handlers({
  async GET(ctx) {
    return await proxy(ctx);
  },
  async POST(ctx) {
    return await proxy(ctx);
  },
  async PUT(ctx) {
    return await proxy(ctx);
  },
  async PATCH(ctx) {
    return await proxy(ctx);
  },
  async DELETE(ctx) {
    return await proxy(ctx);
  },
  async OPTIONS(ctx) {
    return await proxy(ctx);
  },
});
