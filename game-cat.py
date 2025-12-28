import json
import requests
import time
import re
import string
from bs4 import BeautifulSoup
from datetime import datetime
from difflib import get_close_matches

# ================= CONFIG =================
HEADERS = {"User-Agent": "Mozilla/5.0"}
CACHE_FILE = "genre_cache.json"

# ================= TAXONOMY =================
CRAZYGAMES_TAXONOMY = {
    "Action": ["action", "combat", "battle", "fighting", "beat em up"],
    "Shooter": ["shooter", "fps", "first-person shooter", "third-person shooter", "battle royale"],
    "Adventure": ["adventure", "sandbox", "open world", "quest", "exploration"],
    "Platformer": ["platformer", "jump and run"],
    "Puzzle": ["puzzle", "logic", "brain"],
    "Arcade": ["arcade", "casual", "classic"],
    "Racing": ["racing", "driving", "kart"],
    "Sports": ["sports", "soccer", "basketball", "football"],
    "Strategy": ["strategy", "tower defense", "td", "rts"],
    "Simulation": ["simulation", "simulator", "tycoon", "management"],
    "Idle": ["idle", "incremental"],
    "Clicker": ["clicker"],
    "Multiplayer": ["multiplayer", "online", "co-op", "pvp"],
    "IO": ["io game"],
    "Horror": ["horror", "scary", "creepy"],
    "Music": ["music", "rhythm"],
    "Retro": ["retro", "pixel", "8-bit"]
}

# ================= CACHE =================
try:
    with open(CACHE_FILE, "r", encoding="utf-8") as f:
        GENRE_CACHE = json.load(f)
except:
    GENRE_CACHE = {}

# ================= HELPERS =================
def today():
    return datetime.utcnow().strftime("%Y-%m-%d")

def extract_genre_phrases(text):
    patterns = [
        "first-person shooter", "third-person shooter",
        "idle clicker", "tower defense",
        "platformer", "sandbox", "survival",
        "racing", "puzzle", "strategy",
        "simulation", "horror", "adventure",
        "arcade", "multiplayer", "rhythm game",
        "battle royale"
    ]
    found = set()
    text_lower = text.lower()
    for p in patterns:
        if p in text_lower:
            found.add(p)
    return list(found)

# ================= AUTOFIX TITLES =================
def autofix_title(title):
    title_fixed = re.sub(r"([a-z])([A-Z])", r"\1 \2", title)
    title_fixed = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1 \2", title_fixed)
    title_fixed = title_fixed.replace("_", " ").replace("-", " ")
    title_fixed = " ".join(title_fixed.split()).title()
    return title_fixed

def autofix_title_with_fuzzy(title, known_titles):
    title_fixed = autofix_title(title)
    close = get_close_matches(title_fixed, known_titles, n=1, cutoff=0.8)
    if close:
        return close[0]
    return title_fixed

# ================= WIKIPEDIA =================
def get_wikipedia_genres(game_name):
    url = f"https://en.wikipedia.org/wiki/{game_name.replace(' ', '_')}"
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        if r.status_code != 200:
            return []
        soup = BeautifulSoup(r.text, "html.parser")
        genres = []
        infobox = soup.find("table", class_="infobox")
        if infobox:
            for row in infobox.find_all("tr"):
                if "Genre" in row.text:
                    genres += [a.text.strip() for a in row.find_all("a")]
        intro = soup.find("p")
        if intro:
            genres += extract_genre_phrases(intro.text)
        return list(set(genres))
    except:
        return []

# ================= DUCKDUCKGO =================
def duckduckgo_search_data(game_name):
    query = f"{game_name} game genre"
    url = "https://duckduckgo.com/html/?q=" + query.replace(" ", "+")
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(r.text, "html.parser")
        results = soup.select(".result")
        snippets = []
        domains = set()
        for res in results:
            text = res.get_text(" ", strip=True).lower()
            snippets.append(text)
            link = res.find("a", href=True)
            if link:
                domains.add(link["href"])
        return {"count": len(results), "snippets": snippets, "domains": domains}
    except:
        return {"count": 0, "snippets": [], "domains": set()}

# ================= HTML SIGNALS =================
def extract_signals_from_html(url):
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(r.text, "html.parser")
        signals = []
        for meta in soup.find_all("meta"):
            content = meta.get("content", "")
            if content:
                signals.append(content.lower())
        body_text = soup.get_text(" ", strip=True).lower()
        signals.append(body_text[:5000])
        return " ".join(signals)
    except:
        return ""

# ================= NORMALIZATION =================
def normalize_to_crazygames(raw_phrases):
    # Combine all phrases
    text = " ".join(raw_phrases).lower()
    # Remove punctuation
    text = text.translate(str.maketrans("", "", string.punctuation))
    # Split into words for partial matching
    text_words = re.split(r'\s+', text)
    categories = set()
    for cat, signals in CRAZYGAMES_TAXONOMY.items():
        for s in signals:
            s_clean = s.lower().translate(str.maketrans("", "", string.punctuation))
            if s_clean in text_words or s_clean in text:
                categories.add(cat)
    # Auto-add related categories
    if "Shooter" in categories:
        categories.add("Action")
    if "Platformer" in categories:
        categories.add("Action")
    if "Idle" in categories:
        categories.add("Clicker")
    if not categories:
        categories.add("Other")
    return sorted(categories)

# ================= POPULAR =================
def compute_popularity(game_name, wiki_found, search_data):
    score = 0
    text = " ".join(search_data["snippets"])
    if wiki_found:
        score += 3
    if search_data["count"] >= 10:
        score += 2
    if search_data["count"] >= 20:
        score += 3
    if "multiplayer" in text or "online" in text:
        score += 2
    if game_name.lower().endswith(".io"):
        score += 2
    if any(site in " ".join(search_data["domains"]) for site in ["wikipedia", "crazygames", "poki", "itch.io"]):
        score += 2
    return score

# ================= TRENDING =================
def compute_trending(game_name, current_count, text):
    prev = GENRE_CACHE.get(game_name)
    if not prev:
        return False
    prev_count = prev.get("search_count", 0)
    score = 0
    if current_count >= prev_count * 1.5 and current_count >= 10:
        score += 3
    if current_count >= prev_count * 2:
        score += 4
    if any(x in text for x in ["new", "update", "2025", "viral", "trending"]):
        score += 2
    if game_name.lower().endswith(".io"):
        score += 1
    return score >= 4

# ================= MAIN CATEGORIZATION =================
def categorize_game(title, url=None, known_titles=[]):
    raw_title = autofix_title_with_fuzzy(title, known_titles)
    raw = []

    wiki_genres = get_wikipedia_genres(raw_title)
    wiki_found = bool(wiki_genres)
    raw += wiki_genres

    search_data = duckduckgo_search_data(raw_title)
    raw += extract_genre_phrases(" ".join(search_data["snippets"]))

    if url:
        html_text = extract_signals_from_html(url)
        raw += extract_genre_phrases(html_text)

    categories = normalize_to_crazygames(raw)

    popularity_score = compute_popularity(raw_title, wiki_found, search_data)
    if popularity_score >= 6:
        categories.append("Popular")

    trending = compute_trending(raw_title, search_data["count"], " ".join(search_data["snippets"]))
    if trending:
        categories.append("Trending")

    GENRE_CACHE[raw_title] = {
        "categories": sorted(set(categories)),
        "popularity_score": popularity_score,
        "search_count": search_data["count"],
        "last_checked": today()
    }

    return raw_title, GENRE_CACHE[raw_title]["categories"]

# ================= RUN =================
if __name__ == "__main__":
    with open("games.json", "r", encoding="utf-8") as f:
        games = json.load(f)

    KNOWN_TITLES = [autofix_title(game["title"]) for game in games]
    KNOWN_TITLES += [
        "Slither.io", "Surviv.io", "Krunker.io",
        "Paper.io 2", "Stick Fight", "Minecraft",
        "Among Us", "Tetris", "Pac-Man"
    ]

    for i, game in enumerate(games):
        title = game.get("title", "")
        url = game.get("url")
        fixed_title, categories = categorize_game(title, url, KNOWN_TITLES)
        game["title_fixed"] = fixed_title
        game["categories"] = categories
        print(f"{i+1}/{len(games)} {title} -> {fixed_title} -> {categories}")
        time.sleep(1)

    with open("games_categorized.json", "w", encoding="utf-8") as f:
        json.dump(games, f, indent=2, ensure_ascii=False)

    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(GENRE_CACHE, f, indent=2)

    print("✅ Categorization complete.")
