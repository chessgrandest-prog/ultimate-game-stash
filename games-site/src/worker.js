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
              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
              <style>
                body, html { margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden; background: #000; font-family: sans-serif; }
                iframe { width: 100%; height: 100%; border: none; display: block; }
                .overlay-nav { 
                  position: fixed; top: 10px; left: 10px; z-index: 1000; 
                  opacity: 0; transition: opacity 0.3s; 
                }
                body:hover .overlay-nav { opacity: 1; }
                .back-btn { 
                  background: rgba(0,0,0,0.6); color: white; padding: 8px 15px; 
                  text-decoration: none; border-radius: 5px; font-size: 14px;
                  border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(5px);
                }
                .back-btn:hover { background: rgba(0, 209, 255, 0.4); }
              </style>
            </head>
            <body>
              <div class="overlay-nav">
                <a href="/" class="back-btn">← Back</a>
              </div>
              <iframe 
                src="${gameUrl}" 
                allow="autoplay; fullscreen; keyboard; gamepad; microphone; camera; midi; clipboard-read; clipboard-write; xr-spatial-tracking" 
                allowfullscreen 
                sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-downloads"
              ></iframe>
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
        let targetUrl = request.url.split("/proxy/")[1];
        if (!targetUrl) return new Response("Missing target URL", { status: 400 });

        // Auto-fix for known broken 2048 assets
        if (targetUrl.includes("cdn.jsdelivr.net/gh/qollaaa/j") && targetUrl.includes("/Games/2048/")) {
          targetUrl = targetUrl.replace(/gh\/qollaaa\/j@[^\/]+\/Games\/2048\//i, "gh/ovolve/2048-AI/");
          console.log(`Auto-mapped broken asset to: ${targetUrl}`);
        }

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
          const origin = new URL(request.url).origin;
          const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);
          
          const proxyScript = `
<script>
(function() {
  const workerOrigin = "${origin}";
  const proxyPrefix = workerOrigin + '/proxy/';
  const baseUrl = ${JSON.stringify(baseUrl)};

  function wrapUrl(url) {
    if (!url || typeof url !== 'string') return url;
    if (url.startsWith(proxyPrefix)) return url;
    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('#') || url.startsWith('javascript:')) return url;
    
    try {
      const absoluteUrl = new URL(url, baseUrl).href;
      if (absoluteUrl.startsWith(workerOrigin) && !absoluteUrl.startsWith(proxyPrefix)) return url;
      return proxyPrefix + absoluteUrl;
    } catch (e) {
      return url;
    }
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

  // Intercept worker
  const OriginalWorker = window.Worker;
  window.Worker = function(url, options) {
    return new OriginalWorker(wrapUrl(url), options);
  };

  // Patch properties
  const patchProperty = (proto, prop) => {
    const descriptor = Object.getOwnPropertyDescriptor(proto, prop);
    if (!descriptor || !descriptor.set) return;
    const originalSet = descriptor.set;
    Object.defineProperty(proto, prop, {
      set: function(value) { return originalSet.call(this, wrapUrl(value)); },
      get: descriptor.get,
      enumerable: descriptor.enumerable,
      configurable: descriptor.configurable
    });
  };

  [HTMLImageElement, HTMLScriptElement, HTMLSourceElement, HTMLVideoElement, HTMLAudioElement, HTMLLinkElement, HTMLIFrameElement, HTMLEmbedElement, HTMLObjectElement].forEach(cls => {
    if (cls && cls.prototype) {
      if ('src' in cls.prototype) patchProperty(cls.prototype, 'src');
      if ('href' in cls.prototype) patchProperty(cls.prototype, 'href');
      if ('data' in cls.prototype) patchProperty(cls.prototype, 'data');
    }
  });

  // MutationObserver for dynamic elements
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          if (node.tagName === 'SCRIPT' && node.src) node.src = wrapUrl(node.src);
          if (node.tagName === 'LINK' && node.href) node.href = wrapUrl(node.href);
          if (node.tagName === 'IMG' && node.src) node.src = wrapUrl(node.src);
        }
      });
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
</script>`;

          const rewriter = new HTMLRewriter()
            .on("head", {
              element(element) {
                element.prepend(proxyScript, { html: true });
              },
            })
            .on("body", {
              element(element) {
                if (!element.hasAttribute("data-proxy-injected")) {
                  element.prepend(proxyScript, { html: true });
                  element.setAttribute("data-proxy-injected", "true");
                }
              },
            })
            .on("img, script, link, source, video, audio, iframe, embed, object, a, form", {
              element(element) {
                const attributes = ["src", "href", "action", "data", "poster"];
                for (const attr of attributes) {
                  if (element.hasAttribute(attr)) {
                    const value = element.getAttribute(attr);
                    if (value && !value.startsWith("data:") && !value.startsWith("blob:") && !value.startsWith("#") && !value.startsWith("javascript:")) {
                      try {
                        const absolute = new URL(value, baseUrl).href;
                        element.setAttribute(attr, `${origin}/proxy/${absolute}`);
                      } catch (e) {}
                    }
                  }
                }
              },
            });

          return rewriter.transform(new Response(res.body, { status: res.status, headers }));
        }

        // If it's CSS, rewrite url() patterns
        if (headers.get("Content-Type").includes("text/css")) {
          let css = await res.text();
          const origin = new URL(request.url).origin;
          const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);

          css = css.replace(/url\(['"]?([^'")]+)['"]?\)/gi, (match, url) => {
            if (url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("#")) return match;
            try {
              const absolute = new URL(url, baseUrl).href;
              return `url("${origin}/proxy/${absolute}")`;
            } catch (e) {
              return match;
            }
          });

          return new Response(css, { status: res.status, headers });
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
