# 🔔 FoodAlert — Development Logboek

**Project:** FoodAlert Nederland  
**Gestart:** Juli 2026  
**Doel:** App die supermarkten monitort voor voedselveiligheidsmeldingen en push-notificaties stuurt naar gebruikers  

---

## 📋 Projectoverzicht

FoodAlert is een React Native app (Expo SDK 54) voor de Nederlandse markt. Gebruikers selecteren supermarkten en producten waarvan ze terugroepacties/recalls willen ontvangen. De app monitort bronnen zoals productwaarschuwing.nl en de NVWA, en stuurt push-notificaties bij nieuwe meldingen.

**Waarom waardevol voor B2B:** Supermarkten willen hun klanten direct bereiken bij een recall. FoodAlert wordt een communicatiekanaal dat 2-6 uur eerder is dan de NVWA.

---

## 🏗️ Architectuur

```
Frontend (App):
├── Expo SDK 54 + React Native 0.79
├── React Navigation (native-stack)
├── React Native Paper (UI componenten)
├── AsyncStorage (lokale voorkeuren)
└── Firebase (push notificaties, backend)

Backend:
├── Python scraper (BeautifulSoup + requests)
├── Sources: productwaarschuwing.nl, NVWA
├── Draait elk uur (cron job)
└── Output: JSON / Firestore (toekomst)

Data Flow:
Scraper → Firestore (toekomst) → FCM Push → App → Filter → Toon melding
```

---

## ✅ Volledige Build History

### Fase 1: Onderzoek & Planning
- **Onderzocht** waar Nederlandse supermarkten recalls publiceren:
  - NVWA (nvwa.nl) — officiële overheid, 2-6 uur vertraging
  - Productwaarschuwing.nl — onafhankelijk, complete archief sinds 2004
  - Eigen supermarkt-pagina's (nieuws.ah.nl, etc.)
  - EU RASFF (webgate.ec.europa.eu)
- **Conclusie:** Geen officiële API beschikbaar → HTML scraping is de enige route
- **Product-tag strategie:** Geen complete productdatabase (te moeilijk, copyright). In plaats daarvan: vaste voedselcategorieën met emoji's. Geen vrije tekst meer na feedback (gebruikers typten "poep" etc.)
- **Geen email/wachtwoord:** Push-notificaties werken via FCM device token. Geen account nodig. Lage drempel = meer downloads = meer B2B waarde.

### Fase 2: Expo Project Setup
- **Probleem:** npm was niet beschikbaar in de Daimon omgeving
- **Fix:** Node.js runtime gevonden bij `C:\Users\User0x\AppData\Local\Programs\kimi-desktop\resources\resources\runtime\node.exe`
- **package.json** gemaakt met Expo SDK 54 dependencies
- **app.json** geconfigureerd voor iOS + Android

### Fase 3: Firebase Configuratie (placeholder)
- `app/utils/firebase.js` gemaakt met placeholder configuratie
- De eigenlijke Firebase setup moet nog handmatig via console.firebase.google.com

### Fase 4: Python Scraper
- **Backend:** `backend/scraper.py` gebouwd
- Scraped productwaarschuwing.nl + NVWA
- Detecteert supermarkt uit titel (keyword matching)
- Filtert op voedsel-gerelateerde meldingen (non-food wordt uitgesloten)
- Dedupliceert op titel
- Slaat op als JSON (productie: Firestore)
- **Testrun:** 23 recalls opgehaald, correcte supermarktdetectie voor Jumbo, AH, Lidl, Plus, Aldi, Dirk

### Fase 5: App Schermen

#### App.js (Entry Point + Navigatie)
- **Issue:** Conditionele Stack.Screen rendering veroorzaakte "REPLACE" crash bij onboarding reset
- **Fix:** Alle schermen altijd in stack, initialRouteName dynamisch gezet op basis van onboarding status

#### OnboardingSupermarkets.js (Stap 1)
- 14 supermarkten als Chips (Albert Heijn, Jumbo, Lidl, ALDI, PLUS, Dirk, Coop, Hoogvliet, DekaMarkt, SPAR, Vomar, Poiesz, Ekoplaza, Amazing Oriental)
- ProgressBar (33%)
- Opslaat in AsyncStorage
- **Later:** Supermarkt logo's toegevoegd als avatar in Chip component
- **Issue:** OnboardingSupermarkets.js bestand was opeens verdwenen (waarschijnlijk door Write conflict)
- **Fix:** Opnieuw aangemaakt

#### OnboardingTags.js (Stap 2)
- **Versie 1:** Vrije tekst input + suggesties (Melk, Brood, Kaas, etc.)
- **Issue:** Gebruiker typte "poep" en andere onzin
- **Versie 2:** Vaste 22 voedselcategorieën in 3-koloms grid met emoji's
- Geen typveld meer, alleen selectie/deselectie
- Emoji's: 🥛🍞🧀🍦🍗🥓🥩🍖🐟🥜🍫🥬🍎🥚🧈🍝🍚🧃🥤🍪🍺🍼
- ProgressBar (66%)
- "Overslaan" button als geen tags geselecteerd

#### HomeScreen.js (Meldingen Overzicht)
- **Issue 1:** Oude mock data (5 items) in plaats van echte recalls
- **Fix:** 14 echte recalls van productwaarschuwing.nl ingeladen
- **Issue 2:** Data structuur mismatch
  - Voorheen: `supermarket: "Jumbo"` (string)
  - Nu: `supermarkets: ["jumbo"]` (array van IDs) — matched met scraper
- **Issue 3:** Filtering werkte niet
  - `matchesUser()` function verkeerd geïmplementeerd (vergeleek string met array)
  - Recalls zonder supermarkt (leeg array) werden verborgen
  - **Fix:** Overlap-checking tussen recall.supermarkets[] en selectedSupermarketIds[]. Recalls zonder supermarkt worden alleen getoond als gebruiker ALLE supermarkten heeft geselecteerd.
- **Issue 4:** Tag matching te strikt — 20 tags geselecteerd = niets zichtbaar
  - **Fix:** Als meer dan 15 van 22 tags geselecteerd, toon alles (gebruiker wil geen filtering)
- **Issue 5:** Supermarkt logo in melding
  - `getSupermarketLogoByName()` werkte niet met nieuwe array structuur
  - **Fix:** `getSupermarketLogoForRecall()` die eerste ID uit array gebruikt
- **Issue 6:** Filterbalk te simpel
  - Voorheen: "13 supermarkten · 🥛🍞🧀"
  - Nu: 🔴 Belletje + "13 supermarkten geselecteerd" + rode "Wijzig" knop + ⚙️ Instellingen icoon
- **Issue 7:** Tekst te groot (16px), knop te groot
  - **Fix:** 14px tekst, knop 20% kleiner (borderRadius 6, padding 10, minHeight 28)
- **Issue 8:** File corruptie door Edit tool
  - `StyleSheet.create` had duplicate entries (wijzigButton, listContent, filterText meerdere keren)
  - **Fix:** Complete file herschreven met Write (clean slate)

#### SettingsScreen.js (Instellingen)
- **Issue 1:** Geen terug-knop → gebruiker bleef vastzitten
- **Fix:** Appbar.Header met BackAction toegevoegd
- **Issue 2:** Gebruiker kon "poep" toevoegen als tag via dialog
- **Fix:** Vrije tekst input verwijderd, vervangen door inline tag-picker grid (zelfde 22 emoji-tags als onboarding)
- **Issue 3:** Tag picker niet klikbaar
  - FlatList binnen ScrollView blokkeert touch events
  - **Fix:** FlatList vervangen door gewone View met flexWrap + TouchableOpacity
- **Issue 4:** Tag tekst brak af ("Melk" → "Mel / k")
  - Card component was te smal voor 3 kolommen
  - **Fix:** Width '30%' + aspectRatio 1, tekst fontSize 13
- **Issue 5:** Supermarkt logo's ontbraken in instellingen
  - **Fix:** Logo's toegevoegd als avatar in Chip component

### Fase 6: Assets
- **Issue:** expo-asset package ontbrak → crash bij opstarten
- **Fix:** toegevoegd aan package.json + opnieuw npm install
- **Issue:** Asset bestanden ontbraken (icon.png, splash.png, etc.)
- **Fix:** Placeholder afbeeldingen gegenereerd via Python/PIL (rode achtergrond, witte tekst)
- **Later:** Gebruiker leverde eigen logo's (14 supermarkten in 40x40px PNG)
- **Later:** Gebruiker leverde foodalert app logo → vervangen alle assets (icon, splash, adaptive-icon, favicon)
- **Issue:** bell-icon.png voor filterbalk moest apart gekopieerd worden

### Fase 7: Expo SDK & Compatibility
- **Issue:** Expo Go op iPhone was SDK 54, project was SDK 52
- **Fix:** package.json geüpgrade naar SDK 54, react 18.3.1 → 19.0.0
- **Issue:** React 19 vereiste door react-native 0.79.1, maar package.json had 18.3.1
- **Fix:** React geüpgrade naar 19.0.0
- **Issue:** `SafeAreaView` deprecated in Expo SDK 54 (verwijderd uit react-native)
- **Fix:** Alle 4 schermen geüpdate om `SafeAreaView` uit `react-native-safe-area-context` te importeren
- **Issue:** `react-native-vector-icons` deprecated warning
- **Status:** Niet gefixt, niet blocker voor MVP

### Fase 8: Data Structuur (Belangrijke Architectuur Keuze)
- **Recall structuur (scraper output):**
  ```json
  {
    "id": "1",
    "title": "Terugroepactie Jumbo Lezziz Rundergehakt",
    "supermarkets": ["jumbo"],
    "product": "Lezziz Rundergehakt",
    "reason": "Mogelijk Salmonella bacterie.",
    "date": "30 juni 2026",
    "severity": "high"
  }
  ```
- **User preferences (AsyncStorage):**
  ```json
  {
    "@foodalert_supermarkets": ["ah", "jumbo", "lidl"],
    "@foodalert_tags": ["kip", "rundvlees", "vleeswaren"],
    "@foodalert_onboarded": "true",
    "@foodalert_notifications": "true"
  }
  ```
- **Supermarkt mapping (SupermarketLogos.js):**
  - ID → naam → kleur → logo asset
  - Statische `require()` voor elke logo (React Native beperking)

---

## 🐛 Bugs Overzicht (Gefixt)

| Bug | Impact | Fix |
|-----|--------|-----|
| expo-asset ontbrak | App startte niet | Toegevoegd aan package.json |
| Assets ontbraken | Crash bij opstarten | Python-generated placeholders |
| OnboardingSupermarkets.js verdwenen | Module not found crash | Opnieuw aangemaakt |
| SafeAreaView deprecated | Wit scherm/crash | Geïmporteerd uit safe-area-context |
| SDK mismatch (52 vs 54) | "Project incompatible" | Upgrade naar SDK 54 |
| React 18 vs 19 conflict | npm install faalde | React 19.0.0 |
| Data structuur mismatch | Filtering werkte niet | supermarkets[] array i.p.v. string |
| Tag matching te strikt | Geen meldingen bij 20 tags | >=15 tags = toon alles |
| Recalls zonder supermarkt verborgen | Tjendrawasih Bapao niet zichtbaar | Toon alleen als alle SM geselecteerd |
| Geen terug-knop in Settings | Gebruiker vast | Appbar.BackAction |
| Tag picker niet klikbaar | Kon tags niet selecteren | FlatList → View + TouchableOpacity |
| Tag tekst brak af | "Mel / k" | Width 30%, aspectRatio 1 |
| Vrije tekst tags | "poep" mogelijk | Vaste 22 categorieën |
| File corruptie (duplicates) | Stylesheet crash | Complete file herschreven |
| Supermarkt logo matching | Logo's niet zichtbaar | Nieuwe helper function met array index |
| Filterbalk te simpel | Gebruiker wilde design | Belletje + counter + Wijzig knop |

---

## 🎯 Volgende Stappen (TODO)

### Hoog prio:
1. **Firebase setup** — Echte project aanmaken, API keys invullen, Firestore schema
2. **Push notificaties** — FCM configureren, testmelding versturen
3. **Scraper → Firestore** — Python scraper laten schrijven naar echte database
4. **Realtime sync** — App moet nieuwe recalls automatisch ophalen
5. **Product-tag matching verbeteren** — "Hondenvoer" matched niet op "Hondenvoer Lam-Pasta-Groente" als tag "hondenvoer" is (geen fuzzy matching)

### Medium prio:
6. App icon en splash screen optimaliseren (resoluties, sizes)
7. Dark mode
8. Melding delen (WhatsApp, email)
9. "Gelezen" status per melding
10. Melding detail scherm (tapt op melding = meer info)

### B2B (verkoop aan supermarkten):
11. White-label mogelijkheid (andere kleuren/logo per keten)
12. Analytics dashboard (hoeveel users per keten, open rates)
13. Priority alerts (supermarkt betaalt voor eerder verzenden)
14. Geofenced targeting (regio-specifieke recalls)

---

## 📁 Bestanden Overzicht

```
foodalert/
├── App.js                          # Entry point + navigatie
├── app.json                        # Expo configuratie
├── package.json                    # Dependencies (Expo SDK 54)
├── README.md                       # Setup instructies
├── app/
│   ├── screens/
│   │   ├── OnboardingSupermarkets.js
│   │   ├── OnboardingTags.js
│   │   ├── HomeScreen.js
│   │   └── SettingsScreen.js
│   └── utils/
│       ├── firebase.js             # Placeholder config
│       └── SupermarketLogos.js     # Logo mapping + supermarkt data
├── backend/
│   └── scraper.py                  # Python scraper
└── assets/
    ├── icon.png                    # FoodAlert app icon
    ├── splash.png                  # Splash screen
    ├── adaptive-icon.png           # Android adaptive icon
    ├── favicon.png                 # Web favicon
    ├── bell-icon.png               # Filterbalk belletje
    └── supermarkets/               # 14 supermarkt logo's (40x40px)
        ├── albertheijn.png
        ├── jumbo.png
        ├── lidl.png
        ├── aldi.png
        ├── plus.png
        ├── dirk.png
        ├── coop.png
        ├── hoogvliet.png
        ├── dekamarkt.png
        ├── spar.png
        ├── vomar.png
        ├── poiesz.png
        ├── ekoplaza.png
        └── amazingoriental.png
```

---

## 🧠 Lessons Learned

1. **React Native requires** zijn statisch — je kunt geen dynamische `require('./assets/' + id + '.png')` doen. Elke asset moet expliciet geïmporteerd worden.
2. **FlatList binnen ScrollView** is een anti-pattern. Touch events worden geblokkeerd. Gebruik gewone `View` met `flexWrap` of `numColumns` met een render functie buiten ScrollView.
3. **Expo SDK upgrades** zijn non-trivial. SDK 52 → 54 vereiste React 18 → 19, en SafeAreaView werd verwijderd.
4. **Edit tool** kan files corrupten met duplicate entries bij meerdere achtereenvolgende edits. **Write** tool is veiliger voor grote veranderingen.
5. **Geen vrije tekst input** voor tags — gebruikers vullen altijd onzin in. Vaste categorieën zijn beter.
6. **App Store / Play Store** — nog niet begonnen. EAS Build nodig voor .ipa en .aab. Firebase setup eerst.
7. **Scraper vs App data** — de scraper en app moeten dezelfde data structuur gebruiken. Wijzigingen in de scraper vereisen aanpassingen in de app.

---

*Laatste update: Juli 2026*  
*Volgende focus: Firebase backend + push notificaties*
