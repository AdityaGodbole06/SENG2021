import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import clsx from 'clsx';
export const Input = React.forwardRef(({ className, label, error, fullWidth = true, ...props }, ref) => (_jsxs("div", { className: fullWidth ? 'w-full' : '', children: [label && (_jsx("label", { className: 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2', children: label })), _jsx("input", { ref: ref, className: clsx('w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed', error && 'border-red-500 focus:ring-red-500', className), ...props }), error && _jsx("p", { className: 'text-red-500 text-sm mt-1', children: error })] })));
Input.displayName = 'Input';
