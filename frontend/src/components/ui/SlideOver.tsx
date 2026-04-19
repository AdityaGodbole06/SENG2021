import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

interface SlideOverProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export const SlideOver: React.FC<SlideOverProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden='true'
      />

      {/* Panel */}
      <div
        className={clsx(
          'fixed right-0 top-0 z-50 h-full w-full max-w-[520px] bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-700 flex flex-col transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        role='dialog'
        aria-modal='true'
        aria-label={title}
      >
        {/* Header */}
        <div className='flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-700 flex-shrink-0'>
          <h2 className='text-lg font-semibold text-slate-900 dark:text-slate-50 truncate pr-4'>
            {title}
          </h2>
          <button
            onClick={onClose}
            className='flex-shrink-0 p-1.5 rounded-md text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
            aria-label='Close panel'
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className='flex-1 overflow-y-auto px-6 py-5'>
          {children}
        </div>
      </div>
    </>
  )
}
