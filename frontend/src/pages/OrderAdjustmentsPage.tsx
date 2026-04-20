import React, { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SlideOver } from '@/components/ui/SlideOver'
import { useAuth } from '@/context/AuthContext'
import { createApiClients } from '@/services/apiClient'

interface AdjustmentLine {
  sku: string
  field: string
  from: string
  to: string
}

interface OrderAdjustment {
  _id: string
  orderAdjustmentId?: string
  dispatchAdviceId: string
  requestedByPartyId: string
  reason: string
  adjustments: AdjustmentLine[]
  createdAt?: string
}

const emptyLine = (): AdjustmentLine => ({ sku: '', field: '', from: '', to: '' })

const emptyForm = {
  dispatchAdviceId: '',
  reason: '',
}

const OrderAdjustmentsPage: React.FC = () => {
  const { tokens, apiCredentials, role } = useAuth()
  const isBuyer = role === 'buyer'

  const [adjustments, setAdjustments] = useState<OrderAdjustment[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [formData, setFormData] = useState(emptyForm)
  const [lines, setLines] = useState<AdjustmentLine[]>([emptyLine()])
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [lineErrors, setLineErrors] = useState<Record<number, Record<string, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [slideOverItem, setSlideOverItem] = useState<OrderAdjustment | null>(null)

  useEffect(() => {
    fetchAdjustments()
  }, [tokens, apiCredentials])

  const fetchAdjustments = async () => {
    try {
      setLoading(true)
      setPageError(null)
      const clients = createApiClients(tokens || {}, apiCredentials || {})
      const data = await clients.adjustmentApi.get<OrderAdjustment[]>('/')
      setAdjustments(Array.isArray(data) ? data : [])
    } catch (err) {
      setPageError('Failed to load order adjustments')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!formData.dispatchAdviceId.trim()) errs.dispatchAdviceId = 'Dispatch Advice ID is required'
    if (!formData.reason.trim()) errs.reason = 'Reason is required'
    setFieldErrors(errs)

    const lErrs: Record<number, Record<string, string>> = {}
    lines.forEach((line, idx) => {
      const le: Record<string, string> = {}
      if (!line.sku.trim()) le.sku = 'SKU is required'
      if (!line.field.trim()) le.field = 'Field is required'
      if (!line.from.trim()) le.from = 'From value is required'
      if (!line.to.trim()) le.to = 'To value is required'
      if (Object.keys(le).length > 0) lErrs[idx] = le
    })
    setLineErrors(lErrs)

    return Object.keys(errs).length === 0 && Object.keys(lErrs).length === 0
  }

  const handleCreate = async () => {
    if (!validate()) return
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      const clients = createApiClients(tokens || {}, apiCredentials || {})
      const payload = {
        dispatchAdviceId: formData.dispatchAdviceId,
        requestedByPartyId: tokens?.ordersApi || '',
        reason: formData.reason,
        adjustments: lines,
      }
      await clients.adjustmentApi.post<OrderAdjustment>('/', payload)
      resetForm()
      setIsCreateModalOpen(false)
      await fetchAdjustments()
    } catch (err: any) {
      const status = err?.response?.status
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to create adjustment'
      if (status === 404) {
        setSubmitError('Dispatch not found. Please check the Dispatch Advice ID.')
      } else if (status === 403) {
        setSubmitError('Only buyers can create order adjustments.')
      } else {
        setSubmitError(msg)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData(emptyForm)
    setLines([emptyLine()])
    setFieldErrors({})
    setLineErrors({})
    setSubmitError(null)
  }

  const updateLine = (idx: number, key: keyof AdjustmentLine, value: string) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [key]: value } : l))
    setLineErrors(prev => {
      const updated = { ...prev }
      if (updated[idx]) {
        updated[idx] = { ...updated[idx], [key]: '' }
      }
      return updated
    })
  }

  const addLine = () => setLines(prev => [...prev, emptyLine()])
  const removeLine = (idx: number) => {
    if (lines.length === 1) return
    setLines(prev => prev.filter((_, i) => i !== idx))
    setLineErrors(prev => {
      const updated: Record<number, Record<string, string>> = {}
      Object.entries(prev).forEach(([k, v]) => {
        const n = parseInt(k)
        if (n < idx) updated[n] = v
        else if (n > idx) updated[n - 1] = v
      })
      return updated
    })
  }

  const formatDate = (dt?: string) => {
    if (!dt) return '—'
    try { return new Date(dt).toLocaleDateString() } catch { return dt }
  }

  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-900 p-6'>
      <div className='max-w-7xl mx-auto'>
        {/* Header */}
        <div className='mb-8 flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-slate-900 dark:text-slate-50'>Order Adjustments</h1>
            <p className='text-slate-600 dark:text-slate-400'>View and create order adjustment requests</p>
          </div>
          {isBuyer && (
            <Button onClick={() => { resetForm(); setIsCreateModalOpen(true) }} className='flex items-center gap-2'>
              <Plus size={20} />
              Create Adjustment
            </Button>
          )}
        </div>

        {pageError && (
          <div className='mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded text-red-700 dark:text-red-400'>
            {pageError}
            <button onClick={() => setPageError(null)} className='ml-4 text-sm font-medium underline'>Dismiss</button>
          </div>
        )}

        {/* Table */}
        <Card>
          <CardBody>
            {loading ? (
              <div className='text-center py-12 text-slate-500'>Loading adjustments...</div>
            ) : adjustments.length === 0 ? (
              <div className='text-center py-12 text-slate-500'>No order adjustments yet.</div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead>
                    <tr className='border-b border-slate-200 dark:border-slate-700'>
                      <th className='text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-50'>ID</th>
                      <th className='text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-50'>Dispatch Advice ID</th>
                      <th className='text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-50'>Requested By</th>
                      <th className='text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-50'>Reason</th>
                      <th className='text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-50'>Lines</th>
                      <th className='text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-50'>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adjustments.map((adj) => (
                      <tr
                        key={adj._id}
                        onClick={() => setSlideOverItem(adj)}
                        className='border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer'
                      >
                        <td className='py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-400 max-w-[120px] truncate'>
                          {adj.orderAdjustmentId || adj._id}
                        </td>
                        <td className='py-3 px-4 text-sm text-slate-900 dark:text-slate-50'>{adj.dispatchAdviceId}</td>
                        <td className='py-3 px-4 text-sm text-slate-600 dark:text-slate-400'>{adj.requestedByPartyId}</td>
                        <td className='py-3 px-4 text-sm text-slate-600 dark:text-slate-400 max-w-[200px] truncate'>{adj.reason}</td>
                        <td className='py-3 px-4 text-sm text-slate-600 dark:text-slate-400'>{adj.adjustments?.length ?? 0}</td>
                        <td className='py-3 px-4 text-sm text-slate-600 dark:text-slate-400'>{formatDate(adj.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Detail SlideOver */}
      <SlideOver
        isOpen={!!slideOverItem}
        onClose={() => setSlideOverItem(null)}
        title={slideOverItem ? `Adjustment ${slideOverItem.orderAdjustmentId || slideOverItem._id}` : 'Adjustment Details'}
      >
        {slideOverItem && (
          <div className='space-y-6'>
            <div>
              <h3 className='text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3'>Details</h3>
              <dl className='space-y-3'>
                <div className='flex justify-between'>
                  <dt className='text-sm text-slate-500 dark:text-slate-400'>Adjustment ID</dt>
                  <dd className='text-sm font-mono text-slate-900 dark:text-slate-50 break-all text-right max-w-[280px]'>
                    {slideOverItem.orderAdjustmentId || slideOverItem._id}
                  </dd>
                </div>
                <div className='flex justify-between'>
                  <dt className='text-sm text-slate-500 dark:text-slate-400'>Dispatch Advice ID</dt>
                  <dd className='text-sm font-medium text-slate-900 dark:text-slate-50'>{slideOverItem.dispatchAdviceId}</dd>
                </div>
                <div className='flex justify-between'>
                  <dt className='text-sm text-slate-500 dark:text-slate-400'>Requested By</dt>
                  <dd className='text-sm text-slate-900 dark:text-slate-50'>{slideOverItem.requestedByPartyId}</dd>
                </div>
                <div className='flex justify-between'>
                  <dt className='text-sm text-slate-500 dark:text-slate-400'>Reason</dt>
                  <dd className='text-sm text-slate-900 dark:text-slate-50 text-right max-w-[280px]'>{slideOverItem.reason}</dd>
                </div>
                <div className='flex justify-between'>
                  <dt className='text-sm text-slate-500 dark:text-slate-400'>Created</dt>
                  <dd className='text-sm text-slate-900 dark:text-slate-50'>{formatDate(slideOverItem.createdAt)}</dd>
                </div>
              </dl>
            </div>

            {slideOverItem.adjustments && slideOverItem.adjustments.length > 0 && (
              <>
                <hr className='border-slate-200 dark:border-slate-700' />
                <div>
                  <h3 className='text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3'>
                    Adjustment Lines
                  </h3>
                  <div className='space-y-3'>
                    {slideOverItem.adjustments.map((line, idx) => (
                      <div key={idx} className='p-3 rounded-md bg-slate-50 dark:bg-slate-800 space-y-1'>
                        <div className='flex justify-between text-sm'>
                          <span className='text-slate-500 dark:text-slate-400'>SKU</span>
                          <span className='font-medium text-slate-900 dark:text-slate-50'>{line.sku}</span>
                        </div>
                        <div className='flex justify-between text-sm'>
                          <span className='text-slate-500 dark:text-slate-400'>Field</span>
                          <span className='font-medium text-slate-900 dark:text-slate-50'>{line.field}</span>
                        </div>
                        <div className='flex justify-between text-sm'>
                          <span className='text-slate-500 dark:text-slate-400'>From</span>
                          <span className='text-slate-900 dark:text-slate-50'>{line.from}</span>
                        </div>
                        <div className='flex justify-between text-sm'>
                          <span className='text-slate-500 dark:text-slate-400'>To</span>
                          <span className='text-slate-900 dark:text-slate-50'>{line.to}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </SlideOver>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false); resetForm() }}
        title='Create Order Adjustment'
        size='lg'
        footer={
          <>
            <Button variant='secondary' onClick={() => { setIsCreateModalOpen(false); resetForm() }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCreate} isLoading={isSubmitting}>
              Create Adjustment
            </Button>
          </>
        }
      >
        <div className='space-y-4'>
          {submitError && (
            <div className='p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md'>
              <p className='text-sm text-red-600 dark:text-red-400'>{submitError}</p>
            </div>
          )}

          <Input
            label='Dispatch Advice ID *'
            placeholder='DA-xxxxxxxx'
            value={formData.dispatchAdviceId}
            onChange={e => {
              setFormData(prev => ({ ...prev, dispatchAdviceId: e.target.value }))
              setFieldErrors(prev => ({ ...prev, dispatchAdviceId: '' }))
            }}
            error={fieldErrors.dispatchAdviceId}
          />

          <Input
            label='Reason *'
            placeholder='Reason for adjustment'
            value={formData.reason}
            onChange={e => {
              setFormData(prev => ({ ...prev, reason: e.target.value }))
              setFieldErrors(prev => ({ ...prev, reason: '' }))
            }}
            error={fieldErrors.reason}
          />

          <div>
            <div className='flex items-center justify-between mb-2'>
              <p className='text-sm font-medium text-slate-700 dark:text-slate-300'>Adjustment Lines *</p>
              <button
                type='button'
                onClick={addLine}
                className='text-xs text-blue-600 dark:text-blue-400 hover:underline'
              >
                + Add line
              </button>
            </div>

            <div className='space-y-4'>
              {lines.map((line, idx) => (
                <div key={idx} className='p-3 border border-slate-200 dark:border-slate-700 rounded-md space-y-3'>
                  <div className='flex items-center justify-between'>
                    <span className='text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase'>Line {idx + 1}</span>
                    {lines.length > 1 && (
                      <button
                        type='button'
                        onClick={() => removeLine(idx)}
                        className='text-xs text-red-500 hover:text-red-700'
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className='grid grid-cols-2 gap-3'>
                    <Input
                      label='SKU *'
                      placeholder='ITEM-001'
                      value={line.sku}
                      onChange={e => updateLine(idx, 'sku', e.target.value)}
                      error={lineErrors[idx]?.sku}
                    />
                    <Input
                      label='Field *'
                      placeholder='quantity'
                      value={line.field}
                      onChange={e => updateLine(idx, 'field', e.target.value)}
                      error={lineErrors[idx]?.field}
                    />
                    <Input
                      label='From *'
                      placeholder='Original value'
                      value={line.from}
                      onChange={e => updateLine(idx, 'from', e.target.value)}
                      error={lineErrors[idx]?.from}
                    />
                    <Input
                      label='To *'
                      placeholder='New value'
                      value={line.to}
                      onChange={e => updateLine(idx, 'to', e.target.value)}
                      error={lineErrors[idx]?.to}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default OrderAdjustmentsPage
