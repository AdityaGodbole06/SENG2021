import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Plus, Download, Trash2, Eye } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { createApiClients } from '@/services/apiClient';
import { invoicesService } from '@/services/invoicesService';
const InvoicesPage = () => {
    const { tokens } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        const fetchInvoices = async () => {
            try {
                setLoading(true);
                setError(null);
                const clients = createApiClients(tokens);
                const data = await invoicesService.getInvoices(clients);
                setInvoices(data);
            }
            catch (err) {
                setError('Failed to load invoices');
                console.error(err);
            }
            finally {
                setLoading(false);
            }
        };
        fetchInvoices();
    }, [tokens]);
    const filteredInvoices = invoices.filter(invoice => {
        const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            invoice.buyerParty.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = !statusFilter || invoice.status === statusFilter;
        return matchesSearch && matchesStatus;
    });
    const getStatusVariant = (status) => {
        const variants = {
            unpaid: 'danger',
            paid: 'success',
            overdue: 'warning',
            cancelled: 'default',
        };
        return variants[status];
    };
    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this invoice?')) {
            try {
                const clients = createApiClients(tokens);
                const success = await invoicesService.deleteInvoice(clients, id);
                if (success) {
                    setInvoices(invoices.filter(i => i.id !== id));
                    alert('Invoice deleted successfully');
                }
                else {
                    alert('Failed to delete invoice');
                }
            }
            catch (err) {
                alert('Error deleting invoice');
                console.error(err);
            }
        }
    };
    const handleDownload = (invoice) => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice>
  <InvoiceNumber>${invoice.invoiceNumber}</InvoiceNumber>
  <OrderId>${invoice.orderId}</OrderId>
  <BuyerParty>${invoice.buyerParty}</BuyerParty>
  <SellerParty>${invoice.sellerParty}</SellerParty>
  <TotalAmount>${invoice.totalAmount}</TotalAmount>
  <InvoiceDate>${invoice.invoiceDate}</InvoiceDate>
  <DueDate>${invoice.dueDate}</DueDate>
  <Status>${invoice.status}</Status>
</Invoice>`;
        const blob = new Blob([xml], { type: 'application/xml' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${invoice.invoiceNumber}.xml`;
        a.click();
    };
    const handleCreateInvoice = async (formData) => {
        try {
            const clients = createApiClients(tokens);
            const newInvoice = await invoicesService.createInvoice(clients, {
                invoiceNumber: formData.invoiceNumber || `INV-${Date.now()}`,
                orderId: formData.orderId,
                buyerParty: formData.buyerParty,
                sellerParty: formData.sellerParty || 'Seller Inc',
                totalAmount: parseFloat(formData.totalAmount) || 0,
                invoiceDate: formData.invoiceDate,
                dueDate: formData.dueDate,
            });
            if (newInvoice) {
                setInvoices([...invoices, newInvoice]);
                setIsCreateModalOpen(false);
                alert('Invoice created successfully!');
            }
            else {
                alert('Failed to create invoice');
            }
        }
        catch (err) {
            alert('Error creating invoice');
            console.error(err);
        }
    };
    return (_jsxs("div", { children: [_jsxs("div", { className: 'flex justify-between items-center mb-6', children: [_jsx("h1", { className: 'text-3xl font-bold text-slate-900 dark:text-slate-50', children: "Invoices" }), _jsxs(Button, { onClick: () => setIsCreateModalOpen(true), disabled: loading, children: [_jsx(Plus, { size: 18, className: 'mr-2' }), "Generate Invoice"] })] }), error && (_jsx(Card, { className: 'mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20', children: _jsx(CardBody, { children: _jsx("p", { className: 'text-red-600 dark:text-red-400', children: error }) }) })), loading && (_jsx(Card, { className: 'mb-6', children: _jsx(CardBody, { children: _jsx("p", { className: 'text-slate-600 dark:text-slate-400', children: "Loading invoices..." }) }) })), _jsx(Card, { className: 'mb-6', children: _jsxs(CardBody, { className: 'flex gap-4', children: [_jsx("div", { className: 'flex-1', children: _jsx(Input, { placeholder: 'Search by invoice number or buyer...', value: searchTerm, onChange: e => setSearchTerm(e.target.value), className: '!mb-0' }) }), _jsxs("select", { value: statusFilter, onChange: e => setStatusFilter(e.target.value), className: 'px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500', children: [_jsx("option", { value: '', children: "All Status" }), _jsx("option", { value: 'unpaid', children: "Unpaid" }), _jsx("option", { value: 'paid', children: "Paid" }), _jsx("option", { value: 'overdue', children: "Overdue" }), _jsx("option", { value: 'cancelled', children: "Cancelled" })] })] }) }), _jsx(Card, { children: _jsx("div", { className: 'overflow-x-auto', children: _jsxs("table", { className: 'w-full', children: [_jsx("thead", { children: _jsxs("tr", { className: 'border-b border-slate-200 dark:border-slate-800', children: [_jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Invoice #" }), _jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Order ID" }), _jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Buyer" }), _jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Amount" }), _jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Due Date" }), _jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Status" }), _jsx("th", { className: 'px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-50', children: "Actions" })] }) }), _jsx("tbody", { children: filteredInvoices.map(invoice => (_jsxs("tr", { className: 'border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors', children: [_jsx("td", { className: 'px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-50', children: invoice.invoiceNumber }), _jsx("td", { className: 'px-6 py-4 text-sm text-slate-600 dark:text-slate-400', children: invoice.orderId }), _jsx("td", { className: 'px-6 py-4 text-sm text-slate-600 dark:text-slate-400', children: invoice.buyerParty }), _jsxs("td", { className: 'px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-50', children: ["$", invoice.totalAmount.toLocaleString()] }), _jsx("td", { className: 'px-6 py-4 text-sm text-slate-600 dark:text-slate-400', children: invoice.dueDate }), _jsx("td", { className: 'px-6 py-4 text-sm', children: _jsx(Badge, { variant: getStatusVariant(invoice.status), size: 'sm', children: invoice.status }) }), _jsxs("td", { className: 'px-6 py-4 text-sm flex gap-2', children: [_jsx("button", { onClick: () => alert(`Invoice: ${invoice.invoiceNumber}\nAmount: $${invoice.totalAmount}\nStatus: ${invoice.status}`), className: 'p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors', title: 'View invoice', children: _jsx(Eye, { size: 16 }) }), _jsx("button", { onClick: () => handleDownload(invoice), className: 'p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors', title: 'Download as XML', children: _jsx(Download, { size: 16 }) }), _jsx("button", { onClick: () => handleDelete(invoice.id), className: 'p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors text-red-600', title: 'Delete invoice', children: _jsx(Trash2, { size: 16 }) })] })] }, invoice.id))) })] }) }) }), _jsx(CreateInvoiceModal, { isOpen: isCreateModalOpen, onClose: () => setIsCreateModalOpen(false), onSubmit: handleCreateInvoice })] }));
};
const CreateInvoiceModal = ({ isOpen, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        orderId: '',
        invoiceNumber: '',
        invoiceDate: '',
        dueDate: '',
        totalAmount: '',
        buyerParty: '',
        sellerParty: '',
    });
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.orderId || !formData.invoiceDate) {
            alert('Please fill in required fields');
            return;
        }
        onSubmit(formData);
        setFormData({
            orderId: '',
            invoiceNumber: '',
            invoiceDate: '',
            dueDate: '',
            totalAmount: '',
            buyerParty: '',
            sellerParty: '',
        });
    };
    return (_jsx(Modal, { isOpen: isOpen, onClose: onClose, title: 'Generate Invoice', footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: 'secondary', onClick: onClose, children: "Cancel" }), _jsx(Button, { onClick: handleSubmit, children: "Generate" })] }), children: _jsxs("form", { onSubmit: handleSubmit, className: 'space-y-4', children: [_jsx(Input, { label: 'Order ID', placeholder: 'ORD-001', value: formData.orderId, onChange: e => setFormData({ ...formData, orderId: e.target.value }), required: true }), _jsx(Input, { label: 'Invoice Date', type: 'date', value: formData.invoiceDate, onChange: e => setFormData({ ...formData, invoiceDate: e.target.value }), required: true }), _jsx(Input, { label: 'Due Date', type: 'date', value: formData.dueDate, onChange: e => setFormData({ ...formData, dueDate: e.target.value }) }), _jsx(Input, { label: 'Total Amount', type: 'number', placeholder: '0.00', value: formData.totalAmount, onChange: e => setFormData({ ...formData, totalAmount: e.target.value }) }), _jsx(Input, { label: 'Buyer Party', placeholder: 'Buyer name', value: formData.buyerParty, onChange: e => setFormData({ ...formData, buyerParty: e.target.value }) }), _jsx(Input, { label: 'Seller Party', placeholder: 'Seller name', value: formData.sellerParty, onChange: e => setFormData({ ...formData, sellerParty: e.target.value }) })] }) }));
};
export default InvoicesPage;
