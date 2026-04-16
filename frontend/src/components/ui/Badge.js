import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import clsx from 'clsx';
export const Badge = React.forwardRef(({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const variants = {
        default: 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200',
        success: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
        warning: 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200',
        danger: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
        info: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
    };
    const sizes = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-1 text-sm',
    };
    return (_jsx("span", { ref: ref, className: clsx('inline-block font-medium rounded-full', variants[variant], sizes[size], className), ...props }));
});
Badge.displayName = 'Badge';
