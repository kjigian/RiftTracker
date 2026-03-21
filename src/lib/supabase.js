import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// ============================================
// STORAGE HELPERS
// ============================================
// Uses Supabase if configured, falls back to localStorage
// Table: card_collections (id, user_id, card_id, quantity, created_at, updated_at)
// Table: shopping_progress (id, user_id, item_key, checked, updated_at)

// --- Generic key-value fallback (localStorage) ---
function localGet(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function localSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

// --- Collection (card_id → quantity) ---
export async function getCollection() {
  if (supabase) {
    const { data, error } = await supabase
      .from('card_collections')
      .select('card_id, quantity')
    if (error) {
      console.warn('Supabase getCollection error, falling back to local:', error.message)
      return localGet('rb-coll') || {}
    }
    const coll = {}
    for (const row of data) {
      if (row.quantity > 0) coll[row.card_id] = row.quantity
    }
    return coll
  }
  return localGet('rb-coll') || {}
}

export async function updateCard(cardId, quantity) {
  // Always update local as cache
  const coll = localGet('rb-coll') || {}
  if (quantity <= 0) {
    delete coll[cardId]
  } else {
    coll[cardId] = quantity
  }
  localSet('rb-coll', coll)

  if (supabase) {
    if (quantity <= 0) {
      await supabase
        .from('card_collections')
        .delete()
        .eq('card_id', cardId)
    } else {
      await supabase
        .from('card_collections')
        .upsert({ card_id: cardId, quantity, updated_at: new Date().toISOString() },
                 { onConflict: 'card_id' })
    }
  }
}

// --- Shopping checklist ---
export async function getShoppingChecked() {
  if (supabase) {
    const { data, error } = await supabase
      .from('shopping_progress')
      .select('item_key')
      .eq('checked', true)
    if (error) {
      console.warn('Supabase getShoppingChecked error, falling back to local:', error.message)
      return new Set(localGet('rb-shop') || [])
    }
    return new Set(data.map(r => r.item_key))
  }
  return new Set(localGet('rb-shop') || [])
}

export async function toggleShopItem(key, checked) {
  // Local cache
  const arr = localGet('rb-shop') || []
  const set = new Set(arr)
  checked ? set.add(key) : set.delete(key)
  localSet('rb-shop', [...set])

  if (supabase) {
    await supabase
      .from('shopping_progress')
      .upsert({ item_key: key, checked, updated_at: new Date().toISOString() },
               { onConflict: 'item_key' })
  }
}
