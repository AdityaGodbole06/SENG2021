import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { X } from 'lucide-react';
import clsx from 'clsx';
export const Modal = ({ isOpen, onClose, title, children, footer, size = 'md', }) => {
    if (!isOpen)
        return null;
    const sizes = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
    };
    return (_jsxs("div", { className: 'fixed inset-0 z-50 flex items-center justify-center', children: [_jsx("div", { className: 'absolute inset-0 bg-black/50 transition-opacity', onClick: onClose }), _jsxs("div", { className: clsx('relative bg-white dark:bg-slate-900 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto w-full mx-4', sizes[size]), children: [_jsxs("div", { className: 'flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800', children: [_jsx("h2", { className: 'text-lg font-semibold text-slate-900 dark:text-slate-50', children: title }), _jsx("button", { onClick: onClose, className: 'p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors', children: _jsx(X, { size: 20, className: 'text-slate-500' }) })] }), _jsx("div", { className: 'px-6 py-4', children: children }), footer && (_jsx("div", { className: 'px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2', children: footer }))] })] }));
};
