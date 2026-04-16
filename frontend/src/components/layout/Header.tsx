import React from 'react'
import { Moon, Sun, Menu } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

interface HeaderProps {
  onMenuClick?: () => void
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className='bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between'>
      <div className='flex items-center gap-4'>
        <button
          onClick={onMenuClick}
          className='p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden'
        >
          <Menu size={20} />
        </button>
        <h1 className='text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent'>
          DigitalBook
        </h1>
      </div>

      <div className='flex items-center gap-4'>
        <button
          onClick={toggleTheme}
          className='p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors'
          aria-label='Toggle theme'
        >
          {theme === 'light' ? (
            <Moon size={20} className='text-slate-600 dark:text-slate-400' />
          ) : (
            <Sun size={20} className='text-slate-600 dark:text-slate-400' />
          )}
        </button>
      </div>
    </header>
  )
}
