import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import OrdersPage from '@/pages/OrdersPage'
import DispatchPage from '@/pages/DispatchPage'
import InvoicesPage from '@/pages/InvoicesPage'
import AuditTrailPage from '@/pages/AuditTrailPage'
import GuestOrderPage from '@/pages/GuestOrderPage'
import FulfillmentTrackingPage from '@/pages/FulfillmentTrackingPage'
import ReceiptAdvicePage from '@/pages/ReceiptAdvicePage'

function AppRoutes() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path='/login' element={<LoginPage />} />
        <Route path='/guest-order' element={<GuestOrderPage />} />
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
        <Route path='/audit-trail' element={<AuditTrailPage />} />
        <Route path='/fulfillment' element={<FulfillmentTrackingPage />} />
        <Route path='/receipt-advice' element={<ReceiptAdvicePage />} />
        <Route path='*' element={<Navigate to='/dashboard' replace />} />
      </Routes>
    </DashboardLayout>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
