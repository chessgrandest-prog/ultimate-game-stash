const fs = require("fs");
const path = require("path");

const INPUT_FILE = "games.json";
const OUTPUT_FILE = "games.updated.json";
const TITLES_FILE = "names.txt";

// Parse "Title: filename.html" file
function loadTitleMap(file) {
  const map = {};
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim() || !line.includes(":")) continue;

    const [title, fileName] = line.split(":").map(s => s.trim());
    map[fileName] = title;
  }

  return map;
}

const TITLE_MAP = loadTitleMap(TITLES_FILE);

const data = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));

let updated = 0;

for (const item of data) {
  if (!item.url) continue;

  const filename = decodeURIComponent(
    path.basename(new URL(item.url).pathname)
  );

  if (TITLE_MAP[filename]) {
    item.title = TITLE_MAP[filename];
    updated++;
  }
}

fs.writeFileSync(
  OUTPUT_FILE,
  JSON.stringify(data, null, 2)
);

console.log(`Updated ${updated} titles`);
console.log(`Saved → ${OUTPUT_FILE}`);
