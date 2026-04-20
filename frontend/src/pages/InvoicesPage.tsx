import React, { useState, useEffect } from 'react'
import { Plus, Download, Trash2 } from 'lucide-react'
import { Invoice } from '@/types'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { SlideOver } from '@/components/ui/SlideOver'
import { useAuth } from '@/context/AuthContext'
import { createApiClients } from '@/services/apiClient'
import { invoicesService } from '@/services/invoicesService'

const InvoicesPage: React.FC = () => {
  const { tokens, apiCredentials } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [slideOverInvoice, setSlideOverInvoice] = useState<Invoice | null>(null)

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true)
        setError(null)
        const clients = createApiClients(tokens || {}, apiCredentials || {})
        const data = await invoicesService.getInvoices(clients)
        setInvoices(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invoices')
      } finally {
        setLoading(false)
      }
    }
    fetchInvoices()
  }, [tokens, apiCredentials])

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

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (confirm('Are you sure you want to delete this invoice?')) {
      try {
        const clients = createApiClients(tokens || {}, apiCredentials || {})
        const success = await invoicesService.deleteInvoice(clients, id)
        if (success) {
          setInvoices(invoices.filter(i => i.id !== id))
          if (slideOverInvoice?.id === id) setSlideOverInvoice(null)
        } else {
          alert('Failed to delete invoice')
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error deleting invoice')
        console.error(err)
      }
    }
  }

  const handleDownload = async (invoice: Invoice, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      const headers: Record<string, string> = {}
      if (apiCredentials?.gptlessToken) {
        headers['X-Gptless-Token'] = apiCredentials.gptlessToken
      }
      const response = await fetch(
        `http://localhost:3000/api/proxy/invoices/${invoice.id}/xml`,
        { headers }
      )
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        alert(err.error || 'Failed to download invoice XML')
        return
      }
      const xml = await response.text()
      const blob = new Blob([xml], { type: 'application/xml' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoice.invoiceNumber}.xml`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Error downloading invoice XML')
      console.error(err)
    }
  }

  const handleCreateInvoice = async (formData: any) => {
    try {
      const clients = createApiClients(tokens || {}, apiCredentials || {})
      const newInvoice = await invoicesService.createInvoice(clients, {
        invoiceNumber: formData.invoiceNumber || `INV-${Date.now()}`,
        orderId: formData.orderId,
        buyerParty: formData.buyerParty,
        sellerParty: formData.sellerParty || 'Seller Inc',
        totalAmount: parseFloat(formData.totalAmount) || 0,
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate,
      })
      if (newInvoice) {
        setInvoices([...invoices, newInvoice])
        setIsCreateModalOpen(false)
        alert('Invoice created successfully!')
      } else {
        alert('Failed to create invoice')
      }
    } catch (err) {
      alert('Error creating invoice')
      console.error(err)
    }
  }

  return (
    <div>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-3xl font-bold text-slate-900 dark:text-slate-50'>Invoices</h1>
        <Button onClick={() => setIsCreateModalOpen(true)} disabled={loading}>
          <Plus size={18} className='mr-2' />
          Generate Invoice
        </Button>
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
            <p className='text-slate-600 dark:text-slate-400'>Loading invoices...</p>
          </CardBody>
        </Card>
      )}

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
                  onClick={() => setSlideOverInvoice(invoice)}
                  className='border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer'
                >
                  <td className='px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-50'>
                    {invoice.invoiceNumber}
                  </td>
                  <td className='px-6 py-4 text-sm text-slate-600 dark:text-slate-400'>
                    {invoice.orderId}
                  </td>
                  <td className='px-6 py-4 text-sm text-slate-600 dark:text-slate-400'>
                    {typeof invoice.buyerParty === 'string'
                      ? invoice.buyerParty
                      : (invoice.buyerParty as any)?.name || '—'}
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
                  <td className='px-6 py-4 text-sm'>
                    <div className='flex gap-2' onClick={e => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleDownload(invoice, e)}
                        className='p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors'
                        title='Download as XML'
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(invoice.id, e)}
                        className='p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors text-red-600'
                        title='Delete invoice'
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invoice Detail SlideOver */}
      <SlideOver
        isOpen={!!slideOverInvoice}
        onClose={() => setSlideOverInvoice(null)}
        title={slideOverInvoice ? `Invoice ${slideOverInvoice.invoiceNumber}` : 'Invoice Details'}
      >
        {slideOverInvoice && (
          <div className='space-y-6'>
            <div>
              <h3 className='text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3'>
                Invoice Details
              </h3>
              <dl className='space-y-3'>
                <div className='flex justify-between'>
                  <dt className='text-sm text-slate-500 dark:text-slate-400'>Invoice #</dt>
                  <dd className='text-sm font-medium text-slate-900 dark:text-slate-50'>{slideOverInvoice.invoiceNumber}</dd>
                </div>
                <div className='flex justify-between'>
                  <dt className='text-sm text-slate-500 dark:text-slate-400'>Status</dt>
                  <dd><Badge variant={getStatusVariant(slideOverInvoice.status)} size='sm'>{slideOverInvoice.status}</Badge></dd>
                </div>
                <div className='flex justify-between'>
                  <dt className='text-sm text-slate-500 dark:text-slate-400'>Order ID</dt>
                  <dd className='text-sm font-medium text-slate-900 dark:text-slate-50'>{slideOverInvoice.orderId || '—'}</dd>
                </div>
                <div className='flex justify-between'>
                  <dt className='text-sm text-slate-500 dark:text-slate-400'>Buyer</dt>
                  <dd className='text-sm font-medium text-slate-900 dark:text-slate-50'>
                    {typeof slideOverInvoice.buyerParty === 'string'
                      ? slideOverInvoice.buyerParty
                      : (slideOverInvoice.buyerParty as any)?.name || '—'}
                  </dd>
                </div>
                <div className='flex justify-between'>
                  <dt className='text-sm text-slate-500 dark:text-slate-400'>Seller</dt>
                  <dd className='text-sm font-medium text-slate-900 dark:text-slate-50'>
                    {typeof slideOverInvoice.sellerParty === 'string'
                      ? slideOverInvoice.sellerParty
                      : (slideOverInvoice.sellerParty as any)?.name || '—'}
                  </dd>
                </div>
                <div className='flex justify-between'>
                  <dt className='text-sm text-slate-500 dark:text-slate-400'>Total</dt>
                  <dd className='text-sm font-medium text-slate-900 dark:text-slate-50'>${slideOverInvoice.totalAmount.toLocaleString()}</dd>
                </div>
                <div className='flex justify-between'>
                  <dt className='text-sm text-slate-500 dark:text-slate-400'>Invoice Date</dt>
                  <dd className='text-sm text-slate-900 dark:text-slate-50'>{slideOverInvoice.invoiceDate || '—'}</dd>
                </div>
                <div className='flex justify-between'>
                  <dt className='text-sm text-slate-500 dark:text-slate-400'>Due Date</dt>
                  <dd className='text-sm text-slate-900 dark:text-slate-50'>{slideOverInvoice.dueDate || '—'}</dd>
                </div>
              </dl>
            </div>

            <div className='flex gap-3 pt-2'>
              <Button
                variant='ghost'
                onClick={() => handleDownload(slideOverInvoice)}
                className='flex items-center gap-2'
              >
                <Download size={16} />
                Download UBL XML
              </Button>
              <Button
                variant='ghost'
                onClick={() => handleDelete(slideOverInvoice.id)}
                className='flex items-center gap-2 text-red-600 hover:text-red-700'
              >
                <Trash2 size={16} />
                Delete
              </Button>
            </div>
          </div>
        )}
      </SlideOver>

      {/* Generate Invoice Modal */}
      <CreateInvoiceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateInvoice}
      />
    </div>
  )
}

interface CreateInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
}

const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    orderId: '',
    invoiceNumber: '',
    invoiceDate: '',
    dueDate: '',
    totalAmount: '',
    buyerParty: '',
    sellerParty: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.orderId || !formData.invoiceDate) {
      alert('Please fill in required fields')
      return
    }
    onSubmit(formData)
    setFormData({
      orderId: '',
      invoiceNumber: '',
      invoiceDate: '',
      dueDate: '',
      totalAmount: '',
      buyerParty: '',
      sellerParty: '',
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title='Generate Invoice'
      footer={
        <>
          <Button variant='secondary' onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Generate</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className='space-y-4'>
        <Input
          label='Order ID'
          placeholder='ORD-001'
          value={formData.orderId}
          onChange={e => setFormData({ ...formData, orderId: e.target.value })}
          required
        />
        <Input
          label='Invoice Date'
          type='date'
          value={formData.invoiceDate}
          onChange={e => setFormData({ ...formData, invoiceDate: e.target.value })}
          required
        />
        <Input
          label='Due Date'
          type='date'
          value={formData.dueDate}
          onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
        />
        <Input
          label='Total Amount'
          type='number'
          placeholder='0.00'
          value={formData.totalAmount}
          onChange={e => setFormData({ ...formData, totalAmount: e.target.value })}
        />
        <Input
          label='Buyer Party'
          placeholder='Buyer name'
          value={formData.buyerParty}
          onChange={e => setFormData({ ...formData, buyerParty: e.target.value })}
        />
        <Input
          label='Seller Party'
          placeholder='Seller name'
          value={formData.sellerParty}
          onChange={e => setFormData({ ...formData, sellerParty: e.target.value })}
        />
      </form>
    </Modal>
  )
}

export default InvoicesPage
