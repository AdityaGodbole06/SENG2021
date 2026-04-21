import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Download, Truck } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { SlideOver } from '@/components/ui/SlideOver'
import { OrderPipeline } from '@/components/ui/OrderPipeline'
import { useAuth } from '@/context/AuthContext'
import { createApiClients } from '@/services/apiClient'
import { orderService, Order } from '@/services/orderService'
import { dispatchService } from '@/services/dispatchService'
import { receiptAdviceService } from '@/services/receiptAdviceService'
import { invoicesService } from '@/services/invoicesService'
import { DespatchAdvice, ReceiptAdvice, Invoice } from '@/types'

const generateOrderNumber = (orders: Order[]): string => {
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
  const prefix = `ORD-${today}-`
  const existing = orders
    .map(o => o.orderNumber)
    .filter(n => n.startsWith(prefix))
    .map(n => parseInt(n.slice(prefix.length)) || 0)
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1
  return `${prefix}${String(next).padStart(3, '0')}`
}

const addDays = (dateStr: string, days: number): string => {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

const OrdersPage: React.FC = () => {
  const { tokens, apiCredentials, role } = useAuth()
  const isSupplier = role === 'supplier'
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [slideOverOrder, setSlideOverOrder] = useState<Order | null>(null)
  const [dispatchOrder, setDispatchOrder] = useState<Order | null>(null)
  const [relatedDispatches, setRelatedDispatches] = useState<DespatchAdvice[]>([])
  const [relatedReceipts, setRelatedReceipts] = useState<ReceiptAdvice[]>([])
  const [relatedInvoices, setRelatedInvoices] = useState<Invoice[]>([])
  const [relatedLoading, setRelatedLoading] = useState(false)

  // Field-level errors for create/edit forms
  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string>>({})
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({})

  const [dispatchForm, setDispatchForm] = useState({
    deliveryPartyId: '',
    deliveryPartyName: '',
    dispatchDate: new Date().toISOString().split('T')[0],
    expectedArrival: '',
    itemSku: '',
    itemDescription: '',
    itemQuantity: '1',
    itemUom: 'EA',
  })
  const [dispatchLoading, setDispatchLoading] = useState(false)
  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null)

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

  useEffect(() => {
    if (!slideOverOrder) {
      setRelatedDispatches([])
      setRelatedReceipts([])
      setRelatedInvoices([])
      return
    }
    const fetchRelated = async () => {
      setRelatedLoading(true)
      try {
        const clients = createApiClients(tokens || {}, apiCredentials || {})
        const [allDispatches, allReceipts, allInvoices] = await Promise.allSettled([
          dispatchService.getDispatches(clients),
          receiptAdviceService.getReceipts(clients),
          invoicesService.getInvoices(clients),
        ])
        const dispatches = allDispatches.status === 'fulfilled'
          ? allDispatches.value.filter(d => d.orderRef === slideOverOrder.orderNumber)
          : []
        const dispatchIds = new Set(dispatches.map(d => d.id))
        const receipts = allReceipts.status === 'fulfilled'
          ? allReceipts.value.filter(r => dispatchIds.has(r.dispatchAdviceId))
          : []
        const invoices = allInvoices.status === 'fulfilled'
          ? allInvoices.value.filter(i => i.orderId === slideOverOrder.orderNumber)
          : []
        setRelatedDispatches(dispatches)
        setRelatedReceipts(receipts)
        setRelatedInvoices(invoices)
      } catch {
        // non-fatal — related records are best-effort
      } finally {
        setRelatedLoading(false)
      }
    }
    fetchRelated()
  }, [slideOverOrder?.orderNumber])

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

  const validateCreateForm = (): Record<string, string> => {
    const errs: Record<string, string> = {}
    const today = new Date().toISOString().split('T')[0]
    if (!formData.orderNumber.trim()) errs.orderNumber = 'Order number is required'
    if (!formData.buyerParty.trim()) errs.buyerParty = 'Buyer party is required'
    if (!formData.sellerParty.trim()) errs.sellerParty = 'Seller party is required'
    const amount = parseFloat(formData.amount)
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      errs.amount = 'Amount must be greater than 0'
    }
    if (formData.orderDate && formData.orderDate < today) {
      errs.orderDate = 'Order date cannot be in the past'
    }
    if (formData.deliveryDate) {
      if (formData.deliveryDate < today) {
        errs.deliveryDate = 'Delivery date cannot be in the past'
      } else if (formData.orderDate && formData.deliveryDate < formData.orderDate) {
        errs.deliveryDate = 'Delivery date must be after order date'
      }
    }
    return errs
  }

  const validateEditForm = (): Record<string, string> => {
    const errs: Record<string, string> = {}
    const today = new Date().toISOString().split('T')[0]
    if (!formData.buyerParty.trim()) errs.buyerParty = 'Buyer party is required'
    if (!formData.sellerParty.trim()) errs.sellerParty = 'Seller party is required'
    const amount = parseFloat(formData.amount)
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      errs.amount = 'Amount must be greater than 0'
    }
    if (formData.deliveryDate) {
      if (formData.deliveryDate < today) {
        errs.deliveryDate = 'Delivery date cannot be in the past'
      } else if (formData.orderDate && formData.deliveryDate < formData.orderDate) {
        errs.deliveryDate = 'Delivery date must be after order date'
      }
    }
    return errs
  }

  const handleCreateOrder = async () => {
    const errs = validateCreateForm()
    if (Object.keys(errs).length > 0) {
      setCreateFieldErrors(errs)
      return
    }
    setCreateFieldErrors({})

    try {
      setError(null)
      const clients = createApiClients(tokens || {}, apiCredentials || {})
      await orderService.createOrder(clients, {
        orderNumber: formData.orderNumber,
        buyerParty: formData.buyerParty,
        sellerParty: formData.sellerParty,
        amount: parseFloat(formData.amount),
        orderDate: formData.orderDate,
        deliveryDate: formData.deliveryDate || undefined,
      })

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order')
    }
  }

  const handleUpdateOrder = async () => {
    if (!editingOrder) return

    const errs = validateEditForm()
    if (Object.keys(errs).length > 0) {
      setEditFieldErrors(errs)
      return
    }
    setEditFieldErrors({})

    try {
      setError(null)
      const clients = createApiClients(tokens || {}, apiCredentials || {})
      await orderService.updateOrder(clients, editingOrder.orderNumber, {
        buyerParty: formData.buyerParty,
        sellerParty: formData.sellerParty,
        amount: parseFloat(formData.amount),
        orderDate: formData.orderDate,
        deliveryDate: formData.deliveryDate || undefined,
      })

      setEditingOrder(null)
      setIsEditModalOpen(false)
      await fetchOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order')
    }
  }

  const handleDeleteOrder = async (orderNumber: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this order?')) return

    try {
      setError(null)
      const clients = createApiClients(tokens || {}, apiCredentials || {})
      await orderService.deleteOrder(clients, orderNumber)
      if (slideOverOrder?.orderNumber === orderNumber) setSlideOverOrder(null)
      await fetchOrders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete order')
    }
  }

  const handleDownloadXML = (order: Order, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!order.xmlDocument) {
      setError('No XML document available for this order')
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

  const openEditModal = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingOrder(order)
    setEditFieldErrors({})
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

  const handleCreateDispatch = async () => {
    if (!dispatchOrder) return
    if (!dispatchForm.deliveryPartyId || !dispatchForm.deliveryPartyName || !dispatchForm.dispatchDate) {
      setError('Please fill in all required dispatch fields')
      return
    }
    try {
      setDispatchLoading(true)
      setError(null)
      const clients = createApiClients(tokens || {}, apiCredentials || {})
      await dispatchService.createDispatch(clients, {
        externalRef: dispatchOrder.orderNumber,
        despatchParty: { partyId: tokens?.dispatchApi || '', name: dispatchOrder.sellerParty },
        deliveryParty: { partyId: dispatchForm.deliveryPartyId, name: dispatchForm.deliveryPartyName },
        dispatchDate: dispatchForm.dispatchDate,
        expectedDeliveryDate: dispatchForm.expectedArrival || undefined,
        items: [{
          sku: dispatchForm.itemSku || 'ITEM-001',
          description: dispatchForm.itemDescription || dispatchOrder.orderNumber,
          quantity: parseInt(dispatchForm.itemQuantity) || 1,
          uom: dispatchForm.itemUom || 'EA',
        }],
      } as any)
      setDispatchSuccess('Dispatch created successfully!')
      setDispatchForm({
        deliveryPartyId: '',
        deliveryPartyName: '',
        dispatchDate: new Date().toISOString().split('T')[0],
        expectedArrival: '',
        itemSku: '',
        itemDescription: '',
        itemQuantity: '1',
        itemUom: 'EA',
      })
      await fetchOrders()
      setTimeout(() => {
        setDispatchOrder(null)
        setDispatchSuccess(null)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create dispatch')
    } finally {
      setDispatchLoading(false)
    }
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
      invoiced: 'info',
      paid: 'success',
      cancelled: 'danger',
    }
    return variants[status] || 'default'
  }

  const statusTopipeline = (_order: Order) => ({
    hasDispatch: relatedDispatches.length > 0,
    hasReceipt: relatedReceipts.length > 0,
    hasInvoice: relatedInvoices.length > 0,
    isPaid: relatedInvoices.some(i => i.status === 'paid'),
  })

  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-900 p-6'>
      <div className='max-w-7xl mx-auto'>
        {/* Header */}
        <div className='mb-8 flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-slate-900 dark:text-slate-50'>Orders</h1>
            <p className='text-slate-600 dark:text-slate-400'>Manage your orders and track fulfillment</p>
          </div>
          <Button onClick={() => {
            setFormData(prev => ({ ...prev, orderNumber: generateOrderNumber(orders) }))
            setIsCreateModalOpen(true)
            setCreateFieldErrors({})
          }} className='flex items-center gap-2'>
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
                      <th className='text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-50'>Order Number</th>
                      <th className='text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-50'>Buyer</th>
                      <th className='text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-50'>Seller</th>
                      <th className='text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-50'>Amount</th>
                      <th className='text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-50'>Status</th>
                      <th className='text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-50'>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr
                        key={order.orderNumber}
                        onClick={() => setSlideOverOrder(order)}
                        className='border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer'
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
                          <div className='flex gap-2' onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => openEditModal(order, e)}
                              className='p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors'
                              title='Edit order'
                            >
                              <Edit2 size={18} className='text-blue-600' />
                            </button>
                            {isSupplier && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setDispatchOrder(order) }}
                                className='p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors'
                                title='Create Dispatch'
                              >
                                <Truck size={18} className='text-orange-500' />
                              </button>
                            )}
                            <button
                              onClick={(e) => handleDownloadXML(order, e)}
                              className='p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors'
                              title='Download XML'
                            >
                              <Download size={18} className='text-green-600' />
                            </button>
                            <button
                              onClick={(e) => handleDeleteOrder(order.orderNumber, e)}
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

      {/* Order Detail SlideOver */}
      <SlideOver
        isOpen={!!slideOverOrder}
        onClose={() => setSlideOverOrder(null)}
        title={slideOverOrder ? `Order ${slideOverOrder.orderNumber}` : 'Order Details'}
      >
        {slideOverOrder && (
          <div className='space-y-6'>
            {/* Pipeline */}
            <div>
              <h3 className='text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4'>
                Fulfillment Pipeline
              </h3>
              <OrderPipeline
                currentStatus={slideOverOrder.status}
                {...statusTopipeline(slideOverOrder)}
              />
            </div>

            <hr className='border-slate-200 dark:border-slate-700' />

            {/* Order Details */}
            <div>
              <h3 className='text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3'>
                Order Details
              </h3>
              <dl className='space-y-3'>
                <div className='flex justify-between'>
                  <dt className='text-sm text-slate-500 dark:text-slate-400'>Order Number</dt>
                  <dd className='text-sm font-medium text-slate-900 dark:text-slate-50'>{slideOverOrder.orderNumber}</dd>
                </div>
                <div className='flex justify-between'>
                  <dt className='text-sm text-slate-500 dark:text-slate-400'>Status</dt>
                  <dd><Badge variant={getStatusVariant(slideOverOrder.status)}>{slideOverOrder.status}</Badge></dd>
                </div>
                <div className='flex justify-between'>
                  <dt className='text-sm text-slate-500 dark:text-slate-400'>Buyer Party</dt>
                  <dd className='text-sm font-medium text-slate-900 dark:text-slate-50'>{slideOverOrder.buyerParty}</dd>
                </div>
                <div className='flex justify-between'>
                  <dt className='text-sm text-slate-500 dark:text-slate-400'>Seller Party</dt>
                  <dd className='text-sm font-medium text-slate-900 dark:text-slate-50'>{slideOverOrder.sellerParty}</dd>
                </div>
                <div className='flex justify-between'>
                  <dt className='text-sm text-slate-500 dark:text-slate-400'>Amount</dt>
                  <dd className='text-sm font-semibold text-slate-900 dark:text-slate-50'>${slideOverOrder.amount.toFixed(2)}</dd>
                </div>
                {slideOverOrder.orderDate && (
                  <div className='flex justify-between'>
                    <dt className='text-sm text-slate-500 dark:text-slate-400'>Order Date</dt>
                    <dd className='text-sm text-slate-900 dark:text-slate-50'>
                      {new Date(slideOverOrder.orderDate).toLocaleDateString()}
                    </dd>
                  </div>
                )}
                {slideOverOrder.deliveryDate && (
                  <div className='flex justify-between'>
                    <dt className='text-sm text-slate-500 dark:text-slate-400'>Delivery Date</dt>
                    <dd className='text-sm text-slate-900 dark:text-slate-50'>
                      {new Date(slideOverOrder.deliveryDate).toLocaleDateString()}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <hr className='border-slate-200 dark:border-slate-700' />

            {/* Related Records */}
            <div>
              <h3 className='text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3'>
                Related Records
              </h3>
              {relatedLoading ? (
                <p className='text-xs text-slate-400 dark:text-slate-500'>Loading…</p>
              ) : (
                <div className='space-y-2'>
                  <div className='flex items-center justify-between p-3 rounded-md bg-slate-50 dark:bg-slate-800'>
                    <span className='text-sm text-slate-600 dark:text-slate-400'>Dispatches</span>
                    <span className='text-sm font-medium text-slate-900 dark:text-slate-50'>
                      {relatedDispatches.length > 0 ? `${relatedDispatches.length} dispatch${relatedDispatches.length > 1 ? 'es' : ''}` : 'None'}
                    </span>
                  </div>
                  <div className='flex items-center justify-between p-3 rounded-md bg-slate-50 dark:bg-slate-800'>
                    <span className='text-sm text-slate-600 dark:text-slate-400'>Receipt Advice</span>
                    <span className='text-sm font-medium text-slate-900 dark:text-slate-50'>
                      {relatedReceipts.length > 0 ? `${relatedReceipts.length} receipt${relatedReceipts.length > 1 ? 's' : ''}` : 'None'}
                    </span>
                  </div>
                  <div className='flex items-center justify-between p-3 rounded-md bg-slate-50 dark:bg-slate-800'>
                    <span className='text-sm text-slate-600 dark:text-slate-400'>Invoices</span>
                    <span className='text-sm font-medium text-slate-900 dark:text-slate-50'>
                      {relatedInvoices.length > 0 ? `${relatedInvoices.length} invoice${relatedInvoices.length > 1 ? 's' : ''}` : 'None'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className='flex gap-3 pt-2'>
              {isSupplier && (
                <Button
                  onClick={() => {
                    setSlideOverOrder(null)
                    setDispatchOrder(slideOverOrder)
                  }}
                  className='flex items-center gap-2'
                >
                  <Truck size={16} />
                  Create Dispatch
                </Button>
              )}
              <Button
                variant='ghost'
                onClick={() => handleDownloadXML(slideOverOrder)}
                className='flex items-center gap-2'
              >
                <Download size={16} />
                Download XML
              </Button>
            </div>
          </div>
        )}
      </SlideOver>

      {/* Create Order Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false); setCreateFieldErrors({}) }}
        title='Create New Order'
      >
        <div className='min-w-96'>
          <datalist id='buyer-suggestions'>
            {[...new Set(orders.map(o => o.buyerParty))].map(p => <option key={p} value={p} />)}
          </datalist>
          <datalist id='seller-suggestions'>
            {[...new Set(orders.map(o => o.sellerParty))].map(p => <option key={p} value={p} />)}
          </datalist>

          <div className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                Order Number *
              </label>
              <div className='flex gap-2'>
                <Input
                  value={formData.orderNumber}
                  onChange={(e) => {
                    setFormData({ ...formData, orderNumber: e.target.value })
                    setCreateFieldErrors(prev => ({ ...prev, orderNumber: '' }))
                  }}
                  placeholder='ORD-001'
                  error={createFieldErrors.orderNumber}
                />
                <Button
                  variant='ghost'
                  onClick={() => setFormData(prev => ({ ...prev, orderNumber: generateOrderNumber(orders) }))}
                  className='shrink-0 text-xs px-3'
                  title='Auto-generate'
                >
                  Generate
                </Button>
              </div>
            </div>

            <div>
              <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                Buyer Party *
              </label>
              <Input
                value={formData.buyerParty}
                onChange={(e) => {
                  setFormData({ ...formData, buyerParty: e.target.value })
                  setCreateFieldErrors(prev => ({ ...prev, buyerParty: '' }))
                }}
                placeholder='Buyer company name'
                error={createFieldErrors.buyerParty}
                list='buyer-suggestions'
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                Seller Party *
              </label>
              <Input
                value={formData.sellerParty}
                onChange={(e) => {
                  setFormData({ ...formData, sellerParty: e.target.value })
                  setCreateFieldErrors(prev => ({ ...prev, sellerParty: '' }))
                }}
                placeholder='Seller company name'
                error={createFieldErrors.sellerParty}
                list='seller-suggestions'
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                Amount *
              </label>
              <Input
                type='number'
                min='0.01'
                step='0.01'
                value={formData.amount}
                onChange={(e) => {
                  setFormData({ ...formData, amount: e.target.value })
                  setCreateFieldErrors(prev => ({ ...prev, amount: '' }))
                }}
                placeholder='0.00'
                error={createFieldErrors.amount}
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                Order Date
              </label>
              <Input
                type='date'
                value={formData.orderDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  const newDate = e.target.value
                  setFormData(prev => ({
                    ...prev,
                    orderDate: newDate,
                    deliveryDate: prev.deliveryDate || addDays(newDate, 7),
                  }))
                }}
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                Delivery Date
                <span className='ml-2 text-xs text-slate-400 font-normal'>auto-set to +7 days from order date</span>
              </label>
              <Input
                type='date'
                value={formData.deliveryDate}
                min={formData.orderDate || new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  setFormData({ ...formData, deliveryDate: e.target.value })
                  setCreateFieldErrors(prev => ({ ...prev, deliveryDate: '' }))
                }}
                error={createFieldErrors.deliveryDate}
              />
            </div>

            {error && (
              <p className='text-sm text-red-500'>{error}</p>
            )}

            <div className='flex gap-3 mt-6'>
              <Button variant='ghost' onClick={() => { setIsCreateModalOpen(false); setCreateFieldErrors({}) }} fullWidth>
                Cancel
              </Button>
              <Button onClick={handleCreateOrder} fullWidth>
                Create Order
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Order Modal */}
      <Modal
        isOpen={isEditModalOpen && !!editingOrder}
        onClose={() => { setIsEditModalOpen(false); setEditFieldErrors({}) }}
        title={`Edit Order: ${editingOrder?.orderNumber || ''}`}
      >
        <div className='min-w-96'>
          <div className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                Buyer Party *
              </label>
              <Input
                value={formData.buyerParty}
                onChange={(e) => {
                  setFormData({ ...formData, buyerParty: e.target.value })
                  setEditFieldErrors(prev => ({ ...prev, buyerParty: '' }))
                }}
                placeholder='Buyer company name'
                error={editFieldErrors.buyerParty}
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                Seller Party *
              </label>
              <Input
                value={formData.sellerParty}
                onChange={(e) => {
                  setFormData({ ...formData, sellerParty: e.target.value })
                  setEditFieldErrors(prev => ({ ...prev, sellerParty: '' }))
                }}
                placeholder='Seller company name'
                error={editFieldErrors.sellerParty}
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                Amount *
              </label>
              <Input
                type='number'
                value={formData.amount}
                onChange={(e) => {
                  setFormData({ ...formData, amount: e.target.value })
                  setEditFieldErrors(prev => ({ ...prev, amount: '' }))
                }}
                placeholder='0.00'
                error={editFieldErrors.amount}
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

            {error && (
              <p className='text-sm text-red-500'>{error}</p>
            )}

            <div className='flex gap-3 mt-6'>
              <Button variant='ghost' onClick={() => { setIsEditModalOpen(false); setEditFieldErrors({}) }} fullWidth>
                Cancel
              </Button>
              <Button onClick={handleUpdateOrder} fullWidth>
                Update Order
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Create Dispatch Modal */}
      <Modal
        isOpen={!!dispatchOrder}
        onClose={() => setDispatchOrder(null)}
        title={`Create Dispatch for ${dispatchOrder?.orderNumber || ''}`}
      >
        <div className='min-w-96 space-y-4'>
          {dispatchSuccess && (
            <div className='p-3 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-800 rounded text-green-700 dark:text-green-400 text-sm'>
              {dispatchSuccess}
            </div>
          )}
          {error && (
            <div className='p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm'>
              {error}
            </div>
          )}
          <div>
            <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>Order Reference</label>
            <Input value={dispatchOrder?.orderNumber || ''} disabled />
          </div>
          <div>
            <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>Delivery Party ID *</label>
            <Input
              placeholder='BUYER001'
              value={dispatchForm.deliveryPartyId}
              onChange={e => setDispatchForm({ ...dispatchForm, deliveryPartyId: e.target.value })}
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>Delivery Party Name *</label>
            <Input
              placeholder='Buyer company name'
              value={dispatchForm.deliveryPartyName}
              onChange={e => setDispatchForm({ ...dispatchForm, deliveryPartyName: e.target.value })}
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>Dispatch Date *</label>
            <Input
              type='date'
              value={dispatchForm.dispatchDate}
              onChange={e => setDispatchForm({ ...dispatchForm, dispatchDate: e.target.value })}
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>Expected Arrival</label>
            <Input
              type='date'
              value={dispatchForm.expectedArrival}
              onChange={e => setDispatchForm({ ...dispatchForm, expectedArrival: e.target.value })}
            />
          </div>
          <hr className='border-slate-200 dark:border-slate-700' />
          <p className='text-sm font-medium text-slate-700 dark:text-slate-300'>Item Details</p>
          <div>
            <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>SKU</label>
            <Input
              placeholder='ITEM-001'
              value={dispatchForm.itemSku}
              onChange={e => setDispatchForm({ ...dispatchForm, itemSku: e.target.value })}
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>Description</label>
            <Input
              placeholder='Item description'
              value={dispatchForm.itemDescription}
              onChange={e => setDispatchForm({ ...dispatchForm, itemDescription: e.target.value })}
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>Quantity</label>
            <Input
              type='number'
              placeholder='1'
              value={dispatchForm.itemQuantity}
              onChange={e => setDispatchForm({ ...dispatchForm, itemQuantity: e.target.value })}
            />
          </div>
          <div className='flex gap-3 pt-2'>
            <Button variant='ghost' onClick={() => setDispatchOrder(null)} fullWidth>Cancel</Button>
            <Button onClick={handleCreateDispatch} fullWidth isLoading={dispatchLoading}>Create Dispatch</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default OrdersPage
