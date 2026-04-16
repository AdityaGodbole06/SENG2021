import React, { useState } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className='flex flex-col h-screen bg-slate-50 dark:bg-slate-950'>
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div className='flex flex-1 overflow-hidden'>
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className='flex-1 overflow-auto'>
          <div className='p-6 lg:p-8 max-w-7xl mx-auto w-full'>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
