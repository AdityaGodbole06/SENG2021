import React, { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SlideOver } from '@/components/ui/SlideOver'
import { useAuth } from '@/context/AuthContext'
import { createApiClients } from '@/services/apiClient'

interface FulfilmentCancellation {
  _id: string
  fulfilmentCancellationId?: string
  dispatchAdviceId: string
  requestedByPartyId: string
  reason: string
  createdAt?: string
}

const emptyForm = {
  dispatchAdviceId: '',
  requestedByPartyId: '',
  reason: '',
}

const FulfilmentCancellationPage: React.FC = () => {
  const { tokens, apiCredentials, role } = useAuth()
  const isSupplier = role === 'supplier'

  const [cancellations, setCancellations] = useState<FulfilmentCancellation[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [formData, setFormData] = useState(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [slideOverItem, setSlideOverItem] = useState<FulfilmentCancellation | null>(null)

  useEffect(() => {
    fetchCancellations()
  }, [tokens, apiCredentials])

  const fetchCancellations = async () => {
    try {
      setLoading(true)
      setPageError(null)
      const clients = createApiClients(tokens || {}, apiCredentials || {})
      const data = await clients.cancellationApi.get<FulfilmentCancellation[]>('/')
      setCancellations(Array.isArray(data) ? data : [])
    } catch (err) {
      setPageError('Failed to load fulfilment cancellations')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!formData.dispatchAdviceId.trim()) errs.dispatchAdviceId = 'Dispatch Advice ID is required'
    if (!formData.requestedByPartyId.trim()) errs.requestedByPartyId = 'Requested By Party ID is required'
    if (!formData.reason.trim()) errs.reason = 'Reason is required'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleCreate = async () => {
    if (!validate()) return
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      const clients = createApiClients(tokens || {}, apiCredentials || {})
      const payload = {
        dispatchAdviceId: formData.dispatchAdviceId,
        requestedByPartyId: formData.requestedByPartyId,
        reason: formData.reason,
      }
      await clients.cancellationApi.post<FulfilmentCancellation>('/', payload)
      resetForm()
      setIsCreateModalOpen(false)
      await fetchCancellations()
    } catch (err: any) {
      const status = err?.response?.status
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to create cancellation'
      if (status === 404) {
        setSubmitError('Dispatch not found. Please check the Dispatch Advice ID.')
      } else if (status === 403) {
        setSubmitError('Only suppliers can create fulfilment cancellations.')
      } else if (status === 400) {
        setSubmitError(`Validation error: ${msg}`)
      } else {
        setSubmitError(msg)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData(emptyForm)
    setFieldErrors({})
    setSubmitError(null)
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
            <h1 className='text-3xl font-bold text-slate-900 dark:text-slate-50'>Fulfilment Cancellations</h1>
            <p className='text-slate-600 dark:text-slate-400'>View and create fulfilment cancellation requests</p>
          </div>
          {isSupplier && (
            <Button onClick={() => { resetForm(); setIsCreateModalOpen(true) }} className='flex items-center gap-2'>
              <Plus size={20} />
              Create Cancellation
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
              <div className='text-center py-12 text-slate-500'>Loading cancellations...</div>
            ) : cancellations.length === 0 ? (
              <div className='text-center py-12 text-slate-500'>No fulfilment cancellations yet.</div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead>
                    <tr className='border-b border-slate-200 dark:border-slate-700'>
                      <th className='text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-50'>ID</th>
                      <th className='text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-50'>Dispatch Advice ID</th>
                      <th className='text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-50'>Requested By</th>
                      <th className='text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-50'>Reason</th>
                      <th className='text-left py-3 px-4 font-semibold text-slate-900 dark:text-slate-50'>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cancellations.map((item) => (
                      <tr
                        key={item._id}
                        onClick={() => setSlideOverItem(item)}
                        className='border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer'
                      >
                        <td className='py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-400 max-w-[140px] truncate'>
                          {item.fulfilmentCancellationId || item._id}
                        </td>
                        <td className='py-3 px-4 text-sm text-slate-900 dark:text-slate-50'>{item.dispatchAdviceId}</td>
                        <td className='py-3 px-4 text-sm text-slate-600 dark:text-slate-400'>{item.requestedByPartyId}</td>
                        <td className='py-3 px-4 text-sm text-slate-600 dark:text-slate-400 max-w-[200px] truncate'>{item.reason}</td>
                        <td className='py-3 px-4 text-sm text-slate-600 dark:text-slate-400'>{formatDate(item.createdAt)}</td>
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
        title={slideOverItem ? `Cancellation ${slideOverItem.fulfilmentCancellationId || slideOverItem._id}` : 'Cancellation Details'}
      >
        {slideOverItem && (
          <div className='space-y-6'>
            <div>
              <h3 className='text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3'>Details</h3>
              <dl className='space-y-3'>
                <div className='flex justify-between'>
                  <dt className='text-sm text-slate-500 dark:text-slate-400'>Cancellation ID</dt>
                  <dd className='text-sm font-mono text-slate-900 dark:text-slate-50 break-all text-right max-w-[280px]'>
                    {slideOverItem.fulfilmentCancellationId || slideOverItem._id}
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
          </div>
        )}
      </SlideOver>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false); resetForm() }}
        title='Create Fulfilment Cancellation'
        footer={
          <>
            <Button variant='secondary' onClick={() => { setIsCreateModalOpen(false); resetForm() }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCreate} isLoading={isSubmitting}>
              Create Cancellation
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
            label='Requested By Party ID *'
            placeholder='Your party ID'
            value={formData.requestedByPartyId}
            onChange={e => {
              setFormData(prev => ({ ...prev, requestedByPartyId: e.target.value }))
              setFieldErrors(prev => ({ ...prev, requestedByPartyId: '' }))
            }}
            error={fieldErrors.requestedByPartyId}
          />

          <Input
            label='Reason *'
            placeholder='Reason for cancellation'
            value={formData.reason}
            onChange={e => {
              setFormData(prev => ({ ...prev, reason: e.target.value }))
              setFieldErrors(prev => ({ ...prev, reason: '' }))
            }}
            error={fieldErrors.reason}
          />
        </div>
      </Modal>
    </div>
  )
}

export default FulfilmentCancellationPage
