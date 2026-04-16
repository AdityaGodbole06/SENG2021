import { ApiClients } from './apiClient'
import { Invoice } from '@/types'

export const invoicesService = {
  // Get all invoices
  async getInvoices(clients: ApiClients): Promise<Invoice[]> {
    try {
      const response = await clients.invoicesApi.get('/invoices')
      return Array.isArray(response) ? response : (response as any)?.data || []
    } catch (error) {
      console.error('Error fetching invoices:', error)
      return []
    }
  },

  // Get invoice by ID
  async getInvoiceById(clients: ApiClients, id: string): Promise<Invoice | null> {
    try {
      const response = await clients.invoicesApi.get(`/invoices/${id}`)
      return response as Invoice
    } catch (error) {
      console.error('Error fetching invoice:', error)
      return null
    }
  },

  // Create invoice
  async createInvoice(
    clients: ApiClients,
    data: Omit<Invoice, 'id' | 'status'>
  ): Promise<Invoice | null> {
    try {
      const response = await clients.invoicesApi.post('/invoices', {
        ...data,
        status: 'unpaid',
      })
      return response as Invoice
    } catch (error) {
      console.error('Error creating invoice:', error)
      return null
    }
  },

  // Update invoice
  async updateInvoice(clients: ApiClients, id: string, data: Partial<Invoice>): Promise<Invoice | null> {
    try {
      const response = await clients.invoicesApi.put(`/invoices/${id}`, data)
      return response as Invoice
    } catch (error) {
      console.error('Error updating invoice:', error)
      return null
    }
  },

  // Delete invoice
  async deleteInvoice(clients: ApiClients, id: string): Promise<boolean> {
    try {
      await clients.invoicesApi.delete(`/invoices/${id}`)
      return true
    } catch (error) {
      console.error('Error deleting invoice:', error)
      return false
    }
  },

  // Mark invoice as paid
  async markAsPaid(clients: ApiClients, id: string): Promise<Invoice | null> {
    try {
      const response = await clients.invoicesApi.patch(`/invoices/${id}`, {
        status: 'paid',
      })
      return response as Invoice
    } catch (error) {
      console.error('Error marking invoice as paid:', error)
      return null
    }
  },
}
