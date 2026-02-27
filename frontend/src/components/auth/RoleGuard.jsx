// RoleGuard.jsx — Core frontend authorization component.
// Wraps pages and sections to enforce role-based access.
// Unauthorized users are redirected, shown "Access Denied", or hidden.
// Convenience wrappers: AdminOnly, StaffOnly, FacultyOnly
// HOC version: withRoleGuard() for any component

import React from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { hasMinRole, hasRole, hasPermission, ROLES } from '../../utils/roles';

/**
 * RoleGuard Component
 * Protects routes and UI elements based on user roles
 * 
 * Usage:
 * - <RoleGuard minRole="STAFF">...</RoleGuard>  // Requires STAFF or higher
 * - <RoleGuard roles={['ADMIN']}>...</RoleGuard>  // Only ADMIN
 * - <RoleGuard permission="DELETE_USERS">...</RoleGuard>  // Permission-based
 */

const RoleGuard = ({
    children,
    minRole,           // Minimum role level required (uses hierarchy)
    roles,             // Specific roles allowed (exact match)
    permission,        // Permission key from PERMISSIONS object
    fallback = null,   // Custom fallback component
    redirectTo,        // Redirect path if unauthorized
    showAccessDenied = false,  // Show access denied message
}) => {
    const { user, isAuthenticated } = useAuthStore();
    const userRole = user?.role || ROLES.STUDENT;

    // Not authenticated - redirect to login
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Check authorization
    let isAuthorized = true;

    if (minRole) {
        isAuthorized = hasMinRole(userRole, minRole);
    } else if (roles && roles.length > 0) {
        isAuthorized = hasRole(userRole, roles);
    } else if (permission) {
        isAuthorized = hasPermission(userRole, permission);
    }

    // If authorized, render children
    if (isAuthorized) {
        return children;
    }

    // Redirect if path specified
    if (redirectTo) {
        return <Navigate to={redirectTo} replace />;
    }

    // Show access denied message
    if (showAccessDenied) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <ShieldAlert className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Access Denied</h2>
                <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
                    You don't have permission to access this area.
                    Please contact your administrator if you believe this is an error.
                </p>
                <p className="mt-4 text-sm text-gray-400">
                    Required role: {minRole || roles?.join(', ') || 'Special permission'}
                </p>
            </div>
        );
    }

    // Return fallback or null
    return fallback;
};

/**
 * AdminOnly - Shortcut for admin-only content
 */
export const AdminOnly = ({ children, ...props }) => (
    <RoleGuard minRole={ROLES.ADMIN} {...props}>
        {children}
    </RoleGuard>
);

/**
 * StaffOnly - Shortcut for staff+ content
 */
export const StaffOnly = ({ children, ...props }) => (
    <RoleGuard minRole={ROLES.STAFF} {...props}>
        {children}
    </RoleGuard>
);

/**
 * FacultyOnly - Shortcut for faculty+ content (Faculty, Staff, Admin)
 */
export const FacultyOnly = ({ children, ...props }) => (
    <RoleGuard minRole={ROLES.FACULTY} {...props}>
        {children}
    </RoleGuard>
);

/**
 * withRoleGuard - HOC for role protection
 */
export const withRoleGuard = (Component, guardProps) => {
    return (props) => (
        <RoleGuard {...guardProps}>
            <Component {...props} />
        </RoleGuard>
    );
};

export default RoleGuard;
