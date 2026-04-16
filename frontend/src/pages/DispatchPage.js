import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Download } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { createApiClients } from '@/services/apiClient';
import { dispatchService } from '@/services/dispatchService';
const DispatchPage = () => {
    const { tokens } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [dispatches, setDispatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        const fetchDispatches = async () => {
            try {
                setLoading(true);
                setError(null);
                const clients = createApiClients(tokens);
                const data = await dispatchService.getDispatches(clients);
                setDispatches(data);
            }
            catch (err) {
                setError('Failed to load dispatches');
                console.error(err);
            }
            finally {
                setLoading(false);
            }
        };
        fetchDispatches();
    }, [tokens]);
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
    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this dispatch?')) {
            try {
                const clients = createApiClients(tokens);
                const success = await dispatchService.deleteDispatch(clients, id);
                if (success) {
                    setDispatches(dispatches.filter(d => d.id !== id));
                    alert('Dispatch deleted successfully');
                }
                else {
                    alert('Failed to delete dispatch');
                }
            }
            catch (err) {
                alert('Error deleting dispatch');
                console.error(err);
            }
        }
    };
    const handleDownload = (dispatch) => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<DespatchAdvice>
  <DespatchNumber>${dispatch.despatchNumber}</DespatchNumber>
  <OrderRef>${dispatch.orderRef}</OrderRef>
  <DispatchDate>${dispatch.dispatchDate}</DispatchDate>
  <ExpectedArrival>${dispatch.expectedArrival}</ExpectedArrival>
  <Status>${dispatch.status}</Status>
</DespatchAdvice>`;
        const blob = new Blob([xml], { type: 'application/xml' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${dispatch.despatchNumber}.xml`;
        a.click();
    };
    const handleCreateDispatch = async (formData) => {
        try {
            const clients = createApiClients(tokens);
            const newDispatch = await dispatchService.createDispatch(clients, {
                despatchNumber: formData.orderNumber,
                orderRef: formData.orderNumber,
                dispatchDate: formData.dispatchDate,
                deliveryParty: formData.deliveryParty || 'Buyer',
                expectedArrival: formData.expectedArrival,
            });
            if (newDispatch) {
                setDispatches([...dispatches, newDispatch]);
                setIsCreateModalOpen(false);
                alert('Dispatch created successfully!');
            }
            else {
                alert('Failed to create dispatch');
            }
        }
        catch (err) {
            alert('Error creating dispatch');
            console.error(err);
        }
    };
    return (_jsxs("div", { children: [_jsxs("div", { className: 'flex justify-between items-center mb-6', children: [_jsx("h1", { className: 'text-3xl font-bold text-slate-900 dark:text-slate-50', children: "Dispatch" }), _jsxs(Button, { onClick: () => setIsCreateModalOpen(true), disabled: loading, children: [_jsx(Plus, { size: 18, className: 'mr-2' }), "Create Dispatch"] })] }), error && (_jsx(Card, { className: 'mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20', children: _jsx(CardBody, { children: _jsx("p", { className: 'text-red-600 dark:text-red-400', children: error }) }) })), loading && (_jsx(Card, { className: 'mb-6', children: _jsx(CardBody, { children: _jsx("p", { className: 'text-slate-600 dark:text-slate-400', children: "Loading dispatches..." }) }) })), _jsx(Card, { className: 'mb-6', children: _jsxs(CardBody, { className: 'flex gap-4', children: [_jsx("div", { className: 'flex-1', children: _jsx(Input, { placeholder: 'Search by dispatch number or order ref...', value: searchTerm, onChange: e => setSearchTerm(e.target.value), className: '!mb-0' }) }), _jsxs("select", { value: statusFilter, onChange: e => setStatusFilter(e.target.value), className: 'px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500', children: [_jsx("option", { value: '', children: "All Status" }), _jsx("option", { value: 'dispatched', children: "Dispatched" }), _jsx("option", { value: 'in_transit', children: "In Transit" }), _jsx("option", { value: 'delivered', children: "Delivered" }), _jsx("option", { value: 'delayed', children: "Delayed" }), _jsx("option", { value: 'issue', children: "Issue" })] })] }) }), _jsx(Card, { children: _jsx("div", { className: 'overflow-x-auto', children: _jsxs("table", { className: 'w-full', children: [_jsx("thead", { children: _jsxs("tr", { className: 'border-b border-slate-200 dark:border-slate-800', children: [_jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Dispatch #" }), _jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Order Ref" }), _jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Dispatch Date" }), _jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Expected Arrival" }), _jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Status" }), _jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Actions" })] }) }), _jsx("tbody", { children: filteredDispatches.map(dispatch => (_jsxs("tr", { className: 'border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors', children: [_jsx("td", { className: 'px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-50', children: dispatch.despatchNumber }), _jsx("td", { className: 'px-6 py-4 text-sm text-slate-600 dark:text-slate-400', children: dispatch.orderRef }), _jsx("td", { className: 'px-6 py-4 text-sm text-slate-600 dark:text-slate-400', children: dispatch.dispatchDate }), _jsx("td", { className: 'px-6 py-4 text-sm text-slate-600 dark:text-slate-400', children: dispatch.expectedArrival }), _jsx("td", { className: 'px-6 py-4 text-sm', children: _jsx(Badge, { variant: getStatusVariant(dispatch.status), size: 'sm', children: dispatch.status.replace('_', ' ') }) }), _jsxs("td", { className: 'px-6 py-4 text-sm flex gap-2', children: [_jsx("button", { onClick: () => alert('Edit functionality coming soon'), className: 'p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors', title: 'Edit dispatch', children: _jsx(Edit2, { size: 16 }) }), _jsx("button", { onClick: () => handleDownload(dispatch), className: 'p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors', title: 'Download as XML', children: _jsx(Download, { size: 16 }) }), _jsx("button", { onClick: () => handleDelete(dispatch.id), className: 'p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors text-red-600', title: 'Delete dispatch', children: _jsx(Trash2, { size: 16 }) })] })] }, dispatch.id))) })] }) }) }), _jsx(CreateDispatchModal, { isOpen: isCreateModalOpen, onClose: () => setIsCreateModalOpen(false), onSubmit: handleCreateDispatch })] }));
};
const CreateDispatchModal = ({ isOpen, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        orderNumber: '',
        dispatchDate: '',
        expectedArrival: '',
        deliveryParty: '',
    });
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.orderNumber || !formData.dispatchDate) {
            alert('Please fill in required fields');
            return;
        }
        onSubmit(formData);
        setFormData({
            orderNumber: '',
            dispatchDate: '',
            expectedArrival: '',
            deliveryParty: '',
        });
    };
    return (_jsx(Modal, { isOpen: isOpen, onClose: onClose, title: 'Create Dispatch Advice', footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: 'secondary', onClick: onClose, children: "Cancel" }), _jsx(Button, { onClick: handleSubmit, children: "Create" })] }), children: _jsxs("form", { onSubmit: handleSubmit, className: 'space-y-4', children: [_jsx(Input, { label: 'Order Reference', placeholder: 'ORD-001', value: formData.orderNumber, onChange: e => setFormData({ ...formData, orderNumber: e.target.value }), required: true }), _jsx(Input, { label: 'Dispatch Date', type: 'date', value: formData.dispatchDate, onChange: e => setFormData({ ...formData, dispatchDate: e.target.value }), required: true }), _jsx(Input, { label: 'Expected Arrival', type: 'date', value: formData.expectedArrival, onChange: e => setFormData({ ...formData, expectedArrival: e.target.value }) }), _jsx(Input, { label: 'Delivery Party', placeholder: 'Buyer name', value: formData.deliveryParty, onChange: e => setFormData({ ...formData, deliveryParty: e.target.value }) })] }) }));
};
export default DispatchPage;
