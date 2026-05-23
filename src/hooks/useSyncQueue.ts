import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  getPendingActions,
  updateQueueItemStatus,
  removeQueueItem,
  type SyncQueueItem,
} from '../lib/offlineStorage'
import { appVersion, supabase } from '../lib'
import { useOnlineStatus } from './useOnlineStatus'
import type { CriarEventoPayload } from './useEventosWorkspace'

export type SyncState = 'idle' | 'syncing' | 'done' | 'error'

async function syncItem(item: SyncQueueItem): Promise<boolean> {
  if (item.type !== 'CREATE_EVENT') return false

  await updateQueueItemStatus(item.local_id, 'sincronizando')
  const p = item.payload as CriarEventoPayload

  const { error } = await supabase.rpc('rpc_criar_evento', {
    p_workspace_id:        p.workspaceId,
    p_nm_evento:           p.nmEvento,
    p_dt_inicio:           p.dtInicio,
    p_dt_fim:              p.dtFim,
    p_participantes:       p.participantes,
    p_ds_evento:           p.dsEvento ?? null,
    p_categoria_id:        p.categoriaId ?? null,
    p_fl_dia_todo:         p.flDiaTodo ?? false,
    p_fl_bloqueia_horario: p.flBloqueiaHorario ?? true,
    p_fl_recorrente:       p.flRecorrente ?? false,
    p_tp_frequencia:       p.tpFrequencia ?? null,
    p_intervalo:           p.intervalo ?? 1,
    p_dias_semana:         p.diasSemana ?? null,
    p_dt_fim_recorrencia:  p.dtFimRecorrencia ?? null,
  })

  if (error) {
    await updateQueueItemStatus(item.local_id, 'erro', error.message)
    return false
  }

  await removeQueueItem(item.local_id)
  return true
}

export function useSyncQueue(workspaceId: string | null | undefined) {
  const isOnline = useOnlineStatus()
  const queryClient = useQueryClient()
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [pendingItems, setPendingItems] = useState<SyncQueueItem[]>([])
  const isSyncingRef = useRef(false)
  const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reloadPending = useCallback(async () => {
    if (!workspaceId) {
      setPendingItems([])
      return
    }
    const items = await getPendingActions(workspaceId)
    setPendingItems(items)
  }, [workspaceId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void reloadPending()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [reloadPending])

  const processQueue = useCallback(async () => {
    if (!workspaceId || isSyncingRef.current || !isOnline) return

    const items = await getPendingActions(workspaceId)
    const actionable = items.filter(
      (i) => i.status === 'pendente' || i.status === 'erro',
    )

    if (actionable.length === 0) return

    isSyncingRef.current = true
    setSyncState('syncing')

    let hasSynced = false
    let hasError = false

    for (const item of actionable) {
      const ok = await syncItem(item)
      if (ok) hasSynced = true
      else hasError = true
    }

    isSyncingRef.current = false

    if (hasSynced) {
      queryClient.invalidateQueries({
        queryKey: ['duocal', appVersion, 'eventos-workspace', workspaceId],
        exact: false,
      })
    }

    await reloadPending()
    setSyncState(hasError ? 'error' : 'done')

    if (doneTimerRef.current) clearTimeout(doneTimerRef.current)
    doneTimerRef.current = setTimeout(() => setSyncState('idle'), 3_000)
  }, [workspaceId, isOnline, queryClient, reloadPending])

  useEffect(() => {
    if (isOnline && workspaceId) {
      const timer = window.setTimeout(() => {
        void processQueue()
      }, 0)

      return () => window.clearTimeout(timer)
    }
  }, [isOnline, workspaceId, processQueue])

  useEffect(() => {
    return () => {
      if (doneTimerRef.current) clearTimeout(doneTimerRef.current)
    }
  }, [])

  const pendingCount = pendingItems.filter(
    (i) => i.status === 'pendente' || i.status === 'erro',
  ).length

  return {
    isOnline,
    syncState,
    pendingItems,
    pendingCount,
    reloadPending,
  }
}
