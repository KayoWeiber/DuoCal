import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { appVersion, buildQueryKey, supabase } from '../lib'

const authSessionQueryKey = buildQueryKey('auth-session')

export function useAuthSession() {
  const queryClient = useQueryClient()

  const sessionQuery = useQuery({
    queryKey: authSessionQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        throw error
      }

      return data.session
    },
    staleTime: 30_000,
  })

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      queryClient.setQueryData<Session | null>(authSessionQueryKey, session)

      if (!session) {
        queryClient.removeQueries({
          queryKey: ['duocal', appVersion],
        })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [queryClient])

  return {
    session: sessionQuery.data ?? null,
    isLoading: sessionQuery.isLoading,
    isError: sessionQuery.isError,
    error: sessionQuery.error,
  }
}
