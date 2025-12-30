export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // 1️⃣ Serve games+img.json with pagination and favorites
      if (path === "/games+img.json") {
        const res = await env.ASSETS.fetch(new Request(new URL("/games+img.json", request.url)));
        const text = await res.text();

        let games;
        try {
          games = JSON.parse(text);
        } catch (err) {
          console.error("Failed parsing JSON from games+img.json:", text);
          return new Response("Failed to parse games JSON", { status: 500 });
        }

        // Pagination/filtering
        const page = parseInt(url.searchParams.get("page") || "1");
        const limit = parseInt(url.searchParams.get("limit") || "100");
        const searchQuery = (url.searchParams.get("search") || "").toLowerCase();
        const favoritesOnly = url.searchParams.get("favorites") === "1";
        const favoriteGames = JSON.parse(url.searchParams.get("favList") || "[]");

        let filtered = games;
        if (searchQuery) filtered = filtered.filter(g => g.title.toLowerCase().includes(searchQuery));
        if (favoritesOnly) filtered = filtered.filter(g => favoriteGames.includes(g.url));

        const total = filtered.length;
        const start = (page - 1) * limit;
        const paginatedGames = filtered.slice(start, start + limit);

        return new Response(JSON.stringify({ total, page, limit, games: paginatedGames }), {
          headers: { "Content-Type": "application/json; charset=UTF-8" }
        });
      }

      // 2️⃣ Serve static assets
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) return assetResponse;

      // 3️⃣ Serve Terraria files from GitHub
      if (path.startsWith("/terraria/")) {
        const githubUrl = `https://chessgrandest-prog.github.io/terraria-wasm1${path.replace("/terraria", "")}`;
        const res = await fetch(githubUrl);
        if (!res.ok) {
          console.error(`Terraria fetch failed: ${res.status} ${res.statusText} -> ${githubUrl}`);
          return new Response("Terraria file not found", { status: 404 });
        }
        const headers = new Headers(res.headers);
        headers.set("Cross-Origin-Embedder-Policy", "require-corp");
        headers.set("Cross-Origin-Opener-Policy", "same-origin");
        return new Response(res.body, { status: res.status, headers });
      }

      // 4️⃣ Fallback
      console.warn("Request not found:", path);
      return new Response("Not Found", { status: 404 });

    } catch (err) {
      console.error("Worker error:", err);
      return new Response("Internal Worker Error", { status: 500 });
    }
  }
};
