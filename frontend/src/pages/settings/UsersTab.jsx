import React from 'react';
import { Plus, Trash2, UserX, UserCheck, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button, Card } from '../../components/ui';
import { AdminOnly } from '../../components/auth';
import { ROLES, getRoleBadgeColor } from '../../utils/roles';

const UsersTab = ({
    users, handleToggleUserStatus, handleRoleChange, handleUnflagUser,
    setSelectedUser, setShowDeleteModal, setShowCreateUserModal, setCreateUserError,
    unflagConfirmId, setUnflagConfirmId,
}) => {
    return (
        <AdminOnly showAccessDenied>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">User Management</h2>
                        <p className="text-gray-500 text-sm mt-1">Manage user accounts and permissions</p>
                    </div>
                    <Button icon={Plus} onClick={() => { setShowCreateUserModal(true); setCreateUserError(''); }}>Add User</Button>
                </div>

                <Card className="overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Department</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                                                {(u.fullName || u.full_name || u.email || '?').charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800">{u.fullName || u.full_name || u.email}</p>
                                                <p className="text-sm text-gray-500">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={u.role}
                                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                        >
                                            <option value={ROLES.STUDENT}>Student</option>
                                            <option value={ROLES.FACULTY}>Faculty</option>
                                            <option value={ROLES.STAFF}>Staff</option>
                                            <option value={ROLES.ADMIN}>Admin</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{u.department}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                                                {u.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                            {u.isFlagged && (
                                                <div className="flex items-center gap-1">
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" title={`${u.overdueCount || 0} overdue incident(s)`}>
                                                        <AlertTriangle size={12} />
                                                        Flagged ({u.overdueCount || 0})
                                                    </span>
                                                    {unflagConfirmId === u.id ? (
                                                        <div className="flex items-center gap-1">
                                                            <button type="button" onClick={() => handleUnflagUser(u.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer transition-colors">
                                                                ✓ Confirm
                                                            </button>
                                                            <button type="button" onClick={() => setUnflagConfirmId(null)} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 cursor-pointer transition-colors">
                                                                ✗ Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => setUnflagConfirmId(u.id)}
                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 cursor-pointer transition-colors"
                                                            title="Remove flag from this user"
                                                        >
                                                            <ShieldCheck size={12} />
                                                            Unflag
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleToggleUserStatus(u.id)}
                                                className={`p-2 rounded-lg transition-colors ${u.isActive ? 'hover:bg-yellow-50 text-yellow-600' : 'hover:bg-green-50 text-green-600'}`}
                                                title={u.isActive ? 'Deactivate' : 'Activate'}
                                            >
                                                {u.isActive ? <UserX size={18} /> : <UserCheck size={18} />}
                                            </button>
                                            <button
                                                onClick={() => { setSelectedUser(u); setShowDeleteModal(true); }}
                                                className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            </div>
        </AdminOnly>
    );
};

export default UsersTab;
