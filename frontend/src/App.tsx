import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import OrdersPage from '@/pages/OrdersPage'
import DispatchPage from '@/pages/DispatchPage'
import InvoicesPage from '@/pages/InvoicesPage'

function AppRoutes() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path='/login' element={<LoginPage />} />
        <Route path='*' element={<Navigate to='/login' replace />} />
      </Routes>
    )
  }

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
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
