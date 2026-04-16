import { useAuth } from '@/context/AuthContext'
import { createApiClients } from '@/services/apiClient'

export const useApiClient = () => {
  const { tokens, apiCredentials } = useAuth()

  return createApiClients(tokens || {}, apiCredentials || {})
}
