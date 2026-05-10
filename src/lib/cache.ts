import { appVersion } from './supabase'

export const duocalCachePrefix = `duocal:${appVersion}:`

export function buildCacheKey(key: string) {
  return `${duocalCachePrefix}${key}`
}

export function buildQueryKey(...parts: Array<string | number | boolean | null>) {
  return ['duocal', appVersion, ...parts] as const
}

export function savePendingConnectionCode(codigo: string) {
  const normalizedCode = normalizeConnectionCode(codigo)

  if (normalizedCode) {
    localStorage.setItem(buildCacheKey('codigo-conexao-pendente'), normalizedCode)
  }
}

export function getPendingConnectionCode() {
  const storedCode = localStorage.getItem(
    buildCacheKey('codigo-conexao-pendente'),
  )

  return normalizeConnectionCode(storedCode ?? '')
}

export function clearPendingConnectionCode() {
  localStorage.removeItem(buildCacheKey('codigo-conexao-pendente'))
}

export function clearDuocalStorage() {
  clearStorageByPrefix(localStorage, 'duocal:')
  clearStorageByPrefix(sessionStorage, 'duocal:')
}

export function normalizeConnectionCode(codigo: string) {
  const normalizedCode = codigo.replace(/\D/g, '').slice(0, 6)
  return normalizedCode.length === 6 ? normalizedCode : null
}

function clearStorageByPrefix(storage: Storage, prefix: string) {
  const keys = Array.from({ length: storage.length }, (_, index) =>
    storage.key(index),
  ).filter((key): key is string => Boolean(key?.startsWith(prefix)))

  for (const key of keys) {
    storage.removeItem(key)
  }
}
