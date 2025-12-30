import { unzipSync } from 'fflate';

const GAMES_JSON_URL = 'https://raw.githubusercontent.com/chessgrandest-prog/ultimate-game-stash/refs/heads/main/games-site/games+img.json';
const TERRARIA_ZIP_URL = 'https://github.com/chessgrandest-prog/ultimate-game-stash/raw/refs/heads/main/games-site/terraria.zip';
const REPO_BASE_URL = 'https://raw.githubusercontent.com/chessgrandest-prog/ultimate-game-stash/refs/heads/main/games-site';

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/`/g, '&#96;');
}

const addWasmHeaders = (res) => {
  res.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  return res;
};

let cachedZip = null;

async function loadTerrariaZip() {
  if (!cachedZip) {
    console.log('[DEBUG] Fetching Terraria ZIP...');
    const zipRes = await fetch(TERRARIA_ZIP_URL);
    if (!zipRes.ok) throw new Error('Failed to fetch Terraria ZIP');
    const buffer = new Uint8Array(await zipRes.arrayBuffer());
    const zipFiles = unzipSync(buffer);
    cachedZip = {};
    for (const [path, content] of Object.entries(zipFiles)) {
      cachedZip[path.replace(/\\/g, '/')] = content;
    }
    console.log('[DEBUG] ZIP loaded. Files:', Object.keys(cachedZip));
  }
}

function getZipFile(requestPath) {
  const cleanPath = requestPath.replace(/^\/+|\/+$/g, '');
  let content = cachedZip[cleanPath];
  if (!content) {
    const lowerPath = cleanPath.toLowerCase();
    for (const zipPath of Object.keys(cachedZip)) {
      if (zipPath.toLowerCase().endsWith('/' + lowerPath) || zipPath.toLowerCase() === lowerPath) {
        content = cachedZip[zipPath];
        break;
      }
    }
  }
  if (!content) console.log('[DEBUG] File not found in ZIP:', cleanPath);
  return content;
}

function getContentType(filePath) {
  if (filePath.endsWith('.wasm')) return 'application/wasm';
  if (filePath.endsWith('.js')) return 'application/javascript';
  if (filePath.endsWith('.css')) return 'text/css';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
  if (filePath.endsWith('.ico')) return 'image/x-icon';
  if (filePath.endsWith('.html')) return 'text/html';
  return 'application/octet-stream';
}

async function fetchRepoFile(path) {
  try {
    const res = await fetch(REPO_BASE_URL + path);
    if (!res.ok) return null;
    if (path.endsWith('.html') || path.endsWith('.js') || path.endsWith('.css')) {
      return await res.text();
    } else {
      return new Uint8Array(await res.arrayBuffer());
    }
  } catch (err) {
    console.error('[DEBUG] fetchRepoFile error:', path, err);
    return null;
  }
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    console.log('[DEBUG] Incoming request:', url.pathname);

    // Serve index.html
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const html = await fetchRepoFile('/index.html');
      if (!html) return new Response('index.html not found', { status: 404 });
      return addWasmHeaders(new Response(html, { headers: { 'Content-Type': 'text/html; charset=UTF-8' } }));
    }

    // Serve style.css
    if (url.pathname === '/style.css') {
      const css = await fetchRepoFile('/style.css');
      if (!css) return new Response('style.css not found', { status: 404 });
      return addWasmHeaders(new Response(css, { headers: { 'Content-Type': 'text/css; charset=UTF-8' } }));
    }

    // Serve games+img.json
    if (url.pathname === '/games+img.json') {
      try {
        const gamesRes = await fetch(GAMES_JSON_URL);
        let games = await gamesRes.json();

        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '100');
        const searchQuery = (url.searchParams.get('search') || '').toLowerCase();
        const favoritesOnly = url.searchParams.get('favorites') === '1';
        const favoriteGames = JSON.parse(url.searchParams.get('favList') || '[]');

        if (searchQuery) games = games.filter(g => g.title.toLowerCase().includes(searchQuery));
        if (favoritesOnly) games = games.filter(g => favoriteGames.includes(g.url));

        const total = games.length;
        const start = (page - 1) * limit;
        const paginatedGames = games.slice(start, start + limit);

        return addWasmHeaders(new Response(JSON.stringify({
          total,
          page,
          limit,
          games: paginatedGames
        }), { headers: { 'Content-Type': 'application/json; charset=UTF-8' } }));
      } catch (err) {
        console.error('[DEBUG] Error fetching games.json:', err);
        return new Response('Error fetching games.json', { status: 500 });
      }
    }

    // Serve Terraria ZIP files
    if (url.pathname.startsWith('/terraria/')) {
      try {
        await loadTerrariaZip();
        let filePath = url.pathname.replace('/terraria/', '') || 'index.html';
        const content = getZipFile(filePath);
        if (!content) return new Response('File not found in ZIP', { status: 404 });
        const isText = filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css');
        return addWasmHeaders(new Response(isText ? new TextDecoder().decode(content) : content, {
          headers: { 'Content-Type': getContentType(filePath) }
        }));
      } catch (err) {
        console.error('[DEBUG] Terraria load error:', err);
        return new Response('Failed to load Terraria.', { status: 500 });
      }
    }

    // Serve individual game pages
    if (url.pathname.startsWith('/game/')) {
      try {
        const gameFile = decodeURIComponent(url.pathname.replace('/game/', ''));
        const gamesRes = await fetch(GAMES_JSON_URL);
        const games = await gamesRes.json();
        const normalize = str => str.replace(/\/+$/, '');
        const game = games.find(g => normalize(g.url) === normalize(gameFile));
        if (!game) return new Response('Game not found', { status: 404 });

        console.log('[DEBUG] Serving game:', game.title, 'URL:', game.url);

        // Internal paths (like /terraria/)
        if (game.url.startsWith('/')) {
          if (game.url.startsWith('/terraria/')) {
            await loadTerrariaZip();
            const path = game.url.replace(/^\/terraria\//, '');
            const content = getZipFile(path || 'index.html');
            if (!content) return new Response('Internal game file not found in ZIP', { status: 404 });
            const isText = path.endsWith('.html') || path.endsWith('.js') || path.endsWith('.css');
            return addWasmHeaders(new Response(isText ? new TextDecoder().decode(content) : content, {
              headers: { 'Content-Type': getContentType(path) }
            }));
          }

          // Other internal files from repo
          const internalFile = await fetchRepoFile(game.url);
          if (!internalFile) return new Response('Internal game file not found', { status: 404 });
          const contentType = getContentType(game.url);
          const body = typeof internalFile === 'string' ? internalFile : internalFile;
          return addWasmHeaders(new Response(body, { headers: { 'Content-Type': contentType } }));
        }

        // External URLs
        const gameRes = await fetch(game.url);
        const gameHtml = await gameRes.text();
        const iframePage = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${game.title}</title>
<style>html,body{margin:0;padding:0;height:100%}iframe{width:100%;height:100%;border:none}</style>
</head>
<body>
<iframe srcdoc="${escapeHtml(gameHtml)}"></iframe>
</body>
</html>`;
        return addWasmHeaders(new Response(iframePage, { headers: { 'Content-Type': 'text/html; charset=UTF-8' } }));

      } catch (err) {
        console.error('[DEBUG] Failed to load game:', err);
        return new Response('Failed to load game.', { status: 500 });
      }
    }

    // Generic static files (js, ico, png, jpg)
    if (url.pathname.match(/\.(js|ico|png|jpg|jpeg)$/)) {
      const file = await fetchRepoFile(url.pathname);
      if (!file) return new Response('File not found', { status: 404 });
      const contentType = getContentType(url.pathname);
      return addWasmHeaders(new Response(file, { headers: { 'Content-Type': contentType } }));
    }

    // Default fallback
    return fetch(request);
  }
};
