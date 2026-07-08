# Supabase Edge Function + pg_cron Deployment Guide

## Wat je nodig hebt
- Supabase CLI geïnstalleerd: `npm install -g supabase`
- Ingelogd bij Supabase: `supabase login`

---

## Stap 1: Deploy de Edge Function

```bash
# Terminal openen in je project root
cd C:\Users\User0x\Documents\kimi\workspace\foodalert

# Link je project (eenmalig)
supabase link --project-ref jucfctlwxmgybnvujcny

# Deploy de scraper functie
supabase functions deploy scraper
```

Dit uploadt `supabase/functions/scraper/index.ts` naar Supabase.

---

## Stap 2: pg_cron instellen via SQL Editor

1. Ga naar je Supabase Dashboard: https://supabase.com/dashboard/project/jucfctlwxmgybnvujcny
2. Klik links op **SQL Editor**
3. Open `supabase/pg_cron_setup.sql` (uit je project) en kopieer de inhoud
4. Plak in SQL Editor en klik **Run**
5. Check of er geen errors zijn

---

## Stap 3: Testen

**Handmatig testen:**
```bash
# Roep de functie aan vanaf je terminal
curl -X GET "https://jucfctlwxmgybnvujcny.supabase.co/functions/v1/scraper" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1Y2ZjdGx3eG1neWJudnVqY255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NTM2MTIsImV4cCI6MjA5OTAyOTYxMn0.zVxkENunDKh2PCWFhY4VIWr-6Gn4qL4yoQEeK66qA6E"
```

**Logs checken:**
Ga naar: https://supabase.com/dashboard/project/jucfctlwxmgybnvujcny/logs/edge-functions

**Cron job status checken:**
```sql
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'foodalert-scraper';
```

---

## Problemen?

### "pg_net extension not available"
Als `pg_net` niet beschikbaar is op de free tier, gebruik dan de **GitHub Actions fallback** (zie hieronder). Dat is gratis, makkelijker, en werkt 100% betrouwbaar.

### "Edge Function timeout"
De scraper moet binnen 60 seconden klaar zijn (free tier limit). 1 pagina scrapen is ~5-10 seconden, dus dit is geen probleem.

### "Function returns 401 Unauthorized"
De `Authorization` header in de SQL moet exact de anon key bevatten. Check dat de SQL correct is gekopieerd.

---

## Alternatief: GitHub Actions (veel makkelijker!)

Als Supabase Edge Functions + pg_cron te complex is, gebruik GitHub Actions. Het is gratis voor publieke repos en draait 100% betrouwbaar:

1. Maak een publieke repo aan op GitHub: `foodalert-scraper`
2. Kopieer `backend/scraper.py` naar die repo
3. Voeg het bestand `.github/workflows/scraper.yml` toe (dit bestaat al in je repo!)
4. GitHub draait de scraper elke 15 minuten automatisch

Dit vereist **geen** Supabase CLI, geen pg_cron, en geen Edge Functions.

---

## Next: Push Notificaties (1.1 update)

Zodra de scraper draait, gaan we push notificaties bouwen:
1. App vraagt push token + slaat op in Supabase
2. Edge Function (of scraper) stuurt notificaties na nieuwe insert
3. Expo Notifications bezorgt het op de iPhone
