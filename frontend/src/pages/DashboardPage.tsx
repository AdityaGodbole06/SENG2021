import React from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Truck, FileText, TrendingUp } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

const DashboardPage: React.FC = () => {
  const { user, role } = useAuth()

  const stats = [
    { icon: ShoppingCart, label: 'Orders', value: '12', color: 'blue' },
    { icon: Truck, label: 'Dispatches', value: '8', color: 'green' },
    { icon: FileText, label: 'Invoices', value: '15', color: 'purple' },
    { icon: TrendingUp, label: 'Total Value', value: '$45K', color: 'orange' },
  ]

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
                  {value}
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
            <div className='flex justify-between py-3 border-b border-slate-200 dark:border-slate-800'>
              <span className='text-slate-600 dark:text-slate-400'>Order #ORD-001 created</span>
              <span className='text-slate-500 dark:text-slate-500'>2 hours ago</span>
            </div>
            <div className='flex justify-between py-3 border-b border-slate-200 dark:border-slate-800'>
              <span className='text-slate-600 dark:text-slate-400'>Dispatch #DSP-001 shipped</span>
              <span className='text-slate-500 dark:text-slate-500'>5 hours ago</span>
            </div>
            <div className='flex justify-between py-3'>
              <span className='text-slate-600 dark:text-slate-400'>Invoice #INV-001 sent</span>
              <span className='text-slate-500 dark:text-slate-500'>1 day ago</span>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

export default DashboardPage
