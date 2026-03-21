-- ============================================
-- RIFTBOUND CARD SORTER — SUPABASE SCHEMA v2
-- ============================================
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- This schema supports full card scanning + collection tracking

-- ============================================
-- 1. CARD CATALOG — every unique card the system has ever scanned
-- ============================================
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,                          -- unique card identifier (hash of image or manual ID)
  name TEXT NOT NULL,                           -- card name (OCR'd or matched)
  domain TEXT NOT NULL,                         -- Fury, Calm, Mind, Body, Chaos, Order
  cost INTEGER DEFAULT 0,                       -- energy cost
  rarity TEXT DEFAULT 'Common',                 -- Common, Uncommon, Rare, Epic, Legendary
  card_type TEXT DEFAULT 'Unit',                -- Unit, Spell, Champion, Item, Rune
  card_set TEXT DEFAULT 'Origins',              -- which set the card belongs to
  card_text TEXT DEFAULT '',                    -- the card's rules/ability text
  flavor_text TEXT DEFAULT '',                  -- flavor text
  attack INTEGER,                               -- attack stat (NULL if not applicable)
  health INTEGER,                               -- health stat (NULL if not applicable)
  image_hash TEXT,                              -- perceptual hash for matching scanned cards
  image_url TEXT,                               -- URL to card image (Supabase Storage)
  market_value NUMERIC(10,2) DEFAULT 0,         -- estimated market value
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. COLLECTION — how many of each card the user owns
-- ============================================
CREATE TABLE IF NOT EXISTS collection (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  condition TEXT DEFAULT 'Near Mint',            -- NM, LP, MP, HP, DMG
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(card_id)
);

-- ============================================
-- 3. SCAN LOG — every card the machine has scanned
-- ============================================
CREATE TABLE IF NOT EXISTS scan_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  card_id TEXT REFERENCES cards(id),            -- NULL if card wasn't recognized
  scan_mode TEXT NOT NULL DEFAULT 'domain',     -- domain, cost, full
  domain_detected TEXT,                         -- what domain the vision system saw
  cost_detected INTEGER,                        -- what cost was read
  confidence NUMERIC(5,2),                      -- recognition confidence 0-100
  image_path TEXT,                              -- path to saved scan image
  is_new_card BOOLEAN DEFAULT FALSE,            -- true if this was the first time seeing this card
  sorted_to_bin INTEGER,                        -- which bin (0-5) it was sorted into
  scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. SHOPPING PROGRESS — build checklist
-- ============================================
CREATE TABLE IF NOT EXISTS shopping_progress (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  item_key TEXT NOT NULL UNIQUE,
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_progress ENABLE ROW LEVEL SECURITY;

-- Public access (single-user, no auth — add user scoping later)
CREATE POLICY "public_cards" ON cards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_collection" ON collection FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_scan_log" ON scan_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_shopping" ON shopping_progress FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_cards_domain ON cards(domain);
CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name);
CREATE INDEX IF NOT EXISTS idx_cards_image_hash ON cards(image_hash);
CREATE INDEX IF NOT EXISTS idx_collection_card_id ON collection(card_id);
CREATE INDEX IF NOT EXISTS idx_scan_log_card_id ON scan_log(card_id);
CREATE INDEX IF NOT EXISTS idx_scan_log_scanned_at ON scan_log(scanned_at DESC);

-- ============================================
-- HELPER: Upsert a scanned card into collection
-- ============================================
CREATE OR REPLACE FUNCTION add_scanned_card(
  p_card_id TEXT,
  p_name TEXT,
  p_domain TEXT,
  p_cost INTEGER,
  p_rarity TEXT DEFAULT 'Common',
  p_card_type TEXT DEFAULT 'Unit',
  p_card_text TEXT DEFAULT '',
  p_image_hash TEXT DEFAULT NULL,
  p_confidence NUMERIC DEFAULT 0
) RETURNS JSONB AS $$
DECLARE
  v_is_new BOOLEAN := FALSE;
  v_result JSONB;
BEGIN
  -- Insert card into catalog if it doesn't exist
  INSERT INTO cards (id, name, domain, cost, rarity, card_type, card_text, image_hash)
  VALUES (p_card_id, p_name, p_domain, p_cost, p_rarity, p_card_type, p_card_text, p_image_hash)
  ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
  RETURNING (xmax = 0) INTO v_is_new;

  -- Upsert into collection (increment quantity)
  INSERT INTO collection (card_id, quantity)
  VALUES (p_card_id, 1)
  ON CONFLICT (card_id)
  DO UPDATE SET quantity = collection.quantity + 1, updated_at = NOW();

  -- Log the scan
  INSERT INTO scan_log (card_id, domain_detected, cost_detected, confidence, is_new_card)
  VALUES (p_card_id, p_domain, p_cost, p_confidence, v_is_new);

  v_result := jsonb_build_object(
    'card_id', p_card_id,
    'is_new', v_is_new,
    'name', p_name,
    'domain', p_domain
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
