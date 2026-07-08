# App Store Submission Checklist

## ✅ Configuratie klaar
- `eas.json` — EAS build profiles aangemaakt
- `app.json` — notification sound placeholder verwijderd (App Store afkeurt 44-byte placeholders)
- `package.json` — firebase dependency verwijderd (we gebruiken Supabase nu), build scripts toegevoegd
- Bundle ID: `nl.foodalert.app`
- App naam: FoodAlert

---

## 📋 Stappen om in App Store te komen

### 1. Apple Developer Program ($99/jaar)
- Ga naar https://developer.apple.com/programs/
- Meld je aan met je Apple ID
- Betaal $99/jaar
- Dit duurt 1-2 dagen voor goedkeuring

### 2. EAS CLI installeren
```bash
npm install -g eas-cli
```

### 3. Inloggen op EAS
```bash
eas login
```
- Gebruik je Expo account (maak aan op expo.dev als je die nog niet hebt)

### 4. EAS project initialiseren (eenmalig)
```bash
eas build:configure
```
- Kies `iOS`
- Dit maakt het project klaar op expo.dev

### 5. iOS Build starten
```bash
npm run build:ios
```
Of direct:
```bash
eas build --platform ios
```

- EAS vraagt om een nieuw credential (Apple Developer certificaat) te genereren
- Kies `Yes` — EAS regelt alles automatisch
- Build duurt ~15-30 minuten in de cloud
- Je krijgt een `.ipa` file of direct submit naar App Store Connect

### 6. App Store Connect listing
- Ga naar https://appstoreconnect.apple.com
- Klik `+` → `New App`
- Vul in:
  - **Name**: FoodAlert
  - **Primary Language**: Dutch
  - **Bundle ID**: nl.foodalert.app
  - **SKU**: foodalert-001
  - **User Access**: Full Access

### 7. App informatie invullen
- **Categorie**: Food & Drink (of News)
- **Beschrijving**: "Ontvang direct een melding als jouw supermarkt een terugroepactie start. Voedselveiligheid, simpel en snel."
- **Keywords**: foodalert, voedselveiligheid, terugroepactie, supermarkt, NVWA
- **Support URL**: (jouw website of email)
- **Marketing URL**: (optioneel)
- **Privacy Policy URL**: (verplicht — minimaal een simpele pagina)

### 8. Screenshots (verplicht)
- **iPhone 6.7"** (1290×2796) — 3-5 screenshots
- **iPhone 6.5"** (1242×2688) — 3-5 screenshots
- **iPhone 5.5"** (1242×2208) — 3-5 screenshots

> Tip: gebruik de iOS Simulator om screenshots te maken, dan `Cmd + S` (of via Device → Screenshot)

### 9. Submit naar App Store
```bash
npm run submit:ios
```
Of:
```bash
eas submit --platform ios
```

- EAS uploadt automatisch naar App Store Connect
- Je kunt ook handmatig: download `.ipa` en gebruik **Transporter** app (Mac)

### 10. Review aanvragen
- In App Store Connect, klik op de app → `Submit for Review`
- Review duurt meestal 1-2 dagen

---

## 🚀 Quick commands

```bash
# Preview build (interne distributie, geen App Store nodig)
npm run build:preview

# Productie build
npm run build:ios

# Submit naar App Store
npm run submit:ios
```

---

## ⚠️ Let op
- **Privacy Policy** is verplicht voor App Store. Zelfs een simpele HTML pagina met "We slaan geen persoonlijke data op" is genoeg.
- **Push notificaties** zijn post-MVP — voor nu kun je de app zonder push notificaties submitten. De notificatie plugin staat er al in voor later.
- **App Store review** kijkt naar: werkt de app, crasht hij niet, is de beschrijving accuraat.

## 📁 Files die aangepast zijn
- `eas.json` — nieuw
- `app.json` — notification sound verwijderd
- `package.json` — firebase verwijderd, build scripts toegevoegd
