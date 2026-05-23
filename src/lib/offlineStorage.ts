import { appVersion } from './supabase'

const DB_NAME = 'duocal-offline'
const DB_VERSION = 1

export type SyncStatus = 'pendente' | 'sincronizando' | 'sincronizado' | 'erro'

export type SyncQueueItem = {
  local_id: string
  type: 'CREATE_EVENT'
  payload: Record<string, unknown>
  workspace_id: string
  user_id: string
  created_at: string
  status: SyncStatus
  error_message: string | null
  retries: number
}

type EventsCacheEntry = {
  cache_key: string
  workspace_id: string
  data: unknown[]
  cached_at: string
  app_version: string
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains('events_cache')) {
        const store = db.createObjectStore('events_cache', { keyPath: 'cache_key' })
        store.createIndex('workspace_id', 'workspace_id', { unique: false })
      }

      if (!db.objectStoreNames.contains('sync_queue')) {
        const store = db.createObjectStore('sync_queue', { keyPath: 'local_id' })
        store.createIndex('workspace_id', 'workspace_id', { unique: false })
        store.createIndex('status', 'status', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }
  })

  return dbPromise
}

function eventsKey(workspaceId: string, dtInicio: string, dtFim: string): string {
  return `${workspaceId}:${dtInicio}:${dtFim}`
}

export async function cacheEventos(
  workspaceId: string,
  dtInicio: string,
  dtFim: string,
  data: unknown[],
): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('events_cache', 'readwrite')
      const store = tx.objectStore('events_cache')
      const entry: EventsCacheEntry = {
        cache_key: eventsKey(workspaceId, dtInicio, dtFim),
        workspace_id: workspaceId,
        data,
        cached_at: new Date().toISOString(),
        app_version: appVersion,
      }
      const req = store.put(entry)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch {
    return
  }
}

export async function getCachedEventos(
  workspaceId: string,
  dtInicio: string,
  dtFim: string,
): Promise<unknown[] | null> {
  try {
    const db = await openDB()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('events_cache', 'readonly')
      const store = tx.objectStore('events_cache')
      const req = store.get(eventsKey(workspaceId, dtInicio, dtFim))
      req.onsuccess = () => {
        const entry = req.result as EventsCacheEntry | undefined
        if (!entry || entry.app_version !== appVersion) {
          resolve(null)
          return
        }
        resolve(entry.data)
      }
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}


export async function enqueueAction(
  item: Omit<SyncQueueItem, 'retries' | 'error_message'>,
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync_queue', 'readwrite')
    const store = tx.objectStore('sync_queue')
    const req = store.put({ ...item, retries: 0, error_message: null })
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function getPendingActions(workspaceId: string): Promise<SyncQueueItem[]> {
  try {
    const db = await openDB()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readonly')
      const store = tx.objectStore('sync_queue')
      const index = store.index('workspace_id')
      const req = index.getAll(workspaceId)
      req.onsuccess = () => {
        const all = (req.result as SyncQueueItem[]) ?? []
        resolve(
          all
            .filter((i) => i.status !== 'sincronizado')
            .map((i) =>
              i.status === 'sincronizando' ? { ...i, status: 'pendente' as SyncStatus } : i,
            ),
        )
      }
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

export async function updateQueueItemStatus(
  localId: string,
  status: SyncStatus,
  errorMessage?: string,
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync_queue', 'readwrite')
    const store = tx.objectStore('sync_queue')
    const getReq = store.get(localId)
    getReq.onsuccess = () => {
      const item = getReq.result as SyncQueueItem | undefined
      if (!item) {
        resolve()
        return
      }
      const updated: SyncQueueItem = {
        ...item,
        status,
        error_message: errorMessage ?? item.error_message,
        retries: status === 'erro' ? item.retries + 1 : item.retries,
      }
      const putReq = store.put(updated)
      putReq.onsuccess = () => resolve()
      putReq.onerror = () => reject(putReq.error)
    }
    getReq.onerror = () => reject(getReq.error)
  })
}

export async function removeQueueItem(localId: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sync_queue', 'readwrite')
    const store = tx.objectStore('sync_queue')
    const req = store.delete(localId)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}
