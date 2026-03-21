-- ============================================
-- RIFTBOUND CARD SORTER — SUPABASE SCHEMA v3
-- ============================================
-- Multi-user with Supabase Auth
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
--
-- IMPORTANT: Enable Email auth in Supabase Dashboard → Authentication → Providers
-- ============================================

-- ============================================
-- 1. CARD CATALOG — shared across all users (global card database)
-- ============================================
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  cost INTEGER DEFAULT 0,
  rarity TEXT DEFAULT 'Common',
  card_type TEXT DEFAULT 'Unit',
  card_set TEXT DEFAULT 'Origins',
  card_text TEXT DEFAULT '',
  flavor_text TEXT DEFAULT '',
  attack INTEGER,
  health INTEGER,
  image_hash TEXT,
  image_url TEXT,
  market_value NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. COLLECTION — per-user card ownership
-- ============================================
CREATE TABLE IF NOT EXISTS collection (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  condition TEXT DEFAULT 'Near Mint',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, card_id)
);

-- ============================================
-- 3. SCAN LOG — per-user scan history
-- ============================================
CREATE TABLE IF NOT EXISTS scan_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id TEXT REFERENCES cards(id),
  scan_mode TEXT NOT NULL DEFAULT 'domain',
  domain_detected TEXT,
  cost_detected INTEGER,
  confidence NUMERIC(5,2),
  image_path TEXT,
  is_new_card BOOLEAN DEFAULT FALSE,
  sorted_to_bin INTEGER,
  scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. SHOPPING PROGRESS — per-user build checklist
-- ============================================
CREATE TABLE IF NOT EXISTS shopping_progress (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_key)
);

-- ============================================
-- 5. USER PROFILES — display names, settings
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- CARDS: everyone can read, authenticated users can insert/update
CREATE POLICY "cards_read" ON cards FOR SELECT USING (true);
CREATE POLICY "cards_write" ON cards FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "cards_update" ON cards FOR UPDATE USING (auth.role() = 'authenticated');

-- COLLECTION: users can only see/edit their own
CREATE POLICY "collection_select" ON collection FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "collection_insert" ON collection FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "collection_update" ON collection FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "collection_delete" ON collection FOR DELETE USING (auth.uid() = user_id);

-- SCAN LOG: users can only see/edit their own
CREATE POLICY "scan_log_select" ON scan_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "scan_log_insert" ON scan_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- SHOPPING: users can only see/edit their own
CREATE POLICY "shopping_select" ON shopping_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "shopping_insert" ON shopping_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "shopping_update" ON shopping_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "shopping_delete" ON shopping_progress FOR DELETE USING (auth.uid() = user_id);

-- PROFILES: users can read all, edit their own
CREATE POLICY "profiles_read" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_cards_domain ON cards(domain);
CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name);
CREATE INDEX IF NOT EXISTS idx_cards_image_hash ON cards(image_hash);
CREATE INDEX IF NOT EXISTS idx_collection_user ON collection(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_card ON collection(card_id);
CREATE INDEX IF NOT EXISTS idx_scan_log_user ON scan_log(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_log_time ON scan_log(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_shopping_user ON shopping_progress(user_id);

-- ============================================
-- HELPER: Upsert a scanned card (user-scoped)
-- ============================================
CREATE OR REPLACE FUNCTION add_scanned_card(
  p_user_id UUID,
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
  -- Insert card into shared catalog if new
  INSERT INTO cards (id, name, domain, cost, rarity, card_type, card_text, image_hash)
  VALUES (p_card_id, p_name, p_domain, p_cost, p_rarity, p_card_type, p_card_text, p_image_hash)
  ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
  RETURNING (xmax = 0) INTO v_is_new;

  -- Upsert into THIS USER's collection
  INSERT INTO collection (user_id, card_id, quantity)
  VALUES (p_user_id, p_card_id, 1)
  ON CONFLICT (user_id, card_id)
  DO UPDATE SET quantity = collection.quantity + 1, updated_at = NOW();

  -- Log the scan for this user
  INSERT INTO scan_log (user_id, card_id, domain_detected, cost_detected, confidence, is_new_card)
  VALUES (p_user_id, p_card_id, p_domain, p_cost, p_confidence, v_is_new);

  v_result := jsonb_build_object(
    'card_id', p_card_id,
    'is_new', v_is_new,
    'name', p_name,
    'domain', p_domain
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
