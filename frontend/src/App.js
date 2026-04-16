import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import OrdersPage from '@/pages/OrdersPage';
import DispatchPage from '@/pages/DispatchPage';
import InvoicesPage from '@/pages/InvoicesPage';
function AppRoutes() {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) {
        return (_jsxs(Routes, { children: [_jsx(Route, { path: '/login', element: _jsx(LoginPage, {}) }), _jsx(Route, { path: '*', element: _jsx(Navigate, { to: '/login', replace: true }) })] }));
    }
    return (_jsx(DashboardLayout, { children: _jsxs(Routes, { children: [_jsx(Route, { path: '/dashboard', element: _jsx(DashboardPage, {}) }), _jsx(Route, { path: '/orders', element: _jsx(OrdersPage, {}) }), _jsx(Route, { path: '/dispatch', element: _jsx(DispatchPage, {}) }), _jsx(Route, { path: '/invoices', element: _jsx(InvoicesPage, {}) }), _jsx(Route, { path: '*', element: _jsx(Navigate, { to: '/dashboard', replace: true }) })] }) }));
}
function App() {
    return (_jsx(ThemeProvider, { children: _jsx(AuthProvider, { children: _jsx(Router, { children: _jsx(AppRoutes, {}) }) }) }));
}
export default App;
