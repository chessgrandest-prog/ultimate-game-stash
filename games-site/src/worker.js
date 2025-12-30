export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // 1️⃣ Serve games+img.json with pagination and favorites
      if (path === "/games+img.json") {
        // Fetch the raw asset without query params
        const assetUrl = new URL(request.url);
        assetUrl.search = ""; 
        const res = await env.ASSETS.fetch(new Request(assetUrl));
        if (!res.ok) return res;
        
        const text = await res.text();
        let games;
        try {
          games = JSON.parse(text);
        } catch (err) {
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
          headers: { 
            "Content-Type": "application/json; charset=UTF-8",
            "X-Worker-Processed": "true" 
          }
        });
      }

      // 2️⃣ Game Player Route
      if (path === "/play") {
        let gameUrl = url.searchParams.get("url");
        const gameTitle = url.searchParams.get("title") || "Game";
        
        if (!gameUrl) return new Response("Missing game URL", { status: 400 });

        // If it's a raw github URL, proxy it through our worker to avoid blocks and set headers
        if (gameUrl.includes("raw.githubusercontent.com")) {
          gameUrl = `/proxy/${gameUrl}`;
        }

        const playerHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Playing: ${gameTitle}</title>
              <style>
                body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; background: #000; font-family: sans-serif; }
                .nav { height: 40px; background: #1a1a1a; color: white; display: flex; align-items: center; padding: 0 20px; justify-content: space-between; }
                .nav a { color: #00d1ff; text-decoration: none; font-weight: bold; }
                iframe { width: 100%; height: calc(100% - 40px); border: none; }
              </style>
            </head>
            <body>
              <div class="nav">
                <span>${gameTitle}</span>
                <a href="/">Back to Stash</a>
              </div>
              <iframe src="${gameUrl}" allow="autoplay; fullscreen; keyboard" allowfullscreen></iframe>
            </body>
          </html>
        `;

        return new Response(playerHtml, {
          headers: { 
            "Content-Type": "text/html; charset=UTF-8",
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Opener-Policy": "same-origin"
          }
        });
      }

      // 3️⃣ Smart Proxy Route
      if (path.startsWith("/proxy/")) {
        const targetUrl = request.url.split("/proxy/")[1];
        if (!targetUrl) return new Response("Missing target URL", { status: 400 });

        const res = await fetch(targetUrl);
        if (!res.ok) return res;

        const headers = new Headers(res.headers);
        const contentType = headers.get("Content-Type") || "";

        // Force HTML type for GitHub raw links that default to plain text
        if (targetUrl.endsWith(".html") || targetUrl.endsWith(".htm") || contentType.includes("text/plain")) {
          headers.set("Content-Type", "text/html; charset=UTF-8");
        } else if (targetUrl.endsWith(".js")) {
          headers.set("Content-Type", "application/javascript");
        } else if (targetUrl.endsWith(".css")) {
          headers.set("Content-Type", "text/css");
        }

        headers.set("Cross-Origin-Embedder-Policy", "require-corp");
        headers.set("Cross-Origin-Opener-Policy", "same-origin");
        headers.delete("X-Frame-Options");
        headers.delete("Content-Security-Policy");

        // If it's HTML, rewrite relative URLs to use our proxy
        if (headers.get("Content-Type").includes("text/html")) {
          let html = await res.text();
          const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);
          
          // Basic rewrite for relative src and href (handles simple cases)
          html = html.replace(/(src|href)=["'](?!(http|https|\/\/))([^"']+)["']/gi, (match, p1, p2, p3) => {
            const absolute = new URL(p3, baseUrl).href;
            return `${p1}="/proxy/${absolute}"`;
          });

          return new Response(html, { status: res.status, headers });
        }

        return new Response(res.body, { status: res.status, headers });
      }

      // 4️⃣ Serve static assets
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
