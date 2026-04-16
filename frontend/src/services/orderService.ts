import { ApiClients } from './apiClient'

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

export const orderService = {
  async createOrder(clients: ApiClients, data: Omit<Order, 'orderID' | 'status'>): Promise<Order | null> {
    try {
      const response = await clients.ordersApi.post('/orders', data)
      return response.order as Order
    } catch (error) {
      console.error('Error creating order:', error)
      return null
    }
  },

  async getOrders(clients: ApiClients): Promise<Order[]> {
    try {
      const response = await clients.ordersApi.get('/orders')
      return response.orders as Order[]
    } catch (error) {
      console.error('Error fetching orders:', error)
      return []
    }
  },

  async getOrderByNumber(clients: ApiClients, orderNumber: string): Promise<Order | null> {
    try {
      const response = await clients.ordersApi.get(`/orders/${orderNumber}`)
      return response as Order
    } catch (error) {
      console.error('Error fetching order:', error)
      return null
    }
  },

  async updateOrder(clients: ApiClients, orderNumber: string, data: Partial<Order>): Promise<Order | null> {
    try {
      const response = await clients.ordersApi.put(`/orders/${orderNumber}`, data)
      return response.order as Order
    } catch (error) {
      console.error('Error updating order:', error)
      return null
    }
  },

  async deleteOrder(clients: ApiClients, orderNumber: string): Promise<boolean> {
    try {
      await clients.ordersApi.delete(`/orders/${orderNumber}`)
      return true
    } catch (error) {
      console.error('Error deleting order:', error)
      return false
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
