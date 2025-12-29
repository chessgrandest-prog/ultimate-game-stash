const fs = require('fs');
const path = require('path');

// CONFIG: your GitHub repo info
const GITHUB_USER = 'chessgrandest-prog';
const GITHUB_REPO = 'ultimate-game-stash';
const BRANCH = 'games-site';
const IMAGE_FOLDER = 'games-site/images'; // folder in your repo where images are stored

// Read original games.json
const gamesPath = './games.json';
const gamesData = JSON.parse(fs.readFileSync(gamesPath, 'utf8'));

// Update image paths
const updatedGames = gamesData.map(game => {
  if (game.image) {
    // Normalize backslashes to forward slashes
    const fileName = path.basename(game.image);
    game.image = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${BRANCH}/${IMAGE_FOLDER}/${fileName}`;
  }
  return game;
});

// Write new JSON
fs.writeFileSync('./games+img.json', JSON.stringify(updatedGames, null, 2));
console.log('✅ Done! New file: games+img.json');
