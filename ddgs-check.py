from ddgs import DDGS

title = "1 v 1 LOL video game"
with DDGS() as ddgs:
    results = ddgs.text(title, max_results=5)
    for r in results:
        print("Title:", r.get("title"))
        print("Body:", r.get("body"))
        print("Link:", r.get("href"))
        print("---")
