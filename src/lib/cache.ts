import { appVersion } from './supabase'

export const duocalCachePrefix = `duocal:${appVersion}:`

export function buildCacheKey(key: string) {
  return `${duocalCachePrefix}${key}`
}

export function buildQueryKey(...parts: Array<string | number | boolean | null>) {
  return ['duocal', appVersion, ...parts] as const
}

export function clearDuocalStorage() {
  clearStorageByPrefix(localStorage, 'duocal:')
  clearStorageByPrefix(sessionStorage, 'duocal:')
}

function clearStorageByPrefix(storage: Storage, prefix: string) {
  const keys = Array.from({ length: storage.length }, (_, index) =>
    storage.key(index),
  ).filter((key): key is string => Boolean(key?.startsWith(prefix)))

  for (const key of keys) {
    storage.removeItem(key)
  }
}
