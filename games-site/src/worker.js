export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1️⃣ Serve static assets first
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) return assetResponse;

    // 2️⃣ Serve Terraria files from GitHub
    if (url.pathname.startsWith("/terraria/")) {
      const githubUrl = `https://chessgrandest-prog.github.io/terraria-wasm1${url.pathname.replace("/terraria", "")}`;
      const res = await fetch(githubUrl);

      if (!res.ok) return new Response("Terraria file not found", { status: 404 });

      const headers = new Headers(res.headers);
      headers.set("Cross-Origin-Embedder-Policy", "require-corp");
      headers.set("Cross-Origin-Opener-Policy", "same-origin");

      return new Response(res.body, { status: res.status, headers });
    }

    // 3️⃣ Serve games+img.json with filtering, pagination, and favorites
    if (url.pathname === "/games+img.json") {
      try {
        const gamesRes = await env.ASSETS.fetch(new Request(`${env.ASSETS.url}/games+img.json`));
        let games = await gamesRes.json();

        // Query parameters
        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = parseInt(url.searchParams.get("limit") || "100");
        const searchQuery = (url.searchParams.get("search") || "").toLowerCase();
        const favoritesOnly = url.searchParams.get("favorites") === "1";
        const favoriteGames = JSON.parse(url.searchParams.get("favList") || "[]");

        // Filter by search
        if (searchQuery) {
          games = games.filter(g => g.title.toLowerCase().includes(searchQuery));
        }

        // Filter by favorites
        if (favoritesOnly) {
          games = games.filter(g => favoriteGames.includes(g.url));
        }

        const total = games.length;
        const start = (page - 1) * limit;
        const paginatedGames = games.slice(start, start + limit);

        return new Response(JSON.stringify({ total, page, limit, games: paginatedGames }), {
          headers: { "Content-Type": "application/json; charset=UTF-8" }
        });
      } catch (err) {
        return new Response("Error loading games JSON", { status: 500 });
      }
    }

    // 4️⃣ Fallback
    return new Response("Not Found", { status: 404 });
  }
};
