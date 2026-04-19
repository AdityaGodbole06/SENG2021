import { ApiClients } from './apiClient'
import { ReceiptAdvice } from '@/types'
import { AxiosError } from 'axios'

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data
    if (data?.error?.message) return data.error.message
    if (data?.error?.details?.length) return data.error.details.join(', ')
    if (data?.error) return typeof data.error === 'string' ? data.error : fallback
    return error.message ?? fallback
  }
  if (error instanceof Error) return error.message
  return fallback
}

export interface CreateReceiptPayload {
  dispatchAdviceId: string
  receiptDate: string
  receivedItems: Array<{ sku: string; quantityReceived: number; uom: string }>
  notes?: string
}

export const receiptAdviceService = {
  async getReceipts(clients: ApiClients): Promise<ReceiptAdvice[]> {
    try {
      const response = await clients.receiptApi.get('/')
      return Array.isArray(response) ? response : (response as any)?.data || []
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Failed to fetch receipt advices'))
    }
  },

  async createReceiptAdvice(clients: ApiClients, data: CreateReceiptPayload): Promise<string> {
    try {
      const response = await clients.receiptApi.post('/', data)
      return response as unknown as string
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Failed to submit receipt advice'))
    }
  },

  async getReceiptById(clients: ApiClients, id: string): Promise<string> {
    try {
      const response = await clients.receiptApi.get(`/${id}`)
      return response as unknown as string
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Failed to fetch receipt advice'))
    }
  },
}
