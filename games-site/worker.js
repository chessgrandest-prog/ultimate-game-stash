const HTML_URL = 'https://raw.githubusercontent.com/chessgrandest-prog/ultimate-game-stash/refs/heads/main/games-site/index.html';
const CSS_URL = 'https://raw.githubusercontent.com/chessgrandest-prog/ultimate-game-stash/refs/heads/main/games-site/style.css';
const JS_URL = 'https://raw.githubusercontent.com/chessgrandest-prog/ultimate-game-stash/refs/heads/main/games-site/worker.js';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    const jsonUrl = 'https://raw.githubusercontent.com/chessgrandest-prog/ultimate-game-stash/refs/heads/main/games.json';

    // Serve games.json
    if (url.pathname === '/games.json') {
      try {
        const res = await fetch(jsonUrl);
        const games = await res.json();
        return new Response(JSON.stringify(games), {
          headers: { 'Content-Type': 'application/json; charset=UTF-8' }
        });
      } catch {
        return new Response('Error fetching games JSON.', { status: 500 });
      }
    }

    // Serve individual game HTML
    if (url.pathname.startsWith('/game/')) {
      const gameName = decodeURIComponent(url.pathname.replace('/game/', ''));
      try {
        const res = await fetch(jsonUrl);
        const games = await res.json();
        const game = games.find(g => g.url.endsWith(gameName));
        if (!game) return new Response('Game not found.', { status: 404 });

        const gameRes = await fetch(game.url);
        const htmlContent = await gameRes.text();

        const disguisedHtml = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${game.title} - Google Docs</title>
            <style>
              body, html { margin: 0; padding: 0; height: 100%; }
              iframe { width: 100%; height: 100%; border: none; }
            </style>
          </head>
          <body>
            <iframe srcdoc="${htmlContent.replace(/"/g, '&quot;')}"></iframe>
          </body>
          </html>
        `;

        return new Response(disguisedHtml, {
          headers: { 'Content-Type': 'text/html; charset=UTF-8' }
        });
      } catch {
        return new Response('Error fetching game HTML.', { status: 500 });
      }
    }

    // Serve index.html
    if (url.pathname === '/' || url.pathname === '/index.html') {
      try {
        const res = await fetch(`${request.url}index.html`);
        const html = await res.text();
        return new Response(html, {
          headers: { 'Content-Type': 'text/html; charset=UTF-8' }
        });
      } catch {
        return new Response('Error loading index.html', { status: 500 });
      }
    }

    // Serve style.css
    if (url.pathname === '/style.css') {
      try {
        const res = await fetch(`${request.url}style.css`);
        const css = await res.text();
        return new Response(css, {
          headers: { 'Content-Type': 'text/css; charset=UTF-8' }
        });
      } catch {
        return new Response('Error loading style.css', { status: 500 });
      }
    }

    return new Response('Not found', { status: 404 });
  }
};
