import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Moon, Sun, LogOut, Menu } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
export const Header = ({ onMenuClick }) => {
    const { theme, toggleTheme } = useTheme();
    const { user, logout } = useAuth();
    return (_jsxs("header", { className: 'bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between', children: [_jsxs("div", { className: 'flex items-center gap-4', children: [_jsx("button", { onClick: onMenuClick, className: 'p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden', children: _jsx(Menu, { size: 20 }) }), _jsx("h1", { className: 'text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent', children: "DigitalBook" })] }), _jsxs("div", { className: 'flex items-center gap-4', children: [user && (_jsxs("div", { className: 'text-sm', children: [_jsx("p", { className: 'font-medium text-slate-900 dark:text-slate-50', children: user.name }), _jsx("p", { className: 'text-slate-500 dark:text-slate-400 capitalize', children: user.role })] })), _jsx("button", { onClick: toggleTheme, className: 'p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors', "aria-label": 'Toggle theme', children: theme === 'light' ? (_jsx(Moon, { size: 20, className: 'text-slate-600 dark:text-slate-400' })) : (_jsx(Sun, { size: 20, className: 'text-slate-600 dark:text-slate-400' })) }), _jsxs(Button, { variant: 'ghost', size: 'sm', onClick: logout, className: 'flex items-center gap-2', children: [_jsx(LogOut, { size: 18 }), "Logout"] })] })] }));
};
