import fs from "fs";

/* =========================
   FILES
========================= */
const INPUT_FILE = "games.enriched.json";
const OUTPUT_FILE = "games.categorized.json";

/* =========================
   SERIES + CATEGORY DEFINITIONS
========================= */
const SERIES_DEFINITIONS = {
  "five nights at freddy": { series: "Five Nights at Freddy's", categories: ["Horror"] },
  "fnaf": { series: "Five Nights at Freddy's", categories: ["Horror"] },
  "bloons tower defense": { series: "Bloons Tower Defense", categories: ["Strategy", "Tower Defense"] },
  "btd": { series: "Bloons Tower Defense", categories: ["Strategy", "Tower Defense"] },
  "fifa": { series: "FIFA", categories: ["Sports"] },
  "nba": { series: "NBA", categories: ["Sports"] },
  "achievement unlocked": { series: "Achievement Unlocked", categories: ["Puzzle", "Platformer"] },
  "age of war": { series: "Age of War", categories: ["Strategy"] },
  "adofai": { series: "A Dance of Fire and Ice", categories: ["Music", "Rhythm"] },
  "2048": { series: "2048", categories: ["Puzzle"] },
  "1v1lol": { series: "1v1.LOL", categories: ["Shooter", "Multiplayer"] }
};

/* =========================
   HELPERS
========================= */
function extractBaseName(url) {
  return url.split("/").pop().replace(".html", "").replace(/^cl/i, "").toLowerCase();
}

/* =========================
   CATEGORY INFERENCE
========================= */
function inferCategories(game) {
  const categories = new Set(game.categories || []);
  let series = game.series || null;

  const filename = extractBaseName(game.url);
  const combined = `${game.title} ${filename}`.toLowerCase();

  // Series override
  for (const [key, def] of Object.entries(SERIES_DEFINITIONS)) {
    if (combined.includes(key)) {
      series = def.series;
      def.categories.forEach(c => categories.add(c));
    }
  }

  // Keyword-based inference
  if (/clicker|idle/.test(combined)) {
    categories.add("Idle");
    categories.add("Clicker");
  }

  if (/run|dash|jump|x/.test(combined)) {
    categories.add("Platformer");
  }

  if (/escape|room|logic|puzzle/.test(combined)) {
    categories.add("Puzzle");
  }

  if (/doom|fps|shooter|gun|bullet/.test(combined)) {
    categories.add("Shooter");
  }

  if (/battle|war|army|strategy|tower/.test(combined)) {
    categories.add("Strategy");
  }

  if (/soccer|nba|fifa|tennis|ball/.test(combined)) {
    categories.add("Sports");
  }

  if (/survival/.test(combined)) {
    categories.add("Adventure");
  }

  // Arcade fallback only for classic patterns
  if (categories.size === 0) {
    if (/score|endless|classic|retro/.test(combined)) {
      categories.add("Arcade");
    } else {
      categories.add("Action"); // safer generic fallback
    }
  }

  return { series, categories: [...categories] };
}

/* =========================
   MAIN
========================= */
const games = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));

for (const game of games) {
  const inferred = inferCategories(game);
  game.series = inferred.series;
  game.categories = inferred.categories;
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(games, null, 2));
console.log(`✔ Processed ${games.length} games`);
console.log(`✔ Output written to ${OUTPUT_FILE}`);
