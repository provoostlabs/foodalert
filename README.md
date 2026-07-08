# FoodAlert 🔔

> Voedselveiligheid alerts voor Nederland. Direct op je telefoon wanneer een supermarkt een product terugroept.

---

## 🚀 Snel Starten (voor ontwikkelaars)

### Vereisten
- [Node.js](https://nodejs.org/) (v18+)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Een smartphone met Expo Go app (iOS/Android)

### Stappen

```bash
# 1. Clone dit project
cd foodalert

# 2. Installeer dependencies
npm install

# 3. Start de development server
npx expo start

# 4. Scan de QR-code met de Expo Go app op je telefoon
```

---

## 📱 App structuur

```
foodalert/
├── App.js                          # Entry point + navigatie
├── app.json                        # Expo configuratie
├── package.json                    # Dependencies
├── app/
│   ├── screens/
│   │   ├── OnboardingSupermarkets.js   # Stap 1: Kies supermarkten
│   │   ├── OnboardingTags.js           # Stap 2: Kies product-tags
│   │   ├── HomeScreen.js               # Meldingen overzicht
│   │   └── SettingsScreen.js           # Instellingen
│   └── utils/
│       └── firebase.js                 # Firebase config (placeholder)
├── backend/
│   └── scraper.py                      # NVWA + Productwaarschuwing scraper
└── assets/                             # Iconen, splash screen
```

---

## 🔧 Firebase Setup (vereist voor push notificaties)

1. Maak een project aan op [Firebase Console](https://console.firebase.google.com/)
2. Noteer je `projectId`, `apiKey`, etc.
3. Vul deze in in `app/utils/firebase.js`
4. Voor push notificaties: volg [Expo's FCM guide](https://docs.expo.dev/push-notifications/push-notifications-setup/)
5. Download de `serviceAccountKey.json` voor de backend scraper

---

## 🕷️ Scraper draaien

```bash
cd backend

# Installeer dependencies
pip install requests beautifulsoup4

# Draai de scraper (test-modus)
python scraper.py

# Voor productie: configureer Firebase Admin SDK en uncomment de Firestore code
```

---

## 🏗️ App Store + Play Store publiceren

### EAS Build (Expo's cloud build service)

```bash
# Installeer EAS CLI
npm install -g eas-cli

# Login bij Expo
eas login

# Configureer build
eas build:configure

# iOS build
eas build --platform ios

# Android build
eas build --platform android
```

De builds worden in de cloud gemaakt. Je krijgt een `.ipa` (iOS) en `.aab` (Android) terug die je naar de App Store en Play Store kunt uploaden.

---

## 🎯 Hoe het werkt

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│  Scraper    │ ───> │   Firestore  │ ───> │  App        │
│  (1x/uur)   │      │  Database    │      │  Push       │
└─────────────┘      └──────────────┘      └─────────────┘
```

1. **Scraper** checkt elk uur NVWA + Productwaarschuwing.nl
2. **Nieuwe recalls** worden opgeslagen in Firestore
3. **App** ontvangt push notificatie als de recall matcht met jouw supermarkten + product-tags
4. **Je ziet het direct** in de app, vaak 2-6 uur eerder dan via andere kanalen

---

## 📝 Feature roadmap

- [x] Supermarkt selectie onboarding
- [x] Product-tags (vrije tekst)
- [x] Meldingen overzicht
- [x] Instellingen scherm
- [ ] Firebase Firestore integratie
- [ ] Push notificaties (FCM)
- [ ] NVWA scraper (productie)
- [ ] Productwaarschuwing.nl scraper (productie)
- [ ] Product-tag matching (fuzzy search)
- [ ] "Gelezen" status per melding
- [ ] Melding delen (WhatsApp, etc)
- [ ] Dark mode
- [ ] Optionele account (Google/Apple login)
- [ ] White-label voor supermarkten (B2B)

---

## 📄 Licentie

MIT License — gebruik het vrijelijk voor je eigen projecten!

---

> **Gemaakt voor de Nederlandse markt** 🇳🇱 | Veilig eten begint bij het weten.
