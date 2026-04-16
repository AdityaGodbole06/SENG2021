import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Download } from 'lucide-react'
import { Order } from '@/types'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/context/AuthContext'
import { createApiClients } from '@/services/apiClient'
import { ordersService } from '@/services/ordersService'

const OrdersPage: React.FC = () => {
  const { tokens, apiCredentials } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true)
        setError(null)
        const clients = createApiClients(tokens || {}, apiCredentials || {})
        const data = await ordersService.getOrders(clients)
        setOrders(data)
      } catch (err) {
        setError('Failed to load orders')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [tokens, apiCredentials])

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.buyerParty.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusVariant = (status: Order['status']): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
    const variants: Record<Order['status'], 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
      pending: 'warning',
      confirmed: 'info',
      dispatched: 'default',
      delivered: 'success',
      cancelled: 'danger',
    }
    return variants[status]
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this order?')) {
      try {
        const clients = createApiClients(tokens || {}, apiCredentials || {})
        const success = await ordersService.deleteOrder(clients, id)
        if (success) {
          setOrders(orders.filter(o => o.id !== id))
          alert('Order deleted successfully')
        } else {
          alert('Failed to delete order')
        }
      } catch (err) {
        alert('Error deleting order')
        console.error(err)
      }
    }
  }

  const handleDownload = (order: Order) => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Order>
  <OrderNumber>${order.orderNumber}</OrderNumber>
  <BuyerParty>${order.buyerParty}</BuyerParty>
  <SellerParty>${order.sellerParty}</SellerParty>
  <Amount>${order.amount}</Amount>
  <OrderDate>${order.orderDate}</OrderDate>
  <DeliveryDate>${order.deliveryDate}</DeliveryDate>
  <Status>${order.status}</Status>
</Order>`

    const blob = new Blob([xml], { type: 'application/xml' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${order.orderNumber}.xml`
    a.click()
  }

  const handleCreateOrder = async (formData: any) => {
    try {
      const clients = createApiClients(tokens || {}, apiCredentials || {})
      const newOrder = await ordersService.createOrder(clients, {
        orderNumber: formData.orderNumber,
        buyerParty: formData.buyerParty,
        sellerParty: formData.sellerParty,
        amount: parseFloat(formData.amount) || 0,
        orderDate: formData.orderDate,
        deliveryDate: formData.deliveryDate,
      })
      if (newOrder) {
        setOrders([...orders, newOrder])
        setIsCreateModalOpen(false)
        alert('Order created successfully!')
      } else {
        alert('Failed to create order')
      }
    } catch (err) {
      alert('Error creating order')
      console.error(err)
    }
  }

  return (
    <div>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-3xl font-bold text-slate-900 dark:text-slate-50'>Orders</h1>
        <Button onClick={() => setIsCreateModalOpen(true)} disabled={loading}>
          <Plus size={18} className='mr-2' />
          Create Order
        </Button>
      </div>

      {error && (
        <Card className='mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'>
          <CardBody>
            <p className='text-red-600 dark:text-red-400'>{error}</p>
          </CardBody>
        </Card>
      )}

      {loading && (
        <Card className='mb-6'>
          <CardBody>
            <p className='text-slate-600 dark:text-slate-400'>Loading orders...</p>
          </CardBody>
        </Card>
      )}

      {/* Search and Filter */}
      <Card className='mb-6'>
        <CardBody className='flex gap-4'>
          <div className='flex-1'>
            <Input
              placeholder='Search by order number or party...'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className='!mb-0'
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className='px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500'
          >
            <option value=''>All Status</option>
            <option value='pending'>Pending</option>
            <option value='confirmed'>Confirmed</option>
            <option value='dispatched'>Dispatched</option>
            <option value='delivered'>Delivered</option>
            <option value='cancelled'>Cancelled</option>
          </select>
        </CardBody>
      </Card>

      {/* Orders Table */}
      <Card>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='border-b border-slate-200 dark:border-slate-800'>
                <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>
                  Order Number
                </th>
                <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>
                  Buyer
                </th>
                <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>
                  Seller
                </th>
                <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>
                  Amount
                </th>
                <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>
                  Status
                </th>
                <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr
                  key={order.id}
                  className='border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors'
                >
                  <td className='px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-50'>
                    {order.orderNumber}
                  </td>
                  <td className='px-6 py-4 text-sm text-slate-600 dark:text-slate-400'>
                    {order.buyerParty}
                  </td>
                  <td className='px-6 py-4 text-sm text-slate-600 dark:text-slate-400'>
                    {order.sellerParty}
                  </td>
                  <td className='px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-50'>
                    ${order.amount.toLocaleString()}
                  </td>
                  <td className='px-6 py-4 text-sm'>
                    <Badge variant={getStatusVariant(order.status)} size='sm'>
                      {order.status}
                    </Badge>
                  </td>
                  <td className='px-6 py-4 text-sm flex gap-2'>
                    <button
                      onClick={() => alert('Edit functionality coming soon')}
                      className='p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors'
                      title='Edit order'
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDownload(order)}
                      className='p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors'
                      title='Download as XML'
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(order.id)}
                      className='p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors text-red-600'
                      title='Delete order'
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Order Modal */}
      <CreateOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateOrder}
      />
    </div>
  )
}

interface CreateOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
}

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    orderNumber: '',
    buyerParty: '',
    sellerParty: '',
    amount: '',
    orderDate: '',
    deliveryDate: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.orderNumber || !formData.buyerParty || !formData.sellerParty) {
      alert('Please fill in all required fields')
      return
    }
    onSubmit(formData)
    setFormData({
      orderNumber: '',
      buyerParty: '',
      sellerParty: '',
      amount: '',
      orderDate: '',
      deliveryDate: '',
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title='Create New Order'
      footer={
        <>
          <Button variant='secondary' onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create Order</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className='space-y-4'>
        <Input
          label='Order Number'
          placeholder='ORD-003'
          value={formData.orderNumber}
          onChange={e => setFormData({ ...formData, orderNumber: e.target.value })}
          required
        />
        <Input
          label='Buyer Party'
          placeholder='Enter buyer name'
          value={formData.buyerParty}
          onChange={e => setFormData({ ...formData, buyerParty: e.target.value })}
          required
        />
        <Input
          label='Seller Party'
          placeholder='Enter seller name'
          value={formData.sellerParty}
          onChange={e => setFormData({ ...formData, sellerParty: e.target.value })}
          required
        />
        <Input
          label='Amount'
          type='number'
          placeholder='0.00'
          value={formData.amount}
          onChange={e => setFormData({ ...formData, amount: e.target.value })}
        />
        <Input
          label='Order Date'
          type='date'
          value={formData.orderDate}
          onChange={e => setFormData({ ...formData, orderDate: e.target.value })}
        />
        <Input
          label='Delivery Date'
          type='date'
          value={formData.deliveryDate}
          onChange={e => setFormData({ ...formData, deliveryDate: e.target.value })}
        />
      </form>
    </Modal>
  )
}

export default OrdersPage
