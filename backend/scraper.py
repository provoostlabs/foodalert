#!/usr/bin/env python3
"""
FoodAlert Scraper -> Supabase + Push Notifications
Scant productwaarschuwing.nl elke run voor nieuwe food recalls.
Stuurt push notificaties naar gebruikers die de supermarkt/tag volgen.
"""

import requests
from bs4 import BeautifulSoup
from datetime import datetime
import re
import sys

# Supabase config
SUPABASE_URL = "https://jucfctlwxmgybnvujcny.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1Y2ZjdGx3eG1neWJudnVqY255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NTM2MTIsImV4cCI6MjA5OTAyOTYxMn0.zVxkENunDKh2PCWFhY4VIWr-6Gn4qL4yoQEeK66qA6E"

EXPO_PUSH_API = "https://exp.host/--/api/v2/push/send"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

MONTHS_NL = {
    'januari': '01', 'februari': '02', 'maart': '03', 'april': '04',
    'mei': '05', 'juni': '06', 'juli': '07', 'augustus': '08',
    'september': '09', 'oktober': '10', 'november': '11', 'december': '12'
}

SUPERMARKT_KEYWORDS = {
    "ah": ["albert heijn", "ah "], "jumbo": ["jumbo"], "lidl": ["lidl"],
    "aldi": ["aldi"], "plus": ["plus"], "dirk": ["dirk"], "coop": ["coop"],
    "hoogvliet": ["hoogvliet"], "dekamarkt": ["dekamarkt", "deka markt"],
    "spar": ["spar"], "vomar": ["vomar"], "poiesz": ["poiesz"],
    "ekoplaza": ["ekoplaza", "eko plaza"], "amazingoriental": ["amazing oriental"],
    "gamma": ["gamma"], "karwei": ["karwei"], "decathlon": ["decathlon"],
    "tkmaxx": ["tk maxx", "tkmaxx"], "kik": ["kik "],
}

NON_FOOD = [
    "step", "elektrische step", "stuurpen", "b'twin", "btwin",
    "barbecue", "gasbarbecue", "plancha", "grill",
    "bordspel", "magnetisch", "black stones",
    "autostoel", "adapter", "kinderwagen", "kinderwagenonderstel",
    "helm", "ruitersporthelm", "drinkglas", "glazen",
    "projector", "mini-projector", "tas", "opvouwbare tas",
    "wandelschoen", "schoenen", "speelgoed", "knuffel", "knuffelkonijn",
    "braadpan", "gietijzeren braadpan", "gietijzeren",
    "contactgrill", "enfinigy", "spatel", "magneten", "magnetische",
]

FOOD = [
    "chocolade", "melkchocolade", "caramel", "pesto", "mascarpone",
    "walnoot", "noten", "allergenen", "allergie",
    "gehakt", "rundergehakt", "bapao", "kip", "rund", "vlees",
    "zeesalade", "wakame", "nori", "listeria", "salmonella",
    "croissant", "brood", "worst", "worsten", "bbq", "barbecue worst",
    "hondenvoer", "kattenvoer", "hondenvoeding", "dierenvoer", "voer",
    "oester", "bevroren", "mayo", "mayoneur",
    "groenteschijf", "taart", "caramel crush", "groente", "fruit", "vis",
]


def parse_date(date_str):
    parts = date_str.strip().lower().split()
    if len(parts) == 3 and parts[1] in MONTHS_NL:
        return f"{parts[2]}-{MONTHS_NL[parts[1]]}-{parts[0].zfill(2)}"
    return date_str


def detect_supermarkets(text):
    text_lower = text.lower()
    found = []
    for sm_id, keywords in SUPERMARKT_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                found.append(sm_id)
                break
    return list(set(found))


def is_food_related(title, desc):
    text = (title + " " + desc).lower()
    has_food = any(kw in text for kw in FOOD)
    has_non_food = any(kw in text for kw in NON_FOOD)
    if has_non_food and not has_food:
        return False
    if has_food:
        return True
    return not has_non_food


def determine_severity(title, desc):
    text = (title + " " + desc).lower()
    if any(kw in text for kw in ["salmonella", "listeria", "e-coli", "glas", "kanker", "methyleendianiline"]):
        return "high"
    elif any(kw in text for kw in ["allergenen", "allergie", "noten", "walnoot", "soja"]):
        return "medium"
    return "low"


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


def fetch_productwaarschuwing():
    """Scrape productwaarschuwing.nl voor food recalls."""
    try:
        resp = requests.get(
            "https://www.productwaarschuwing.nl/",
            timeout=30,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
        )
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        recalls = []
        articles = soup.find_all("article")

        for article in articles:
            title_elem = None
            for header in article.find_all(["h2", "h3", "h1"]):
                link = header.find("a", href=re.compile(r'/\d{4}/\d{2}/'))
                if link:
                    title_elem = link
                    break

            if not title_elem:
                title_elem = article.find("a", href=re.compile(r'/\d{4}/\d{2}/[^/]+/$'))
            if not title_elem:
                continue

            href = title_elem.get("href", "")
            if "#more" in href or not href:
                continue

            title = title_elem.get_text(strip=True)
            if not title or len(title) < 5:
                continue

            date_text = ""
            time_elem = article.find("time")
            if time_elem:
                date_text = time_elem.get_text(strip=True)
            else:
                for text in article.stripped_strings:
                    match = re.match(r'^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$', text.strip())
                    if match:
                        date_text = text.strip()
                        break

            desc = ""
            content = article.find("div", class_=re.compile("entry-content|post-content|content"))
            if content:
                texts = []
                for elem in content.find_all(string=True):
                    t = elem.strip()
                    if t and t != "Lees meer!" and len(t) > 10 and not t.startswith("http"):
                        texts.append(t)
                if texts:
                    desc = " ".join(texts[:3])

            if not desc:
                all_text = article.get_text(separator=" ", strip=True)
                desc = all_text.replace(title, "").strip()
                desc = re.sub(r'\s+', ' ', desc)
                desc = desc.replace("Lees meer!", "").strip()

            desc = desc.strip()
            if len(desc) > 300:
                desc = desc[:297] + "..."

            parsed_date = parse_date(date_text)
            product = title
            for prefix in ["Terugroepactie ", "Allergenenwaarschuwing "]:
                if product.startswith(prefix):
                    product = product[len(prefix):]
                    break

            supermarkets = detect_supermarkets(title + " " + desc)
            if not is_food_related(title, desc):
                continue

            recalls.append({
                "title": title,
                "supermarkets": ",".join(supermarkets),
                "product": product,
                "reason": desc,
                "date": parsed_date,
                "severity": determine_severity(title, desc),
                "source": "productwaarschuwing",
            })

        return recalls
    except Exception as e:
        print(f"ERROR fetching productwaarschuwing.nl: {e}")
        return []


def save_to_supabase(recalls):
    """Insert alleen nieuwe recalls in Supabase."""
    if not recalls:
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


# ==================== PUSH NOTIFICATIONS ====================

def get_push_tokens():
    """Haal alle push tokens op uit Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/push_tokens?select=*"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"ERROR fetching push tokens: {e}")
        return []


def send_push_notification(token, title, body):
    """Stuur push notificatie via Expo Push API."""
    try:
        resp = requests.post(
            EXPO_PUSH_API,
            json={
                "to": token,
                "title": title,
                "body": body,
                "sound": "default",
                "priority": "high",
            },
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        return resp.status_code == 200
    except Exception as e:
        print(f"  Push send error: {e}")
        return False


def should_notify(token, recall):
    """Check of een token een notificatie moet krijgen voor deze recall."""
    token_sm = token.get("supermarkets", "")
    token_tags = token.get("tags", "")
    recall_sm = recall.get("supermarkets", "")
    
    # Parse
    token_sm_list = [s.strip() for s in token_sm.split(",") if s.strip()] if token_sm else []
    token_tags_list = [t.strip() for t in token_tags.split(",") if t.strip()] if token_tags else []
    recall_sm_list = [s.strip() for s in recall_sm.split(",") if s.strip()] if recall_sm else []
    
    # Supermarket check
    if token_sm_list:
        # Token has specific supermarkets selected
        sm_overlap = any(sm in token_sm_list for sm in recall_sm_list)
        if not sm_overlap and recall_sm_list:
            return False
    
    # Tag check
    if token_tags_list and len(token_tags_list) < 15:
        text = (recall.get("title", "") + " " + recall.get("product", "")).lower()
        tag_match = any(tag.lower() in text for tag in token_tags_list)
        if not tag_match:
            return False
    
    return True


def notify_users(recalls):
    """Stuur push notificaties naar relevante gebruikers."""
    if not recalls:
        return 0

    print("\nPush notificaties voorbereiden...")
    tokens = get_push_tokens()
    if not tokens:
        print("  Geen push tokens gevonden.")
        return 0

    print(f"  {len(tokens)} push tokens gevonden.")
    sent_count = 0

    for recall in recalls:
        title = f"🚨 {recall['title'][:40]}"
        body = recall.get("product", "Nieuwe terugroepactie")
        
        for token in tokens:
            if should_notify(token, recall):
                token_str = token.get("token", "")
                if token_str and send_push_notification(token_str, title, body):
                    sent_count += 1
                    print(f"    -> Sent to {token_str[:30]}...")

    print(f"  {sent_count} notificaties verstuurd.")
    return sent_count


# ==================== MAIN ====================

def main():
    print(f"\n{'='*60}")
    print(f"FoodAlert Scraper -> Supabase | {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")

    print("Ophalen bestaande recalls...")
    existing = fetch_existing_titles()
    print(f"  {len(existing)} titels al in database.")

    print("\nScrapen productwaarschuwing.nl...")
    new_recalls = fetch_productwaarschuwing()
    print(f"  {len(new_recalls)} food recalls gevonden op pagina.")

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
        for r in unique_new:
            print(f"    + {r['title'][:60]}")

        # Stuur push notificaties
        notify_users(unique_new)
    else:
        print("\nGeen nieuwe recalls -- niets opgeslagen.")

    print(f"\n{'='*60}")
    print("Klaar!")
    print(f"{'='*60}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
