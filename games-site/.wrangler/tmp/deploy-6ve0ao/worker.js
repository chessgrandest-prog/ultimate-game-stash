// src/worker.js
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) return assetResponse;
    if (url.pathname.startsWith("/terraria/")) {
      const githubUrl = `https://chessgrandest-prog.github.io/terraria-wasm1${url.pathname.replace("/terraria", "")}`;
      const res = await fetch(githubUrl);
      if (!res.ok) return new Response("Terraria file not found", { status: 404 });
      const headers = new Headers(res.headers);
      headers.set("Cross-Origin-Embedder-Policy", "require-corp");
      headers.set("Cross-Origin-Opener-Policy", "same-origin");
      return new Response(res.body, { status: res.status, headers });
    }
    if (url.pathname === "/games+img.json") {
      try {
        const gamesRes = await env.ASSETS.fetch(new Request(`${env.ASSETS.url}/games+img.json`));
        if (!gamesRes.ok) throw new Error("Failed to fetch games JSON");
        let games = await gamesRes.json();
        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const searchQuery = (url.searchParams.get("search") || "").toLowerCase();
        const favoritesOnly = url.searchParams.get("favorites") === "1";
        const favoriteGames = JSON.parse(url.searchParams.get("favList") || "[]");
        if (searchQuery) games = games.filter((g) => g.title.toLowerCase().includes(searchQuery));
        if (favoritesOnly) games = games.filter((g) => favoriteGames.includes(g.url));
        const total = games.length;
        const start = (page - 1) * limit;
        const paginatedGames = games.slice(start, start + limit);
        const headers = new Headers({
          "Content-Type": "application/json; charset=UTF-8",
          "Cross-Origin-Embedder-Policy": "require-corp",
          "Cross-Origin-Opener-Policy": "same-origin"
        });
        return new Response(JSON.stringify({ total, page, limit, games: paginatedGames }), { headers });
      } catch (err) {
        console.error("[Worker] Error loading games JSON:", err);
        return new Response(JSON.stringify({ total: 0, page: 1, limit: 50, games: [] }), {
          headers: {
            "Content-Type": "application/json; charset=UTF-8",
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Opener-Policy": "same-origin"
          },
          status: 500
        });
      }
    }
    return new Response("Not Found", { status: 404 });
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
