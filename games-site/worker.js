import { unzipSync } from 'fflate';

const GAMES_JSON_URL = 'https://raw.githubusercontent.com/chessgrandest-prog/ultimate-game-stash/main/games-site/games+img.json';
const TERRARIA_ZIP_URL = 'https://github.com/chessgrandest-prog/ultimate-game-stash/raw/main/games-site/terraria.zip';
const REPO_BASE_URL = 'https://raw.githubusercontent.com/chessgrandest-prog/ultimate-game-stash/main/games-site';
const FRAMEWORK_BASE = REPO_BASE_URL + '/_framework';

const FRAMEWORK_FILES = {
  '/_framework/blazor.boot.json': FRAMEWORK_BASE + '/blazor.boot.json',
  '/_framework/CsvHelper.3nwd0yg8jo.dll': FRAMEWORK_BASE + '/CsvHelper.3nwd0yg8jo.dll',
  '/_framework/DepotDownloader.kwzsf4pptn.dll': FRAMEWORK_BASE + '/DepotDownloader.kwzsf4pptn.dll',
  '/_framework/dotnet.js': FRAMEWORK_BASE + '/dotnet.js',
  '/_framework/dotnet.native.5ueb4eu8qt.js': FRAMEWORK_BASE + '/dotnet.native.5ueb4eu8qt.js',
  '/_framework/dotnet.native.6p12adq9gl.wasm': FRAMEWORK_BASE + '/dotnet.native.6p12adq9gl.wasm',
  '/_framework/dotnet.native.worker.ratb5i3t1q.mjs': FRAMEWORK_BASE + '/dotnet.native.worker.ratb5i3t1q.mjs',
  '/_framework/dotnet.runtime.5c6f0nk6pn.js': FRAMEWORK_BASE + '/dotnet.runtime.5c6f0nk6pn.js',
  '/_framework/DotNetZip.cn1r8e8enx.dll': FRAMEWORK_BASE + '/DotNetZip.cn1r8e8enx.dll',
  '/_framework/FNA.zxr12ku1h7.dll': FRAMEWORK_BASE + '/FNA.zxr12ku1h7.dll',
  '/_framework/icudt_CJK.tjcz0u77k5.dat': FRAMEWORK_BASE + '/icudt_CJK.tjcz0u77k5.dat',
  '/_framework/icudt_EFIGS.tptq2av103.dat': FRAMEWORK_BASE + '/icudt_EFIGS.tptq2av103.dat',
  '/_framework/icudt_no_CJK.lfu7j35m59.dat': FRAMEWORK_BASE + '/icudt_no_CJK.lfu7j35m59.dat',
  '/_framework/Microsoft.CSharp.477qod9r2z.dll': FRAMEWORK_BASE + '/Microsoft.CSharp.477qod9r2z.dll',
  '/_framework/Microsoft.Win32.Primitives.s2b3zn8pfv.dll': FRAMEWORK_BASE + '/Microsoft.Win32.Primitives.s2b3zn8pfv.dll',
  '/_framework/Microsoft.Win32.Registry.95a3ud2ill.dll': FRAMEWORK_BASE + '/Microsoft.Win32.Registry.95a3ud2ill.dll',
  '/_framework/Microsoft.Win32.SystemEvents.drmiff8ls9.dll': FRAMEWORK_BASE + '/Microsoft.Win32.SystemEvents.drmiff8ls9.dll',
  '/_framework/MP3Sharp.fzcfomtlmr.dll': FRAMEWORK_BASE + '/MP3Sharp.fzcfomtlmr.dll',
  '/_framework/mscorlib.zihg2w7xdf.dll': FRAMEWORK_BASE + '/mscorlib.zihg2w7xdf.dll',
  '/_framework/netstandard.53t0azuk6u.dll': FRAMEWORK_BASE + '/netstandard.53t0azuk6u.dll',
  '/_framework/Newtonsoft.Json.Bson.2xy9hqeqy6.dll': FRAMEWORK_BASE + '/Newtonsoft.Json.Bson.2xy9hqeqy6.dll',
  '/_framework/Newtonsoft.Json.zgpdt8xax0.dll': FRAMEWORK_BASE + '/Newtonsoft.Json.zgpdt8xax0.dll',
  '/_framework/NVorbis.lx566n87nu.dll': FRAMEWORK_BASE + '/NVorbis.lx566n87nu.dll',
  '/_framework/protobuf-net.Core.9cn3m4azxo.dll': FRAMEWORK_BASE + '/protobuf-net.Core.9cn3m4azxo.dll',
  '/_framework/protobuf-net.ripp589a7z.dll': FRAMEWORK_BASE + '/protobuf-net.ripp589a7z.dll',
  '/_framework/QRCoder.4j53o3igzi.dll': FRAMEWORK_BASE + '/QRCoder.4j53o3igzi.dll',
  '/_framework/SteamKit2.5p696cll57.dll': FRAMEWORK_BASE + '/SteamKit2.5p696cll57.dll',
  '/_framework/Steamworks.NET.d7kco8hunl.dll': FRAMEWORK_BASE + '/Steamworks.NET.d7kco8hunl.dll',
  '/_framework/System.Collections.Concurrent.77keru240q.dll': FRAMEWORK_BASE + '/System.Collections.Concurrent.77keru240q.dll',
  '/_framework/System.Collections.Immutable.tyd5fk0lcs.dll': FRAMEWORK_BASE + '/System.Collections.Immutable.tyd5fk0lcs.dll',
  '/_framework/System.Collections.NonGeneric.n2cmv67loc.dll': FRAMEWORK_BASE + '/System.Collections.NonGeneric.n2cmv67loc.dll',
  '/_framework/System.Collections.Specialized.cj5nf4s906.dll': FRAMEWORK_BASE + '/System.Collections.Specialized.cj5nf4s906.dll',
  '/_framework/System.Collections.y4sy5p2c5n.dll': FRAMEWORK_BASE + '/System.Collections.y4sy5p2c5n.dll',
  '/_framework/System.ComponentModel.cznq51fcdk.dll': FRAMEWORK_BASE + '/System.ComponentModel.cznq51fcdk.dll',
  '/_framework/System.ComponentModel.EventBasedAsync.h56vxs90mj.dll': FRAMEWORK_BASE + '/System.ComponentModel.EventBasedAsync.h56vxs90mj.dll',
  '/_framework/System.ComponentModel.Primitives.5fu8gslfun.dll': FRAMEWORK_BASE + '/System.ComponentModel.Primitives.5fu8gslfun.dll',
  '/_framework/System.ComponentModel.TypeConverter.zpkuz4dyes.dll': FRAMEWORK_BASE + '/System.ComponentModel.TypeConverter.zpkuz4dyes.dll',
  '/_framework/System.Console.94obmc87cg.dll': FRAMEWORK_BASE + '/System.Console.94obmc87cg.dll',
  '/_framework/System.Core.msjm544yyg.dll': FRAMEWORK_BASE + '/System.Core.msjm544yyg.dll',
  '/_framework/System.Data.Common.atpoulwi2c.dll': FRAMEWORK_BASE + '/System.Data.Common.atpoulwi2c.dll',
  '/_framework/System.Diagnostics.DiagnosticSource.att75q2nje.dll': FRAMEWORK_BASE + '/System.Diagnostics.DiagnosticSource.att75q2nje.dll',
  '/_framework/System.Diagnostics.Process.hmratj86to.dll': FRAMEWORK_BASE + '/System.Diagnostics.Process.hmratj86to.dll',
  '/_framework/System.Diagnostics.TraceSource.uf4o4yfqov.dll': FRAMEWORK_BASE + '/System.Diagnostics.TraceSource.uf4o4yfqov.dll',
  '/_framework/System.Diagnostics.Tracing.86r1zarkcp.dll': FRAMEWORK_BASE + '/System.Diagnostics.Tracing.86r1zarkcp.dll',
  '/_framework/System.Drawing.Common.jz8dhnwxl9.dll': FRAMEWORK_BASE + '/System.Drawing.Common.jz8dhnwxl9.dll',
  '/_framework/System.Drawing.k75ptddlp6.dll': FRAMEWORK_BASE + '/System.Drawing.k75ptddlp6.dll',
  '/_framework/System.Drawing.Primitives.bra7bkiujb.dll': FRAMEWORK_BASE + '/System.Drawing.Primitives.bra7bkiujb.dll',
  '/_framework/System.gjaswxgac3.dll': FRAMEWORK_BASE + '/System.gjaswxgac3.dll',
  '/_framework/System.IO.Compression.cws62cxo3e.dll': FRAMEWORK_BASE + '/System.IO.Compression.cws62cxo3e.dll',
  '/_framework/System.IO.FileSystem.DriveInfo.vi74au9701.dll': FRAMEWORK_BASE + '/System.IO.FileSystem.DriveInfo.vi74au9701.dll',
  '/_framework/System.IO.Hashing.ycswjrw70w.dll': FRAMEWORK_BASE + '/System.IO.Hashing.ycswjrw70w.dll',
  '/_framework/System.IO.IsolatedStorage.88f24y8x0d.dll': FRAMEWORK_BASE + '/System.IO.IsolatedStorage.88f24y8x0d.dll',
  '/_framework/System.Linq.98vlh7bp4q.dll': FRAMEWORK_BASE + '/System.Linq.98vlh7bp4q.dll',
  '/_framework/System.Linq.Expressions.l2dgm2md7w.dll': FRAMEWORK_BASE + '/System.Linq.Expressions.l2dgm2md7w.dll',
  '/_framework/System.Linq.Parallel.wgyl7vt2ly.dll': FRAMEWORK_BASE + '/System.Linq.Parallel.wgyl7vt2ly.dll',
  '/_framework/System.Memory.yroyh960u7.dll': FRAMEWORK_BASE + '/System.Memory.yroyh960u7.dll',
  '/_framework/System.Net.Http.7xejhiabt5.dll': FRAMEWORK_BASE + '/System.Net.Http.7xejhiabt5.dll',
  '/_framework/System.Net.NameResolution.cumb15yn65.dll': FRAMEWORK_BASE + '/System.Net.NameResolution.cumb15yn65.dll',
  '/_framework/System.Net.NetworkInformation.pzrv7wzjc3.dll': FRAMEWORK_BASE + '/System.Net.NetworkInformation.pzrv7wzjc3.dll',
  '/_framework/System.Net.Primitives.wnl5r931hd.dll': FRAMEWORK_BASE + '/System.Net.Primitives.wnl5r931hd.dll',
  '/_framework/System.Net.Sockets.tdhad29kzj.dll': FRAMEWORK_BASE + '/System.Net.Sockets.tdhad29kzj.dll',
  '/_framework/System.Net.WebSockets.Client.0v5h62nljn.dll': FRAMEWORK_BASE + '/System.Net.WebSockets.Client.0v5h62nljn.dll',
  '/_framework/System.Net.WebSockets.czpvksdp8e.dll': FRAMEWORK_BASE + '/System.Net.WebSockets.czpvksdp8e.dll',
  '/_framework/System.ObjectModel.f08n95ii3w.dll': FRAMEWORK_BASE + '/System.ObjectModel.f08n95ii3w.dll',
  '/_framework/System.Private.CoreLib.1kuik1zyqu.dll': FRAMEWORK_BASE + '/System.Private.CoreLib.1kuik1zyqu.dll',
  '/_framework/System.Private.Uri.a1nf5z1dnj.dll': FRAMEWORK_BASE + '/System.Private.Uri.a1nf5z1dnj.dll',
  '/_framework/System.Private.Xml.Linq.36e4pp1k05.dll': FRAMEWORK_BASE + '/System.Private.Xml.Linq.36e4pp1k05.dll',
  '/_framework/System.Private.Xml.od6fvx07if.dll': FRAMEWORK_BASE + '/System.Private.Xml.od6fvx07if.dll',
  '/_framework/System.Reflection.Emit.ILGeneration.uzhil9zyh4.dll': FRAMEWORK_BASE + '/System.Reflection.Emit.ILGeneration.uzhil9zyh4.dll',
  '/_framework/System.Reflection.Emit.Lightweight.y1oc8ir061.dll': FRAMEWORK_BASE + '/System.Reflection.Emit.Lightweight.y1oc8ir061.dll',
  '/_framework/System.Reflection.Emit.mu9nde9tfa.dll': FRAMEWORK_BASE + '/System.Reflection.Emit.mu9nde9tfa.dll',
  '/_framework/System.Reflection.Primitives.1ywxzaodqd.dll': FRAMEWORK_BASE + '/System.Reflection.Primitives.1ywxzaodqd.dll',
  '/_framework/System.Resources.ResourceManager.k0n19fu6rg.dll': FRAMEWORK_BASE + '/System.Resources.ResourceManager.k0n19fu6rg.dll',
  '/_framework/System.Runtime.5zfq2618qh.dll': FRAMEWORK_BASE + '/System.Runtime.5zfq2618qh.dll',
  '/_framework/System.Runtime.Extensions.922aiehf0h.dll': FRAMEWORK_BASE + '/System.Runtime.Extensions.922aiehf0h.dll',
  '/_framework/System.Runtime.InteropServices.JavaScript.c4ajrwafcr.dll': FRAMEWORK_BASE + '/System.Runtime.InteropServices.JavaScript.c4ajrwafcr.dll',
  '/_framework/System.Runtime.InteropServices.kiy794v4su.dll': FRAMEWORK_BASE + '/System.Runtime.InteropServices.kiy794v4su.dll',
  '/_framework/System.Runtime.Numerics.ltk3xwrx3x.dll': FRAMEWORK_BASE + '/System.Runtime.Numerics.ltk3xwrx3x.dll',
  '/_framework/System.Runtime.Serialization.Formatters.erngn40z49.dll': FRAMEWORK_BASE + '/System.Runtime.Serialization.Formatters.erngn40z49.dll',
  '/_framework/System.Runtime.Serialization.Primitives.wp2qnba2lw.dll': FRAMEWORK_BASE + '/System.Runtime.Serialization.Primitives.wp2qnba2lw.dll',
  '/_framework/System.Security.AccessControl.ecwc9ya9sh.dll': FRAMEWORK_BASE + '/System.Security.AccessControl.ecwc9ya9sh.dll',
  '/_framework/System.Security.Claims.y2t7q6jjnn.dll': FRAMEWORK_BASE + '/System.Security.Claims.y2t7q6jjnn.dll',
  '/_framework/System.Security.Cryptography.Csp.6wdlc8f4v9.dll': FRAMEWORK_BASE + '/System.Security.Cryptography.Csp.6wdlc8f4v9.dll',
  '/_framework/System.Security.Cryptography.ikvgvdkklk.dll': FRAMEWORK_BASE + '/System.Security.Cryptography.ikvgvdkklk.dll',
  '/_framework/System.Security.Cryptography.Primitives.lz5afmigc6.dll': FRAMEWORK_BASE + '/System.Security.Cryptography.Primitives.lz5afmigc6.dll',
  '/_framework/System.Security.Cryptography.X509Certificates.8e0wihs4np.dll': FRAMEWORK_BASE + '/System.Security.Cryptography.X509Certificates.8e0wihs4np.dll',
  '/_framework/System.Security.Permissions.zlrpq8fur5.dll': FRAMEWORK_BASE + '/System.Security.Permissions.zlrpq8fur5.dll',
  '/_framework/System.Security.Principal.7ypn88lxgo.dll': FRAMEWORK_BASE + '/System.Security.Principal.7ypn88lxgo.dll',
  '/_framework/System.Security.Principal.Windows.lgmvwarjwb.dll': FRAMEWORK_BASE + '/System.Security.Principal.Windows.lgmvwarjwb.dll',
  '/_framework/System.Text.Encoding.CodePages.f4p51cwf2m.dll': FRAMEWORK_BASE + '/System.Text.Encoding.CodePages.f4p51cwf2m.dll',
  '/_framework/System.Text.Encoding.Extensions.m037ot4hwy.dll': FRAMEWORK_BASE + '/System.Text.Encoding.Extensions.m037ot4hwy.dll',
  '/_framework/System.Text.RegularExpressions.tvx6amazwf.dll': FRAMEWORK_BASE + '/System.Text.RegularExpressions.tvx6amazwf.dll',
  '/_framework/System.Threading.3ssvqmtk6g.dll': FRAMEWORK_BASE + '/System.Threading.3ssvqmtk6g.dll',
  '/_framework/System.Threading.Channels.eka96a30ml.dll': FRAMEWORK_BASE + '/System.Threading.Channels.eka96a30ml.dll',
  '/_framework/System.Threading.Overlapped.zusvlkavjx.dll': FRAMEWORK_BASE + '/System.Threading.Overlapped.zusvlkavjx.dll',
  '/_framework/System.Threading.Tasks.Dataflow.ioh5d77moh.dll': FRAMEWORK_BASE + '/System.Threading.Tasks.Dataflow.ioh5d77moh.dll',
  '/_framework/System.Threading.Thread.jj7jyil7jl.dll': FRAMEWORK_BASE + '/System.Threading.Thread.jj7jyil7jl.dll',
  '/_framework/System.Threading.ThreadPool.zu1mzoof7d.dll': FRAMEWORK_BASE + '/System.Threading.ThreadPool.zu1mzoof7d.dll',
  '/_framework/System.Web.HttpUtility.qst6a4t5ak.dll': FRAMEWORK_BASE + '/System.Web.HttpUtility.qst6a4t5ak.dll',
  '/_framework/System.Windows.Extensions.jxvjfrz0ew.dll': FRAMEWORK_BASE + '/System.Windows.Extensions.jxvjfrz0ew.dll',
  '/_framework/System.Xml.Linq.du5ff8lic8.dll': FRAMEWORK_BASE + '/System.Xml.Linq.du5ff8lic8.dll',
  '/_framework/System.Xml.ReaderWriter.0tbmg2y0jx.dll': FRAMEWORK_BASE + '/System.Xml.ReaderWriter.0tbmg2y0jx.dll',
  '/_framework/System.Xml.XDocument.htc7u8fv08.dll': FRAMEWORK_BASE + '/System.Xml.XDocument.htc7u8fv08.dll',
  '/_framework/terraria.htgijktbe2.dll': FRAMEWORK_BASE + '/terraria.htgijktbe2.dll'
};

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

let cachedZip = null;

async function loadTerrariaZip() {
  if (!cachedZip) {
    console.log('[DEBUG] Fetching Terraria ZIP...');
    const zipRes = await fetch(TERRARIA_ZIP_URL);
    if (!zipRes.ok) throw new Error('Failed to fetch Terraria ZIP');
    const buffer = new Uint8Array(await zipRes.arrayBuffer());
    const zipFiles = unzipSync(buffer);
    cachedZip = {};
    for (const [path, content] of Object.entries(zipFiles)) {
      cachedZip[path.replace(/\\/g, '/')] = content;
    }
    console.log('[DEBUG] ZIP loaded. Files:', Object.keys(cachedZip));
  }
}

function getZipFile(requestPath) {
  const cleanPath = requestPath.replace(/^\/+|\/+$/g, '');
  if (cachedZip[cleanPath]) return cachedZip[cleanPath];
  const lowerPath = cleanPath.toLowerCase();
  for (const zipPath of Object.keys(cachedZip)) {
    if (zipPath.toLowerCase().endsWith(lowerPath)) return cachedZip[zipPath];
  }
  console.log('[DEBUG] File not found in ZIP:', requestPath);
  return null;
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(req) {
  const url = new URL(req.url);
  const path = url.pathname;

  try {
    // 1. Root static files
    const rootFiles = ['/', '/index.html', '/logo.png', '/app.ico', '/AndyBold.ttf', '/backdrop.png'];
    if (rootFiles.includes(path)) {
      const fileUrl = REPO_BASE_URL + (path === '/' ? '/index.html' : path);
      const res = await fetch(fileUrl);
      return addWasmHeaders(res);
    }

    // 2. Assets folder
    if (path.startsWith('/assets/')) {
      const fileUrl = REPO_BASE_URL + path;
      const res = await fetch(fileUrl);
      return addWasmHeaders(res);
    }

    // 3. _framework folder
    if (path.startsWith('/_framework/')) {
      if (FRAMEWORK_FILES[path]) {
        const res = await fetch(FRAMEWORK_FILES[path]);
        return addWasmHeaders(res);
      }
      return new Response('Framework file not found', { status: 404 });
    }

    // 4. Terraria ZIP
    await loadTerrariaZip();
    const zipContent = getZipFile(path.slice(1));
    if (zipContent) {
      return new Response(zipContent, { headers: { 'Content-Type': 'application/octet-stream' } });
    }

    // 5. Fallback 404
    return new Response(`File not found: ${escapeHtml(path)}`, { status: 404 });
  } catch (err) {
    return new Response(`Error: ${escapeHtml(err.message)}`, { status: 500 });
  }
}
