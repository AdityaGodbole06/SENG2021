import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Download, History } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/context/AuthContext'
import { createApiClients } from '@/services/apiClient'
import { orderService, Order } from '@/services/orderService'

const OrdersPage: React.FC = () => {
  const { tokens, apiCredentials } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    orderNumber: '',
    buyerParty: '',
    sellerParty: '',
    amount: '',
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: '',
  })

  useEffect(() => {
    fetchOrders()
  }, [tokens, apiCredentials])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError(null)
      const clients = createApiClients(tokens || {}, apiCredentials || {})
      const data = await orderService.getOrders(clients)
      setOrders(data || [])
    } catch (err) {
      setError('Failed to load orders')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrder = async () => {
    console.log('handleCreateOrder called', { tokens, apiCredentials })
    if (!formData.orderNumber || !formData.buyerParty || !formData.sellerParty || !formData.amount) {
      console.log('Validation failed', formData)
      setError('Please fill in all required fields')
      return
    }

    try {
      setError(null)
      console.log('Creating API clients with tokens:', tokens)
      const clients = createApiClients(tokens || {}, apiCredentials || {})
      console.log('Calling orderService.createOrder with:', {
        orderNumber: formData.orderNumber,
        buyerParty: formData.buyerParty,
        sellerParty: formData.sellerParty,
        amount: parseFloat(formData.amount),
        orderDate: formData.orderDate,
      })
      const result = await orderService.createOrder(clients, {
        orderNumber: formData.orderNumber,
        buyerParty: formData.buyerParty,
        sellerParty: formData.sellerParty,
        amount: parseFloat(formData.amount),
        orderDate: formData.orderDate,
        deliveryDate: formData.deliveryDate || undefined,
      })

      console.log('Order creation result:', result)
      if (result) {
        alert('Order created successfully!')
        setFormData({
          orderNumber: '',
          buyerParty: '',
          sellerParty: '',
          amount: '',
          orderDate: new Date().toISOString().split('T')[0],
          deliveryDate: '',
        })
        setIsCreateModalOpen(false)
        await fetchOrders()
      } else {
        setError('Failed to create order')
      }
    } catch (err) {
      console.error('Order creation error:', err)
      setError(`Error creating order: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleUpdateOrder = async () => {
    if (!editingOrder) return

    if (!formData.buyerParty || !formData.sellerParty || !formData.amount) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setError(null)
      const clients = createApiClients(tokens || {}, apiCredentials || {})
      const result = await orderService.updateOrder(clients, editingOrder.orderNumber, {
        buyerParty: formData.buyerParty,
        sellerParty: formData.sellerParty,
        amount: parseFloat(formData.amount),
        orderDate: formData.orderDate,
        deliveryDate: formData.deliveryDate || undefined,
      })

      if (result) {
        alert('Order updated successfully!')
        setEditingOrder(null)
        setIsEditModalOpen(false)
        await fetchOrders()
      } else {
        setError('Failed to update order')
      }
    } catch (err) {
      setError('Error updating order')
      console.error(err)
    }
  }

  const handleDeleteOrder = async (orderNumber: string) => {
    if (!confirm('Are you sure you want to delete this order?')) return

    try {
      setError(null)
      const clients = createApiClients(tokens || {}, apiCredentials || {})
      const result = await orderService.deleteOrder(clients, orderNumber)

      if (result) {
        alert('Order deleted successfully!')
        await fetchOrders()
      } else {
        setError('Failed to delete order')
      }
    } catch (err) {
      setError('Error deleting order')
      console.error(err)
    }
  }

  const handleDownloadXML = (order: Order) => {
    if (!order.xmlDocument) {
      alert('No XML document available for this order')
      return
    }

    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/xml;charset=utf-8,' + encodeURIComponent(order.xmlDocument))
    element.setAttribute('download', `${order.orderNumber}.xml`)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const openEditModal = (order: Order) => {
    setEditingOrder(order)
    setFormData({
      orderNumber: order.orderNumber,
      buyerParty: order.buyerParty,
      sellerParty: order.sellerParty,
      amount: order.amount.toString(),
      orderDate: order.orderDate?.split('T')[0] || '',
      deliveryDate: order.deliveryDate?.split('T')[0] || '',
    })
    setIsEditModalOpen(true)
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.buyerParty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.sellerParty.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusVariant = (
    status: string
  ): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
      pending: 'warning',
      confirmed: 'info',
      dispatched: 'default',
      delivered: 'success',
      cancelled: 'danger',
    }
    return variants[status] || 'default'
  }

  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-900 p-6'>
      <div className='max-w-7xl mx-auto'>
        {/* Header */}
        <div className='mb-8 flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-slate-900 dark:text-slate-50'>Orders</h1>
            <p className='text-slate-600 dark:text-slate-400'>Manage your orders and track fulfillment</p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)} className='flex items-center gap-2'>
            <Plus size={20} />
            Create Order
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className='mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded text-red-700 dark:text-red-400'>
            {error}
            <button
              onClick={() => setError(null)}
              className='ml-4 text-sm font-medium underline'
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filters */}
        <Card className='mb-6'>
          <CardBody>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <Input
                placeholder='Search by order number, buyer, or seller...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className='px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50'
              >
                <option value=''>All Status</option>
                <option value='pending'>Pending</option>
                <option value='confirmed'>Confirmed</option>
                <option value='dispatched'>Dispatched</option>
                <option value='delivered'>Delivered</option>
                <option value='cancelled'>Cancelled</option>
              </select>
            </div>
          </CardBody>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardBody>
            {loading ? (
              <div className='text-center py-12 text-slate-500'>Loading orders...</div>
            ) : filteredOrders.length === 0 ? (
              <div className='text-center py-12 text-slate-500'>
                {orders.length === 0 ? 'No orders yet. Create one to get started!' : 'No orders match your filters'}
              </div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead>
                    <tr className='border-b border-slate-200 dark:border-slate-700'>
                      <th className='text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-50'>
                        Order Number
                      </th>
                      <th className='text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-50'>
                        Buyer
                      </th>
                      <th className='text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-50'>
                        Seller
                      </th>
                      <th className='text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-50'>
                        Amount
                      </th>
                      <th className='text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-50'>
                        Status
                      </th>
                      <th className='text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-50'>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr
                        key={order.orderNumber}
                        className='border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors'
                      >
                        <td className='py-3 px-4 font-medium text-slate-900 dark:text-slate-50'>
                          {order.orderNumber}
                        </td>
                        <td className='py-3 px-4 text-sm text-slate-600 dark:text-slate-400'>
                          {order.buyerParty}
                        </td>
                        <td className='py-3 px-4 text-sm text-slate-600 dark:text-slate-400'>
                          {order.sellerParty}
                        </td>
                        <td className='py-3 px-4 font-semibold text-slate-900 dark:text-slate-50'>
                          ${order.amount.toFixed(2)}
                        </td>
                        <td className='py-3 px-4'>
                          <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                        </td>
                        <td className='py-3 px-4'>
                          <div className='flex gap-2'>
                            <button
                              onClick={() => openEditModal(order)}
                              className='p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors'
                              title='Edit order'
                            >
                              <Edit2 size={18} className='text-blue-600' />
                            </button>
                            <button
                              onClick={() => handleDownloadXML(order)}
                              className='p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors'
                              title='Download XML'
                            >
                              <Download size={18} className='text-green-600' />
                            </button>
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className='p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors'
                              title='View audit trail'
                            >
                              <History size={18} className='text-purple-600' />
                            </button>
                            <button
                              onClick={() => handleDeleteOrder(order.orderNumber)}
                              className='p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors'
                              title='Delete order'
                            >
                              <Trash2 size={18} className='text-red-600' />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Create Order Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title='Create New Order'
      >
        <div className='min-w-96'>
            {error && (
              <div className='mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm'>
                {error}
              </div>
            )}
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                  Order Number *
                </label>
                <Input
                  value={formData.orderNumber}
                  onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                  placeholder='ORD-001'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                  Buyer Party *
                </label>
                <Input
                  value={formData.buyerParty}
                  onChange={(e) => setFormData({ ...formData, buyerParty: e.target.value })}
                  placeholder='Buyer company name'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                  Seller Party *
                </label>
                <Input
                  value={formData.sellerParty}
                  onChange={(e) => setFormData({ ...formData, sellerParty: e.target.value })}
                  placeholder='Seller company name'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                  Amount *
                </label>
                <Input
                  type='number'
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder='0.00'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                  Order Date
                </label>
                <Input
                  type='date'
                  value={formData.orderDate}
                  onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                  Delivery Date
                </label>
                <Input
                  type='date'
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                />
              </div>

              <div className='flex gap-3 mt-6'>
                <Button
                  variant='ghost'
                  onClick={() => setIsCreateModalOpen(false)}
                  fullWidth
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateOrder}
                  fullWidth
                >
                  Create Order
                </Button>
              </div>
            </div>
        </div>
      </Modal>

      {/* Edit Order Modal */}
      <Modal
        isOpen={isEditModalOpen && !!editingOrder}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Order: ${editingOrder?.orderNumber || ''}`}
      >
        <div className='min-w-96'>
            {error && (
              <div className='mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm'>
                {error}
              </div>
            )}
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                  Buyer Party *
                </label>
                <Input
                  value={formData.buyerParty}
                  onChange={(e) => setFormData({ ...formData, buyerParty: e.target.value })}
                  placeholder='Buyer company name'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                  Seller Party *
                </label>
                <Input
                  value={formData.sellerParty}
                  onChange={(e) => setFormData({ ...formData, sellerParty: e.target.value })}
                  placeholder='Seller company name'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                  Amount *
                </label>
                <Input
                  type='number'
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder='0.00'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                  Order Date
                </label>
                <Input
                  type='date'
                  value={formData.orderDate}
                  onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                  Delivery Date
                </label>
                <Input
                  type='date'
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                />
              </div>

              <div className='flex gap-3 mt-6'>
                <Button
                  variant='ghost'
                  onClick={() => setIsEditModalOpen(false)}
                  fullWidth
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateOrder}
                  fullWidth
                >
                  Update Order
                </Button>
              </div>
            </div>
        </div>
      </Modal>
    </div>
  )
}

export default OrdersPage
