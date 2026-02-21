import React, { useState } from 'react';
import { Plus, X, Package, FileText, Users, Settings, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { hasMinRole, ROLES } from '../../utils/roles';

const FAB = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { user } = useAuthStore();
    const userRole = user?.role || 'STUDENT';

    // Define actions based on role
    const actions = [
        // Everyone can see these
        {
            icon: FileText,
            label: 'New Request',
            to: '/requests',
            color: 'bg-blue-500 hover:bg-blue-600',
            minRole: 'STUDENT',
        },
        // Faculty+ can access inventory
        {
            icon: Package,
            label: 'Inventory',
            to: '/inventory',
            color: 'bg-emerald-500 hover:bg-emerald-600',
            minRole: 'FACULTY',
        },
        // Staff+ can see reports
        {
            icon: BarChart3,
            label: 'Dashboard',
            to: '/',
            color: 'bg-purple-500 hover:bg-purple-600',
            minRole: 'STAFF',
        },
        // Admin only - User Management
        {
            icon: Users,
            label: 'Users',
            to: '/users',
            color: 'bg-amber-500 hover:bg-amber-600',
            minRole: 'ADMIN',
        },
        // Everyone can access settings
        {
            icon: Settings,
            label: 'Settings',
            to: '/settings',
            color: 'bg-gray-500 hover:bg-gray-600',
            minRole: 'STUDENT',
        },
    ];

    // Filter actions based on user role
    const visibleActions = actions.filter(action =>
        hasMinRole(userRole, action.minRole)
    );

    return (
        <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
            {/* Action items */}
            <div className={`
                flex flex-col-reverse gap-3 mb-3
                transition-all duration-300 ease-out
                ${isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}
            `}>
                {visibleActions.map((action, index) => (
                    <Link
                        key={action.label}
                        to={action.to}
                        onClick={() => setIsOpen(false)}
                        className={`
                            flex items-center gap-3 px-4 py-3
                            ${action.color} text-white
                            rounded-xl shadow-lg
                            transform transition-all duration-200
                            hover:scale-105 hover:shadow-xl
                        `}
                        style={{
                            transitionDelay: isOpen ? `${index * 50}ms` : '0ms',
                        }}
                    >
                        <action.icon size={20} />
                        <span className="font-medium">{action.label}</span>
                    </Link>
                ))}
            </div>

            {/* Main FAB Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-14 h-14 rounded-full
                    bg-gradient-to-br from-primary to-primary/80
                    text-white shadow-lg
                    flex items-center justify-center
                    transition-all duration-300
                    hover:shadow-xl hover:scale-110
                    pointer-events-auto
                    ${isOpen ? 'rotate-45 bg-red-500' : ''}
                `}
                style={{
                    background: isOpen ? 'linear-gradient(135deg, #ef4444, #dc2626)' : undefined,
                }}
            >
                {isOpen ? <X size={24} /> : <Plus size={24} />}
            </button>

            {/* Backdrop when open */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 -z-10 pointer-events-auto"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
};

export default FAB;
