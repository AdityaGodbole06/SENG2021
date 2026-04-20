import React, { useState, useEffect } from 'react'
import { Plus, CheckCircle, Download } from 'lucide-react'
import { DespatchAdvice, ReceiptAdvice } from '@/types'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { SlideOver } from '@/components/ui/SlideOver'
import { useAuth } from '@/context/AuthContext'
import { createApiClients } from '@/services/apiClient'
import { dispatchService } from '@/services/dispatchService'
import { receiptAdviceService } from '@/services/receiptAdviceService'

const ReceiptAdvicePage: React.FC = () => {
  const { tokens, apiCredentials, role } = useAuth()
  const isBuyer = role === 'buyer'
  const [dispatches, setDispatches] = useState<DespatchAdvice[]>([])
  const [receipts, setReceipts] = useState<ReceiptAdvice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDispatch, setSelectedDispatch] = useState<DespatchAdvice | null>(null)
  const [slideOverReceipt, setSlideOverReceipt] = useState<ReceiptAdvice | null>(null)
  const [slideOverDispatch, setSlideOverDispatch] = useState<DespatchAdvice | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const clients = createApiClients(tokens || {}, apiCredentials || {})
        const [dispatchData, receiptData] = await Promise.all([
          dispatchService.getDispatches(clients),
          receiptAdviceService.getReceipts(clients),
        ])
        setDispatches(dispatchData)
        setReceipts(receiptData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [tokens, apiCredentials])

  const filteredDispatches = dispatches.filter(d =>
    d.despatchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.orderRef.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const submittedIds = new Set(receipts.map(r => r.dispatchAdviceId))

  const getStatusVariant = (
    status: DespatchAdvice['status']
  ): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
    const map: Record<DespatchAdvice['status'], 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
      CREATED: 'default',
      SENT: 'info',
      IN_TRANSIT: 'warning',
      DELIVERED: 'success',
      CANCELLED: 'danger',
    }
    return map[status] || 'default'
  }

  const handleReceiptSubmitted = (receipt: ReceiptAdvice) => {
    setReceipts(prev => [receipt, ...prev])
    setDispatches(prev =>
      prev.map(d => d.id === receipt.dispatchAdviceId ? { ...d, status: 'DELIVERED' as const } : d)
    )
    setSelectedDispatch(null)
  }

  const handleDownloadReceipt = (receipt: ReceiptAdvice) => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ReceiptAdvice>
  <ReceiptAdviceId>${receipt.id}</ReceiptAdviceId>
  <DispatchAdviceId>${receipt.dispatchAdviceId}</DispatchAdviceId>
  <ReceiptDate>${receipt.receiptDate}</ReceiptDate>
  <ReceivedItems>
${receipt.receivedItems.map(i => `    <Item>
      <SKU>${i.sku}</SKU>
      <QuantityReceived>${i.quantityReceived}</QuantityReceived>
      <UOM>${i.uom}</UOM>
    </Item>`).join('\n')}
  </ReceivedItems>${receipt.notes ? `\n  <Notes>${receipt.notes}</Notes>` : ''}
</ReceiptAdvice>`
    const blob = new Blob([xml], { type: 'application/xml' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${receipt.id}.xml`
    a.click()
  }

  return (
    <div>
      <div className='flex justify-between items-center mb-6'>
        <div>
          <h1 className='text-3xl font-bold text-slate-900 dark:text-slate-50'>Receipt Advice</h1>
          <p className='text-sm text-slate-500 dark:text-slate-400 mt-1'>
            Confirm receipt of dispatched goods
          </p>
        </div>
        {isBuyer && (
          <Button onClick={() => setSelectedDispatch({ id: '', despatchNumber: '', orderRef: '', dispatchDate: '', expectedArrival: '', status: 'SENT', deliveryParty: '' })} disabled={loading}>
            <Plus size={18} className='mr-2' />
            Submit Receipt Advice
          </Button>
        )}
      </div>

      {error && (
        <Card className='mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'>
          <CardBody>
            <p className='text-red-600 dark:text-red-400'>{error}</p>
          </CardBody>
        </Card>
      )}

      {!isBuyer && (
        <Card className='mb-6 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'>
          <CardBody>
            <p className='text-sm text-blue-600 dark:text-blue-400'>
              Only buyers can submit receipt advices. As a supplier you can view dispatch statuses below.
            </p>
          </CardBody>
        </Card>
      )}

      {/* Dispatches table */}
      <Card className='mb-6'>
        <div className='px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center'>
          <h2 className='text-lg font-semibold text-slate-900 dark:text-slate-50'>Dispatches</h2>
          <div className='w-72'>
            <Input
              placeholder='Search by dispatch # or order ref...'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className='!mb-0'
            />
          </div>
        </div>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='border-b border-slate-200 dark:border-slate-800'>
                <th className='px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>Dispatch #</th>
                <th className='px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>Order Ref</th>
                <th className='px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>Dispatch Date</th>
                <th className='px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>Status</th>
                {isBuyer && (
                  <th className='px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>Action</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className='px-6 py-8 text-center text-slate-500 dark:text-slate-400'>
                    Loading dispatches...
                  </td>
                </tr>
              )}
              {!loading && filteredDispatches.length === 0 && (
                <tr>
                  <td colSpan={5} className='px-6 py-8 text-center text-slate-500 dark:text-slate-400'>
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
                    {dispatch.orderRef || '—'}
                  </td>
                  <td className='px-6 py-4 text-sm text-slate-600 dark:text-slate-400'>
                    {dispatch.dispatchDate}
                  </td>
                  <td className='px-6 py-4 text-sm'>
                    <Badge variant={getStatusVariant(dispatch.status)} size='sm'>
                      {dispatch.status.replace('_', ' ').toLowerCase()}
                    </Badge>
                  </td>
                  {isBuyer && (
                    <td className='px-6 py-4 text-sm' onClick={e => e.stopPropagation()}>
                      {submittedIds.has(dispatch.id) ? (
                        <span className='flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium'>
                          <CheckCircle size={14} /> Submitted
                        </span>
                      ) : dispatch.status === 'DELIVERED' || dispatch.status === 'CANCELLED' ? (
                        <span className='text-xs text-slate-400'>Already delivered</span>
                      ) : (
                        <button
                          onClick={() => setSelectedDispatch(dispatch)}
                          className='text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline'
                        >
                          Submit Receipt
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Submitted receipts this session */}
      {receipts.length > 0 && (
        <Card>
          <div className='px-6 py-4 border-b border-slate-200 dark:border-slate-800'>
            <h2 className='text-lg font-semibold text-slate-900 dark:text-slate-50'>
              Submitted Receipts
            </h2>
          </div>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead>
                <tr className='border-b border-slate-200 dark:border-slate-800'>
                  <th className='px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>Receipt ID</th>
                  <th className='px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>Dispatch ID</th>
                  <th className='px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>Receipt Date</th>
                  <th className='px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>Items</th>
                  <th className='px-6 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map(receipt => (
                  <tr
                    key={receipt.id}
                    onClick={() => setSlideOverReceipt(receipt)}
                    className='border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer'
                  >
                    <td className='px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-50'>
                      {receipt.id}
                    </td>
                    <td className='px-6 py-4 text-sm text-slate-600 dark:text-slate-400'>
                      {receipt.dispatchAdviceId}
                    </td>
                    <td className='px-6 py-4 text-sm text-slate-600 dark:text-slate-400'>
                      {receipt.receiptDate}
                    </td>
                    <td className='px-6 py-4 text-sm text-slate-600 dark:text-slate-400'>
                      {receipt.receivedItems.length} item(s)
                    </td>
                    <td className='px-6 py-4 text-sm' onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleDownloadReceipt(receipt)}
                        className='p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors'
                        title='Download as XML'
                      >
                        <Download size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Submit Receipt Modal */}
      {selectedDispatch !== null && (
        <SubmitReceiptModal
          dispatch={selectedDispatch}
          onClose={() => setSelectedDispatch(null)}
          onSubmitted={handleReceiptSubmitted}
          tokens={tokens}
          apiCredentials={apiCredentials}
        />
      )}

      {/* Dispatch Detail SlideOver */}
      <SlideOver
        isOpen={!!slideOverDispatch}
        onClose={() => setSlideOverDispatch(null)}
        title={slideOverDispatch ? `Dispatch ${slideOverDispatch.despatchNumber}` : 'Dispatch Details'}
      >
        {slideOverDispatch && (
          <div className='space-y-6'>
            <dl className='grid grid-cols-2 gap-4'>
              {[
                ['Dispatch #', slideOverDispatch.despatchNumber],
                ['Order Ref', slideOverDispatch.orderRef || '—'],
                ['Delivery Party', slideOverDispatch.deliveryParty || '—'],
                ['Dispatch Date', slideOverDispatch.dispatchDate || '—'],
                ['Expected Arrival', slideOverDispatch.expectedArrival || '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className='text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400'>{label}</dt>
                  <dd className='mt-1 text-sm font-medium text-slate-900 dark:text-slate-50'>{value}</dd>
                </div>
              ))}
              <div>
                <dt className='text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400'>Status</dt>
                <dd className='mt-1'><Badge variant={getStatusVariant(slideOverDispatch.status)} size='sm'>{slideOverDispatch.status.replace('_', ' ').toLowerCase()}</Badge></dd>
              </div>
            </dl>
            {slideOverDispatch.items && slideOverDispatch.items.length > 0 && (
              <div>
                <h3 className='text-sm font-semibold text-slate-900 dark:text-slate-50 mb-3'>Items</h3>
                <div className='space-y-2'>
                  {slideOverDispatch.items.map((item, idx) => (
                    <div key={idx} className='p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm'>
                      <div className='font-medium text-slate-900 dark:text-slate-50'>SKU: {(item as any).sku || '—'}</div>
                      <div className='text-slate-500 dark:text-slate-400'>Qty: {(item as any).deliveredQuantity ?? (item as any).quantity ?? '—'} {(item as any).uom || ''}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SlideOver>

      {/* Receipt Detail SlideOver */}
      <SlideOver
        isOpen={!!slideOverReceipt}
        onClose={() => setSlideOverReceipt(null)}
        title={slideOverReceipt ? `Receipt ${slideOverReceipt.id}` : 'Receipt Details'}
      >
        {slideOverReceipt && (
          <div className='space-y-6'>
            <dl className='grid grid-cols-2 gap-4'>
              {[
                ['Receipt ID', slideOverReceipt.id],
                ['Dispatch ID', slideOverReceipt.dispatchAdviceId],
                ['Receipt Date', slideOverReceipt.receiptDate],
                ['Submitted', slideOverReceipt.submittedAt ? new Date(slideOverReceipt.submittedAt).toLocaleDateString() : '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className='text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400'>{label}</dt>
                  <dd className='mt-1 text-sm font-medium text-slate-900 dark:text-slate-50 break-all'>{value}</dd>
                </div>
              ))}
            </dl>
            <div>
              <h3 className='text-sm font-semibold text-slate-900 dark:text-slate-50 mb-3'>Received Items</h3>
              <div className='space-y-2'>
                {slideOverReceipt.receivedItems.map((item, idx) => (
                  <div key={idx} className='p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm'>
                    <div className='font-medium text-slate-900 dark:text-slate-50'>SKU: {item.sku}</div>
                    <div className='text-slate-500 dark:text-slate-400'>Qty: {item.quantityReceived} {item.uom}</div>
                  </div>
                ))}
              </div>
            </div>
            {slideOverReceipt.notes && (
              <div>
                <h3 className='text-sm font-semibold text-slate-900 dark:text-slate-50 mb-2'>Notes</h3>
                <p className='text-sm text-slate-600 dark:text-slate-400'>{slideOverReceipt.notes}</p>
              </div>
            )}
            <button
              onClick={() => handleDownloadReceipt(slideOverReceipt)}
              className='flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline'
            >
              <Download size={16} /> Download XML
            </button>
          </div>
        )}
      </SlideOver>
    </div>
  )
}

interface SubmitReceiptModalProps {
  dispatch: DespatchAdvice
  onClose: () => void
  onSubmitted: (receipt: ReceiptAdvice) => void
  tokens: any
  apiCredentials: any
}

const emptyForm = {
  dispatchAdviceId: '',
  receiptDate: new Date().toISOString().split('T')[0],
  itemSku: '',
  itemQuantityReceived: '1',
  itemUom: 'EA',
  notes: '',
}

const SubmitReceiptModal: React.FC<SubmitReceiptModalProps> = ({
  dispatch,
  onClose,
  onSubmitted,
  tokens,
  apiCredentials,
}) => {
  const [formData, setFormData] = useState({
    ...emptyForm,
    dispatchAdviceId: dispatch.id || '',
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const set = (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [key]: e.target.value }))
    setFieldErrors(prev => ({ ...prev, [key]: '' }))
  }

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {}
    if (!formData.dispatchAdviceId.trim()) errs.dispatchAdviceId = 'Dispatch Advice ID is required'
    if (!formData.receiptDate) errs.receiptDate = 'Receipt date is required'
    if (!formData.itemSku.trim()) errs.itemSku = 'SKU is required'
    const qty = parseInt(formData.itemQuantityReceived)
    if (isNaN(qty) || qty < 0) errs.itemQuantityReceived = 'Quantity must be 0 or more'
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
      const clients = createApiClients(tokens || {}, apiCredentials || {})
      await receiptAdviceService.createReceiptAdvice(clients, {
        dispatchAdviceId: formData.dispatchAdviceId,
        receiptDate: formData.receiptDate,
        receivedItems: [
          {
            sku: formData.itemSku,
            quantityReceived: parseInt(formData.itemQuantityReceived),
            uom: formData.itemUom,
          },
        ],
        notes: formData.notes || undefined,
      })

      const newReceipt: ReceiptAdvice = {
        id: `RA-${formData.dispatchAdviceId}-${Date.now()}`,
        dispatchAdviceId: formData.dispatchAdviceId,
        receiptDate: formData.receiptDate,
        receivedItems: [
          {
            sku: formData.itemSku,
            quantityReceived: parseInt(formData.itemQuantityReceived),
            uom: formData.itemUom,
          },
        ],
        notes: formData.notes || undefined,
        submittedAt: new Date().toISOString(),
      }
      onSubmitted(newReceipt)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit receipt advice')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title='Submit Receipt Advice'
      footer={
        <>
          <Button variant='secondary' onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting}>
            Submit
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

        <div>
          <Input
            label='Dispatch Advice ID *'
            placeholder='DA-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
            value={formData.dispatchAdviceId}
            onChange={set('dispatchAdviceId')}
          />
          {fieldErrors.dispatchAdviceId && (
            <p className='text-xs text-red-500 mt-1'>{fieldErrors.dispatchAdviceId}</p>
          )}
        </div>

        <div>
          <Input
            label='Receipt Date *'
            type='date'
            value={formData.receiptDate}
            onChange={set('receiptDate')}
          />
          {fieldErrors.receiptDate && (
            <p className='text-xs text-red-500 mt-1'>{fieldErrors.receiptDate}</p>
          )}
        </div>

        <hr className='border-slate-200 dark:border-slate-700' />
        <p className='text-sm font-medium text-slate-700 dark:text-slate-300'>Received Item</p>

        <div>
          <Input
            label='SKU *'
            placeholder='ITEM-001'
            value={formData.itemSku}
            onChange={set('itemSku')}
          />
          {fieldErrors.itemSku && (
            <p className='text-xs text-red-500 mt-1'>{fieldErrors.itemSku}</p>
          )}
        </div>

        <div>
          <Input
            label='Quantity Received *'
            type='number'
            placeholder='1'
            value={formData.itemQuantityReceived}
            onChange={set('itemQuantityReceived')}
          />
          {fieldErrors.itemQuantityReceived && (
            <p className='text-xs text-red-500 mt-1'>{fieldErrors.itemQuantityReceived}</p>
          )}
        </div>

        <div>
          <Input
            label='Unit of Measure *'
            placeholder='EA'
            value={formData.itemUom}
            onChange={set('itemUom')}
          />
          {fieldErrors.itemUom && (
            <p className='text-xs text-red-500 mt-1'>{fieldErrors.itemUom}</p>
          )}
        </div>

        <div>
          <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
            Notes
          </label>
          <textarea
            className='w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none'
            rows={3}
            placeholder='Optional notes about the received goods...'
            value={formData.notes}
            onChange={set('notes')}
          />
        </div>
      </form>
    </Modal>
  )
}

export default ReceiptAdvicePage
