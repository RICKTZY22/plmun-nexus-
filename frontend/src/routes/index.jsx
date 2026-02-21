import React, { useState } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Menu, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Sidebar, BottomNav } from '../components/layout';
import { Dashboard, Inventory, Requests, Reports, Login, Register, Settings, Users } from '../pages';
import { NotificationDropdown, AnimatedBackground } from '../components/ui';
import { useIsMobile } from '../hooks';
import useAuthStore from '../store/authStore';
import { RoleGuard } from '../components/auth';
import { ROLES } from '../utils/roles';

// Main layout shell (sidebar + content area)
const DashboardLayout = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [flagDismissed, setFlagDismissed] = useState(false);
    const { user } = useAuthStore();
    const isMobile = useIsMobile();
    const location = useLocation();

    // Reset dismissed state on page navigation
    React.useEffect(() => {
        setFlagDismissed(false);
    }, [location.pathname]);

    const mainMargin = isMobile ? '0' : (sidebarCollapsed ? '5rem' : '16rem');
    const isFlagged = user?.isFlagged;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative">
            <AnimatedBackground />

            {/* Sidebar */}
            <Sidebar
                collapsed={sidebarCollapsed}
                setCollapsed={setSidebarCollapsed}
                mobileOpen={mobileOpen}
                setMobileOpen={setMobileOpen}
            />

            {/* Main Content */}
            <main
                className="transition-all duration-300 relative z-10"
                style={{ marginLeft: mainMargin }}
            >
                {/* Header */}
                <header className="sticky top-0 z-30 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between px-3 md:px-5 lg:px-7 py-2.5">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setMobileOpen(true)}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 md:hidden"
                            >
                                <Menu size={22} className="text-gray-600 dark:text-gray-300" />
                            </button>
                            <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">
                                Welcome, <span className="font-semibold text-gray-900 dark:text-white">{user?.fullName || 'User'}</span>
                            </span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white sm:hidden">
                                {user?.fullName?.split(' ')[0] || 'Hi'}
                            </span>
                            {isFlagged && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 animate-pulse">
                                    <AlertTriangle size={11} />
                                    Flagged
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <NotificationDropdown />
                        </div>
                    </div>
                </header>
                {/* Content */}
                <div className="p-3 md:p-5 lg:p-7 pb-24 md:pb-5 lg:pb-7">
                    <Outlet />
                </div>

                {/* ===== Flagged User Blocking Overlay ===== */}
                {isFlagged && (
                    <>
                        {/* Semi-transparent click blocker */}
                        <div
                            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40"
                            style={{ pointerEvents: 'all' }}
                        />

                        {/* Warning popup */}
                        {!flagDismissed && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                                <div
                                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-red-200 dark:border-red-800/50"
                                    style={{ animation: 'scaleIn 0.3s ease-out' }}
                                >
                                    {/* Warning icon */}
                                    <div className="flex justify-center">
                                        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                            <ShieldAlert size={32} className="text-red-600 dark:text-red-400" />
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <h2 className="text-xl font-bold text-center text-gray-900 dark:text-white">
                                        Account Flagged
                                    </h2>

                                    {/* Message */}
                                    <div className="text-center space-y-2">
                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                            Your account has been flagged due to <span className="font-semibold text-red-600">overdue item returns</span>.
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                            While flagged, you <span className="font-bold">cannot perform any actions</span> such as borrowing items or making requests.
                                        </p>
                                    </div>

                                    {/* Contact info */}
                                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-700/50">
                                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 text-center">
                                            ⚠️ Please contact an Admin or Staff member to resolve this issue and restore your account access.
                                        </p>
                                    </div>

                                    {/* Overdue count */}
                                    {user?.overdueCount > 0 && (
                                        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                                            Overdue incidents: <span className="font-bold text-red-600">{user.overdueCount}</span>
                                        </p>
                                    )}

                                    {/* Dismiss button */}
                                    <button
                                        onClick={() => setFlagDismissed(true)}
                                        className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        I Understand
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Animation styles */}
                        <style>{`
                            @keyframes fadeIn {
                                from { opacity: 0; }
                                to { opacity: 1; }
                            }
                            @keyframes scaleIn {
                                from { opacity: 0; transform: scale(0.9); }
                                to { opacity: 1; transform: scale(1); }
                            }
                        `}</style>
                    </>
                )}
            </main>

            <BottomNav />

        </div>
    );
};

// Redirect to /login if not authenticated
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

// Redirect to /dashboard if already logged in
const PublicRoute = ({ children }) => {
    const { isAuthenticated } = useAuthStore();

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

// Route tree
const AppRoutes = () => {
    return (
        <Routes>
            {/* Public Routes */}
            <Route
                path="/login"
                element={
                    <PublicRoute>
                        <Login />
                    </PublicRoute>
                }
            />
            <Route
                path="/register"
                element={
                    <PublicRoute>
                        <Register />
                    </PublicRoute>
                }
            />

            {/* Protected Routes */}
            <Route
                element={
                    <ProtectedRoute>
                        <DashboardLayout />
                    </ProtectedRoute>
                }
            >
                {/* Dashboard - Faculty+ */}
                <Route path="/dashboard" element={
                    <RoleGuard minRole={ROLES.FACULTY} redirectTo="/requests" showAccessDenied>
                        <Dashboard />
                    </RoleGuard>
                } />

                {/* Inventory - All roles (read-only for students) */}
                <Route path="/inventory" element={<Inventory />} />

                {/* Requests - All roles */}
                <Route path="/requests" element={<Requests />} />

                {/* Settings - All roles */}
                <Route path="/settings" element={<Settings />} />

                {/* Reports - Staff+ */}
                <Route
                    path="/reports"
                    element={
                        <RoleGuard minRole={ROLES.STAFF} showAccessDenied>
                            <Reports />
                        </RoleGuard>
                    }
                />

                {/* Users - Admin only */}
                <Route
                    path="/users"
                    element={
                        <RoleGuard minRole={ROLES.ADMIN} showAccessDenied>
                            <Users />
                        </RoleGuard>
                    }
                />
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/requests" replace />} />

            {/* 404 catch-all */}
            <Route path="*" element={<Navigate to="/requests" replace />} />
        </Routes>
    );
};

export default AppRoutes;
