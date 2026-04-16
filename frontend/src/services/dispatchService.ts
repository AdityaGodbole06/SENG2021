import { ApiClients } from './apiClient'
import { DespatchAdvice } from '@/types'

export const dispatchService = {
  // Get all dispatch advices
  async getDispatches(clients: ApiClients): Promise<DespatchAdvice[]> {
    try {
      const response = await clients.dispatchApi.get('/dispatch-advices')
      return Array.isArray(response) ? response : (response as any)?.data || []
    } catch (error) {
      console.error('Error fetching dispatches:', error)
      return []
    }
  },

  // Get dispatch by ID
  async getDispatchById(clients: ApiClients, id: string): Promise<DespatchAdvice | null> {
    try {
      const response = await clients.dispatchApi.get(`/dispatch-advices/${id}`)
      return response as DespatchAdvice
    } catch (error) {
      console.error('Error fetching dispatch:', error)
      return null
    }
  },

  // Create dispatch advice
  async createDispatch(
    clients: ApiClients,
    data: Omit<DespatchAdvice, 'id' | 'status'>
  ): Promise<DespatchAdvice | null> {
    try {
      const response = await clients.dispatchApi.post('/dispatch-advices', {
        ...data,
        status: 'dispatched',
      })
      return response as DespatchAdvice
    } catch (error) {
      console.error('Error creating dispatch:', error)
      return null
    }
  },

  // Update dispatch
  async updateDispatch(
    clients: ApiClients,
    id: string,
    data: Partial<DespatchAdvice>
  ): Promise<DespatchAdvice | null> {
    try {
      const response = await clients.dispatchApi.put(`/dispatch-advices/${id}`, data)
      return response as DespatchAdvice
    } catch (error) {
      console.error('Error updating dispatch:', error)
      return null
    }
  },

  // Delete dispatch
  async deleteDispatch(clients: ApiClients, id: string): Promise<boolean> {
    try {
      await clients.dispatchApi.delete(`/dispatch-advices/${id}`)
      return true
    } catch (error) {
      console.error('Error deleting dispatch:', error)
      return false
    }
  },
}
