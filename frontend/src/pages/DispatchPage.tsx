import React, { useState } from 'react'
import { Plus, Edit2, Trash2, Download } from 'lucide-react'
import { DespatchAdvice } from '@/types'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

const DispatchPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [dispatches] = useState<DespatchAdvice[]>([
    {
      id: '1',
      despatchNumber: 'DSP-001',
      orderRef: 'ORD-001',
      dispatchDate: '2024-04-15',
      deliveryParty: 'Buyer Corp',
      expectedArrival: '2024-04-20',
      status: 'dispatched',
    },
    {
      id: '2',
      despatchNumber: 'DSP-002',
      orderRef: 'ORD-002',
      dispatchDate: '2024-04-16',
      deliveryParty: 'Buyer Corp',
      expectedArrival: '2024-04-25',
      status: 'in_transit',
    },
  ])

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

  return (
    <div>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-3xl font-bold text-slate-900 dark:text-slate-50'>Dispatch</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={18} className='mr-2' />
          Create Dispatch
        </Button>
      </div>

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

      {/* Create Dispatch Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title='Create Dispatch Advice'
        footer={
          <>
            <Button variant='secondary' onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsCreateModalOpen(false)}>Create</Button>
          </>
        }
      >
        <div className='space-y-4'>
          <Input label='Order Reference' placeholder='ORD-001' />
          <Input label='Dispatch Date' type='date' />
          <Input label='Expected Arrival' type='date' />
          <div>
            <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'>
              Status
            </label>
            <select className='w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500'>
              <option>Dispatched</option>
              <option>In Transit</option>
              <option>Delivered</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default DispatchPage