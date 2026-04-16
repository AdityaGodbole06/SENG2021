import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import DashboardPage from '@/pages/DashboardPage'
import OrdersPage from '@/pages/OrdersPage'
import DispatchPage from '@/pages/DispatchPage'
import InvoicesPage from '@/pages/InvoicesPage'
import { externalApiSetup } from '@/services/externalApiSetup'

function AppRoutes() {
  useEffect(() => {
    // Initialize external APIs on app load
    externalApiSetup.initialize()
  }, [])

  return (
    <DashboardLayout>
      <Routes>
        <Route path='/dashboard' element={<DashboardPage />} />
        <Route path='/orders' element={<OrdersPage />} />
        <Route path='/dispatch' element={<DispatchPage />} />
        <Route path='/invoices' element={<InvoicesPage />} />
        <Route path='*' element={<Navigate to='/dashboard' replace />} />
      </Routes>
    </DashboardLayout>
  )
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppRoutes />
      </Router>
    </ThemeProvider>
  )
}

export default App
