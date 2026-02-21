import React, { useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    FileText,
    BarChart3,
    Settings,
    LogOut,
    ChevronLeft,
    Menu,
    Users,
    X
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import plmunLogo from '../../assets/images/logo.png';
import { ROLES, hasMinRole } from '../../utils/roles';

// Navigation items with minimum role requirements
const getNavItems = (userRole) => [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', minRole: ROLES.FACULTY },
    { icon: Package, label: hasMinRole(userRole, ROLES.STAFF) ? 'Inventory' : 'Items', path: '/inventory', minRole: null },
    { icon: FileText, label: 'Requests', path: '/requests', minRole: null },
    { icon: BarChart3, label: 'Reports', path: '/reports', minRole: ROLES.STAFF },
    { icon: Users, label: 'Users', path: '/users', minRole: ROLES.ADMIN },
    { icon: Settings, label: 'Settings', path: '/settings', minRole: null },
];

const Sidebar = ({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuthStore();

    useEffect(() => {
        setMobileOpen?.(false);
    }, [location.pathname, setMobileOpen]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = getNavItems(user?.role);
    const visibleNavItems = navItems.filter(item => {
        if (!item.minRole) return true;
        return hasMinRole(user?.role, item.minRole);
    });

    return (
        <>
            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setMobileOpen(false)}
                    style={{ animation: 'fadeIn 0.2s ease-out' }}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed left-0 top-0 h-screen
                bg-gradient-to-b from-gray-900 via-gray-850 to-gray-800
                text-white z-50
                transition-all duration-300 ease-in-out
                flex flex-col
                shadow-2xl shadow-black/20
                ${collapsed ? 'w-20' : 'w-64'}
                ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0
            `}>
                {/* Logo Section */}
                <div className="p-3 border-b border-gray-700/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden sidebar-logo">
                                <img src={plmunLogo} alt="PLMun" className="w-8 h-8 object-contain" />
                            </div>
                            {!collapsed && (
                                <div className="overflow-hidden" style={{ animation: 'slideInLeft 0.3s ease-out' }}>
                                    <h1 className="font-bold text-lg leading-tight">PLMun</h1>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Inventory Nexus</p>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => {
                                if (window.innerWidth < 768) {
                                    setMobileOpen(false);
                                } else {
                                    setCollapsed(!collapsed);
                                }
                            }}
                            className="p-2 hover:bg-gray-700/50 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
                        >
                            {mobileOpen && window.innerWidth < 768 ? (
                                <X size={20} />
                            ) : collapsed ? (
                                <Menu size={20} />
                            ) : (
                                <ChevronLeft size={20} />
                            )}
                        </button>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto">
                    {visibleNavItems.map((item, index) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            style={{ animationDelay: `${index * 50}ms` }}
                            className={({ isActive }) => `
                                flex items-center gap-3 px-3 py-2 rounded-xl
                                transition-all duration-300 ease-out
                                group relative overflow-hidden
                                sidebar-nav-item
                                ${isActive
                                    ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/30'
                                    : 'text-gray-300 hover:bg-gray-700/50 hover:text-white hover:translate-x-1'
                                }
                            `}
                        >
                            {({ isActive }) => (
                                <>
                                    {/* Active indicator */}
                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full shadow-lg shadow-white/50"
                                            style={{ animation: 'slideInLeft 0.3s ease-out' }}
                                        />
                                    )}

                                    <item.icon size={20} className="flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />

                                    {!collapsed && (
                                        <span className="font-medium transition-all duration-200">{item.label}</span>
                                    )}

                                    {/* Hover glow */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 
                                        translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />

                                    {collapsed && (
                                        <div className="
                                            absolute left-full ml-3 px-3 py-1.5 
                                            bg-gray-900 text-white text-sm rounded-lg
                                            opacity-0 invisible group-hover:opacity-100 group-hover:visible
                                            transition-all duration-200 transform group-hover:translate-x-0 translate-x-[-8px]
                                            whitespace-nowrap z-50 shadow-xl
                                            hidden md:block
                                            border border-gray-700/50
                                        ">
                                            {item.label}
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45 border-l border-b border-gray-700/50" />
                                        </div>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* User Section */}
                <div className="p-2 border-t border-gray-700/50">
                    <div className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-700/30 transition-all duration-300 hover:bg-gray-700/50">
                        {user?.avatar ? (
                            <img
                                src={user.avatar}
                                alt="Profile"
                                className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/30 transition-all duration-300 hover:ring-primary/60 hover:scale-105"
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold transition-transform duration-300 hover:scale-105 shadow-lg shadow-primary/20 text-sm">
                                {user?.fullName?.charAt(0) || 'U'}
                            </div>
                        )}
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-xs truncate">{user?.fullName || 'User'}</p>
                                <p className="text-[10px] text-gray-400 truncate">{user?.email || 'user@plmun.edu.ph'}</p>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleLogout}
                        className={`
                            w-full mt-1.5 flex items-center justify-center gap-2
                            px-3 py-2 rounded-xl
                            text-gray-400 hover:text-white hover:bg-red-500/20
                            transition-all duration-300
                            group/logout
                            hover:shadow-lg hover:shadow-red-500/10
                        `}
                    >
                        <LogOut size={16} className="transition-transform duration-300 group-hover/logout:rotate-[-12deg] group-hover/logout:scale-110" />
                        {!collapsed && <span className="font-medium text-xs">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Sidebar Animation Styles */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideInLeft {
                    from { opacity: 0; transform: translateX(-12px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .sidebar-nav-item {
                    animation: slideInLeft 0.4s ease-out both;
                }
                .sidebar-logo {
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                }
                .sidebar-logo:hover {
                    transform: rotate(8deg) scale(1.05);
                    box-shadow: 0 0 20px rgba(var(--color-primary-rgb, 59, 130, 246), 0.3);
                }
            `}</style>
        </>
    );
};

export default Sidebar;
