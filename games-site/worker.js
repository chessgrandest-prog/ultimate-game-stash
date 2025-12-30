const GAMES_JSON_URL = 'https://raw.githubusercontent.com/chessgrandest-prog/ultimate-game-stash/refs/heads/main/games-site/games+img.json';

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;');
}

// Add cross-origin headers for WASM
const addWasmHeaders = (res) => {
  res.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  return res;
};

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

      } catch {
        return new Response('Error fetching games.json', { status: 500 });
      }
    }

    // Serve Terraria WASM and assets
    if (url.pathname.startsWith('/terraria/')) {
      try {
        // ✅ Fixed filePath fallback
        let filePath = url.pathname.replace('/terraria/', '');
        if (!filePath || filePath === '') filePath = 'index.html';

        const fileUrl = `https://raw.githubusercontent.com/chessgrandest-prog/ultimate-game-stash/refs/heads/main/games-site/terraria/${filePath}`;

        const res = await fetch(fileUrl);
        if (!res.ok) return new Response('File not found', { status: 404 });

        // Detect content type
        let contentType = 'text/html';
        if (filePath.endsWith('.js')) contentType = 'application/javascript';
        else if (filePath.endsWith('.wasm')) contentType = 'application/wasm';
        else if (filePath.endsWith('.css')) contentType = 'text/css';
        else if (filePath.endsWith('.png')) contentType = 'image/png';
        else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) contentType = 'image/jpeg';

        // Use arrayBuffer for binary files
        const body = ['.wasm', '.png', '.jpg', '.jpeg'].some(ext => filePath.endsWith(ext))
          ? await res.arrayBuffer()
          : await res.text();

        return addWasmHeaders(new Response(body, { headers: { 'Content-Type': contentType } }));

      } catch {
        return new Response('Failed to load Terraria file.', { status: 500 });
      }
    }

    // Serve individual game pages
    if (url.pathname.startsWith('/game/')) {
      try {
        const gameFile = decodeURIComponent(url.pathname.replace('/game/', ''));
        const gamesRes = await fetch(GAMES_JSON_URL);
        const games = await gamesRes.json();

        const game = games.find(g => g.url.endsWith(gameFile) || g.url === gameFile);
        if (!game) return new Response('Game not found', { status: 404 });

        // GitHub Pages iframe
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

        // Otherwise, fetch raw HTML
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

      } catch {
        return new Response('Failed to load game.', { status: 500 });
      }
    }

    // Default fetch
    return fetch(request);
  }
};
