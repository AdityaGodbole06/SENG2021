import React, { useState } from 'react'
import { Plus, Edit2, Trash2, Download } from 'lucide-react'
import { Order } from '@/types'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

const OrdersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [orders] = useState<Order[]>([
    {
      id: '1',
      orderNumber: 'ORD-001',
      buyerParty: 'Buyer Corp',
      sellerParty: 'Seller Inc',
      amount: 5000,
      orderDate: '2024-04-10',
      deliveryDate: '2024-04-20',
      status: 'confirmed',
    },
    {
      id: '2',
      orderNumber: 'ORD-002',
      buyerParty: 'Buyer Corp',
      sellerParty: 'Seller Inc',
      amount: 3200,
      orderDate: '2024-04-12',
      deliveryDate: '2024-04-25',
      status: 'pending',
    },
  ])

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

  return (
    <div>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-3xl font-bold text-slate-900 dark:text-slate-50'>Orders</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={18} className='mr-2' />
          Create Order
        </Button>
      </div>

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
                    <button className='p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors'>
                      <Edit2 size={16} />
                    </button>
                    <button className='p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors'>
                      <Download size={16} />
                    </button>
                    <button className='p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors text-red-600'>
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
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title='Create New Order'
        footer={
          <>
            <Button variant='secondary' onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsCreateModalOpen(false)}>Create Order</Button>
          </>
        }
      >
        <div className='space-y-4'>
          <Input label='Order Number' placeholder='ORD-003' />
          <Input label='Buyer Party' placeholder='Enter buyer name' />
          <Input label='Seller Party' placeholder='Enter seller name' />
          <Input label='Amount' type='number' placeholder='0.00' />
          <Input label='Order Date' type='date' />
          <Input label='Delivery Date' type='date' />
        </div>
      </Modal>
    </div>
  )
}

export default OrdersPage
