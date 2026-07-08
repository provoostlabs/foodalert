import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jucfctlwxmgybnvujcny.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1Y2ZjdGx3eG1neWJudnVqY255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NTM2MTIsImV4cCI6MjA5OTAyOTYxMn0.zVxkENunDKh2PCWFhY4VIWr-6Gn4qL4yoQEeK66qA6E';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Table: recalls
// Columns: id, title, supermarkets, product, reason, date, severity, source, created_at
