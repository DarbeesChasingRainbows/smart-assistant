import { page, PageProps } from "fresh";
import { define, url } from "../../utils.ts";

export const handler = define.handlers({
  GET(_ctx) {
    // Create a proper redirect response
    const headers = new Headers();
    headers.set("Location", url("/maintenance/history"));
    return new Response(null, { status: 302, headers });
  },
});

export default define.page(function MaintenanceIndex() {
  return null;
});
