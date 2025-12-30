import { unzipSync } from 'fflate';

const GAMES_JSON_URL = 'https://raw.githubusercontent.com/chessgrandest-prog/ultimate-game-stash/refs/heads/main/games-site/games+img.json';
const TERRARIA_ZIP_URL = 'https://github.com/chessgrandest-prog/ultimate-game-stash/raw/refs/heads/main/games-site/terraria.zip';

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
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
    const zipRes = await fetch(TERRARIA_ZIP_URL);
    if (!zipRes.ok) throw new Error('Failed to fetch Terraria ZIP');
    const buffer = new Uint8Array(await zipRes.arrayBuffer());
    const zipFiles = unzipSync(buffer);
    cachedZip = {};
    for (const [path, content] of Object.entries(zipFiles)) {
      cachedZip[path.replace(/\\/g, '/')] = content;
    }
    console.log('ZIP loaded. Files:', Object.keys(cachedZip));
  }
}

// Map requested path to ZIP content (folder-aware)
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
  return content;
}

// Determine MIME type
function getContentType(filePath) {
  if (filePath.endsWith('.wasm')) return 'application/wasm';
  if (filePath.endsWith('.js')) return 'application/javascript';
  if (filePath.endsWith('.css')) return 'text/css';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
  if (filePath.endsWith('.html')) return 'text/html';
  return 'application/octet-stream';
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Serve index.html
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const res = await fetch('https://raw.githubusercontent.com/chessgrandest-prog/ultimate-game-stash/refs/heads/main/games-site/index.html');
      return addWasmHeaders(new Response(await res.text(), { headers: { 'Content-Type': 'text/html; charset=UTF-8' } }));
    }

    // Serve style.css
    if (url.pathname === '/style.css') {
      const res = await fetch('https://raw.githubusercontent.com/chessgrandest-prog/ultimate-game-stash/refs/heads/main/games-site/style.css');
      return addWasmHeaders(new Response(await res.text(), { headers: { 'Content-Type': 'text/css; charset=UTF-8' } }));
    }

    // Paginated & filtered games JSON
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
        console.error('Error fetching games.json:', err);
        return new Response('Error fetching games.json', { status: 500 });
      }
    }

    // Serve Terraria + all subpaths
    if (url.pathname.startsWith('/terraria/')) {
      try {
        await loadTerrariaZip();

        let filePath = url.pathname.replace('/terraria/', '');
        if (!filePath) filePath = 'index.html';

        const contentBuffer = getZipFile(filePath);
        if (!contentBuffer) return new Response('File not found in ZIP', { status: 404 });

        const isText = filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css');
        return addWasmHeaders(new Response(isText ? new TextDecoder().decode(contentBuffer) : contentBuffer, {
          headers: { 'Content-Type': getContentType(filePath) }
        }));

      } catch (err) {
        console.error('Terraria load error:', err);
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

        if (game.url.includes(".github.io")) {
          const iframePage = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${game.title}</title>
<style>html,body{margin:0;padding:0;height:100%}iframe{width:100%;height:100%;border:none}</style>
</head>
<body>
<iframe src="${game.url}" frameborder="0" allowfullscreen></iframe>
</body>
</html>`;
          return addWasmHeaders(new Response(iframePage, { headers: { 'Content-Type': 'text/html; charset=UTF-8' } }));
        }

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
        console.error('Failed to load game:', err);
        return new Response('Failed to load game.', { status: 500 });
      }
    }

    // Default fallback
    return fetch(request);
  }
};
