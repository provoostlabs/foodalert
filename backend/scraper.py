#!/usr/bin/env python3
"""
FoodAlert Scraper → Supabase
Monitert NVWA en productwaarschuwing.nl voor nieuwe voedselveiligheid meldingen.
Schrijft alleen nieuwe recalls naar Supabase.
"""

import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone
import json
import re
import sys

# Supabase config
SUPABASE_URL = "https://jucfctlwxmgybnvujcny.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1Y2ZjdGx3eG1neWJudnVqY255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NTM2MTIsImV4cCI6MjA5OTAyOTYxMn0.zVxkENunDKh2PCWFhY4VIWr-6Gn4qL4yoQEeK66qA6E"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

SOURCES = {
    "nvwa": "https://www.nvwa.nl/actueel/veiligheidswaarschuwingen/overzicht",
    "productwaarschuwing": "https://www.productwaarschuwing.nl/",
}

SUPERMARKT_KEYWORDS = {
    "ah": ["albert heijn", "ah "],
    "jumbo": ["jumbo"],
    "lidl": ["lidl"],
    "aldi": ["aldi"],
    "plus": ["plus"],
    "dirk": ["dirk"],
    "coop": ["coop"],
    "hoogvliet": ["hoogvliet"],
    "dekamarkt": ["dekamarkt", "deka markt"],
    "spar": ["spar"],
    "vomar": ["vomar"],
    "poiesz": ["poiesz"],
    "ekoplaza": ["ekoplaza", "eko plaza"],
    "amazingoriental": ["amazing oriental"],
}


def detect_supermarket(text):
    text_lower = text.lower()
    found = []
    for sm_id, keywords in SUPERMARKT_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                found.append(sm_id)
                break
    return found


def is_food_related(text):
    text_lower = text.lower()
    food_keywords = [
        "terugroep", "terugroepactie", "voedsel", "product", "bacterie",
        "allergeen", "salmonella", "listeria", "e-coli", "besmetting",
        "melk", "brood", "kaas", "vlees", "groente", "fruit", "chocolade",
        "noten", "pinda", "yoghurt", "salade", "gehakt", "kip", "rund",
        "hondenvoer", "kattenvoer", "voeding", "diepvries", "pasta",
        "worst", "saucijs", "biefstuk", "hamburger", "schnitzel",
        "mayo", "sauce", "dressing", "oesters", "vis", "garnalen",
        "worst", "paté", "pastei", "croissant", "bagel", "wrap",
    ]
    non_food = [
        "speelgoed", "powerbank", "step", "fiets", "schoenen", "kleding",
        "elektronica", "accu", "lamp", "kraan", "autostoel", "bordspel",
        "projector", "contactgrill", "helm", "drinkglas", "kinderwagen",
        "wandelschoen", "grill", "power", "spatel", "tas", "kabel",
    ]
    has_food = any(kw in text_lower for kw in food_keywords)
    has_non_food = any(kw in text_lower for kw in non_food)
    return has_food and not has_non_food


def fetch_existing_titles():
    """Haal alle bestaande titels op uit Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/recalls?select=title"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        return {item["title"].lower().strip() for item in data if item.get("title")}
    except Exception as e:
        print(f"ERROR fetching existing: {e}")
        return set()


def save_to_supabase(recalls):
    """Insert alleen nieuwe recalls in Supabase."""
    if not recalls:
        print("Geen nieuwe recalls om op te slaan.")
        return 0

    url = f"{SUPABASE_URL}/rest/v1/recalls"
    count = 0
    for recall in recalls:
        try:
            resp = requests.post(url, headers=HEADERS, json=recall, timeout=30)
            if resp.status_code in (201, 204):
                count += 1
            else:
                print(f"  Insert failed: {resp.status_code} - {resp.text[:200]}")
        except Exception as e:
            print(f"  Insert error: {e}")
    return count


def fetch_productwaarschuwing():
    try:
        resp = requests.get(
            SOURCES["productwaarschuwing"],
            timeout=30,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
        )
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        recalls = []
        articles = soup.find_all("article", class_=re.compile("post|recall"))

        for article in articles[:30]:
            title_elem = article.find("h2") or article.find("a")
            if not title_elem:
                continue
            title = title_elem.get_text(strip=True)
            link = title_elem.get("href", "")
            if link and not link.startswith("http"):
                link = "https://www.productwaarschuwing.nl" + link

            supermarkets = detect_supermarket(title)
            date_elem = article.find("time") or article.find(text=re.compile(r"\d{1,2}\s+[a-zA-Z]+\s+\d{4}"))
            date_str = date_elem.get_text(strip=True) if date_elem else datetime.now().strftime("%d %B %Y")

            if not is_food_related(title):
                continue

            recalls.append({
                "title": title,
                "supermarkets": ",".join(supermarkets),
                "product": title.replace("Terugroepactie ", "").strip(),
                "reason": "Zie productwaarschuwing.nl voor details.",
                "date": date_str,
                "severity": "medium",
                "source": "productwaarschuwing",
            })
        return recalls
    except Exception as e:
        print(f"ERROR fetching productwaarschuwing.nl: {e}")
        return []


def main():
    print(f"\n{'='*60}")
    print(f"FoodAlert Scraper → Supabase | {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")

    print("Ophalen bestaande recalls...")
    existing = fetch_existing_titles()
    print(f"  {len(existing)} titels al in database.")

    print("\nScrapen productwaarschuwing.nl...")
    new_recalls = fetch_productwaarschuwing()
    print(f"  {len(new_recalls)} food recalls gevonden.")

    # Filter alleen nieuwe
    unique_new = []
    for r in new_recalls:
        key = r["title"].lower().strip()
        if key not in existing:
            unique_new.append(r)
            existing.add(key)

    print(f"  {len(unique_new)} nieuwe recalls.")

    if unique_new:
        print("\nOpslaan in Supabase...")
        saved = save_to_supabase(unique_new)
        print(f"  {saved} opgeslagen.")
    else:
        print("\nGeen nieuwe recalls — niets opgeslagen.")

    print(f"\n{'='*60}")
    print("Klaar!")
    print(f"{'='*60}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
