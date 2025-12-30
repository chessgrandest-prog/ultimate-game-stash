import { unzipSync } from 'fflate';

const GAMES_JSON_URL = 'https://raw.githubusercontent.com/chessgrandest-prog/ultimate-game-stash/main/games-site/games+img.json';
const TERRARIA_ZIP_URL = 'https://github.com/chessgrandest-prog/ultimate-game-stash/raw/main/games-site/terraria.zip';

// Escape HTML for iframe
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/`/g, '&#96;');
}

// Add WASM headers
const addWasmHeaders = (res) => {
  res.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  return res;
};

let cachedZip = null;

// Load Terraria ZIP once
async function loadTerrariaZip() {
  if (!cachedZip) {
    console.log('[DEBUG] Fetching Terraria ZIP...');
    const zipRes = await fetch(TERRARIA_ZIP_URL);
    if (!zipRes.ok) throw new Error('Failed to fetch Terraria ZIP');
    const buffer = new Uint8Array(await zipRes.arrayBuffer());
    cachedZip = unzipSync(buffer);
    console.log('[DEBUG] ZIP loaded. Files:', Object.keys(cachedZip));
  }
}

// Get file from ZIP (case-insensitive)
function getZipFile(path) {
  const cleanPath = path.replace(/^\/+|\/+$/g, '');
  if (cachedZip[cleanPath]) return cachedZip[cleanPath];
  const lowerPath = cleanPath.toLowerCase();
  for (const zipPath of Object.keys(cachedZip)) {
    if (zipPath.toLowerCase().endsWith(lowerPath)) return cachedZip[zipPath];
  }
  console.log('[DEBUG] File not found in ZIP:', cleanPath);
  return null;
}

// Determine MIME type
function getContentType(filePath) {
  if (filePath.endsWith('.wasm')) return 'application/wasm';
  if (filePath.endsWith('.js')) return 'application/javascript';
  if (filePath.endsWith('.css')) return 'text/css';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
  if (filePath.endsWith('.ico')) return 'image/x-icon';
  if (filePath.endsWith('.ttf')) return 'font/ttf';
  if (filePath.endsWith('.html')) return 'text/html';
  return 'application/octet-stream';
}

// Fetch file directly from GitHub Raw
async function fetchRepoFile(path) {
  try {
    const url = `https://raw.githubusercontent.com/chessgrandest-prog/ultimate-game-stash/main/games-site/${path}`;
    console.log('[DEBUG] Fetching repo file:', url);
    const res = await fetch(url);
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

    // Root static files
    const rootFiles = ['index.html', 'style.css', 'index.js', 'app.ico', 'AndyBold.ttf', 'backdrop.png', 'logo.png', 'sw.js'];
    if (rootFiles.includes(url.pathname.replace(/^\/+/g, ''))) {
      const file = await fetchRepoFile(url.pathname.replace(/^\/+/g, ''));
      if (!file) return new Response('File not found', { status: 404 });
      const contentType = getContentType(url.pathname);
      return addWasmHeaders(new Response(file, { headers: { 'Content-Type': contentType } }));
    }

    // Assets folder
    if (url.pathname.startsWith('/assets/')) {
      const file = await fetchRepoFile(url.pathname.replace(/^\/+/g, ''));
      if (!file) return new Response('Asset not found', { status: 404 });
      return addWasmHeaders(new Response(file, { headers: { 'Content-Type': getContentType(url.pathname) } }));
    }

    // _framework folder
    if (url.pathname.startsWith('/_framework/')) {
      const file = await fetchRepoFile(url.pathname.replace(/^\/+/g, '_framework/'));
      if (!file) return new Response('Framework file not found', { status: 404 });
      return addWasmHeaders(new Response(file, { headers: { 'Content-Type': getContentType(url.pathname) } }));
    }

    // Games JSON
    if (url.pathname === '/games+img.json') {
      try {
        const res = await fetch(GAMES_JSON_URL);
        let games = await res.json();
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
        return addWasmHeaders(new Response(JSON.stringify({ total, page, limit, games: paginatedGames }), {
          headers: { 'Content-Type': 'application/json; charset=UTF-8' }
        }));
      } catch (err) {
        console.error('[DEBUG] Error fetching games.json:', err);
        return new Response('Error fetching games.json', { status: 500 });
      }
    }

    // Terraria ZIP
    if (url.pathname.startsWith('/terraria/')) {
      try {
        await loadTerrariaZip();
        const path = url.pathname.replace('/terraria/', '') || 'index.html';
        const content = getZipFile(path);
        if (!content) return new Response('File not found in ZIP', { status: 404 });
        const isText = path.endsWith('.html') || path.endsWith('.js') || path.endsWith('.css');
        return addWasmHeaders(new Response(isText ? new TextDecoder().decode(content) : content, {
          headers: { 'Content-Type': getContentType(path) }
        }));
      } catch (err) {
        console.error('[DEBUG] Terraria load error:', err);
        return new Response('Failed to load Terraria.', { status: 500 });
      }
    }

    // Individual game pages
    if (url.pathname.startsWith('/game/')) {
      try {
        const gameFile = decodeURIComponent(url.pathname.replace('/game/', ''));
        const res = await fetch(GAMES_JSON_URL);
        const games = await res.json();
        const normalize = str => str.replace(/\/+$/, '');
        const game = games.find(g => normalize(g.url) === normalize(gameFile));
        if (!game) return new Response('Game not found', { status: 404 });

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

        // External game URL
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

    // Fallback
    return fetch(request);
  }
};
