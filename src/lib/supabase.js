import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// ============================================
// LOCAL STORAGE FALLBACK
// ============================================

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

// ============================================
// CARD CATALOG — all cards the system knows about
// ============================================

export async function getAllCards() {
  if (supabase) {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .order('domain')
      .order('cost')
      .order('name')
    if (error) {
      console.warn('Supabase getAllCards error:', error.message)
      return localGet('rb-cards') || []
    }
    // Cache locally
    localSet('rb-cards', data)
    return data
  }
  return localGet('rb-cards') || []
}

// ============================================
// COLLECTION — quantities owned
// ============================================

export async function getCollection() {
  if (supabase) {
    const { data, error } = await supabase
      .from('collection')
      .select('card_id, quantity, condition, notes')
    if (error) {
      console.warn('Supabase getCollection error:', error.message)
      return localGet('rb-coll') || {}
    }
    const coll = {}
    for (const row of data) {
      if (row.quantity > 0) coll[row.card_id] = row.quantity
    }
    localSet('rb-coll', coll)
    return coll
  }
  return localGet('rb-coll') || {}
}

export async function updateCard(cardId, quantity) {
  const coll = localGet('rb-coll') || {}
  if (quantity <= 0) {
    delete coll[cardId]
  } else {
    coll[cardId] = quantity
  }
  localSet('rb-coll', coll)

  if (supabase) {
    if (quantity <= 0) {
      await supabase.from('collection').delete().eq('card_id', cardId)
    } else {
      await supabase.from('collection').upsert(
        { card_id: cardId, quantity, updated_at: new Date().toISOString() },
        { onConflict: 'card_id' }
      )
    }
  }
}

// ============================================
// SCAN LOG — recent scans from the machine
// ============================================

export async function getRecentScans(limit = 50) {
  if (supabase) {
    const { data, error } = await supabase
      .from('scan_log')
      .select('*, cards(name, domain, cost, rarity)')
      .order('scanned_at', { ascending: false })
      .limit(limit)
    if (error) {
      console.warn('Supabase getRecentScans error:', error.message)
      return []
    }
    return data
  }
  return []
}

export async function getScanStats() {
  if (supabase) {
    const { data, error } = await supabase
      .from('scan_log')
      .select('id, is_new_card, scanned_at')
    if (error) return { total: 0, newCards: 0 }
    return {
      total: data.length,
      newCards: data.filter(s => s.is_new_card).length,
    }
  }
  return { total: 0, newCards: 0 }
}

// ============================================
// SHOPPING CHECKLIST
// ============================================

export async function getShoppingChecked() {
  if (supabase) {
    const { data, error } = await supabase
      .from('shopping_progress')
      .select('item_key')
      .eq('checked', true)
    if (error) {
      console.warn('Supabase getShoppingChecked error:', error.message)
      return new Set(localGet('rb-shop') || [])
    }
    return new Set(data.map(r => r.item_key))
  }
  return new Set(localGet('rb-shop') || [])
}

export async function toggleShopItem(key, checked) {
  const arr = localGet('rb-shop') || []
  const set = new Set(arr)
  checked ? set.add(key) : set.delete(key)
  localSet('rb-shop', [...set])

  if (supabase) {
    await supabase.from('shopping_progress').upsert(
      { item_key: key, checked, updated_at: new Date().toISOString() },
      { onConflict: 'item_key' }
    )
  }
}
