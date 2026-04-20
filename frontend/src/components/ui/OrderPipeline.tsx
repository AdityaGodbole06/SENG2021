import React from 'react'
import { Check, Package, Truck, FileText, CreditCard, LucideProps } from 'lucide-react'
import clsx from 'clsx'

interface OrderPipelineProps {
  currentStatus: string
  hasDispatch: boolean
  hasReceipt: boolean
  hasInvoice: boolean
  isPaid: boolean
}

interface Stage {
  key: string
  label: string
  icon: React.ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>>
  isComplete: (props: OrderPipelineProps) => boolean
  isActive: (props: OrderPipelineProps) => boolean
}

const stages: Stage[] = [
  {
    key: 'created',
    label: 'Created',
    icon: Package,
    isComplete: (_p) => true,
    isActive: (p) => p.currentStatus === 'pending' || p.currentStatus === 'confirmed',
  },
  {
    key: 'dispatched',
    label: 'Dispatched',
    icon: Truck,
    isComplete: (p) => p.hasDispatch,
    isActive: (p) => p.hasDispatch && !p.hasReceipt,
  },
  {
    key: 'delivered',
    label: 'Delivered',
    icon: Check,
    isComplete: (p) => p.hasReceipt,
    isActive: (p) => p.hasReceipt && !p.hasInvoice,
  },
  {
    key: 'invoiced',
    label: 'Invoiced',
    icon: FileText,
    isComplete: (p) => p.hasInvoice,
    isActive: (p) => p.hasInvoice && !p.isPaid,
  },
  {
    key: 'paid',
    label: 'Paid',
    icon: CreditCard,
    isComplete: (p) => p.isPaid,
    isActive: (p) => p.isPaid,
  },
]

export const OrderPipeline: React.FC<OrderPipelineProps> = (props) => {
  return (
    <div className='w-full'>
      <div className='flex items-start'>
        {stages.map((stage, index) => {
          const complete = stage.isComplete(props)
          const active = stage.isActive(props)
          const Icon = stage.icon
          const isLast = index === stages.length - 1

          return (
            <React.Fragment key={stage.key}>
              <div className='flex flex-col items-center flex-1 min-w-0'>
                {/* Circle */}
                <div
                  className={clsx(
                    'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors',
                    complete
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : active
                        ? 'bg-transparent border-blue-500 text-blue-500'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500'
                  )}
                >
                  {complete && !active ? (
                    <Check size={16} strokeWidth={3} />
                  ) : (
                    <Icon size={16} />
                  )}
                </div>
                {/* Label */}
                <span
                  className={clsx(
                    'mt-2 text-xs font-medium text-center leading-tight',
                    complete || active
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-400 dark:text-slate-500'
                  )}
                >
                  {stage.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={clsx(
                    'h-0.5 flex-1 mt-4 mx-1 transition-colors',
                    complete ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                  )}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
