import React, { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/context/AuthContext'
import { createApiClients } from '@/services/apiClient'
import { AxiosError } from 'axios'

interface AdjustmentLine {
  sku: string
  field: 'QUANTITY' | 'DESCRIPTION' | 'UNIT'
  from: string
  to: string
}

interface OrderAdjustment {
  orderAdjustmentId: string
  dispatchAdviceId: string
  requestedByPartyId: string
  reason: string
  adjustments: AdjustmentLine[]
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const err = error.response?.data?.error
    if (typeof err === 'string') return err
    if (typeof err === 'object' && err?.message) return err.message
    return error.message ?? fallback
  }
  if (error instanceof Error) return error.message
  return fallback
}

const statusVariant = (status: OrderAdjustment['status']): 'default' | 'warning' | 'success' | 'danger' => {
  if (status === 'APPROVED') return 'success'
  if (status === 'REJECTED') return 'danger'
  return 'warning'
}

const emptyLine = (): AdjustmentLine => ({ sku: '', field: 'QUANTITY', from: '', to: '' })

const OrderAdjustmentsPage: React.FC = () => {
  const { tokens, apiCredentials, role, user } = useAuth()
  const isBuyer = role === 'buyer'
  const [adjustments, setAdjustments] = useState<OrderAdjustment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true)
        setError(null)
        const clients = createApiClients(tokens || {}, apiCredentials || {})
        const response = await clients.adjustmentApi.get<any>('/')
        const raw = (response as any)?.adjustments ?? (Array.isArray(response) ? response : [])
        setAdjustments(raw)
      } catch (err) {
        setError(extractErrorMessage(err, 'Failed to load order adjustments'))
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [tokens, apiCredentials])

  const handleCreate = async (formData: any) => {
    try {
      const clients = createApiClients(tokens || {}, apiCredentials || {})
      const payload = {
        despatchAdviceId: formData.despatchAdviceId,
        requestedByPartyId: user?.id ?? '',
        reason: formData.reason,
        adjustments: formData.lines.map((l: AdjustmentLine) => ({
          sku: l.sku,
          field: l.field,
          from: l.from,
          to: Number(l.to),
        })),
      }
      const created = await clients.adjustmentApi.post<OrderAdjustment>('/', payload)
      setAdjustments(prev => [created as any, ...prev])
      setIsModalOpen(false)
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to create order adjustment'))
    }
  }

  return (
    <div>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-3xl font-bold text-slate-900 dark:text-slate-50'>Order Adjustments</h1>
        {isBuyer ? (
          <Button onClick={() => setIsModalOpen(true)} disabled={loading}>
            <Plus size={18} className='mr-2' />
            New Adjustment
          </Button>
        ) : (
          <span className='text-sm text-slate-500 dark:text-slate-400'>
            Only buyers can request adjustments
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
            <p className='text-slate-600 dark:text-slate-400'>Loading adjustments...</p>
          </CardBody>
        </Card>
      )}

      <Card>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='border-b border-slate-200 dark:border-slate-800'>
                <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>ID</th>
                <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>Dispatch Ref</th>
                <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>Reason</th>
                <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>Lines</th>
                <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>Status</th>
                <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>Created</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className='px-6 py-8 text-center text-slate-500 dark:text-slate-400'>
                    No order adjustments found.
                  </td>
                </tr>
              )}
              {adjustments.map(adj => (
                <tr
                  key={adj.orderAdjustmentId}
                  className='border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors'
                >
                  <td className='px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-50'>
                    {adj.orderAdjustmentId}
                  </td>
                  <td className='px-6 py-4 text-sm text-slate-600 dark:text-slate-400'>
                    {adj.dispatchAdviceId}
                  </td>
                  <td className='px-6 py-4 text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate'>
                    {adj.reason}
                  </td>
                  <td className='px-6 py-4 text-sm text-slate-600 dark:text-slate-400'>
                    {adj.adjustments?.length ?? 0} line(s)
                  </td>
                  <td className='px-6 py-4 text-sm'>
                    <Badge variant={statusVariant(adj.status)} size='sm'>
                      {adj.status}
                    </Badge>
                  </td>
                  <td className='px-6 py-4 text-sm text-slate-600 dark:text-slate-400'>
                    {adj.createdAt ? new Date(adj.createdAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <CreateAdjustmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  )
}

interface CreateAdjustmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
}

const CreateAdjustmentModal: React.FC<CreateAdjustmentModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [despatchAdviceId, setDespatchAdviceId] = useState('')
  const [reason, setReason] = useState('')
  const [lines, setLines] = useState<AdjustmentLine[]>([emptyLine()])
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = () => {
    setFormError(null)
    if (!despatchAdviceId || !reason) {
      setFormError('Dispatch Advice ID and reason are required')
      return
    }
    if (lines.some(l => !l.sku || !l.to)) {
      setFormError('Each adjustment line needs a SKU and target value')
      return
    }
    onSubmit({ despatchAdviceId, reason, lines })
    setDespatchAdviceId('')
    setReason('')
    setLines([emptyLine()])
  }

  const updateLine = (idx: number, field: keyof AdjustmentLine, value: string) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l))
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title='Request Order Adjustment'
      footer={
        <>
          <Button variant='secondary' onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Submit</Button>
        </>
      }
    >
      <div className='space-y-4'>
        {formError && <p className='text-sm text-red-600 dark:text-red-400'>{formError}</p>}
        <Input
          label='Dispatch Advice ID *'
          placeholder='DA-xxxxxxxx'
          value={despatchAdviceId}
          onChange={e => setDespatchAdviceId(e.target.value)}
        />
        <Input
          label='Reason *'
          placeholder='Reason for adjustment'
          value={reason}
          onChange={e => setReason(e.target.value)}
        />

        <div>
          <div className='flex justify-between items-center mb-2'>
            <p className='text-sm font-medium text-slate-700 dark:text-slate-300'>Adjustment Lines *</p>
            <button
              type='button'
              onClick={() => setLines(prev => [...prev, emptyLine()])}
              className='text-xs text-blue-600 hover:underline'
            >
              + Add Line
            </button>
          </div>
          <div className='space-y-2'>
            {lines.map((line, idx) => (
              <div key={idx} className='grid grid-cols-12 gap-1 items-end'>
                <div className='col-span-3'>
                  <Input
                    label={idx === 0 ? 'SKU *' : ''}
                    placeholder='SKU-001'
                    value={line.sku}
                    onChange={e => updateLine(idx, 'sku', e.target.value)}
                  />
                </div>
                <div className='col-span-3'>
                  <label className={`block text-sm font-medium text-slate-700 dark:text-slate-300 ${idx === 0 ? 'mb-1' : 'hidden'}`}>
                    Field *
                  </label>
                  <select
                    value={line.field}
                    onChange={e => updateLine(idx, 'field', e.target.value)}
                    className='w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    <option value='QUANTITY'>QUANTITY</option>
                    <option value='DESCRIPTION'>DESCRIPTION</option>
                    <option value='UNIT'>UNIT</option>
                  </select>
                </div>
                <div className='col-span-2'>
                  <Input
                    label={idx === 0 ? 'From' : ''}
                    placeholder='old'
                    value={line.from}
                    onChange={e => updateLine(idx, 'from', e.target.value)}
                  />
                </div>
                <div className='col-span-3'>
                  <Input
                    label={idx === 0 ? 'To *' : ''}
                    placeholder='new'
                    value={line.to}
                    onChange={e => updateLine(idx, 'to', e.target.value)}
                  />
                </div>
                <div className='col-span-1 pb-1'>
                  {lines.length > 1 && (
                    <button
                      type='button'
                      onClick={() => setLines(prev => prev.filter((_, i) => i !== idx))}
                      className='p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded'
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default OrderAdjustmentsPage
