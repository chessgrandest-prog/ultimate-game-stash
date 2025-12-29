import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";
import slugify from "slugify";

const GAMES_FILE = "./games.json";
const OUTPUT_DIR = "./thumbnails";
const USER_AGENT = "Mozilla/5.0";

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

const games = JSON.parse(fs.readFileSync(GAMES_FILE, "utf-8"));

async function searchImage(title) {
  const query = encodeURIComponent(title + " game cover");
  const url = `https://duckduckgo.com/?q=${query}&iax=images&ia=images`;

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT }
  });

  const html = await res.text();
  const dom = new JSDOM(html);
  const scripts = [...dom.window.document.querySelectorAll("script")];

  for (const script of scripts) {
    if (script.textContent.includes("var o =")) {
      const match = script.textContent.match(/"image":"(.*?)"/);
      if (match) return match[1].replace(/\\u002F/g, "/");
    }
  }
  return null;
}

async function downloadImage(url, filePath) {
  const res = await fetch(url);
  if (!res.ok) return false;

  const buffer = await res.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(buffer));
  return true;
}

for (const game of games) {
  if (game.thumbnail) continue;

  const slug = slugify(game.title, { lower: true });
  const filePath = path.join(OUTPUT_DIR, `${slug}.jpg`);

  if (fs.existsSync(filePath)) {
    game.thumbnail = `thumbnails/${slug}.jpg`;
    continue;
  }

  console.log(`🔍 Finding image for: ${game.title}`);

  try {
    const imgUrl = await searchImage(game.title);
    if (!imgUrl) {
      console.log("❌ No image found");
      continue;
    }

    const success = await downloadImage(imgUrl, filePath);
    if (success) {
      game.thumbnail = `thumbnails/${slug}.jpg`;
      console.log("✅ Saved");
    }
  } catch (e) {
    console.log("⚠️ Failed:", e.message);
  }
}

fs.writeFileSync(GAMES_FILE, JSON.stringify(games, null, 2));
console.log("🎉 Done!");
