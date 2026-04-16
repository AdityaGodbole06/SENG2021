import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Plus, Edit2, Trash2, Download } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
const OrdersPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [orders] = useState([
        {
            id: '1',
            orderNumber: 'ORD-001',
            buyerParty: 'Buyer Corp',
            sellerParty: 'Seller Inc',
            amount: 5000,
            orderDate: '2024-04-10',
            deliveryDate: '2024-04-20',
            status: 'confirmed',
        },
        {
            id: '2',
            orderNumber: 'ORD-002',
            buyerParty: 'Buyer Corp',
            sellerParty: 'Seller Inc',
            amount: 3200,
            orderDate: '2024-04-12',
            deliveryDate: '2024-04-25',
            status: 'pending',
        },
    ]);
    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.buyerParty.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = !statusFilter || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });
    const getStatusVariant = (status) => {
        const variants = {
            pending: 'warning',
            confirmed: 'info',
            dispatched: 'default',
            delivered: 'success',
            cancelled: 'danger',
        };
        return variants[status];
    };
    return (_jsxs("div", { children: [_jsxs("div", { className: 'flex justify-between items-center mb-6', children: [_jsx("h1", { className: 'text-3xl font-bold text-slate-900 dark:text-slate-50', children: "Orders" }), _jsxs(Button, { onClick: () => setIsCreateModalOpen(true), children: [_jsx(Plus, { size: 18, className: 'mr-2' }), "Create Order"] })] }), _jsx(Card, { className: 'mb-6', children: _jsxs(CardBody, { className: 'flex gap-4', children: [_jsx("div", { className: 'flex-1', children: _jsx(Input, { placeholder: 'Search by order number or party...', value: searchTerm, onChange: e => setSearchTerm(e.target.value), className: '!mb-0' }) }), _jsxs("select", { value: statusFilter, onChange: e => setStatusFilter(e.target.value), className: 'px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500', children: [_jsx("option", { value: '', children: "All Status" }), _jsx("option", { value: 'pending', children: "Pending" }), _jsx("option", { value: 'confirmed', children: "Confirmed" }), _jsx("option", { value: 'dispatched', children: "Dispatched" }), _jsx("option", { value: 'delivered', children: "Delivered" }), _jsx("option", { value: 'cancelled', children: "Cancelled" })] })] }) }), _jsx(Card, { children: _jsx("div", { className: 'overflow-x-auto', children: _jsxs("table", { className: 'w-full', children: [_jsx("thead", { children: _jsxs("tr", { className: 'border-b border-slate-200 dark:border-slate-800', children: [_jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Order Number" }), _jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Buyer" }), _jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Seller" }), _jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Amount" }), _jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Status" }), _jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Actions" })] }) }), _jsx("tbody", { children: filteredOrders.map(order => (_jsxs("tr", { className: 'border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors', children: [_jsx("td", { className: 'px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-50', children: order.orderNumber }), _jsx("td", { className: 'px-6 py-4 text-sm text-slate-600 dark:text-slate-400', children: order.buyerParty }), _jsx("td", { className: 'px-6 py-4 text-sm text-slate-600 dark:text-slate-400', children: order.sellerParty }), _jsxs("td", { className: 'px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-50', children: ["$", order.amount.toLocaleString()] }), _jsx("td", { className: 'px-6 py-4 text-sm', children: _jsx(Badge, { variant: getStatusVariant(order.status), size: 'sm', children: order.status }) }), _jsxs("td", { className: 'px-6 py-4 text-sm flex gap-2', children: [_jsx("button", { className: 'p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors', children: _jsx(Edit2, { size: 16 }) }), _jsx("button", { className: 'p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors', children: _jsx(Download, { size: 16 }) }), _jsx("button", { className: 'p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors text-red-600', children: _jsx(Trash2, { size: 16 }) })] })] }, order.id))) })] }) }) }), _jsx(Modal, { isOpen: isCreateModalOpen, onClose: () => setIsCreateModalOpen(false), title: 'Create New Order', footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: 'secondary', onClick: () => setIsCreateModalOpen(false), children: "Cancel" }), _jsx(Button, { onClick: () => setIsCreateModalOpen(false), children: "Create Order" })] }), children: _jsxs("div", { className: 'space-y-4', children: [_jsx(Input, { label: 'Order Number', placeholder: 'ORD-003' }), _jsx(Input, { label: 'Buyer Party', placeholder: 'Enter buyer name' }), _jsx(Input, { label: 'Seller Party', placeholder: 'Enter seller name' }), _jsx(Input, { label: 'Amount', type: 'number', placeholder: '0.00' }), _jsx(Input, { label: 'Order Date', type: 'date' }), _jsx(Input, { label: 'Delivery Date', type: 'date' })] }) })] }));
};
export default OrdersPage;
