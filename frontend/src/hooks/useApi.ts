import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { createApiClients, ApiClients } from '@/services/apiClient'

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

export function useApi<T>(
  fetchFn: (clients: ApiClients) => Promise<T>,
  deps?: any[]
) {
  const { tokens, apiCredentials } = useAuth()
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    const fetch = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }))
        const clients = createApiClients(tokens || {}, apiCredentials || {})
        const data = await fetchFn(clients)
        setState({ data, loading: false, error: null })
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error : new Error('Unknown error'),
          loading: false,
        }))
      }
    }

    fetch()
  }, deps || [])

  return state
}

export function useApiMutation<T, R = void>(
  mutationFn: (clients: ApiClients, args: T) => Promise<R>
) {
  const { tokens, apiCredentials } = useAuth()
  const [state, setState] = useState<UseApiState<R>>({
    data: null,
    loading: false,
    error: null,
  })

  const mutate = useCallback(
    async (args: T) => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }))
        const clients = createApiClients(tokens || {}, apiCredentials || {})
        const data = await mutationFn(clients, args)
        setState({ data, loading: false, error: null })
        return data
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error')
        setState(prev => ({
          ...prev,
          error: err,
          loading: false,
        }))
        throw err
      }
    },
    [tokens, apiCredentials]
  )

  return { ...state, mutate }
}
