import { ApiClients } from './apiClient'
import { AxiosError } from 'axios'

export interface Order {
  orderNumber: string
  orderID: string
  buyerParty: string
  sellerParty: string
  amount: number
  status: 'pending' | 'confirmed' | 'dispatched' | 'delivered' | 'cancelled'
  orderDate: string
  deliveryDate?: string
  createdAt?: string
  xmlDocument?: string
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    return error.response?.data?.error ?? error.message ?? fallback
  }
  if (error instanceof Error) return error.message
  return fallback
}

export const orderService = {
  async createOrder(clients: ApiClients, data: Omit<Order, 'orderID' | 'status'>): Promise<Order> {
    try {
      const response = await clients.ordersApi.post('/', data)
      return response.order as Order
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Failed to create order'))
    }
  },

  async getOrders(clients: ApiClients): Promise<Order[]> {
    try {
      const response = await clients.ordersApi.get('/')
      return response.orders as Order[]
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Failed to fetch orders'))
    }
  },

  async getOrderByNumber(clients: ApiClients, orderNumber: string): Promise<Order | null> {
    try {
      const response = await clients.ordersApi.get(`/${orderNumber}`)
      return response as Order
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Failed to fetch order'))
    }
  },

  async updateOrder(clients: ApiClients, orderNumber: string, data: Partial<Order>): Promise<Order> {
    try {
      const response = await clients.ordersApi.put(`/${orderNumber}`, data)
      return response.order as Order
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Failed to update order'))
    }
  },

  async deleteOrder(clients: ApiClients, orderNumber: string): Promise<boolean> {
    try {
      await clients.ordersApi.delete(`/${orderNumber}`)
      return true
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Failed to delete order'))
    }
  },

  async createGuestOrder(data: Omit<Order, 'orderID' | 'status' | 'createdAt'>): Promise<{ xmlDocument: string } | null> {
    try {
      const response = await fetch('http://localhost:3000/api/orders/guest/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error creating guest order:', error)
      return null
    }
  },
}
