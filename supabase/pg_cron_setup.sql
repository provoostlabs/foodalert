-- FoodAlert pg_cron setup
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- 1. Enable extensions (eenmalig)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Verwijder oude job als die bestaat
SELECT cron.unschedule('foodalert-scraper');

-- 3. Maak nieuwe cron job: elke 15 minuten
-- Vervang de URL met je eigen Supabase project URL
-- Authorization header is verplicht voor Edge Functions
SELECT cron.schedule(
    'foodalert-scraper',
    '*/15 * * * *',
    $$
    SELECT net.http_get(
        url := 'https://jucfctlwxmgybnvujcny.supabase.co/functions/v1/scraper',
        headers := '{
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1Y2ZjdGx3eG1neWJudnVqY255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NTM2MTIsImV4cCI6MjA5OTAyOTYxMn0.zVxkENunDKh2PCWFhY4VIWr-6Gn4qL4yoQEeK66qA6E",
            "Content-Type": "application/json"
        }'::jsonb
    )
    $$
);

-- 4. Check dat de job bestaat
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname = 'foodalert-scraper';

-- 5. Test de job handmatig (optioneel)
-- SELECT cron.schedule('test-run', '1 minute', $$SELECT net.http_get('https://jucfctlwxmgybnvujcny.supabase.co/functions/v1/scraper', headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1Y2ZjdGx3eG1neWJudnVqY255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NTM2MTIsImV4cCI6MjA5OTAyOTYxMn0.zVxkENunDKh2PCWFhY4VIWr-6Gn4qL4yoQEeK66qA6E"}'::jsonb)$$);
