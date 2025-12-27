import fs from "fs";

/* =========================
   FILES
========================= */

const INPUT_FILE = "games.json";
const OUTPUT_FILE = "games.enriched.json";

/* =========================
   SERIES DEFINITIONS
========================= */

const SERIES_DEFINITIONS = {
  "five nights at freddy": {
    series: "Five Nights at Freddy's",
    categories: ["Horror"]
  },
  "fnaf": {
    series: "Five Nights at Freddy's",
    categories: ["Horror"]
  },
  "bloons tower defense": {
    series: "Bloons Tower Defense",
    categories: ["Strategy", "Tower Defense"]
  },
  "btd": {
    series: "Bloons Tower Defense",
    categories: ["Strategy", "Tower Defense"]
  },
  "fifa": {
    series: "FIFA",
    categories: ["Sports"]
  },
  "nba": {
    series: "NBA",
    categories: ["Sports"]
  },
  "achievement unlocked": {
    series: "Achievement Unlocked",
    categories: ["Puzzle", "Platformer"]
  },
  "age of war": {
    series: "Age of War",
    categories: ["Strategy"]
  },
  "adofai": {
    series: "A Dance of Fire and Ice",
    categories: ["Music", "Rhythm"]
  },
  "2048": {
    series: "2048",
    categories: ["Puzzle"]
  },
  "1v1lol": {
    series: "1v1.LOL",
    categories: ["Shooter", "Multiplayer"]
  }
};

/* =========================
   TITLE FIXES
========================= */

const TITLE_FIXES = {
  "adofai": "A Dance of Fire and Ice",
  "fnaf": "Five Nights at Freddy's",
  "btd": "Bloons Tower Defense",
  "nba": "NBA",
  "fifa": "FIFA",
  "1v1lol": "1v1.LOL",
  "achievment unlocked": "Achievement Unlocked",
  "achievement unlocked": "Achievement Unlocked",
  "ageofwar": "Age of War"
};

/* =========================
   HELPERS
========================= */

function extractBaseName(url) {
  return url
    .split("/")
    .pop()
    .replace(".html", "")
    .replace(/^cl/i, "")
    .toLowerCase();
}

function insertSpaces(text) {
  return text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([a-z])([0-9])/g, "$1 $2")
    .replace(/([0-9])([a-z])/g, "$1 $2")
    .replace(/[_\-]+/g, " ")
    .trim();
}

function applyTitleFixes(text) {
  for (const [key, value] of Object.entries(TITLE_FIXES)) {
    if (text.includes(key)) {
      const rest = text.replace(key, "").trim();
      return (value + " " + rest).trim();
    }
  }
  return text;
}

function titleCase(str) {
  return str.replace(/\w\S*/g, w =>
    w.charAt(0).toUpperCase() + w.slice(1)
  );
}

/* =========================
   TITLE GENERATION
========================= */

function generateCleanTitle(game) {
  let text = extractBaseName(game.url);
  text = applyTitleFixes(text);
  text = insertSpaces(text);
  text = text.replace(/\s+/g, " ").trim();
  return titleCase(text);
}

/* =========================
   SERIES + CATEGORY INFERENCE
========================= */

function inferSeriesAndCategories(game) {
  const categories = new Set();
  let series = null;

  const filename = extractBaseName(game.url);
  const combined = `${game.title} ${filename}`.toLowerCase();

  for (const [key, def] of Object.entries(SERIES_DEFINITIONS)) {
    if (combined.includes(key)) {
      series = def.series;
      def.categories.forEach(c => categories.add(c));
    }
  }

  // Generic keyword fallbacks
  if (/clicker|idle/.test(combined)) {
    categories.add("Idle");
    categories.add("Clicker");
  }

  if (/run|dash/.test(combined)) {
    categories.add("Arcade");
  }

  if (/escape|puzzle/.test(combined)) {
    categories.add("Puzzle");
  }

  if (/doom|fps|shooter/.test(combined)) {
    categories.add("Shooter");
  }

  if (/survival/.test(combined)) {
    categories.add("Adventure");
  }

  if (categories.size === 0) {
    categories.add("Arcade");
  }

  return {
    series,
    categories: [...categories]
  };
}

/* =========================
   MAIN
========================= */

const games = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));

for (const game of games) {
  game.title = generateCleanTitle(game);

  const inferred = inferSeriesAndCategories(game);
  game.series = inferred.series;
  game.categories = inferred.categories;
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(games, null, 2));

console.log(`✔ Enriched ${games.length} games`);
console.log(`✔ Output written to ${OUTPUT_FILE}`);
