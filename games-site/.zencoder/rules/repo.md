---
description: Repository Information Overview
alwaysApply: true
---

# ultimate-game-stash Information

## Summary
The `ultimate-game-stash` (also referred to as `games-site`) is a web application and API powered by Cloudflare Workers. It serves a collection of games with features like pagination, search filtering, and favorite list management. It also includes a utility script for updating image URLs from a GitHub repository.

## Structure
- **public/**: Contains static assets including `index.html`, `style.css`, and image resources.
- **src/**: Contains the main application logic.
- **games.json**: Source data file containing the list of games.
- **update-images.js**: Node.js script for generating `games+img.json` with updated GitHub image links.
- **wrangler.toml**: Configuration for Cloudflare Workers deployment and static assets.

## Language & Runtime
**Language**: JavaScript (ES Modules)  
**Version**: Compatibility Date 2025-12-30  
**Build System**: Wrangler (Cloudflare Workers CLI)  
**Package Manager**: npm

## Dependencies
**Main Dependencies**:
- **fflate**: High-performance compression library.
- **wrangler**: Tooling for Cloudflare Workers (implied for deployment).

## Build & Installation
```bash
# Install dependencies
npm install

# Update image links in data file
node update-images.js

# Deploy to Cloudflare Workers
npm run deploy
```

## Main Files & Resources
- **src/worker.js**: The primary entry point for the Cloudflare Worker, handling requests for static assets, specialized Terraria file serving, and the paginated games API.
- **public/index.html**: Main frontend entry point.
- **public/games+img.json**: The processed games data file used by the application.
- **update-images.js**: A utility script used to transform `games.json` into `games+img.json` by mapping local image paths to raw GitHub URLs.

## Usage & Operations
- **API Endpoints**:
    - `/games+img.json`: Supports `page`, `limit`, `search`, `favorites`, and `favList` query parameters.
    - `/terraria/*`: Proxies requests to a GitHub Pages site with specific CORS headers for WebAssembly compatibility.
- **Deployment**: Managed through Wrangler with the `wrangler deploy` command.
