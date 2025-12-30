export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Serve static assets first
    const assetResponse = await env.ASSETS.fetch(request);

    // If asset exists, return it
    if (assetResponse.status !== 404) {
      // ONLY apply COOP/COEP to Terraria
      if (url.pathname.startsWith("/terraria/")) {
        const headers = new Headers(assetResponse.headers);
        headers.set("Cross-Origin-Embedder-Policy", "require-corp");
        headers.set("Cross-Origin-Opener-Policy", "same-origin");

        return new Response(assetResponse.body, {
          status: assetResponse.status,
          headers
        });
      }

      return assetResponse;
    }

    // Fallback 404
    return new Response("Not Found", { status: 404 });
  }
};
