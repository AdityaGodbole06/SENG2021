import React, { useState } from 'react'
import { Plus, Download, Trash2, Eye } from 'lucide-react'
import { Invoice } from '@/types'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

const InvoicesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [invoices] = useState<Invoice[]>([
    {
      id: '1',
      invoiceNumber: 'INV-001',
      orderId: 'ORD-001',
      buyerParty: 'Buyer Corp',
      sellerParty: 'Seller Inc',
      totalAmount: 5000,
      invoiceDate: '2024-04-15',
      dueDate: '2024-05-15',
      status: 'paid',
    },
    {
      id: '2',
      invoiceNumber: 'INV-002',
      orderId: 'ORD-002',
      buyerParty: 'Buyer Corp',
      sellerParty: 'Seller Inc',
      totalAmount: 3200,
      invoiceDate: '2024-04-16',
      dueDate: '2024-05-16',
      status: 'unpaid',
    },
  ])

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.buyerParty.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || invoice.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusVariant = (status: Invoice['status']): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
    const variants: Record<Invoice['status'], 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
      unpaid: 'danger',
      paid: 'success',
      overdue: 'warning',
      cancelled: 'default',
    }
    return variants[status]
  }

  return (
    <div>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-3xl font-bold text-slate-900 dark:text-slate-50'>Invoices</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={18} className='mr-2' />
          Generate Invoice
        </Button>
      </div>

      {/* Search and Filter */}
      <Card className='mb-6'>
        <CardBody className='flex gap-4'>
          <div className='flex-1'>
            <Input
              placeholder='Search by invoice number or buyer...'
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
            <option value='unpaid'>Unpaid</option>
            <option value='paid'>Paid</option>
            <option value='overdue'>Overdue</option>
            <option value='cancelled'>Cancelled</option>
          </select>
        </CardBody>
      </Card>

      {/* Invoices Table */}
      <Card>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead>
              <tr className='border-b border-slate-200 dark:border-slate-800'>
                <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>
                  Invoice #
                </th>
                <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>
                  Order ID
                </th>
                <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>
                  Buyer
                </th>
                <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>
                  Amount
                </th>
                <th className='px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50'>
                  Due Date
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
              {filteredInvoices.map(invoice => (
                <tr
                  key={invoice.id}
                  className='border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors'
                >
                  <td className='px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-50'>
                    {invoice.invoiceNumber}
                  </td>
                  <td className='px-6 py-4 text-sm text-slate-600 dark:text-slate-400'>
                    {invoice.orderId}
                  </td>
                  <td className='px-6 py-4 text-sm text-slate-600 dark:text-slate-400'>
                    {invoice.buyerParty}
                  </td>
                  <td className='px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-50'>
                    ${invoice.totalAmount.toLocaleString()}
                  </td>
                  <td className='px-6 py-4 text-sm text-slate-600 dark:text-slate-400'>
                    {invoice.dueDate}
                  </td>
                  <td className='px-6 py-4 text-sm'>
                    <Badge variant={getStatusVariant(invoice.status)} size='sm'>
                      {invoice.status}
                    </Badge>
                  </td>
                  <td className='px-6 py-4 text-sm flex gap-2'>
                    <button className='p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors'>
                      <Eye size={16} />
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

      {/* Generate Invoice Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title='Generate Invoice'
        footer={
          <>
            <Button variant='secondary' onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsCreateModalOpen(false)}>Generate</Button>
          </>
        }
      >
        <div className='space-y-4'>
          <Input label='Order ID' placeholder='ORD-001' />
          <Input label='Invoice Date' type='date' />
          <Input label='Due Date' type='date' />
          <Input label='Total Amount' type='number' placeholder='0.00' />
          <div>
            <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'>
              Buyer Details
            </label>
            <Input placeholder='Buyer name' />
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default InvoicesPage
