import React, { useState, useEffect } from 'react'
import { Plus, Download } from 'lucide-react'
import { DespatchAdvice, DISPATCH_STATUS_LABELS, DISPATCH_NEXT_STATES } from '@/types'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { SlideOver } from '@/components/ui/SlideOver'
import { useAuth } from '@/context/AuthContext'
import { createApiClients } from '@/services/apiClient'
import { dispatchService } from '@/services/dispatchService'

const DispatchPage: React.FC = () => {
  const { tokens, apiCredentials, role } = useAuth()
  const isSupplier = role === 'supplier'
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [dispatches, setDispatches] = useState<DespatchAdvice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [slideOverDispatch, setSlideOverDispatch] = useState<DespatchAdvice | null>(null)

  const fetchDispatches = async () => {
    try {
      setLoading(true)
      setError(null)
      const clients = createApiClients(tokens || {}, apiCredentials || {})
      const data = await dispatchService.getDispatches(clients)
      setDispatches(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dispatches')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDispatches()
  }, [tokens, apiCredentials])

  const filteredDispatches = dispatches.filter(dispatch => {
    const matchesSearch =
      dispatch.despatchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispatch.orderRef.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || dispatch.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusVariant = (
    status: DespatchAdvice['status']
  ): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
    const variants: Record<DespatchAdvice['status'], 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
      CREATED: 'default',
      SENT: 'info',
      IN_TRANSIT: 'warning',
      DELIVERED: 'success',
      CANCELLED: 'danger',
    }
    return variants[status] || 'default'
  }

  const handleStatusChange = async (next: DespatchAdvice['status']) => {
    if (!slideOverDispatch) return
    if (!confirm(`Update dispatch ${slideOverDispatch.despatchNumber} to ${DISPATCH_STATUS_LABELS[next]}?`)) return
    try {
      const clients = createApiClients(tokens || {}, apiCredentials || {})
      const result = await dispatchService.updateStatus(clients, slideOverDispatch.id, next)
      const updated = { ...slideOverDispatch, status: result.status }
      setSlideOverDispatch(updated)
      setDispatches(prev => prev.map(d => d.id === updated.id ? updated : d))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  const handleDownload = (dispatch: DespatchAdvice, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<DespatchAdvice>
  <DespatchNumber>${dispatch.despatchNumber}</DespatchNumber>
  <OrderRef>${dispatch.orderRef}</OrderRef>
  <DispatchDate>${dispatch.dispatchDate}</DispatchDate>
  <ExpectedArrival>${dispatch.expectedArrival}</ExpectedArrival>
  <Status>${dispatch.status}</Status>
</DespatchAdvice>`
    const blob = new Blob([xml], { type: 'application/xml' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${dispatch.despatchNumber}.xml`
    a.click()
  }

  const handleCreateDispatch = async (formData: any): Promise<void> => {
    const clients = createApiClients(tokens || {}, apiCredentials || {})
    const payload = {
      externalRef: formData.orderRef,
      despatchParty: {
        partyId: tokens?.dispatchApi || 'UNKNOWN',
        name: formData.despatchPartyName,
      },
      deliveryParty: {
        partyId: formData.deliveryPartyId,
        name: formData.deliveryPartyName,
      },
      dispatchDate: formData.dispatchDate,
      expectedDeliveryDate: formData.expectedArrival || undefined,
      items: [
        {
          sku: formData.itemSku || 'ITEM-001',
          description: formData.itemDescription || 'Order Items',
          quantity: parseInt(formData.itemQuantity) || 1,
          uom: formData.itemUom || 'EA',
        },
      ],
    }
    await dispatchService.createDispatch(clients, payload as any)
    await fetchDispatches()
    setIsCreateModalOpen(false)
  }

  return (
    <div>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-3xl font-bold text-slate-900 dark:text-slate-50'>Dispatch</h1>
        {isSupplier ? (
          <Button onClick={() => setIsCreateModalOpen(true)} disabled={loading}>
            <Plus size={18} className='mr-2' />
            Create Dispatch
          </Button>
        ) : (
          <span className='text-sm text-slate-500 dark:text-slate-400'>
            Only suppliers can create dispatches
          </span>
        )}
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
            <p className='text-slate-600 dark:text-slate-400'>Loading dispatches...</p>
          </CardBody>
        </Card>
      )}

      {/* Search and Filter */}
      <Card className='mb-6'>
        <CardBody className='flex gap-4'>
          <div className='flex-1'>
            <Input
              placeholder='Search by dispatch number or order ref...'
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
            <option value='CREATED'>Created</option>
            <option value='SENT'>Sent</option>
            <option value='IN_TRANSIT'>In Transit</option>
            <option value='DELIVERED'>Delivered</option>
            <option value='CANCELLED'>Cancelled</option>
          </select>
        </CardBody>
      </Card>

      {/* Dispatch Table */}
      <Card>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='border-b border-slate-200 dark:border-slate-800'>
                <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>Dispatch #</th>
                <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>Order Ref</th>
                <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>Dispatch Date</th>
                <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>Expected Arrival</th>
                <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>Status</th>
                <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && filteredDispatches.length === 0 && (
                <tr>
                  <td colSpan={6} className='px-6 py-8 text-center text-slate-500 dark:text-slate-400'>
                    No dispatches found.
                  </td>
                </tr>
              )}
              {filteredDispatches.map(dispatch => (
                <tr
                  key={dispatch.id}
                  onClick={() => setSlideOverDispatch(dispatch)}
                  className='border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer'
                >
                  <td className='px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-50'>
                    {dispatch.despatchNumber}
                  </td>
                  <td className='px-6 py-4 text-sm text-slate-600 dark:text-slate-400'>
                    {dispatch.orderRef}
                  </td>
                  <td className='px-6 py-4 text-sm text-slate-600 dark:text-slate-400'>
                    {dispatch.dispatchDate}
                  </td>
                  <td className='px-6 py-4 text-sm text-slate-600 dark:text-slate-400'>
                    {dispatch.expectedArrival || '—'}
                  </td>
                  <td className='px-6 py-4 text-sm'>
                    <Badge variant={getStatusVariant(dispatch.status)} size='sm'>
                      {DISPATCH_STATUS_LABELS[dispatch.status] || dispatch.status}
                    </Badge>
                  </td>
                  <td className='px-6 py-4 text-sm'>
                    <div className='flex gap-2' onClick={e => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleDownload(dispatch, e)}
                        className='p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors'
                        title='Download as XML'
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dispatch Detail SlideOver */}
      <SlideOver
        isOpen={!!slideOverDispatch}
        onClose={() => setSlideOverDispatch(null)}
        title={slideOverDispatch ? `Dispatch ${slideOverDispatch.despatchNumber}` : 'Dispatch Details'}
      >
        {slideOverDispatch && (
          <div className='space-y-6'>
            <div>
              <h3 className='text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3'>
                Dispatch Details
              </h3>
              <dl className='space-y-3'>
                <div className='flex justify-between'>
                  <dt className='text-sm text-slate-500 dark:text-slate-400'>Dispatch Number</dt>
                  <dd className='text-sm font-medium text-slate-900 dark:text-slate-50'>{slideOverDispatch.despatchNumber}</dd>
                </div>
                <div className='flex justify-between'>
                  <dt className='text-sm text-slate-500 dark:text-slate-400'>Status</dt>
                  <dd><Badge variant={getStatusVariant(slideOverDispatch.status)} size='sm'>{DISPATCH_STATUS_LABELS[slideOverDispatch.status] || slideOverDispatch.status}</Badge></dd>
                </div>
                <div className='flex justify-between'>
                  <dt className='text-sm text-slate-500 dark:text-slate-400'>Order Reference</dt>
                  <dd className='text-sm font-medium text-slate-900 dark:text-slate-50'>{slideOverDispatch.orderRef}</dd>
                </div>
                <div className='flex justify-between'>
                  <dt className='text-sm text-slate-500 dark:text-slate-400'>Delivery Party</dt>
                  <dd className='text-sm font-medium text-slate-900 dark:text-slate-50'>{(() => {
                    const dp: any = slideOverDispatch.deliveryParty
                    if (!dp) return '—'
                    if (typeof dp === 'string') return dp
                    return dp.name || dp.partyId || '—'
                  })()}</dd>
                </div>
                <div className='flex justify-between'>
                  <dt className='text-sm text-slate-500 dark:text-slate-400'>Dispatch Date</dt>
                  <dd className='text-sm text-slate-900 dark:text-slate-50'>{slideOverDispatch.dispatchDate || '—'}</dd>
                </div>
                <div className='flex justify-between'>
                  <dt className='text-sm text-slate-500 dark:text-slate-400'>Expected Arrival</dt>
                  <dd className='text-sm text-slate-900 dark:text-slate-50'>{slideOverDispatch.expectedArrival || '—'}</dd>
                </div>
              </dl>
            </div>

            {slideOverDispatch.items && slideOverDispatch.items.length > 0 && (
              <>
                <hr className='border-slate-200 dark:border-slate-700' />
                <div>
                  <h3 className='text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3'>
                    Items
                  </h3>
                  <div className='space-y-2'>
                    {slideOverDispatch.items.map((item: any, idx) => (
                      <div key={idx} className='p-3 rounded-md bg-slate-50 dark:bg-slate-800'>
                        <div className='flex justify-between text-sm'>
                          <span className='text-slate-500 dark:text-slate-400'>SKU</span>
                          <span className='font-medium text-slate-900 dark:text-slate-50'>{item.sku || item.orderLineRef || '—'}</span>
                        </div>
                        {item.description && (
                          <div className='flex justify-between text-sm mt-1'>
                            <span className='text-slate-500 dark:text-slate-400'>Description</span>
                            <span className='font-medium text-slate-900 dark:text-slate-50'>{item.description}</span>
                          </div>
                        )}
                        <div className='flex justify-between text-sm mt-1'>
                          <span className='text-slate-500 dark:text-slate-400'>Quantity</span>
                          <span className='font-medium text-slate-900 dark:text-slate-50'>{item.quantity ?? item.deliveredQuantity ?? '—'} {item.uom || ''}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {slideOverDispatch.discrepancies && slideOverDispatch.discrepancies.length > 0 && (
              <>
                <hr className='border-slate-200 dark:border-slate-700' />
                <div>
                  <h3 className='text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3'>
                    Discrepancies
                  </h3>
                  <ul className='space-y-1'>
                    {slideOverDispatch.discrepancies.map((d, idx) => (
                      <li key={idx} className='text-sm text-red-600 dark:text-red-400'>{d}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {isSupplier && DISPATCH_NEXT_STATES[slideOverDispatch.status]?.length > 0 && (
              <>
                <hr className='border-slate-200 dark:border-slate-700' />
                <div>
                  <h3 className='text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3'>
                    Update Status
                  </h3>
                  <div className='flex flex-wrap gap-2'>
                    {DISPATCH_NEXT_STATES[slideOverDispatch.status].map(next => (
                      <Button
                        key={next}
                        variant={next === 'CANCELLED' ? 'ghost' : 'primary'}
                        onClick={() => handleStatusChange(next)}
                        className={next === 'CANCELLED' ? 'text-red-600 hover:text-red-700' : ''}
                      >
                        Mark as {DISPATCH_STATUS_LABELS[next]}
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className='flex gap-3 pt-2'>
              <Button
                variant='ghost'
                onClick={() => handleDownload(slideOverDispatch)}
                className='flex items-center gap-2'
              >
                <Download size={16} />
                Download XML
              </Button>
            </div>
          </div>
        )}
      </SlideOver>

      <CreateDispatchModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateDispatch}
      />
    </div>
  )
}

interface CreateDispatchModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<void>
}

const emptyForm = {
  orderRef: '',
  despatchPartyName: '',
  deliveryPartyId: '',
  deliveryPartyName: '',
  dispatchDate: '',
  expectedArrival: '',
  itemSku: '',
  itemDescription: '',
  itemQuantity: '1',
  itemUom: 'EA',
}

const CreateDispatchModal: React.FC<CreateDispatchModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const set = (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [key]: e.target.value }))
    setFieldErrors(prev => ({ ...prev, [key]: '' }))
  }

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {}
    if (!formData.despatchPartyName.trim()) errs.despatchPartyName = 'Despatch party name is required'
    if (!formData.deliveryPartyId.trim()) errs.deliveryPartyId = 'Delivery party ID is required'
    if (!formData.deliveryPartyName.trim()) errs.deliveryPartyName = 'Delivery party name is required'
    if (!formData.dispatchDate) errs.dispatchDate = 'Dispatch date is required'
    const qty = parseInt(formData.itemQuantity)
    if (isNaN(qty) || qty < 1) errs.itemQuantity = 'Quantity must be at least 1'
    if (!formData.itemUom.trim()) errs.itemUom = 'Unit of measure is required'
    return errs
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      setFormData(emptyForm)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create dispatch')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData(emptyForm)
    setFieldErrors({})
    setSubmitError(null)
    onClose()
  }

  const field = (key: keyof typeof emptyForm) => ({
    value: formData[key],
    onChange: set(key),
    error: fieldErrors[key],
  })

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title='Create Dispatch Advice'
      footer={
        <>
          <Button variant='secondary' onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting}>
            Create
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className='space-y-4'>
        {submitError && (
          <div className='p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md'>
            <p className='text-sm text-red-600 dark:text-red-400'>{submitError}</p>
          </div>
        )}

        <Input
          label='Order Reference'
          placeholder='ORD-001'
          {...field('orderRef')}
        />

        <Input
          label='Despatch Party Name *'
          placeholder='Your company name'
          {...field('despatchPartyName')}
        />

        <Input
          label='Delivery Party ID *'
          placeholder='BUYER001'
          {...field('deliveryPartyId')}
        />

        <Input
          label='Delivery Party Name *'
          placeholder='Buyer company name'
          {...field('deliveryPartyName')}
        />

        <Input
          label='Dispatch Date *'
          type='date'
          {...field('dispatchDate')}
        />

        <Input
          label='Expected Arrival Date'
          type='date'
          {...field('expectedArrival')}
        />

        <hr className='border-slate-200 dark:border-slate-700' />
        <p className='text-sm font-medium text-slate-700 dark:text-slate-300'>Item Details</p>

        <Input
          label='SKU'
          placeholder='ITEM-001'
          {...field('itemSku')}
        />

        <Input
          label='Description'
          placeholder='Item description'
          {...field('itemDescription')}
        />

        <Input
          label='Quantity *'
          type='number'
          placeholder='1'
          {...field('itemQuantity')}
        />

        <Input
          label='Unit of Measure *'
          placeholder='EA'
          {...field('itemUom')}
        />
      </form>
    </Modal>
  )
}

export default DispatchPage
