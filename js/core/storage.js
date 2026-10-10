/* ============================================================
   AMS — Storage wrapper
   Safe localStorage access with JSON serialization, namespaced keys,
   and in-memory fallback if localStorage is unavailable.
   ============================================================ */

const NAMESPACE = "ams.";

/* In-memory fallback when localStorage is blocked (private mode, etc.) */
const memoryStore = new Map();
let useMemory = false;

/**
 * Detect whether localStorage is actually usable.
 * Some browsers throw on access, not on call.
 */
function canUseLocalStorage() {
  try {
    const probe = "__ams_probe__";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

useMemory = !canUseLocalStorage();
if (useMemory) {
  console.warn("localStorage unavailable — using in-memory fallback.");
}

/**
 * Build the full namespaced key.
 */
function fullKey(key) {
  return NAMESPACE + key;
}

/**
 * Read a value. Returns fallback if missing or unparsable.
 */
export function load(key, fallback = null) {
  const k = fullKey(key);
  try {
    const raw = useMemory ? memoryStore.get(k) : localStorage.getItem(k);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`storage.load("${key}") failed:`, err);
    return fallback;
  }
}

/**
 * Write a value. Returns true on success.
 */
export function save(key, value) {
  const k = fullKey(key);
  try {
    const raw = JSON.stringify(value);
    if (useMemory) {
      memoryStore.set(k, raw);
    } else {
      localStorage.setItem(k, raw);
    }
    return true;
  } catch (err) {
    console.error(`storage.save("${key}") failed:`, err);
    return false;
  }
}

/**
 * Remove a key.
 */
export function remove(key) {
  const k = fullKey(key);
  if (useMemory) {
    memoryStore.delete(k);
  } else {
    localStorage.removeItem(k);
  }
}

/**
 * Check existence of a key.
 */
export function has(key) {
  const k = fullKey(key);
  if (useMemory) return memoryStore.has(k);
  return localStorage.getItem(k) !== null;
}

/**
 * List all AMS keys (without namespace).
 */
export function keys() {
  const result = [];
  if (useMemory) {
    for (const k of memoryStore.keys()) {
      if (k.startsWith(NAMESPACE)) result.push(k.slice(NAMESPACE.length));
    }
  } else {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(NAMESPACE)) result.push(k.slice(NAMESPACE.length));
    }
  }
  return result;
}

/**
 * Clear all AMS data. Useful for "reset" in settings.
 */
export function clearAll() {
  const allKeys = keys();
  for (const k of allKeys) remove(k);
  console.log(`Cleared ${allKeys.length} AMS keys.`);
}