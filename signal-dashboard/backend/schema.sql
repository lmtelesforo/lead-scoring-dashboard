-- ============================================================
-- SIGNAL Dashboard — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Main leads table
CREATE TABLE IF NOT EXISTS leads (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email         text NOT NULL,
  company_url   text NOT NULL,
  lead_name     text,
  lead_title    text,
  score         integer CHECK (score >= 0 AND score <= 100),
  badges        text[],          -- e.g. ARRAY['High Intent', 'Decision Maker']
  research      jsonb,           -- full Groq AI research blob
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- 2. Score history table (tracks score changes over time)
CREATE TABLE IF NOT EXISTS lead_score_history (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id     uuid REFERENCES leads(id) ON DELETE CASCADE,
  score       integer,
  scored_at   timestamptz DEFAULT now()
);

-- 3. Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_leads_score     ON leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email     ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created   ON leads(created_at DESC);

-- 4. Trigger: auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. Trigger: auto-log score history when score changes
CREATE OR REPLACE FUNCTION log_score_history()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (OLD.score IS DISTINCT FROM NEW.score) THEN
    INSERT INTO lead_score_history(lead_id, score)
    VALUES (NEW.id, NEW.score);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_score_history
  AFTER INSERT OR UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION log_score_history();

-- 6. Useful views
CREATE OR REPLACE VIEW hot_leads AS
  SELECT id, lead_name, lead_title, email, company_url, score, badges, created_at
  FROM leads
  WHERE score >= 80
  ORDER BY score DESC, created_at DESC;

CREATE OR REPLACE VIEW lead_summary AS
  SELECT
    COUNT(*)                                          AS total_leads,
    COUNT(*) FILTER (WHERE score >= 80)               AS hot_leads,
    COUNT(*) FILTER (WHERE score BETWEEN 60 AND 79)  AS warm_leads,
    COUNT(*) FILTER (WHERE score < 60)                AS cold_leads,
    ROUND(AVG(score))                                 AS avg_score
  FROM leads;

-- 7. Enable Row Level Security (RLS) — important for production
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_score_history ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write their own org's leads
-- (In production, add org_id column and scope policies by org)
CREATE POLICY "Allow all for authenticated" ON leads
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated" ON lead_score_history
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- Sample data to test with (optional — run separately)
-- ============================================================
/*
INSERT INTO leads (email, company_url, lead_name, lead_title, score, badges, research) VALUES
  ('jreyes@shopify.com', 'https://shopify.com', 'James Reyes', 'VP of Sales', 94,
   ARRAY['High Intent','Decision Maker','Series C+'],
   '{"company_overview": "Shopify is a global e-commerce platform.", "estimated_revenue": "$7.1B ARR"}'::jsonb),
  ('priya@notion.so', 'https://notion.so', 'Priya Nair', 'Head of RevOps', 88,
   ARRAY['Decision Maker','Competitor User'],
   '{"company_overview": "Notion is an all-in-one workspace.", "estimated_revenue": "$350M-$500M ARR"}'::jsonb);
*/
