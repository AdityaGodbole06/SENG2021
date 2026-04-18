import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ShoppingCart, Truck, FileText, Home, X, ClipboardList } from 'lucide-react'
import clsx from 'clsx'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

const navItems = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: ShoppingCart, label: 'Orders', href: '/orders' },
  { icon: Truck, label: 'Dispatch', href: '/dispatch' },
  { icon: FileText, label: 'Invoices', href: '/invoices' },
  { icon: ClipboardList, label: 'Order Adjustments', href: '/order-adjustments' },
]

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const location = useLocation()

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className='fixed inset-0 bg-black/50 z-40 lg:hidden'
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed left-0 top-16 h-[calc(100vh-64px)] w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 lg:relative lg:top-0 lg:h-full transition-transform lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className='p-6'>
          <button
            onClick={onClose}
            className='absolute top-4 right-4 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden'
          >
            <X size={20} />
          </button>

          <nav className='space-y-2'>
            {navItems.map(({ icon: Icon, label, href }) => {
              const isActive = location.pathname === href
              return (
                <Link
                  key={href}
                  to={href}
                  onClick={onClose}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-2 rounded-md transition-colors font-medium',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <Icon size={20} />
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>
    </>
  )
}
