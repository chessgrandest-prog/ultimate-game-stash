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

        // If it's a raw github URL or jsdelivr, proxy it through our worker to avoid blocks and set headers
        if (gameUrl.includes("raw.githubusercontent.com") || gameUrl.includes("cdn.jsdelivr.net")) {
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
              <iframe src="${gameUrl}" allow="autoplay; fullscreen" allowfullscreen></iframe>
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

        console.log(`Proxy fetching: ${targetUrl}`);

        const res = await fetch(targetUrl);
        
        const headers = new Headers(res.headers);
        const contentType = headers.get("Content-Type") || "";

        // Determine correct Content-Type based on extension first
        const lowerUrl = targetUrl.toLowerCase();
        if (lowerUrl.endsWith(".js") || lowerUrl.includes(".js?") || lowerUrl.includes(".js#") || lowerUrl.endsWith("/js")) {
          headers.set("Content-Type", "application/javascript; charset=UTF-8");
        } else if (lowerUrl.endsWith(".css") || lowerUrl.includes(".css?") || lowerUrl.includes(".css#")) {
          headers.set("Content-Type", "text/css; charset=UTF-8");
        } else if (lowerUrl.endsWith(".html") || lowerUrl.endsWith(".htm") || contentType.includes("text/plain")) {
          headers.set("Content-Type", "text/html; charset=UTF-8");
        }

        headers.set("Cross-Origin-Embedder-Policy", "require-corp");
        headers.set("Cross-Origin-Opener-Policy", "same-origin");
        headers.delete("X-Frame-Options");
        headers.delete("Content-Security-Policy");

        if (!res.ok) {
          console.error(`Proxy 404/Error: ${res.status} for ${targetUrl}`);
          return new Response(res.body, { status: res.status, headers });
        }

        // If it's HTML, rewrite relative URLs to use our proxy
        if (headers.get("Content-Type").includes("text/html")) {
          let html = await res.text();
          const origin = new URL(request.url).origin;
          const baseUrl = encodeURI(targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1));
          
          // Inject helper script
          const proxyScript = `
<script>
(function() {
  const workerOrigin = "${origin}";
  const proxyPrefix = workerOrigin + '/proxy/';
  const baseUrl = ${JSON.stringify(baseUrl)};

  function wrapUrl(url) {
    if (!url || typeof url !== 'string') return url;
    
    // Aggressively check for any existing proxy pattern in the URL
    if (url.includes('/proxy/http')) {
       // Extract the actual target URL from the nested structure
       const parts = url.split('/proxy/');
       const lastPart = parts[parts.length - 1];
       if (lastPart && lastPart.startsWith('http')) return proxyPrefix + lastPart;
    }

    if (url.startsWith(proxyPrefix)) return url;
    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('#')) return url;
    
    let absoluteUrl;
    try {
      absoluteUrl = new URL(url, baseUrl).href;
    } catch (e) {
      return url;
    }

    if (absoluteUrl.startsWith(workerOrigin)) return url;
    return proxyPrefix + absoluteUrl;
  }

  // Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    if (typeof input === 'string') {
      input = wrapUrl(input);
    } else if (input instanceof Request) {
      const newUrl = wrapUrl(input.url);
      if (newUrl !== input.url) {
        input = new Request(newUrl, input);
      }
    }
    return originalFetch(input, init);
  };

  // Intercept XHR
  const originalOpen = window.XMLHttpRequest.prototype.open;
  window.XMLHttpRequest.prototype.open = function(method, url, ...args) {
    return originalOpen.apply(this, [method, wrapUrl(url), ...args]);
  };

  // Intercept worker creation if possible (common in some games)
  const OriginalWorker = window.Worker;
  window.Worker = function(url, options) {
    return new OriginalWorker(wrapUrl(url), options);
  };

  // Intercept dynamically set src/href properties
  const patchProperty = (proto, prop) => {
    const descriptor = Object.getOwnPropertyDescriptor(proto, prop);
    if (!descriptor || !descriptor.set) return;
    const originalSet = descriptor.set;
    Object.defineProperty(proto, prop, {
      set: function(value) {
        return originalSet.call(this, wrapUrl(value));
      },
      get: descriptor.get,
      enumerable: descriptor.enumerable,
      configurable: descriptor.configurable
    });
  };

  [HTMLImageElement, HTMLScriptElement, HTMLSourceElement, HTMLVideoElement, HTMLAudioElement, HTMLLinkElement, HTMLIFrameElement].forEach(cls => {
    if (cls && cls.prototype) {
      if (Object.prototype.hasOwnProperty.call(cls.prototype, 'src') || 'src' in cls.prototype) patchProperty(cls.prototype, 'src');
      if (Object.prototype.hasOwnProperty.call(cls.prototype, 'href') || 'href' in cls.prototype) patchProperty(cls.prototype, 'href');
    }
  });

  // Intercept new elements added to the DOM
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element
          if (node.src) node.src = wrapUrl(node.getAttribute('src'));
          if (node.href) node.href = wrapUrl(node.getAttribute('href'));
        }
      });
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
</script>`;

          // Insert script at the beginning of head or body
          if (html.includes("<head>")) {
            html = html.replace("<head>", "<head>" + proxyScript);
          } else if (html.includes("<body>")) {
            html = html.replace("<body>", "<body>" + proxyScript);
          } else {
            html = proxyScript + html;
          }

          // Improved regex for src, href, and action attributes
          html = html.replace(/(src|href|action)=["']([^"']+)["']/gi, (match, attr, val) => {
            // Skip already proxied, data, or absolute URLs that are same-origin
            if (val.includes('/proxy/') || val.startsWith("data:") || val.startsWith("blob:") || val.startsWith("#")) {
              return match;
            }
            
            try {
              const absolute = new URL(val, baseUrl).href;
              // Use full absolute URL for the proxy to avoid issues with <base> tag
              return `${attr}="${origin}/proxy/${absolute}"`;
            } catch (e) {
              return match;
            }
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
