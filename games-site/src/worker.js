export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1️⃣ Serve static assets from Pages
    const assetRes = await env.ASSETS.fetch(request);
    if (assetRes.status !== 404) return assetRes;

    // 2️⃣ Serve Terraria WASM files from GitHub
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
        const res = await env.ASSETS.fetch(request);
        if (!res.ok) throw new Error("games+img.json not found");

        const text = await res.text();
        const games = JSON.parse(text);

        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = parseInt(url.searchParams.get("limit") || "50"); // default 50
        const searchQuery = (url.searchParams.get("search") || "").toLowerCase();
        const favoritesOnly = url.searchParams.get("favorites") === "1";
        const favoriteGames = JSON.parse(url.searchParams.get("favList") || "[]");

        let filtered = games;
        if (searchQuery) filtered = filtered.filter(g => g.title.toLowerCase().includes(searchQuery));
        if (favoritesOnly) filtered = filtered.filter(g => favoriteGames.includes(g.url));

        const total = filtered.length;
        const start = (page - 1) * limit;
        const paginated = filtered.slice(start, start + limit);

        return new Response(JSON.stringify({ total, page, limit, games: paginated }), {
          headers: {
            "Content-Type": "application/json; charset=UTF-8",
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Opener-Policy": "same-origin"
          }
        });
      } catch (err) {
        console.error("[Worker] Failed to load games+img.json", err);
        return new Response(JSON.stringify({ total: 0, page: 1, limit: 50, games: [] }), {
          status: 500,
          headers: {
            "Content-Type": "application/json; charset=UTF-8",
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Opener-Policy": "same-origin"
          }
        });
      }
    }

    // 4️⃣ Fallback
    return new Response("Not Found", { status: 404 });
  }
};
