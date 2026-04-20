import { ApiClients } from './apiClient'
import { DespatchAdvice } from '@/types'
import { AxiosError } from 'axios'

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data
    if (data?.error?.message) {
      const detail = Array.isArray(data.error.details) && data.error.details.length
        ? `: ${data.error.details.join(', ')}`
        : ''
      return `${data.error.message}${detail}`
    }
    if (typeof data?.error === 'string') return data.error
    return error.message ?? fallback
  }
  if (error instanceof Error) return error.message
  return fallback
}

export const dispatchService = {
  async getDispatches(clients: ApiClients): Promise<DespatchAdvice[]> {
    try {
      const response = await clients.dispatchApi.get('/')
      const raw = (response as any)?.despatchAdvices ?? (Array.isArray(response) ? response : [])
      return raw.map((d: any) => ({
        id: d.dispatchAdviceId,
        despatchNumber: d.dispatchAdviceId,
        orderRef: d.externalRef || '',
        despatchParty: d.despatchParty,
        deliveryParty: d.deliveryParty,
        dispatchDate: d.dispatchDate?.split('T')[0] ?? '',
        expectedArrival: d.expectedDeliveryDate?.split('T')[0] ?? '',
        status: (d.status || 'CREATED') as DespatchAdvice['status'],
        items: d.items,
      }))
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Failed to fetch dispatches'))
    }
  },

  async getDispatchById(clients: ApiClients, id: string): Promise<DespatchAdvice | null> {
    try {
      const response = await clients.dispatchApi.get(`/${id}`)
      return response as DespatchAdvice
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Failed to fetch dispatch'))
    }
  },

  async createDispatch(
    clients: ApiClients,
    data: Omit<DespatchAdvice, 'id' | 'status'>
  ): Promise<DespatchAdvice> {
    try {
      const response = await clients.dispatchApi.post('/', data)
      return response as DespatchAdvice
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Failed to create dispatch'))
    }
  },

  async updateDispatch(
    clients: ApiClients,
    id: string,
    data: Partial<DespatchAdvice>
  ): Promise<DespatchAdvice> {
    try {
      const response = await clients.dispatchApi.put(`/${id}`, data)
      return response as DespatchAdvice
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Failed to update dispatch'))
    }
  },

  async updateStatus(
    clients: ApiClients,
    id: string,
    status: DespatchAdvice['status']
  ): Promise<{ status: DespatchAdvice['status']; previousStatus: DespatchAdvice['status'] }> {
    try {
      const response = await clients.dispatchApi.patch(`/${id}/status`, { status })
      return response as { status: DespatchAdvice['status']; previousStatus: DespatchAdvice['status'] }
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Failed to update dispatch status'))
    }
  },

  async deleteDispatch(clients: ApiClients, id: string): Promise<boolean> {
    try {
      await clients.dispatchApi.delete(`/${id}`)
      return true
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Failed to delete dispatch'))
    }
  },
}
