import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/context/AuthContext'
import { createApiClients } from '@/services/apiClient'
import axios from 'axios'

interface Order {
  _id: string
  orderNumber: string
  buyerParty: string
  sellerParty: string
  amount: number
  status: string
  createdAt: string
  updatedAt: string
}

interface DespatchAdvice {
  _id: string
  orderNumber: string
  shipmentDate: string
  createdAt: string
}

interface ReceiptAdvice {
  _id: string
  orderNumber: string
  receivedDate: string
  createdAt: string
}

const FulfillmentTrackingPage: React.FC = () => {
  const { tokens, apiCredentials } = useAuth()
  const [searchParams] = useSearchParams()
  const orderNumber = searchParams.get('orderNumber')

  const [order, setOrder] = useState<Order | null>(null)
  const [despatchAdvice, setDespatchAdvice] = useState<DespatchAdvice | null>(null)
  const [receiptAdvice, setReceiptAdvice] = useState<ReceiptAdvice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchFulfillmentData = async () => {
      if (!orderNumber) {
        setError('Order number not provided')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const clients = createApiClients(tokens || {}, apiCredentials || {})

        // Fetch order details
        const orderData = await clients.ordersApi.get<any>(`/${orderNumber}`)
        setOrder(orderData)

        // Try to fetch despatch advice
        try {
          const despatchData = await axios.get(
            `http://localhost:3000/api/despatch-advices?orderNumber=${orderNumber}`,
            {
              headers: {
                Authorization: `Bearer ${tokens?.dispatchApi || ''}`,
              },
            }
          )
          if (despatchData.data && despatchData.data.length > 0) {
            setDespatchAdvice(despatchData.data[0])
          }
        } catch (_) {
          // Despatch not found, that's ok
        }

        // Try to fetch receipt advice
        try {
          const receiptData = await axios.get(
            `http://localhost:3000/api/receipt-advices?orderNumber=${orderNumber}`,
            {
              headers: {
                Authorization: `Bearer ${tokens?.dispatchApi || ''}`,
              },
            }
          )
          if (receiptData.data && receiptData.data.length > 0) {
            setReceiptAdvice(receiptData.data[0])
          }
        } catch (_) {
          // Receipt not found, that's ok
        }
      } catch (err) {
        setError(`Failed to load fulfillment data: ${err instanceof Error ? err.message : String(err)}`)
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchFulfillmentData()
  }, [orderNumber, tokens, apiCredentials])

  const getStatusStage = () => {
    if (!order) return 'pending'
    if (receiptAdvice) return 'delivered'
    if (despatchAdvice) return 'dispatched'
    if (order.status === 'confirmed') return 'confirmed'
    return 'pending'
  }

  const stages = [
    { id: 'pending', label: 'Order Created', description: 'Order has been placed' },
    { id: 'confirmed', label: 'Confirmed', description: 'Order confirmed by seller' },
    { id: 'dispatched', label: 'Dispatched', description: 'Goods dispatched to buyer' },
    { id: 'delivered', label: 'Delivered', description: 'Goods received by buyer' },
  ]

  const currentStageIndex = stages.findIndex(s => s.id === getStatusStage())

  if (loading) {
    return (
      <div className='min-h-screen bg-slate-50 dark:bg-slate-900 p-6 flex items-center justify-center'>
        <div className='text-center'>
          <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
          <p className='mt-4 text-slate-600 dark:text-slate-400'>Loading fulfillment data...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className='min-h-screen bg-slate-50 dark:bg-slate-900 p-6'>
        <div className='max-w-4xl mx-auto'>
          <div className='p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400'>
            {error || 'Order not found'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-900 p-6'>
      <div className='max-w-4xl mx-auto'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-slate-900 dark:text-slate-50 mb-2'>
            Fulfillment Tracking
          </h1>
          <p className='text-slate-600 dark:text-slate-400'>Order: {order.orderNumber}</p>
        </div>

        {/* Order Summary */}
        <Card className='mb-6'>
          <CardBody>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              <div>
                <p className='text-xs font-medium text-slate-500 dark:text-slate-400 uppercase'>Order Number</p>
                <p className='text-lg font-semibold text-slate-900 dark:text-slate-50'>{order.orderNumber}</p>
              </div>
              <div>
                <p className='text-xs font-medium text-slate-500 dark:text-slate-400 uppercase'>Buyer</p>
                <p className='text-lg font-semibold text-slate-900 dark:text-slate-50 truncate'>{order.buyerParty}</p>
              </div>
              <div>
                <p className='text-xs font-medium text-slate-500 dark:text-slate-400 uppercase'>Seller</p>
                <p className='text-lg font-semibold text-slate-900 dark:text-slate-50 truncate'>{order.sellerParty}</p>
              </div>
              <div>
                <p className='text-xs font-medium text-slate-500 dark:text-slate-400 uppercase'>Amount</p>
                <p className='text-lg font-semibold text-slate-900 dark:text-slate-50'>${order.amount.toLocaleString()}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Timeline */}
        <Card className='mb-6'>
          <CardBody>
            <h2 className='text-xl font-semibold text-slate-900 dark:text-slate-50 mb-6'>Fulfillment Status</h2>

            <div className='space-y-6'>
              {stages.map((stage, index) => {
                const isCompleted = index < currentStageIndex
                const isCurrent = index === currentStageIndex
                const isPending = index > currentStageIndex

                return (
                  <div key={stage.id} className='flex gap-4'>
                    {/* Timeline dot */}
                    <div className='flex flex-col items-center'>
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                          isCompleted
                            ? 'bg-green-500 text-white'
                            : isCurrent
                              ? 'bg-blue-500 text-white ring-4 ring-blue-200 dark:ring-blue-900/50'
                              : 'bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {isCompleted ? '✓' : index + 1}
                      </div>
                      {index < stages.length - 1 && (
                        <div
                          className={`w-0.5 h-16 mt-2 ${isCompleted ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                        ></div>
                      )}
                    </div>

                    {/* Content */}
                    <div className='pb-6 flex-1'>
                      <div className='flex items-center gap-2 mb-1'>
                        <h3 className='font-semibold text-slate-900 dark:text-slate-50'>{stage.label}</h3>
                        {isCompleted && (
                          <Badge variant='success' className='text-xs'>
                            Completed
                          </Badge>
                        )}
                        {isCurrent && (
                          <Badge variant='default' className='text-xs bg-blue-500'>
                            In Progress
                          </Badge>
                        )}
                      </div>
                      <p className='text-sm text-slate-600 dark:text-slate-400 mb-3'>{stage.description}</p>

                      {/* Stage Details */}
                      {stage.id === 'pending' && order && (
                        <div className='bg-slate-50 dark:bg-slate-800 p-3 rounded text-xs text-slate-600 dark:text-slate-400'>
                          <p>Created: {new Date(order.createdAt).toLocaleString()}</p>
                        </div>
                      )}

                      {stage.id === 'dispatched' && despatchAdvice && (
                        <div className='bg-green-50 dark:bg-green-900/20 p-3 rounded text-xs text-green-700 dark:text-green-400'>
                          <p>Dispatched: {new Date(despatchAdvice.createdAt).toLocaleString()}</p>
                        </div>
                      )}

                      {stage.id === 'delivered' && receiptAdvice && (
                        <div className='bg-green-50 dark:bg-green-900/20 p-3 rounded text-xs text-green-700 dark:text-green-400'>
                          <p>Received: {new Date(receiptAdvice.createdAt).toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardBody>
        </Card>

        {/* Documents */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {/* Despatch Advice */}
          <Card>
            <CardBody>
              <h3 className='font-semibold text-slate-900 dark:text-slate-50 mb-3'>Despatch Advice</h3>
              {despatchAdvice ? (
                <div className='space-y-2'>
                  <Badge variant='success'>Created</Badge>
                  <p className='text-xs text-slate-600 dark:text-slate-400'>
                    {new Date(despatchAdvice.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <div className='text-center py-4 text-slate-500 dark:text-slate-400 text-sm'>
                  <p>Awaiting dispatch</p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Receipt Advice */}
          <Card>
            <CardBody>
              <h3 className='font-semibold text-slate-900 dark:text-slate-50 mb-3'>Receipt Advice</h3>
              {receiptAdvice ? (
                <div className='space-y-2'>
                  <Badge variant='success'>Submitted</Badge>
                  <p className='text-xs text-slate-600 dark:text-slate-400'>
                    {new Date(receiptAdvice.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ) : (
                <div className='text-center py-4 text-slate-500 dark:text-slate-400 text-sm'>
                  <p>Awaiting receipt</p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Invoice Generation */}
          <Card>
            <CardBody>
              <h3 className='font-semibold text-slate-900 dark:text-slate-50 mb-3'>Invoice</h3>
              {receiptAdvice ? (
                <div className='space-y-2'>
                  <Badge variant='success'>Ready</Badge>
                  <p className='text-xs text-slate-600 dark:text-slate-400'>All conditions met</p>
                </div>
              ) : (
                <div className='text-center py-4 text-slate-500 dark:text-slate-400 text-sm'>
                  <p>Receipt required</p>
                  <p className='text-xs mt-1'>Submit receipt to generate invoice</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default FulfillmentTrackingPage
