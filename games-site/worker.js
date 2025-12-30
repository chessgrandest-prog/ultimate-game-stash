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

const REPO_RAW_BASE = 'https://raw.githubusercontent.com/chessgrandest-prog/ultimate-game-stash/main/games-site';
const GAMES_JSON_URL = `${REPO_RAW_BASE}/games+img.json`;

// Full list of Terraria files
const TERRARIA_FILES = [
  'index.html','AndyBold.ttf','app.ico','backdrop.png','logo.png','package-lock.json','package.json','sw.js','_headers',
  'assets/index.css','assets/index.js',
  '_framework/blazor.boot.json','_framework/CsvHelper.3nwd0yg8jo.dll','_framework/DepotDownloader.kwzsf4pptn.dll',
  '_framework/dotnet.js','_framework/dotnet.native.5ueb4eu8qt.js','_framework/dotnet.native.6p12adq9gl.wasm',
  '_framework/dotnet.native.worker.ratb5i3t1q.mjs','_framework/dotnet.runtime.5c6f0nk6pn.js','_framework/DotNetZip.cn1r8e8enx.dll',
  '_framework/FNA.zxr12ku1h7.dll','_framework/icudt_CJK.tjcz0u77k5.dat','_framework/icudt_EFIGS.tptq2av103.dat',
  '_framework/icudt_no_CJK.lfu7j35m59.dat','_framework/Microsoft.CSharp.477qod9r2z.dll','_framework/Microsoft.Win32.Primitives.s2b3zn8pfv.dll',
  '_framework/Microsoft.Win32.Registry.95a3ud2ill.dll','_framework/Microsoft.Win32.SystemEvents.drmiff8ls9.dll','_framework/MP3Sharp.fzcfomtlmr.dll',
  '_framework/mscorlib.zihg2w7xdf.dll','_framework/netstandard.53t0azuk6u.dll','_framework/Newtonsoft.Json.Bson.2xy9hqeqy6.dll',
  '_framework/Newtonsoft.Json.zgpdt8xax0.dll','_framework/NVorbis.lx566n87nu.dll','_framework/protobuf-net.Core.9cn3m4azxo.dll',
  '_framework/protobuf-net.ripp589a7z.dll','_framework/QRCoder.4j53o3igzi.dll','_framework/SteamKit2.5p696cll57.dll',
  '_framework/Steamworks.NET.d7kco8hunl.dll','_framework/System.Collections.Concurrent.77keru240q.dll','_framework/System.Collections.Immutable.tyd5fk0lcs.dll',
  '_framework/System.Collections.NonGeneric.n2cmv67loc.dll','_framework/System.Collections.Specialized.cj5nf4s906.dll','_framework/System.Collections.y4sy5p2c5n.dll',
  '_framework/System.ComponentModel.cznq51fcdk.dll','_framework/System.ComponentModel.EventBasedAsync.h56vxs90mj.dll','_framework/System.ComponentModel.Primitives.5fu8gslfun.dll',
  '_framework/System.ComponentModel.TypeConverter.zpkuz4dyes.dll','_framework/System.Console.94obmc87cg.dll','_framework/System.Core.msjm544yyg.dll',
  '_framework/System.Data.Common.atpoulwi2c.dll','_framework/System.Diagnostics.DiagnosticSource.att75q2nje.dll','_framework/System.Diagnostics.Process.hmratj86to.dll',
  '_framework/System.Diagnostics.TraceSource.uf4o4yfqov.dll','_framework/System.Diagnostics.Tracing.86r1zarkcp.dll','_framework/System.Drawing.Common.jz8dhnwxl9.dll',
  '_framework/System.Drawing.k75ptddlp6.dll','_framework/System.Drawing.Primitives.bra7bkiujb.dll','_framework/System.gjaswxgac3.dll',
  '_framework/System.IO.Compression.cws62cxo3e.dll','_framework/System.IO.FileSystem.DriveInfo.vi74au9701.dll','_framework/System.IO.Hashing.ycswjrw70w.dll',
  '_framework/System.IO.IsolatedStorage.88f24y8x0d.dll','_framework/System.Linq.98vlh7bp4q.dll','_framework/System.Linq.Expressions.l2dgm2md7w.dll',
  '_framework/System.Linq.Parallel.wgyl7vt2ly.dll','_framework/System.Memory.yroyh960u7.dll','_framework/System.Net.Http.7xejhiabt5.dll',
  '_framework/System.Net.NameResolution.cumb15yn65.dll','_framework/System.Net.NetworkInformation.pzrv7wzjc3.dll','_framework/System.Net.Primitives.wnl5r931hd.dll',
  '_framework/System.Net.Sockets.tdhad29kzj.dll','_framework/System.Net.WebSockets.Client.0v5h62nljn.dll','_framework/System.Net.WebSockets.czpvksdp8e.dll',
  '_framework/System.ObjectModel.f08n95ii3w.dll','_framework/System.Private.CoreLib.1kuik1zyqu.dll','_framework/System.Private.Uri.a1nf5z1dnj.dll',
  '_framework/System.Private.Xml.Linq.36e4pp1k05.dll','_framework/System.Private.Xml.od6fvx07if.dll','_framework/System.Reflection.Emit.ILGeneration.uzhil9zyh4.dll',
  '_framework/System.Reflection.Emit.Lightweight.y1oc8ir061.dll','_framework/System.Reflection.Emit.mu9nde9tfa.dll','_framework/System.Reflection.Primitives.1ywxzaodqd.dll',
  '_framework/System.Resources.ResourceManager.k0n19fu6rg.dll','_framework/System.Runtime.5zfq2618qh.dll','_framework/System.Runtime.Extensions.922aiehf0h.dll',
  '_framework/System.Runtime.InteropServices.JavaScript.c4ajrwafcr.dll','_framework/System.Runtime.InteropServices.kiy794v4su.dll','_framework/System.Runtime.Numerics.ltk3xwrx3x.dll',
  '_framework/System.Runtime.Serialization.Formatters.erngn40z49.dll','_framework/System.Runtime.Serialization.Primitives.wp2qnba2lw.dll','_framework/System.Security.AccessControl.ecwc9ya9sh.dll',
  '_framework/System.Security.Claims.y2t7q6jjnn.dll','_framework/System.Security.Cryptography.Csp.6wdlc8f4v9.dll','_framework/System.Security.Cryptography.ikvgvdkklk.dll',
  '_framework/System.Security.Cryptography.Primitives.lz5afmigc6.dll','_framework/System.Security.Cryptography.X509Certificates.8e0wihs4np.dll','_framework/System.Security.Permissions.zlrpq8fur5.dll',
  '_framework/System.Security.Principal.7ypn88lxgo.dll','_framework/System.Security.Principal.Windows.lgmvwarjwb.dll','_framework/System.Text.Encoding.CodePages.f4p51cwf2m.dll',
  '_framework/System.Text.Encoding.Extensions.m037ot4hwy.dll','_framework/System.Text.RegularExpressions.tvx6amazwf.dll','_framework/System.Threading.3ssvqmtk6g.dll',
  '_framework/System.Threading.Channels.eka96a30ml.dll','_framework/System.Threading.Overlapped.zusvlkavjx.dll','_framework/System.Threading.Tasks.Dataflow.ioh5d77moh.dll',
  '_framework/System.Threading.Thread.jj7jyil7jl.dll','_framework/System.Threading.ThreadPool.zu1mzoof7d.dll','_framework/System.Web.HttpUtility.qst6a4t5ak.dll','_framework/System.Windows.Extensions.jxvjfrz0ew.dll',
  '_framework/System.Xml.Linq.du5ff8lic8.dll','_framework/System.Xml.ReaderWriter.0tbmg2y0jx.dll','_framework/System.Xml.XDocument.htc7u8fv08.dll',
  '_framework/terraria.htgijktbe2.dll'
];

function getContentType(path) {
  if (path.endsWith('.wasm')) return 'application/wasm';
  if (path.endsWith('.js')) return 'application/javascript';
  if (path.endsWith('.css')) return 'text/css';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.ico')) return 'image/x-icon';
  if (path.endsWith('.ttf')) return 'font/ttf';
  if (path.endsWith('.json')) return 'application/json';
  if (path.endsWith('.html')) return 'text/html';
  return 'application/octet-stream';
}

async function fetchFile(path) {
  const url = `${REPO_RAW_BASE}/${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${path}`);
  if (path.endsWith('.html') || path.endsWith('.js') || path.endsWith('.css') || path.endsWith('.json')) {
    return await res.text();
  } else {
    return new Uint8Array(await res.arrayBuffer());
  }
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    let path = url.pathname.replace(/^\/+/, '');

    // Serve /games+img.json with search, pagination, favorites
    if (path === 'games+img.json') {
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

        return addWasmHeaders(new Response(JSON.stringify({ total, page, limit, games: paginatedGames }), {
          headers: { 'Content-Type': 'application/json; charset=UTF-8' }
        }));
      } catch (err) {
        console.error('[DEBUG] Failed to fetch games+img.json', err);
        return new Response('Error fetching games.json', { status: 500 });
      }
    }

    // Serve /game/:slug pages
    if (path.startsWith('game/')) {
      const gameSlug = decodeURIComponent(path.replace(/^game\//, ''));
      try {
        const gamesRes = await fetch(GAMES_JSON_URL);
        const games = await gamesRes.json();
        const normalize = str => str.replace(/\/+$/, '');
        const game = games.find(g => normalize(g.url) === normalize(gameSlug));
        if (!game) return new Response('Game not found', { status: 404 });

        // Internal Terraria game
        if (game.url.startsWith('/terraria/')) {
          const terrariaPath = game.url.replace(/^\/terraria\//, '');
          if (!TERRARIA_FILES.includes(terrariaPath)) return new Response('File not found', { status: 404 });
          const file = await fetchFile(`terraria/${terrariaPath}`);
          return addWasmHeaders(new Response(file, { headers: { 'Content-Type': getContentType(terrariaPath) } }));
        }

        // External URL
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
        console.error('[DEBUG] Failed to fetch game page', err);
        return new Response('Failed to load game.', { status: 500 });
      }
    }

    // Serve root/Terraria files
    if (TERRARIA_FILES.includes(path) || path.startsWith('terraria/')) {
      let filePath = path.startsWith('terraria/') ? path : `terraria/${path}`;
      if (!TERRARIA_FILES.includes(filePath.replace(/^terraria\//, ''))) {
        return new Response('File not found', { status: 404 });
      }
      try {
        const file = await fetchFile(filePath);
        return addWasmHeaders(new Response(file, { headers: { 'Content-Type': getContentType(filePath) } }));
      } catch (err) {
        console.error('[DEBUG] Failed to fetch static file:', filePath, err);
        return new Response('Failed to load file.', { status: 500 });
      }
    }

    return new Response('Not Found', { status: 404 });
  }
};
