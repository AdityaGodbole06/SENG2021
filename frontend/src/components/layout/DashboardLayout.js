import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
export const DashboardLayout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    return (_jsxs("div", { className: 'flex flex-col h-screen bg-slate-50 dark:bg-slate-950', children: [_jsx(Header, { onMenuClick: () => setSidebarOpen(!sidebarOpen) }), _jsxs("div", { className: 'flex flex-1 overflow-hidden', children: [_jsx(Sidebar, { isOpen: sidebarOpen, onClose: () => setSidebarOpen(false) }), _jsx("main", { className: 'flex-1 overflow-auto', children: _jsx("div", { className: 'p-6 lg:p-8 max-w-7xl mx-auto w-full', children: children }) })] })] }));
};
