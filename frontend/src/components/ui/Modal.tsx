import React from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}) => {
  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      <div
        className='absolute inset-0 bg-black/50 transition-opacity'
        onClick={onClose}
      />
      <div
        className={clsx(
          'relative bg-white dark:bg-slate-900 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto w-full mx-4',
          sizes[size]
        )}
      >
        <div className='flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800'>
          <h2 className='text-lg font-semibold text-slate-900 dark:text-slate-50'>
            {title}
          </h2>
          <button
            onClick={onClose}
            className='p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
          >
            <X size={20} className='text-slate-500' />
          </button>
        </div>
        <div className='px-6 py-4'>{children}</div>
        {footer && (
          <div className='px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2'>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
