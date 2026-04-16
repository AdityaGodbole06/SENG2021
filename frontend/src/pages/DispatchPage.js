import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Plus, Edit2, Trash2, Download } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
const DispatchPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [dispatches] = useState([
        {
            id: '1',
            despatchNumber: 'DSP-001',
            orderRef: 'ORD-001',
            dispatchDate: '2024-04-15',
            deliveryParty: 'Buyer Corp',
            expectedArrival: '2024-04-20',
            status: 'dispatched',
        },
        {
            id: '2',
            despatchNumber: 'DSP-002',
            orderRef: 'ORD-002',
            dispatchDate: '2024-04-16',
            deliveryParty: 'Buyer Corp',
            expectedArrival: '2024-04-25',
            status: 'in_transit',
        },
    ]);
    const filteredDispatches = dispatches.filter(dispatch => {
        const matchesSearch = dispatch.despatchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            dispatch.orderRef.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = !statusFilter || dispatch.status === statusFilter;
        return matchesSearch && matchesStatus;
    });
    const getStatusVariant = (status) => {
        const variants = {
            dispatched: 'info',
            in_transit: 'default',
            delivered: 'success',
            delayed: 'warning',
            issue: 'danger',
        };
        return variants[status];
    };
    return (_jsxs("div", { children: [_jsxs("div", { className: 'flex justify-between items-center mb-6', children: [_jsx("h1", { className: 'text-3xl font-bold text-slate-900 dark:text-slate-50', children: "Dispatch" }), _jsxs(Button, { onClick: () => setIsCreateModalOpen(true), children: [_jsx(Plus, { size: 18, className: 'mr-2' }), "Create Dispatch"] })] }), _jsx(Card, { className: 'mb-6', children: _jsxs(CardBody, { className: 'flex gap-4', children: [_jsx("div", { className: 'flex-1', children: _jsx(Input, { placeholder: 'Search by dispatch number or order ref...', value: searchTerm, onChange: e => setSearchTerm(e.target.value), className: '!mb-0' }) }), _jsxs("select", { value: statusFilter, onChange: e => setStatusFilter(e.target.value), className: 'px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500', children: [_jsx("option", { value: '', children: "All Status" }), _jsx("option", { value: 'dispatched', children: "Dispatched" }), _jsx("option", { value: 'in_transit', children: "In Transit" }), _jsx("option", { value: 'delivered', children: "Delivered" }), _jsx("option", { value: 'delayed', children: "Delayed" }), _jsx("option", { value: 'issue', children: "Issue" })] })] }) }), _jsx(Card, { children: _jsx("div", { className: 'overflow-x-auto', children: _jsxs("table", { className: 'w-full', children: [_jsx("thead", { children: _jsxs("tr", { className: 'border-b border-slate-200 dark:border-slate-800', children: [_jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Dispatch #" }), _jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Order Ref" }), _jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Dispatch Date" }), _jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Expected Arrival" }), _jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Status" }), _jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Actions" })] }) }), _jsx("tbody", { children: filteredDispatches.map(dispatch => (_jsxs("tr", { className: 'border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors', children: [_jsx("td", { className: 'px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-50', children: dispatch.despatchNumber }), _jsx("td", { className: 'px-6 py-4 text-sm text-slate-600 dark:text-slate-400', children: dispatch.orderRef }), _jsx("td", { className: 'px-6 py-4 text-sm text-slate-600 dark:text-slate-400', children: dispatch.dispatchDate }), _jsx("td", { className: 'px-6 py-4 text-sm text-slate-600 dark:text-slate-400', children: dispatch.expectedArrival }), _jsx("td", { className: 'px-6 py-4 text-sm', children: _jsx(Badge, { variant: getStatusVariant(dispatch.status), size: 'sm', children: dispatch.status.replace('_', ' ') }) }), _jsxs("td", { className: 'px-6 py-4 text-sm flex gap-2', children: [_jsx("button", { className: 'p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors', children: _jsx(Edit2, { size: 16 }) }), _jsx("button", { className: 'p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors', children: _jsx(Download, { size: 16 }) }), _jsx("button", { className: 'p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors text-red-600', children: _jsx(Trash2, { size: 16 }) })] })] }, dispatch.id))) })] }) }) }), _jsx(Modal, { isOpen: isCreateModalOpen, onClose: () => setIsCreateModalOpen(false), title: 'Create Dispatch Advice', footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: 'secondary', onClick: () => setIsCreateModalOpen(false), children: "Cancel" }), _jsx(Button, { onClick: () => setIsCreateModalOpen(false), children: "Create" })] }), children: _jsxs("div", { className: 'space-y-4', children: [_jsx(Input, { label: 'Order Reference', placeholder: 'ORD-001' }), _jsx(Input, { label: 'Dispatch Date', type: 'date' }), _jsx(Input, { label: 'Expected Arrival', type: 'date' }), _jsxs("div", { children: [_jsx("label", { className: 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2', children: "Status" }), _jsxs("select", { className: 'w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500', children: [_jsx("option", { children: "Dispatched" }), _jsx("option", { children: "In Transit" }), _jsx("option", { children: "Delivered" })] })] })] }) })] }));
};
export default DispatchPage;
