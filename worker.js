// Create a file named `worker.js` in your GitHub repo
// This serves your portal from GitHub via jsDelivr

// worker.js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    // Redirect root to your portal on jsDelivr
    if (url.pathname === '/') {
      const portalUrl = 'https://cdn.jsdelivr.net/gh/YOUR_USERNAME/ultimate-game-stash/portal/index.html';
      
      // Fetch and serve the portal
      const response = await fetch(portalUrl);
      const html = await response.text();
      
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }
    
    // For any other path, redirect to the portal
    return Response.redirect('https://YOUR_WORKER.workers.dev/', 302);
  }
};