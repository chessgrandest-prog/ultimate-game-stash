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

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Serve index.html
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const res = await fetch('https://raw.githubusercontent.com/chessgrandest-prog/ultimate-game-stash/refs/heads/main/games-site/index.html');
      return new Response(await res.text(), { headers: { 'Content-Type': 'text/html; charset=UTF-8' } });
    }

    // Serve style.css
    if (url.pathname === '/style.css') {
      const res = await fetch('https://raw.githubusercontent.com/chessgrandest-prog/ultimate-game-stash/refs/heads/main/games-site/style.css');
      return new Response(await res.text(), { headers: { 'Content-Type': 'text/css; charset=UTF-8' } });
    }

    // Paginated & filtered games
    if (url.pathname === '/games+img.json') {
      try {
        const gamesRes = await fetch(GAMES_JSON_URL);
        let games = await gamesRes.json();

        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '100');
        const searchQuery = (url.searchParams.get('search') || '').toLowerCase();
        const favoritesOnly = url.searchParams.get('favorites') === '1';
        const favoriteGames = JSON.parse(url.searchParams.get('favList') || '[]');

        // Global filters
        if (searchQuery) {
          games = games.filter(g => g.title.toLowerCase().includes(searchQuery));
        }
        if (favoritesOnly) {
          games = games.filter(g => favoriteGames.includes(g.url));
        }

        const total = games.length;
        const start = (page - 1) * limit;
        const paginatedGames = games.slice(start, start + limit);

        return new Response(JSON.stringify({
          total,
          page,
          limit,
          games: paginatedGames
        }), {
          headers: { 'Content-Type': 'application/json; charset=UTF-8' }
        });

      } catch (err) {
        return new Response('Error fetching games.json', { status: 500 });
      }
    }

    // Serve individual game pages
    // Serve individual game pages
if (url.pathname.startsWith('/game/')) {
  try {
    const gameFile = decodeURIComponent(url.pathname.replace('/game/', ''));
    const gamesRes = await fetch(GAMES_JSON_URL);
    const games = await gamesRes.json();

    const game = games.find(g => g.url.endsWith(gameFile) || g.url === gameFile);
    if (!game) return new Response('Game not found', { status: 404 });

    // 🚨 WASM / COOP games MUST be top-level
    if (game.url.startsWith('/terraria/')) {
      return Response.redirect(new URL(game.url, url.origin), 302);
    }

        // Detect GitHub Pages URLs
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
          return new Response(iframePage, { headers: { 'Content-Type': 'text/html; charset=UTF-8' } });
        }

        // Otherwise, fetch raw HTML for normal games
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
        return new Response(iframePage, { headers: { 'Content-Type': 'text/html; charset=UTF-8' } });

      } catch {
        return new Response('Failed to load game.', { status: 500 });
      }
    }

    return fetch(request);
  }
};
