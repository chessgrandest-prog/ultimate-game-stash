// auto-bing-image-downloader.js
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const fetch = require("node-fetch"); // make sure node-fetch v2 is installed

// Paths
const GAMES_JSON_PATH = "./games.json";
const IMAGE_FOLDER = "./images";
const NEW_JSON_PATH = "./games+img.json"; // new file with images
const CONCURRENCY = 5; // number of games to process simultaneously

// Ensure images folder exists
if (!fs.existsSync(IMAGE_FOLDER)) fs.mkdirSync(IMAGE_FOLDER);

// Load games.json
const games = JSON.parse(fs.readFileSync(GAMES_JSON_PATH, "utf-8"));

// Helper to save games+img.json progressively
function saveGamesJSON() {
  fs.writeFileSync(NEW_JSON_PATH, JSON.stringify(games, null, 2));
}

// Function to download an image with retries using next image on failure
async function downloadImageWithRetry(page, game, attempts = 3) {
  try {
    const searchQuery = `${game.title} video game`;
    const searchUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(
      searchQuery
    )}&qft=+filterui:imagesize-wallpaper&form=IRFLTR`;

    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 20000 });

    // Get all image URLs from Bing's JSON metadata
    const imageUrls = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll("a.iusc"));
      return elements.map(el => {
        try {
          const m = JSON.parse(el.getAttribute("m"));
          return m.murl;
        } catch {
          return null;
        }
      }).filter(url => url);
    });

    if (imageUrls.length === 0) {
      console.log(`⚠️ No images found for ${game.title}`);
      return false;
    }

    // Try each image up to `attempts` times
    for (let i = 0; i < Math.min(attempts, imageUrls.length); i++) {
      const imageUrl = imageUrls[i];
      try {
        const ext = path.extname(new URL(imageUrl).pathname).split("?")[0] || ".jpg";
        const filename = path.join(
          IMAGE_FOLDER,
          `${game.title.replace(/[^a-z0-9]/gi, "_")}${ext}`
        );

        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        const buffer = await response.buffer();
        fs.writeFileSync(filename, buffer);

        console.log(`✅ Downloaded: ${filename}`);
        game.image = filename;

        // Save updated JSON progressively
        saveGamesJSON();

        return true; // success
      } catch (err) {
        console.log(`❌ Error downloading image ${i + 1} for ${game.title}: ${err.message}`);
        if (i === Math.min(attempts, imageUrls.length) - 1) {
          console.log(`⚠️ Giving up on ${game.title} after ${i + 1} failed images.`);
          return false;
        } else {
          console.log(`🔄 Trying next image...`);
        }
      }
    }
  } catch (err) {
    console.log(`❌ Error for ${game.title}: ${err.message}`);
    return false;
  }
}

// Main function
(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const pages = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    );
    pages.push(page);
  }

  let index = 0;
  async function processNext(page) {
    if (index >= games.length) return;
    const game = games[index++];
    await downloadImageWithRetry(page, game, 3);
    await processNext(page); // recursive call to pick next game
  }

  // Run all pages concurrently
  await Promise.all(pages.map(page => processNext(page)));

  console.log(`\nAll done! Updated file written to ${NEW_JSON_PATH}`);
  await browser.close();
})();
