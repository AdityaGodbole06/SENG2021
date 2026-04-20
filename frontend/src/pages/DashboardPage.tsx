import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Truck, FileText, TrendingUp } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { createApiClients } from '@/services/apiClient'
import { orderService } from '@/services/orderService'
import { auditService, AuditLog } from '@/services/auditService'

const DashboardPage: React.FC = () => {
  const { user, role, tokens, apiCredentials } = useAuth()
  const [orderCount, setOrderCount] = useState(0)
  const [invoiceCount, setInvoiceCount] = useState(0)
  const [dispatchCount, setDispatchCount] = useState(0)
  const [totalValue, setTotalValue] = useState(0)
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const clients = createApiClients(tokens || {}, apiCredentials || {})

        // Fetch orders
        const orders = await orderService.getOrders(clients)
        setOrderCount(orders.length)
        const total = orders.reduce((sum, order) => sum + (order.amount || 0), 0)
        setTotalValue(total)

        // Fetch audit logs for recent activity and counts
        const logs = await auditService.getAuditTrail(clients, { limit: 50 })
        setRecentActivity(logs.slice(0, 10))

        // Count dispatches and invoices from audit logs
        const dispatchCount = logs.filter(log => log.entityType === 'DESPATCH').length
        const invoiceCount = logs.filter(log => log.action === 'CREATE_INVOICE').length

        setDispatchCount(dispatchCount)
        setInvoiceCount(invoiceCount)
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
        // Keep default 0 values
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [tokens, apiCredentials])

  const stats = [
    { icon: ShoppingCart, label: 'Orders', value: orderCount, color: 'blue' },
    { icon: Truck, label: 'Dispatches', value: dispatchCount, color: 'green' },
    { icon: FileText, label: 'Invoices', value: invoiceCount, color: 'purple' },
    { icon: TrendingUp, label: 'Total Value', value: `$${(totalValue / 1000).toFixed(1)}K`, color: 'orange' },
  ]

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-slate-900 dark:text-slate-50 mb-2'>
          Welcome back, {user?.name}
        </h1>
        <p className='text-slate-600 dark:text-slate-400'>
          You're logged in as <span className='font-medium capitalize'>{role}</span>
        </p>
      </div>

      {/* Stats Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
        {stats.map(({ icon: Icon, label, value, color }) => (
          <Card key={label}>
            <CardBody className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-slate-600 dark:text-slate-400 mb-1'>
                  {label}
                </p>
                <p className='text-2xl font-bold text-slate-900 dark:text-slate-50'>
                  {loading ? '-' : value}
                </p>
              </div>
              <div className={`p-3 rounded-lg bg-${color}-100 dark:bg-${color}-900/20`}>
                <Icon className={`text-${color}-600 dark:text-${color}-400`} size={24} />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className='mb-8'>
        <CardHeader>
          <h2 className='text-lg font-semibold text-slate-900 dark:text-slate-50'>
            Quick Actions
          </h2>
        </CardHeader>
        <CardBody>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <Link to='/orders'>
              <Button variant='outline' fullWidth className='text-left'>
                <ShoppingCart size={18} className='mr-2' />
                View Orders
              </Button>
            </Link>
            <Link to='/dispatch'>
              <Button variant='outline' fullWidth className='text-left'>
                <Truck size={18} className='mr-2' />
                View Dispatches
              </Button>
            </Link>
            <Link to='/invoices'>
              <Button variant='outline' fullWidth className='text-left'>
                <FileText size={18} className='mr-2' />
                View Invoices
              </Button>
            </Link>
          </div>
        </CardBody>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <h2 className='text-lg font-semibold text-slate-900 dark:text-slate-50'>
            Recent Activity
          </h2>
        </CardHeader>
        <CardBody>
          <div className='space-y-4 text-sm'>
            {loading ? (
              <div className='text-center py-8 text-slate-500'>Loading activity...</div>
            ) : recentActivity.length === 0 ? (
              <div className='text-center py-8 text-slate-500'>No activity yet</div>
            ) : (
              recentActivity.map((log) => (
                <div
                  key={log.auditLogId}
                  className='flex justify-between py-3 border-b border-slate-200 dark:border-slate-800 last:border-0'
                >
                  <span className='text-slate-600 dark:text-slate-400'>
                    {log.description || `${log.action.replace(/_/g, ' ')}`}
                  </span>
                  <span className='text-slate-500 dark:text-slate-500'>
                    {formatTimeAgo(log.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

export default DashboardPage
