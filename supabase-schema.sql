-- ============================================
-- RIFTBOUND CARD SORTER — SUPABASE SCHEMA
-- ============================================
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Card collection tracking
CREATE TABLE IF NOT EXISTS card_collections (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  card_id TEXT NOT NULL UNIQUE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shopping list progress
CREATE TABLE IF NOT EXISTS shopping_progress (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  item_key TEXT NOT NULL UNIQUE,
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (required for Supabase public access)
ALTER TABLE card_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_progress ENABLE ROW LEVEL SECURITY;

-- Allow public read/write (single-user app, no auth needed yet)
-- If you add auth later, replace these with user-scoped policies
CREATE POLICY "Allow all access to card_collections"
  ON card_collections FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to shopping_progress"
  ON shopping_progress FOR ALL
  USING (true) WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_card_collections_card_id ON card_collections(card_id);
CREATE INDEX IF NOT EXISTS idx_shopping_progress_item_key ON shopping_progress(item_key);
