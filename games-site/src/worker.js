export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Map /terraria/* → GitHub Pages
    const upstream = "https://chessgrandest-prog.github.io/terraria-wasm1/";
    const targetUrl = upstream + url.pathname.replace(/^\/terraria/, "");

    const upstreamRes = await fetch(targetUrl, {
      headers: request.headers
    });

    const headers = new Headers(upstreamRes.headers);

    // REQUIRED for Terraria WASM
    headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    headers.set("Cross-Origin-Opener-Policy", "same-origin");

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers
    });
  }
};
