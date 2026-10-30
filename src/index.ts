import { buildRatios, prices } from "./prices";

// Prices are static per deploy, so the body is computed once per isolate.
const body = JSON.stringify({ success: true, data: buildRatios(prices) });

export default {
  async fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    if (pathname !== "/" && pathname !== "/api/ratio_config") {
      return new Response("Not Found", { status: 404 });
    }
    return new Response(request.method === "HEAD" ? null : body, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });
  },
} satisfies ExportedHandler;
