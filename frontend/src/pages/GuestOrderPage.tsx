import React, { useState } from 'react'
import { Card, CardBody } from '@/components/ui/Card'
import { orderService } from '@/services/orderService'

interface FormData {
  orderNumber: string
  buyerParty: string
  sellerParty: string
  amount: string
  orderDate: string
  deliveryDate: string
}

const GuestOrderPage: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    orderNumber: '',
    buyerParty: '',
    sellerParty: '',
    amount: '',
    orderDate: '',
    deliveryDate: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [xmlContent, setXmlContent] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleCreateGuestOrder = async (e: React.FormEvent) => {
    e.preventDefault()

    const today = new Date().toISOString().split('T')[0]
    if (!formData.orderNumber || !formData.buyerParty || !formData.sellerParty || !formData.amount) {
      setError('Please fill in all required fields')
      return
    }
    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      setError('Amount must be greater than 0')
      return
    }
    if (formData.orderDate && formData.orderDate < today) {
      setError('Order date cannot be in the past')
      return
    }
    if (formData.deliveryDate) {
      if (formData.deliveryDate < today) {
        setError('Delivery date cannot be in the past')
        return
      }
      if (formData.orderDate && formData.deliveryDate < formData.orderDate) {
        setError('Delivery date must be after order date')
        return
      }
    }

    try {
      setLoading(true)
      setError(null)
      setSuccess(false)

      const result = await orderService.createGuestOrder({
        orderNumber: formData.orderNumber,
        buyerParty: formData.buyerParty,
        sellerParty: formData.sellerParty,
        amount: parseFloat(formData.amount),
        orderDate: formData.orderDate || new Date().toISOString().split('T')[0],
        deliveryDate: formData.deliveryDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      })

      setXmlContent(result.ubl)
      setSuccess(true)

      // Reset form
      setFormData({
        orderNumber: '',
        buyerParty: '',
        sellerParty: '',
        amount: '',
        orderDate: '',
        deliveryDate: '',
      })
    } catch (err) {
      setError(`Failed to create guest order: ${err instanceof Error ? err.message : String(err)}`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadXML = () => {
    if (!xmlContent) return

    const element = document.createElement('a')
    element.setAttribute('href', `data:text/xml;charset=utf-8,${encodeURIComponent(xmlContent)}`)
    element.setAttribute('download', `order-${formData.orderNumber}.xml`)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800'>
      {/* Header */}
      <div className='bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700'>
        <div className='max-w-4xl mx-auto px-6 py-8'>
          <div className='flex items-center gap-3 mb-2'>
            <div className='w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center'>
              <span className='text-blue-600 dark:text-blue-400 font-bold'>📦</span>
            </div>
            <h1 className='text-3xl font-bold text-slate-900 dark:text-slate-50'>Guest Order</h1>
          </div>
          <p className='text-slate-600 dark:text-slate-400'>Create and download an order as UBL XML without creating an account</p>
        </div>
      </div>

      <div className='max-w-4xl mx-auto px-6 py-8'>
        {/* Error Message */}
        {error && (
          <div className='mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400'>
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className='mb-6 p-4 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400'>
            ✓ Guest order created successfully! Download the XML file below.
          </div>
        )}

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Form */}
          <div className='lg:col-span-2'>
            <Card>
              <CardBody>
                <h2 className='text-xl font-semibold text-slate-900 dark:text-slate-50 mb-4'>Order Details</h2>
                <form onSubmit={handleCreateGuestOrder} className='space-y-4'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                        Order Number *
                      </label>
                      <input
                        type='text'
                        name='orderNumber'
                        value={formData.orderNumber}
                        onChange={handleInputChange}
                        placeholder='e.g., ORD-GUEST-001'
                        className='w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
                      />
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                        Amount (USD) *
                      </label>
                      <input
                        type='number'
                        name='amount'
                        value={formData.amount}
                        onChange={handleInputChange}
                        placeholder='e.g., 5000'
                        step='0.01'
                        className='w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
                      />
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                        Buyer Party *
                      </label>
                      <input
                        type='text'
                        name='buyerParty'
                        value={formData.buyerParty}
                        onChange={handleInputChange}
                        placeholder='e.g., ABC Trading Ltd'
                        className='w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
                      />
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                        Seller Party *
                      </label>
                      <input
                        type='text'
                        name='sellerParty'
                        value={formData.sellerParty}
                        onChange={handleInputChange}
                        placeholder='e.g., XYZ Exports Inc'
                        className='w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
                      />
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                        Order Date
                      </label>
                      <input
                        type='date'
                        name='orderDate'
                        value={formData.orderDate}
                        onChange={handleInputChange}
                        className='w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500'
                      />
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1'>
                        Delivery Date
                      </label>
                      <input
                        type='date'
                        name='deliveryDate'
                        value={formData.deliveryDate}
                        onChange={handleInputChange}
                        className='w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500'
                      />
                    </div>
                  </div>

                  <button
                    type='submit'
                    disabled={loading}
                    className='w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-medium py-2 px-4 rounded-lg transition-colors'
                  >
                    {loading ? 'Creating Order...' : 'Create Guest Order'}
                  </button>
                </form>
              </CardBody>
            </Card>
          </div>

          {/* XML Preview & Download */}
          <div className='lg:col-span-1'>
            <Card>
              <CardBody>
                <h2 className='text-lg font-semibold text-slate-900 dark:text-slate-50 mb-4'>Generated XML</h2>
                {xmlContent ? (
                  <div className='space-y-4'>
                    <div className='bg-slate-50 dark:bg-slate-800 rounded p-3 max-h-64 overflow-y-auto'>
                      <pre className='text-xs text-slate-700 dark:text-slate-300 font-mono whitespace-pre-wrap break-words'>
                        {xmlContent.substring(0, 500)}...
                      </pre>
                    </div>
                    <button
                      onClick={handleDownloadXML}
                      className='w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors'
                    >
                      ⬇️ Download XML
                    </button>
                    <p className='text-xs text-slate-500 dark:text-slate-400'>
                      This order is not saved. Only the XML file is generated for download.
                    </p>
                  </div>
                ) : (
                  <div className='text-center py-8 text-slate-500 dark:text-slate-400'>
                    <p>Create an order to generate XML</p>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GuestOrderPage
