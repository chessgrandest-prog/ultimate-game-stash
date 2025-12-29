// --- CONFIG: Replace with your GitHub repo info ---
const GITHUB_USER = 'chessgrandest-prog';
const GITHUB_REPO = 'fun';
const BRANCH = 'main';

// File URLs
const HTML_URL = `https://raw.githubusercontent.com/chessgrandest-prog/ultimate-game-stash/refs/heads/main/games-site/index.html`;
const CSS_URL  = `https://raw.githubusercontent.com/chessgrandest-prog/ultimate-game-stash/refs/heads/main/games-site/style.css`;
const GAMES_JSON_URL = `https://raw.githubusercontent.com/chessgrandest-prog/ultimate-game-stash/refs/heads/main/games-site/games.json`;

// Escape HTML for iframe srcdoc
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

    // --- Serve index.html ---
    if (url.pathname === '/' || url.pathname === '/index.html') {
      try {
        const res = await fetch(HTML_URL);
        const html = await res.text();
        return new Response(html, { headers: { 'Content-Type': 'text/html; charset=UTF-8' } });
      } catch (err) {
        return new Response('Error loading index.html', { status: 500 });
      }
    }

    // --- Serve style.css ---
    if (url.pathname === '/style.css') {
      try {
        const res = await fetch(CSS_URL);
        const css = await res.text();
        return new Response(css, { headers: { 'Content-Type': 'text/css; charset=UTF-8' } });
      } catch (err) {
        return new Response('Error loading style.css', { status: 500 });
      }
    }

    // --- Serve individual game pages ---
    if (url.pathname.startsWith('/game/')) {
      try {
        const gameFile = decodeURIComponent(url.pathname.replace('/game/', ''));

        // Fetch games.json from GitHub
        const gamesRes = await fetch(GAMES_JSON_URL);
        const games = await gamesRes.json();

        const game = games.find(g => g.url.endsWith(gameFile));
        if (!game) return new Response('Game not found', { status: 404 });

        // Fetch actual game HTML from GitHub
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
      } catch (err) {
        return new Response('Failed to load game.', { status: 500 });
      }
    }

    // --- Everything else (images, JSON, etc.) ---
    return fetch(request);
  }
};
