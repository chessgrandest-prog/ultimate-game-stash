import { unzipSync } from 'fflate';

const GAMES_JSON_URL = 'https://raw.githubusercontent.com/chessgrandest-prog/ultimate-game-stash/main/games-site/games+img.json';
const TERRARIA_ZIP_URL = 'https://github.com/chessgrandest-prog/ultimate-game-stash/raw/main/games-site/terraria.zip';
const REPO_BASE_URL = 'https://raw.githubusercontent.com/chessgrandest-prog/ultimate-game-stash/main/games-site';

let cachedZip = null;

// Safe fetch with COEP/COOP headers
async function fetchWithWasmHeaders(url, isText = false) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${url}`);
  const body = isText ? await res.text() : new Uint8Array(await res.arrayBuffer());
  const headers = new Headers(res.headers);
  headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  if (isText) headers.set('Content-Type', 'text/html; charset=UTF-8');
  return new Response(body, { status: res.status, statusText: res.statusText, headers });
}

// Load Terraria ZIP
async function loadTerrariaZip() {
  if (!cachedZip) {
    const zipRes = await fetch(TERRARIA_ZIP_URL);
    if (!zipRes.ok) throw new Error('Failed to fetch Terraria ZIP');
    const buffer = new Uint8Array(await zipRes.arrayBuffer());
    const zipFiles = unzipSync(buffer);
    cachedZip = {};
    for (const [path, content] of Object.entries(zipFiles)) {
      cachedZip[path.replace(/\\/g, '/')] = content;
    }
  }
}

// Lookup file in ZIP
function getZipFile(requestPath) {
  const cleanPath = requestPath.replace(/^\/+|\/+$/g, '');
  if (cachedZip[cleanPath]) return cachedZip[cleanPath];
  const lowerPath = cleanPath.toLowerCase();
  for (const zipPath of Object.keys(cachedZip)) {
    if (zipPath.toLowerCase().endsWith(lowerPath)) return cachedZip[zipPath];
  }
  return null;
}

// Get MIME type
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

// Escape HTML for iframe
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/`/g, '&#96;');
}

// Fetch any file from repo dynamically
async function fetchRepoFile(path) {
  const isText = path.endsWith('.html') || path.endsWith('.js') || path.endsWith('.css');
  return fetchWithWasmHeaders(`${REPO_BASE_URL}${path}`, isText);
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    try {
      // Root files
      const rootFiles = ['index.html', 'style.css', 'index.js', 'app.ico', 'AndyBold.ttf', 'backdrop.png', 'logo.png', 'sw.js', '_headers', 'MILESTONE', 'package.json', 'package-lock.json'];
      if (rootFiles.includes(pathname.replace(/^\/+/, ''))) {
        return await fetchRepoFile('/' + pathname.replace(/^\/+/, ''));
      }

      // Serve anything in /assets/ dynamically
      if (pathname.startsWith('/assets/')) {
        return await fetchRepoFile(pathname);
      }

      // Serve anything in /_framework/ dynamically
      if (pathname.startsWith('/_framework/')) {
        return await fetchRepoFile(pathname);
      }

      // Serve games JSON
      if (pathname === '/games+img.json') {
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

        return new Response(JSON.stringify({ total, page, limit, games: paginatedGames }), {
          headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            'Cross-Origin-Embedder-Policy': 'require-corp',
            'Cross-Origin-Opener-Policy': 'same-origin'
          }
        });
      }

      // Terraria ZIP
      if (pathname.startsWith('/terraria/')) {
        await loadTerrariaZip();
        const filePath = pathname.replace('/terraria/', '') || 'index.html';
        const content = getZipFile(filePath);
        if (!content) return new Response('File not found in ZIP', { status: 404 });
        const isText = filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css');
        return new Response(isText ? new TextDecoder().decode(content) : content, {
          headers: {
            'Content-Type': getContentType(filePath),
            'Cross-Origin-Embedder-Policy': 'require-corp',
            'Cross-Origin-Opener-Policy': 'same-origin'
          }
        });
      }

      // Individual game pages
      if (pathname.startsWith('/game/')) {
        const gameFile = decodeURIComponent(pathname.replace('/game/', ''));
        const gamesRes = await fetch(GAMES_JSON_URL);
        const games = await gamesRes.json();
        const normalize = str => str.replace(/\/+$/, '');
        const game = games.find(g => normalize(g.url) === normalize(gameFile));
        if (!game) return new Response('Game not found', { status: 404 });

        if (game.url.startsWith('/terraria/')) {
          await loadTerrariaZip();
          const path = game.url.replace(/^\/terraria\//, '');
          const content = getZipFile(path || 'index.html');
          if (!content) return new Response('Internal game file not found in ZIP', { status: 404 });
          const isText = path.endsWith('.html') || path.endsWith('.js') || path.endsWith('.css');
          return new Response(isText ? new TextDecoder().decode(content) : content, {
            headers: {
              'Content-Type': getContentType(path),
              'Cross-Origin-Embedder-Policy': 'require-corp',
              'Cross-Origin-Opener-Policy': 'same-origin'
            }
          });
        }

        // External games
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
        return new Response(iframePage, {
          headers: {
            'Content-Type': 'text/html; charset=UTF-8',
            'Cross-Origin-Embedder-Policy': 'require-corp',
            'Cross-Origin-Opener-Policy': 'same-origin'
          }
        });
      }

      // Fallback
      return fetch(request);
    } catch (err) {
      console.error('[DEBUG] Worker error:', err);
      return new Response('Internal Worker error', { status: 500 });
    }
  }
};
