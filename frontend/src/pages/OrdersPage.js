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
import { ordersService } from '@/services/ordersService';
const OrdersPage = () => {
    const { tokens } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        const fetchOrders = async () => {
            try {
                setLoading(true);
                setError(null);
                const clients = createApiClients(tokens);
                const data = await ordersService.getOrders(clients);
                setOrders(data);
            }
            catch (err) {
                setError('Failed to load orders');
                console.error(err);
            }
            finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, [tokens]);
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
    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this order?')) {
            try {
                const clients = createApiClients(tokens);
                const success = await ordersService.deleteOrder(clients, id);
                if (success) {
                    setOrders(orders.filter(o => o.id !== id));
                    alert('Order deleted successfully');
                }
                else {
                    alert('Failed to delete order');
                }
            }
            catch (err) {
                alert('Error deleting order');
                console.error(err);
            }
        }
    };
    const handleDownload = (order) => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Order>
  <OrderNumber>${order.orderNumber}</OrderNumber>
  <BuyerParty>${order.buyerParty}</BuyerParty>
  <SellerParty>${order.sellerParty}</SellerParty>
  <Amount>${order.amount}</Amount>
  <OrderDate>${order.orderDate}</OrderDate>
  <DeliveryDate>${order.deliveryDate}</DeliveryDate>
  <Status>${order.status}</Status>
</Order>`;
        const blob = new Blob([xml], { type: 'application/xml' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${order.orderNumber}.xml`;
        a.click();
    };
    const handleCreateOrder = async (formData) => {
        try {
            const clients = createApiClients(tokens);
            const newOrder = await ordersService.createOrder(clients, {
                orderNumber: formData.orderNumber,
                buyerParty: formData.buyerParty,
                sellerParty: formData.sellerParty,
                amount: parseFloat(formData.amount) || 0,
                orderDate: formData.orderDate,
                deliveryDate: formData.deliveryDate,
            });
            if (newOrder) {
                setOrders([...orders, newOrder]);
                setIsCreateModalOpen(false);
                alert('Order created successfully!');
            }
            else {
                alert('Failed to create order');
            }
        }
        catch (err) {
            alert('Error creating order');
            console.error(err);
        }
    };
    return (_jsxs("div", { children: [_jsxs("div", { className: 'flex justify-between items-center mb-6', children: [_jsx("h1", { className: 'text-3xl font-bold text-slate-900 dark:text-slate-50', children: "Orders" }), _jsxs(Button, { onClick: () => setIsCreateModalOpen(true), disabled: loading, children: [_jsx(Plus, { size: 18, className: 'mr-2' }), "Create Order"] })] }), error && (_jsx(Card, { className: 'mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20', children: _jsx(CardBody, { children: _jsx("p", { className: 'text-red-600 dark:text-red-400', children: error }) }) })), loading && (_jsx(Card, { className: 'mb-6', children: _jsx(CardBody, { children: _jsx("p", { className: 'text-slate-600 dark:text-slate-400', children: "Loading orders..." }) }) })), _jsx(Card, { className: 'mb-6', children: _jsxs(CardBody, { className: 'flex gap-4', children: [_jsx("div", { className: 'flex-1', children: _jsx(Input, { placeholder: 'Search by order number or party...', value: searchTerm, onChange: e => setSearchTerm(e.target.value), className: '!mb-0' }) }), _jsxs("select", { value: statusFilter, onChange: e => setStatusFilter(e.target.value), className: 'px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500', children: [_jsx("option", { value: '', children: "All Status" }), _jsx("option", { value: 'pending', children: "Pending" }), _jsx("option", { value: 'confirmed', children: "Confirmed" }), _jsx("option", { value: 'dispatched', children: "Dispatched" }), _jsx("option", { value: 'delivered', children: "Delivered" }), _jsx("option", { value: 'cancelled', children: "Cancelled" })] })] }) }), _jsx(Card, { children: _jsx("div", { className: 'overflow-x-auto', children: _jsxs("table", { className: 'w-full', children: [_jsx("thead", { children: _jsxs("tr", { className: 'border-b border-slate-200 dark:border-slate-800', children: [_jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Order Number" }), _jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Buyer" }), _jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Seller" }), _jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Amount" }), _jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Status" }), _jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Actions" })] }) }), _jsx("tbody", { children: filteredOrders.map(order => (_jsxs("tr", { className: 'border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors', children: [_jsx("td", { className: 'px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-50', children: order.orderNumber }), _jsx("td", { className: 'px-6 py-4 text-sm text-slate-600 dark:text-slate-400', children: order.buyerParty }), _jsx("td", { className: 'px-6 py-4 text-sm text-slate-600 dark:text-slate-400', children: order.sellerParty }), _jsxs("td", { className: 'px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-50', children: ["$", order.amount.toLocaleString()] }), _jsx("td", { className: 'px-6 py-4 text-sm', children: _jsx(Badge, { variant: getStatusVariant(order.status), size: 'sm', children: order.status }) }), _jsxs("td", { className: 'px-6 py-4 text-sm flex gap-2', children: [_jsx("button", { onClick: () => alert('Edit functionality coming soon'), className: 'p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors', title: 'Edit order', children: _jsx(Edit2, { size: 16 }) }), _jsx("button", { onClick: () => handleDownload(order), className: 'p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors', title: 'Download as XML', children: _jsx(Download, { size: 16 }) }), _jsx("button", { onClick: () => handleDelete(order.id), className: 'p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors text-red-600', title: 'Delete order', children: _jsx(Trash2, { size: 16 }) })] })] }, order.id))) })] }) }) }), _jsx(CreateOrderModal, { isOpen: isCreateModalOpen, onClose: () => setIsCreateModalOpen(false), onSubmit: handleCreateOrder })] }));
};
const CreateOrderModal = ({ isOpen, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        orderNumber: '',
        buyerParty: '',
        sellerParty: '',
        amount: '',
        orderDate: '',
        deliveryDate: '',
    });
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.orderNumber || !formData.buyerParty || !formData.sellerParty) {
            alert('Please fill in all required fields');
            return;
        }
        onSubmit(formData);
        setFormData({
            orderNumber: '',
            buyerParty: '',
            sellerParty: '',
            amount: '',
            orderDate: '',
            deliveryDate: '',
        });
    };
    return (_jsx(Modal, { isOpen: isOpen, onClose: onClose, title: 'Create New Order', footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: 'secondary', onClick: onClose, children: "Cancel" }), _jsx(Button, { onClick: handleSubmit, children: "Create Order" })] }), children: _jsxs("form", { onSubmit: handleSubmit, className: 'space-y-4', children: [_jsx(Input, { label: 'Order Number', placeholder: 'ORD-003', value: formData.orderNumber, onChange: e => setFormData({ ...formData, orderNumber: e.target.value }), required: true }), _jsx(Input, { label: 'Buyer Party', placeholder: 'Enter buyer name', value: formData.buyerParty, onChange: e => setFormData({ ...formData, buyerParty: e.target.value }), required: true }), _jsx(Input, { label: 'Seller Party', placeholder: 'Enter seller name', value: formData.sellerParty, onChange: e => setFormData({ ...formData, sellerParty: e.target.value }), required: true }), _jsx(Input, { label: 'Amount', type: 'number', placeholder: '0.00', value: formData.amount, onChange: e => setFormData({ ...formData, amount: e.target.value }) }), _jsx(Input, { label: 'Order Date', type: 'date', value: formData.orderDate, onChange: e => setFormData({ ...formData, orderDate: e.target.value }) }), _jsx(Input, { label: 'Delivery Date', type: 'date', value: formData.deliveryDate, onChange: e => setFormData({ ...formData, deliveryDate: e.target.value }) })] }) }));
};
export default OrdersPage;
