import { ApiClients } from './apiClient'
import { Invoice } from '@/types'
import { AxiosError } from 'axios'

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    return error.response?.data?.error ?? error.message ?? fallback
  }
  if (error instanceof Error) return error.message
  return fallback
}

export const invoicesService = {
  async getInvoices(clients: ApiClients): Promise<Invoice[]> {
    try {
      const response = await clients.invoicesApi.get('/invoices')
      return Array.isArray(response) ? response : (response as any)?.data || []
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Failed to fetch invoices'))
    }
  },

  async getInvoiceById(clients: ApiClients, id: string): Promise<Invoice | null> {
    try {
      const response = await clients.invoicesApi.get(`/invoices/${id}`)
      return response as Invoice
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Failed to fetch invoice'))
    }
  },

  async createInvoice(clients: ApiClients, data: Omit<Invoice, 'id' | 'status'>): Promise<Invoice> {
    try {
      const response = await clients.invoicesApi.post('/invoices', { ...data, status: 'unpaid' })
      return response as Invoice
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Failed to create invoice'))
    }
  },

  async updateInvoice(clients: ApiClients, id: string, data: Partial<Invoice>): Promise<Invoice> {
    try {
      const response = await clients.invoicesApi.put(`/invoices/${id}`, data)
      return response as Invoice
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Failed to update invoice'))
    }
  },

  async deleteInvoice(clients: ApiClients, id: string): Promise<boolean> {
    try {
      await clients.invoicesApi.delete(`/invoices/${id}`)
      return true
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Failed to delete invoice'))
    }
  },

  async markAsPaid(clients: ApiClients, id: string): Promise<Invoice> {
    try {
      const response = await clients.invoicesApi.patch(`/invoices/${id}`, { status: 'paid' })
      return response as Invoice
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Failed to mark invoice as paid'))
    }
  },
}
