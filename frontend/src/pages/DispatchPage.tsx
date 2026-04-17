import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Download } from 'lucide-react'
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
    const matchesSearch = dispatch.despatchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispatch.orderRef.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || dispatch.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusVariant = (status: DespatchAdvice['status']): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
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

  const handleCreateDispatch = async (formData: any) => {
    try {
      const clients = createApiClients(tokens || {}, apiCredentials || {})
      const newDispatch = await dispatchService.createDispatch(clients, {
        despatchNumber: formData.orderNumber,
        orderRef: formData.orderNumber,
        dispatchDate: formData.dispatchDate,
        deliveryParty: formData.deliveryParty || '',
        expectedArrival: formData.expectedArrival,
      })
      setDispatches([...dispatches, newDispatch])
      setIsCreateModalOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create dispatch')
    }
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
                    {dispatch.expectedArrival}
                  </td>
                  <td className='px-6 py-4 text-sm'>
                    <Badge variant={getStatusVariant(dispatch.status)} size='sm'>
                      {dispatch.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className='px-6 py-4 text-sm flex gap-2'>
                    <button
                      onClick={() => alert('Edit functionality coming soon')}
                      className='p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors'
                      title='Edit dispatch'
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDownload(dispatch)}
                      className='p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors'
                      title='Download as XML'
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(dispatch.id)}
                      className='p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors text-red-600'
                      title='Delete dispatch'
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

      {/* Create Dispatch Modal */}
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
  onSubmit: (data: any) => void
}

const CreateDispatchModal: React.FC<CreateDispatchModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    orderNumber: '',
    dispatchDate: '',
    expectedArrival: '',
    deliveryParty: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.orderNumber || !formData.dispatchDate) {
      alert('Please fill in required fields')
      return
    }
    onSubmit(formData)
    setFormData({
      orderNumber: '',
      dispatchDate: '',
      expectedArrival: '',
      deliveryParty: '',
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title='Create Dispatch Advice'
      footer={
        <>
          <Button variant='secondary' onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className='space-y-4'>
        <Input
          label='Order Reference'
          placeholder='ORD-001'
          value={formData.orderNumber}
          onChange={e => setFormData({ ...formData, orderNumber: e.target.value })}
          required
        />
        <Input
          label='Dispatch Date'
          type='date'
          value={formData.dispatchDate}
          onChange={e => setFormData({ ...formData, dispatchDate: e.target.value })}
          required
        />
        <Input
          label='Expected Arrival'
          type='date'
          value={formData.expectedArrival}
          onChange={e => setFormData({ ...formData, expectedArrival: e.target.value })}
        />
        <Input
          label='Delivery Party'
          placeholder='Buyer name'
          value={formData.deliveryParty}
          onChange={e => setFormData({ ...formData, deliveryParty: e.target.value })}
        />
      </form>
    </Modal>
  )
}

export default DispatchPage