import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIG ---
const IMAGE_REPO_USER = 'chessgrandest-prog';
const IMAGE_REPO_NAME = 'ultimate-game-stash';
const IMAGE_BRANCH = 'main';
const IMAGE_FOLDER = 'games-site/images'; // folder in your repo with images

// --- LOAD games.json ---
const inputPath = path.join(__dirname, 'games.json');
const outputPath = path.join(__dirname, 'games+img.json');

const gamesData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

// --- UPDATE IMAGE LINKS ONLY ---
const updatedGames = gamesData.map(game => {
  if (game.image) {
    const fileName = path.basename(game.image).replace(/\\/g, '/');
    game.image = `https://raw.githubusercontent.com/${IMAGE_REPO_USER}/${IMAGE_REPO_NAME}/refs/heads/${IMAGE_BRANCH}/${IMAGE_FOLDER}/${fileName}`;
  }
  return game;
});

// --- WRITE NEW JSON ---
fs.writeFileSync(outputPath, JSON.stringify(updatedGames, null, 2), 'utf8');
console.log(`✅ Done! Updated games written to ${outputPath}`);
