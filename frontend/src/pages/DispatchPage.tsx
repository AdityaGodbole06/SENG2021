import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Download } from 'lucide-react'
import { DespatchAdvice } from '@/types'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
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

  useEffect(() => {
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
      dispatched: 'info',
      in_transit: 'default',
      delivered: 'success',
      delayed: 'warning',
      issue: 'danger',
    }
    return variants[status]
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this dispatch?')) {
      try {
        const clients = createApiClients(tokens || {}, apiCredentials || {})
        await dispatchService.deleteDispatch(clients, id)
        setDispatches(dispatches.filter(d => d.id !== id))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete dispatch')
      }
    }
  }

  const handleDownload = (dispatch: DespatchAdvice) => {
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
    const newDispatch = await dispatchService.createDispatch(clients, payload as any)
    setDispatches(prev => [...prev, newDispatch])
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
            <option value='dispatched'>Dispatched</option>
            <option value='in_transit'>In Transit</option>
            <option value='delivered'>Delivered</option>
            <option value='delayed'>Delayed</option>
            <option value='issue'>Issue</option>
          </select>
        </CardBody>
      </Card>

      {/* Dispatch Table */}
      <Card>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='border-b border-slate-200 dark:border-slate-800'>
                <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>
                  Dispatch #
                </th>
                <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>
                  Order Ref
                </th>
                <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>
                  Dispatch Date
                </th>
                <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>
                  Expected Arrival
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
                  className='border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors'
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
                      {dispatch.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className='px-6 py-4 text-sm flex gap-2'>
                    <button
                      onClick={() => handleDownload(dispatch)}
                      className='p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors'
                      title='Download as XML'
                    >
                      <Download size={16} />
                    </button>
                    {isSupplier && (
                      <button
                        onClick={() => handleDelete(dispatch.id)}
                        className='p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors text-red-600'
                        title='Delete dispatch'
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

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

        <div>
          <Input
            label='Despatch Party Name *'
            placeholder='Your company name'
            {...field('despatchPartyName')}
          />
          {fieldErrors.despatchPartyName && (
            <p className='text-xs text-red-500 mt-1'>{fieldErrors.despatchPartyName}</p>
          )}
        </div>

        <div>
          <Input
            label='Delivery Party ID *'
            placeholder='BUYER001'
            {...field('deliveryPartyId')}
          />
          {fieldErrors.deliveryPartyId && (
            <p className='text-xs text-red-500 mt-1'>{fieldErrors.deliveryPartyId}</p>
          )}
        </div>

        <div>
          <Input
            label='Delivery Party Name *'
            placeholder='Buyer company name'
            {...field('deliveryPartyName')}
          />
          {fieldErrors.deliveryPartyName && (
            <p className='text-xs text-red-500 mt-1'>{fieldErrors.deliveryPartyName}</p>
          )}
        </div>

        <div>
          <Input
            label='Dispatch Date *'
            type='date'
            {...field('dispatchDate')}
          />
          {fieldErrors.dispatchDate && (
            <p className='text-xs text-red-500 mt-1'>{fieldErrors.dispatchDate}</p>
          )}
        </div>

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

        <div>
          <Input
            label='Quantity *'
            type='number'
            placeholder='1'
            {...field('itemQuantity')}
          />
          {fieldErrors.itemQuantity && (
            <p className='text-xs text-red-500 mt-1'>{fieldErrors.itemQuantity}</p>
          )}
        </div>

        <div>
          <Input
            label='Unit of Measure *'
            placeholder='EA'
            {...field('itemUom')}
          />
          {fieldErrors.itemUom && (
            <p className='text-xs text-red-500 mt-1'>{fieldErrors.itemUom}</p>
          )}
        </div>
      </form>
    </Modal>
  )
}

export default DispatchPage
