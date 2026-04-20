import { ApiClients } from './apiClient'
import { Order } from '@/types'

export const ordersService = {
  // Get all orders
  async getOrders(clients: ApiClients): Promise<Order[]> {
    try {
      const response = await clients.ordersApi.get('/')
      return response as Order[]
    } catch (error) {
      console.error('Error fetching orders:', error)
      return []
    }
  },

  // Get order by ID
  async getOrderById(clients: ApiClients, id: string): Promise<Order | null> {
    try {
      const response = await clients.ordersApi.get(`/${id}`)
      return response as Order
    } catch (error) {
      console.error('Error fetching order:', error)
      return null
    }
  },

  // Create order
  async createOrder(
    clients: ApiClients,
    data: Omit<Order, 'id' | 'status'>
  ): Promise<Order | null> {
    try {
      const response = await clients.ordersApi.post('/', {
        ...data,
        status: 'pending',
      })
      return response as Order
    } catch (error) {
      console.error('Error creating order:', error)
      return null
    }
  },

  // Update order
  async updateOrder(clients: ApiClients, id: string, data: Partial<Order>): Promise<Order | null> {
    try {
      const response = await clients.ordersApi.put(`/${id}`, data)
      return response as Order
    } catch (error) {
      console.error('Error updating order:', error)
      return null
    }
  },

  // Delete order
  async deleteOrder(clients: ApiClients, id: string): Promise<boolean> {
    try {
      await clients.ordersApi.delete(`/${id}`)
      return true
    } catch (error) {
      console.error('Error deleting order:', error)
      return false
    }
  },
}
