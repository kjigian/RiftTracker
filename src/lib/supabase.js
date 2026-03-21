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
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}
function localSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

// ============================================
// AUTH
// ============================================
export async function signUp(email, password, displayName) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { display_name: displayName || email.split('@')[0] } }
  })
  return { data, error }
}

export async function signIn(email, password) {
  if (!supabase) return { error: { message: 'Supabase not configured' } }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}

export async function getUser() {
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export function onAuthChange(callback) {
  if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } }
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null)
  })
}

// ============================================
// CARD CATALOG — shared, all users can read
// ============================================
export async function getAllCards() {
  if (supabase) {
    const { data, error } = await supabase
      .from('cards').select('*').order('domain').order('cost').order('name')
    if (error) { console.warn('getAllCards:', error.message); return localGet('rb-cards') || [] }
    localSet('rb-cards', data)
    return data
  }
  return localGet('rb-cards') || []
}

// ============================================
// COLLECTION — scoped to logged-in user via RLS
// ============================================
export async function getCollection() {
  if (supabase) {
    const { data, error } = await supabase
      .from('collection').select('card_id, quantity, condition, notes')
    if (error) { console.warn('getCollection:', error.message); return localGet('rb-coll') || {} }
    const coll = {}
    for (const row of data) { if (row.quantity > 0) coll[row.card_id] = row.quantity }
    localSet('rb-coll', coll)
    return coll
  }
  return localGet('rb-coll') || {}
}

export async function updateCard(cardId, quantity) {
  const coll = localGet('rb-coll') || {}
  if (quantity <= 0) { delete coll[cardId] } else { coll[cardId] = quantity }
  localSet('rb-coll', coll)

  if (supabase) {
    const user = await getUser()
    if (!user) return
    if (quantity <= 0) {
      await supabase.from('collection').delete().eq('card_id', cardId).eq('user_id', user.id)
    } else {
      await supabase.from('collection').upsert(
        { user_id: user.id, card_id: cardId, quantity, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,card_id' }
      )
    }
  }
}

// ============================================
// SCAN LOG
// ============================================
export async function getRecentScans(limit = 50) {
  if (supabase) {
    const { data, error } = await supabase
      .from('scan_log').select('*, cards(name, domain, cost, rarity)')
      .order('scanned_at', { ascending: false }).limit(limit)
    if (error) return []
    return data
  }
  return []
}

// ============================================
// SHOPPING CHECKLIST — scoped to logged-in user
// ============================================
export async function getShoppingChecked() {
  if (supabase) {
    const { data, error } = await supabase
      .from('shopping_progress').select('item_key').eq('checked', true)
    if (error) return new Set(localGet('rb-shop') || [])
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
    const user = await getUser()
    if (!user) return
    await supabase.from('shopping_progress').upsert(
      { user_id: user.id, item_key: key, checked, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,item_key' }
    )
  }
}
