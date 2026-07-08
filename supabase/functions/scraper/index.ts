import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://jucfctlwxmgybnvujcny.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1Y2ZjdGx3eG1neWJudnVqY255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NTM2MTIsImV4cCI6MjA5OTAyOTYxMn0.zVxkENunDKh2PCWFhY4VIWr-6Gn4qL4yoQEeK66qA6E";

const MONTHS_NL: Record<string, string> = {
  januari: "01", februari: "02", maart: "03", april: "04",
  mei: "05", juni: "06", juli: "07", augustus: "08",
  september: "09", oktober: "10", november: "11", december: "12",
};

const SUPERMARKT_KEYWORDS: Record<string, string[]> = {
  ah: ["albert heijn", "ah "],
  jumbo: ["jumbo"],
  lidl: ["lidl"],
  aldi: ["aldi"],
  plus: ["plus"],
  dirk: ["dirk"],
  coop: ["coop"],
  hoogvliet: ["hoogvliet"],
  dekamarkt: ["dekamarkt", "deka markt"],
  spar: ["spar"],
  vomar: ["vomar"],
  poiesz: ["poiesz"],
  ekoplaza: ["ekoplaza", "eko plaza"],
  amazingoriental: ["amazing oriental"],
  gamma: ["gamma"],
  karwei: ["karwei"],
  decathlon: ["decathlon"],
  tkmaxx: ["tk maxx", "tkmaxx"],
  kik: ["kik "],
};

const NON_FOOD = [
  "step", "elektrische step", "stuurpen", "b'twin", "btwin",
  "barbecue", "gasbarbecue", "plancha", "grill",
  "bordspel", "magnetisch", "black stones",
  "autostoel", "adapter", "kinderwagen", "kinderwagenonderstel",
  "helm", "ruitersporthelm",
  "drinkglas", "glazen",
  "projector", "mini-projector",
  "tas", "opvouwbare tas",
  "wandelschoen", "schoenen",
  "speelgoed", "knuffel", "knuffelkonijn",
  "braadpan", "gietijzeren braadpan", "gietijzeren",
  "contactgrill", "enfinigy",
  "spatel",
  "magneten", "magnetische",
];

const FOOD = [
  "chocolade", "melkchocolade", "caramel", "pesto", "mascarpone",
  "walnoot", "noten", "allergenen", "allergie",
  "gehakt", "rundergehakt", "bapao", "kip", "rund", "vlees",
  "zeesalade", "wakame", "nori", "listeria", "salmonella",
  "croissant", "brood", "worst", "worsten", "bbq", "barbecue worst",
  "hondenvoer", "kattenvoer", "hondenvoeding", "dierenvoer", "voer",
  "oester", "bevroren", "mayo", "mayoneur",
  "groenteschijf", "taart", "caramel crush",
  "groente", "fruit", "vis",
];

function parseDate(dateStr: string): string {
  const parts = dateStr.trim().toLowerCase().split(/\s+/);
  if (parts.length === 3 && MONTHS_NL[parts[1]]) {
    return `${parts[2]}-${MONTHS_NL[parts[1]]}-${parts[0].padStart(2, "0")}`;
  }
  return dateStr;
}

function detectSupermarkets(text: string): string[] {
  const textLower = text.toLowerCase();
  const found: string[] = [];
  for (const [smId, keywords] of Object.entries(SUPERMARKT_KEYWORDS)) {
    for (const kw of keywords) {
      if (textLower.includes(kw)) {
        found.push(smId);
        break;
      }
    }
  }
  return [...new Set(found)];
}

function isFoodRelated(title: string, desc: string): boolean {
  const text = (title + " " + desc).toLowerCase();
  const hasFood = FOOD.some((kw) => text.includes(kw));
  const hasNonFood = NON_FOOD.some((kw) => text.includes(kw));
  if (hasNonFood && !hasFood) return false;
  if (hasFood) return true;
  return !hasNonFood;
}

function determineSeverity(title: string, desc: string): string {
  const text = (title + " " + desc).toLowerCase();
  if (["salmonella", "listeria", "e-coli", "glas", "kanker", "methyleendianiline"].some((kw) => text.includes(kw))) {
    return "high";
  }
  if (["allergenen", "allergie", "noten", "walnoot", "soja"].some((kw) => text.includes(kw))) {
    return "medium";
  }
  return "low";
}

Deno.serve(async (_req) => {
  const startTime = new Date().toISOString();
  let found = 0;
  let inserted = 0;

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // 1. Fetch existing titles
    const { data: existingData, error: existingError } = await supabase
      .from("recalls")
      .select("title");
    if (existingError) throw existingError;
    const existing = new Set(existingData.map((r: any) => r.title.toLowerCase().trim()));

    // 2. Fetch productwaarschuwing.nl
    const resp = await fetch("https://www.productwaarschuwing.nl/", {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const html = await resp.text();

    // 3. Parse HTML with DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const articles = doc.querySelectorAll("article");

    const recalls: any[] = [];
    for (const article of articles) {
      // Find title link
      let titleLink: HTMLAnchorElement | null = null;
      for (const header of article.querySelectorAll("h2, h3, h1")) {
        const link = header.querySelector('a[href*="/20"]');
        if (link) {
          titleLink = link as HTMLAnchorElement;
          break;
        }
      }
      if (!titleLink) {
        const fallback = article.querySelector('a[href*="/20"]');
        if (fallback) titleLink = fallback as HTMLAnchorElement;
      }
      if (!titleLink) continue;

      const href = titleLink.getAttribute("href") || "";
      if (href.includes("#more") || !href) continue;

      const title = titleLink.textContent?.trim() || "";
      if (!title || title.length < 5) continue;

      // Find date
      let dateText = "";
      const timeElem = article.querySelector("time");
      if (timeElem) {
        dateText = timeElem.textContent?.trim() || "";
      } else {
        for (const text of article.textContent?.split("\n") || []) {
          const trimmed = text.trim();
          if (/^\d{1,2}\s+[a-zA-Z]+\s+\d{4}$/.test(trimmed)) {
            dateText = trimmed;
            break;
          }
        }
      }

      // Find description
      let desc = "";
      const content = article.querySelector("div.entry-content, div.post-content, div.content");
      if (content) {
        const texts: string[] = [];
        for (const node of content.childNodes) {
          const t = node.textContent?.trim() || "";
          if (t && t !== "Lees meer!" && t.length > 10 && !t.startsWith("http")) {
            texts.push(t);
          }
        }
        if (texts.length) desc = texts.slice(0, 3).join(" ");
      }

      if (!desc) {
        const allText = article.textContent?.replace(title, "").replace("Lees meer!", "") || "";
        desc = allText.replace(/\s+/g, " ").trim();
      }

      desc = desc.slice(0, 300);
      if (desc.length > 297) desc = desc.slice(0, 297) + "...";

      const parsedDate = parseDate(dateText);

      // Extract product name
      let product = title;
      for (const prefix of ["Terugroepactie ", "Allergenenwaarschuwing "]) {
        if (product.startsWith(prefix)) {
          product = product.slice(prefix.length);
          break;
        }
      }

      const supermarkets = detectSupermarkets(title + " " + desc);

      if (!isFoodRelated(title, desc)) continue;

      recalls.push({
        title,
        supermarkets: supermarkets.join(","),
        product,
        reason: desc,
        date: parsedDate,
        severity: determineSeverity(title, desc),
        source: "productwaarschuwing",
      });
    }

    found = recalls.length;

    // 4. Insert only new ones
    for (const r of recalls) {
      const key = r.title.toLowerCase().trim();
      if (existing.has(key)) continue;

      const { error } = await supabase.from("recalls").insert(r);
      if (!error) {
        inserted++;
        existing.add(key);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: startTime,
        articles_scanned: articles.length,
        food_recalls_found: found,
        new_inserted: inserted,
        total_in_db: existing.size,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message,
        timestamp: startTime,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
