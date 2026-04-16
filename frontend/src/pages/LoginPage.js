import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardBody } from '@/components/ui/Card';
const LoginPage = () => {
    const navigate = useNavigate();
    const { login, setTokens } = useAuth();
    const [name, setName] = useState('John Doe');
    const [email, setEmail] = useState('buyer@example.com');
    const [role, setRole] = useState('buyer');
    const [loading, setLoading] = useState(false);
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Simulate API login and token retrieval
            const user = {
                id: '1',
                name,
                email,
                role,
                company: 'Example Corp',
            };
            // Set mock tokens (in real scenario, these would come from auth API)
            setTokens({
                ordersApi: 'mock-orders-token',
                dispatchApi: 'mock-dispatch-token',
                invoicesApi: 'mock-invoices-token',
            });
            login(user);
            navigate('/dashboard');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: 'min-h-screen bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center p-4', children: _jsx(Card, { className: 'w-full max-w-md', children: _jsxs(CardBody, { className: 'pt-8', children: [_jsx("h1", { className: 'text-3xl font-bold text-center mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent', children: "DigitalBook" }), _jsx("p", { className: 'text-center text-slate-600 dark:text-slate-400 mb-6', children: "Digital Trade Management Platform" }), _jsxs("form", { onSubmit: handleLogin, className: 'space-y-4', children: [_jsx(Input, { label: 'Full Name', type: 'text', value: name, onChange: e => setName(e.target.value), placeholder: 'John Doe', required: true }), _jsx(Input, { label: 'Email', type: 'email', value: email, onChange: e => setEmail(e.target.value), placeholder: 'buyer@example.com', required: true }), _jsxs("div", { children: [_jsx("label", { className: 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2', children: "User Role" }), _jsxs("select", { value: role, onChange: e => setRole(e.target.value), className: 'w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500', children: [_jsx("option", { value: 'buyer', children: "Buyer" }), _jsx("option", { value: 'supplier', children: "Supplier" })] })] }), _jsx(Button, { type: 'submit', fullWidth: true, isLoading: loading, className: 'mt-6', children: "Login" })] }), _jsx("div", { className: 'mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md', children: _jsx("p", { className: 'text-xs text-slate-600 dark:text-slate-400', children: "Demo credentials: Use any name/email combination" }) })] }) }) }));
};
export default LoginPage;
