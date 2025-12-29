import json
import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import quote
from collections import defaultdict

# ===============================
# CONFIG
# ===============================

INPUT_FILE = "games.json"
OUTPUT_FILE = "games_with_categories.json"
RAWG_API_KEY = "5fc0e1f6a3fc49ee84892309677b0ed4"

HEADERS = {"User-Agent": "Mozilla/5.0"}

# ===============================
# CATEGORY KEYWORDS
# ===============================

KEYWORD_MAP = {
    "puzzle": [
        "puzzle", "logic", "brain", "thinking", "strategy puzzle",
        "sliding block", "tile", "match", "merge", "2048",
        "block puzzle", "number puzzle", "grid", "maze",
        "word puzzle", "sudoku", "crossword", "pattern",
        "physics puzzle", "mind game", "iq", "riddle",
        "pipe", "connect", "rotate", "shape"
    ],

    "action": [
        "action", "fast paced", "combat", "fight", "brawl",
        "beat em up", "hack and slash", "arena",
        "reaction", "reflex", "skill based",
        "platformer", "jump", "dash", "melee"
    ],

    "adventure": [
        "adventure", "exploration", "story",
        "quest", "journey", "open world",
        "narrative", "character driven",
        "puzzle adventure", "point and click",
        "dialogue", "mystery"
    ],

    "shooting": [
        "shoot", "shooter", "shooting", "gun",
        "third person shooter", "battle royale",
        "sniper", "weapon", "firearm",
        "aim", "cover shooter", "tactical shooter",
        "bullet", "reload"
    ],

    "fps": [
        "fps", "first person shooter",
        "first-person", "first person",
        "doom-like", "arena shooter"
    ],

    "sports": [
        "sport", "sports",
        "soccer", "football", "basketball",
        "tennis", "golf", "hockey",
        "baseball", "volleyball", "cricket",
        "rugby", "boxing", "mma",
        "pool", "8 ball", "billiards",
        "bowling", "ping pong",
        "olympic", "match", "tournament"
    ],

    "car": [
        "car", "cars", "racing", "driving",
        "race", "drift", "formula",
        "rally", "track", "vehicle",
        "motor", "traffic", "parking",
        "speed", "garage"
    ],

    "card": [
        "card", "cards",
        "solitaire", "poker", "blackjack",
        "hearts", "spades", "klondike",
        "deck", "tabletop", "casino"
    ],

    "casual": [
        "casual", "relaxing", "simple",
        "easy", "fun", "time killer",
        "short game", "lighthearted",
        "endless", "tap"
    ],

    "clicker": [
        "clicker", "idle",
        "incremental", "tap game",
        "auto click", "grind",
        "resource generator"
    ],

    "escape": [
        "escape", "escape room",
        "locked room", "find the key",
        "solve clues", "hidden object",
        "break out"
    ],

    "horror": [
        "horror", "scary", "creepy",
        "fear", "dark", "terror",
        "survival horror", "jumpscare",
        "psychological horror"
    ],

    ".io": [
        ".io", "io game",
        "browser multiplayer",
        "real-time multiplayer"
    ],

    "minecraft": [
        "minecraft", "block building",
        "voxel", "craft", "survival sandbox"
    ],

    "tower defense": [
        "tower defense", "td",
        "defense game", "waves",
        "turret", "base defense",
        "enemy waves", "upgrade towers"
    ],

    "rpg": [
        "rpg", "role playing",
        "role-playing", "level up",
        "experience points", "xp",
        "stats", "skills", "quest",
        "loot", "character progression"
    ],

    "simulation": [
        "simulation", "simulator",
        "sim", "management",
        "sandbox", "realistic",
        "life sim", "physics based",
        "business", "tycoon"
    ],

    "strategy": [
        "strategy", "tactical",
        "turn based", "turn-based",
        "real time strategy", "rts",
        "planning", "resource management",
        "chess", "board game"
    ],

    "arcade": [
        "arcade", "classic",
        "retro", "high score",
        "coin op", "old school",
        "score attack"
    ],

    "multiplayer": [
        "multiplayer", "online",
        "co-op", "coop",
        "versus", "pvp",
        "matchmaking"
    ],

    "2 player": [
        "2 player", "two player",
        "local multiplayer",
        "split screen", "duel",
        "head to head", "1v1"
    ]
}


# ===============================
# UTILS
# ===============================

def clean_text(text):
    return re.sub(r"\s+", " ", text.lower())

def score_text(text, weight):
    scores = {}
    text = clean_text(text)
    for cat, keywords in KEYWORD_MAP.items():
        for kw in keywords:
            if re.search(rf"\b{re.escape(kw)}\b", text):
                scores[cat] = scores.get(cat, 0) + weight
    return scores

def empty_sources():
    return {"wiki": 0, "rawg": 0, "ddg": 0, "title": 0, "url": 0}

# ===============================
# WIKIPEDIA
# ===============================

def wikipedia_text(title):
    try:
        url = f"https://en.wikipedia.org/wiki/{quote(title.replace(' ', '_'))}"
        r = requests.get(url, headers=HEADERS, timeout=10)
        if r.status_code != 200:
            return ""
        soup = BeautifulSoup(r.text, "html.parser")
        return " ".join(p.get_text() for p in soup.select("p")[:5])
    except:
        return ""

# ===============================
# DUCKDUCKGO
# ===============================

def duckduckgo_text(title):
    try:
        url = f"https://html.duckduckgo.com/html/?q={quote(title + ' game')}"
        r = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(r.text, "html.parser")

        parts = []
        for res in soup.select(".result"):
            t = res.select_one(".result__a")
            s = res.select_one(".result__snippet")
            if t:
                parts.append(t.get_text())
            if s:
                parts.append(s.get_text())

        return " ".join(parts)
    except:
        return ""

# ===============================
# RAWG
# ===============================

def rawg_text(title):
    try:
        url = (
            f"https://api.rawg.io/api/games?"
            f"search={quote(title)}&key={RAWG_API_KEY}"
        )
        r = requests.get(url, timeout=10)
        data = r.json()

        if not data.get("results"):
            return ""

        game = data["results"][0]
        parts = []

        for g in game.get("genres", []):
            parts.append(g["name"])
        for t in game.get("tags", []):
            parts.append(t["name"])

        return " ".join(parts)
    except:
        return ""

# ===============================
# CLASSIFIER
# ===============================

def classify_game(title, url, debug=False):
    scores = defaultdict(empty_sources)

    def add(source, text, weight):
        for cat, val in score_text(text, weight).items():
            scores[cat][source] += val

    add("wiki", wikipedia_text(title), 4)
    add("rawg", rawg_text(title), 4)
    add("ddg", duckduckgo_text(title), 3)
    add("title", title, 2)
    add("url", url, 1)

    totals = {c: sum(src.values()) for c, src in scores.items()}

    if not totals:
        return "other", []

    max_score = max(totals.values())
    tied = [c for c, s in totals.items() if s == max_score]

    if len(tied) == 1:
        winner = tied[0]
    else:
        winner = max(
            tied,
            key=lambda c: (
                scores[c]["wiki"],
                scores[c]["rawg"],
                scores[c]["ddg"],
                scores[c]["title"],
                scores[c]["url"],
                -len(c)
            )
        )

    if debug:
        print(f"\n=== DEBUG: {title} ===")
        for c in totals:
            print(f"{c}: total={totals[c]} sources={scores[c]}")
        print(f"FINAL CATEGORY ➜ {winner}")

    return winner, list(totals.keys())

# ===============================
# RUN
# ===============================

def main():
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        games = json.load(f)

    for game in games:
        title = game.get("title", "")
        url = game.get("url", "")
        main_cat, cats = classify_game(title, url, debug=True)

        game["main_category"] = main_cat
        game["category"] = cats

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(games, f, indent=2)

    print(f"\n✅ Saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
