import React, { useState, useEffect } from 'react';
import {
    User,
    Shield,
    Settings as SettingsIcon,
    ChevronRight,
    Wrench,
    Bell,
    Palette,
    Database,
    Users,
    Lock,
    BookOpen,
    GraduationCap,
    Briefcase,
    ShieldCheck,
    Sliders,
    Mail,
    Building,
    Plus,
    Trash2,
    AlertTriangle
} from 'lucide-react';
import { Button, Input, Card, Modal } from '../components/ui';
import { AdminOnly, StaffOnly, FacultyOnly } from '../components/auth';
import useAuthStore from '../store/authStore';
import useUIStore from '../store/uiStore';
import { useUsers } from '../hooks';
import { ROLES, getRoleLabel, getRoleBadgeColor, hasMinRole } from '../utils/roles';
import { formatApiError } from '../utils/errorUtils';
import api from '../services/api';
import { exportCSV, exportPDF } from '../utils/exportUtils';
import ProfileTab from './settings/ProfileTab';
import PreferencesTab from './settings/PreferencesTab';
import SecurityTab from './settings/SecurityTab';
import NotificationsTab from './settings/NotificationsTab';
import AppearanceTab from './settings/AppearanceTab';
import FacultyTab from './settings/FacultyTab';
import StaffTab from './settings/StaffTab';
import SystemTab from './settings/SystemTab';
import UsersTab from './settings/UsersTab';
import AdminTab from './settings/AdminTab';

// Settings navigation tabs - organized by role
const settingsTabs = [
    { id: 'profile', label: 'Profile', icon: User, minRole: null },
    { id: 'preferences', label: 'Preferences', icon: Sliders, minRole: null },
    { id: 'security', label: 'Security', icon: Lock, minRole: null },
    { id: 'notifications', label: 'Notifications', icon: Bell, minRole: null },
    { id: 'appearance', label: 'Appearance', icon: Palette, minRole: null },
    { id: 'faculty', label: 'Faculty', icon: GraduationCap, exactRole: 'FACULTY' },
    { id: 'staff', label: 'Inventory', icon: Briefcase, minRole: ROLES.STAFF },
    { id: 'system', label: 'System', icon: Wrench, minRole: ROLES.STAFF },
    { id: 'users', label: 'Users', icon: Users, minRole: ROLES.ADMIN },
    { id: 'admin', label: 'Administration', icon: Shield, minRole: ROLES.ADMIN },
];

const Settings = () => {
    const { user, updateProfile, updateAvatar, changePassword, isLoading, hasMinRole } = useAuthStore();
    const { theme, setTheme, backgroundEffect, setBackgroundEffect, viewMode, setViewMode, itemsPerPage, setItemsPerPage, showImages, setShowImages } = useUIStore();
    const { users, loading: usersLoading, fetchUsers, updateUserRole, toggleUserStatus, deleteUser: deleteUserAPI, unflagUser } = useUsers();
    const [activeTab, setActiveTab] = useState('profile');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showCreateUserModal, setShowCreateUserModal] = useState(false);
    const [createUserForm, setCreateUserForm] = useState({
        fullName: '', email: '', username: '', password: '', password2: '',
        role: 'STUDENT', department: '',
    });
    const [createUserError, setCreateUserError] = useState('');
    const [createUserLoading, setCreateUserLoading] = useState(false);

    // Fetch users when admin tab is accessed
    useEffect(() => {
        if (activeTab === 'users' && hasMinRole(ROLES.ADMIN)) {
            fetchUsers();
        }
    }, [activeTab, fetchUsers, hasMinRole]);

    // Filter tabs based on user role
    const visibleTabs = settingsTabs.filter(tab => {
        if (tab.exactRole) return user?.role === tab.exactRole;
        if (!tab.minRole) return true;
        return hasMinRole(tab.minRole);
    });

    // Profile form state
    const [profileForm, setProfileForm] = useState({
        fullName: user?.fullName || '',
        email: user?.email || '',
        phone: user?.phone || '',
        department: user?.department || '',
    });

    // Password form state
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });

    // System settings state - matches backend Item.Category choices
    const defaultCategories = ['Electronics', 'Furniture', 'Equipment', 'Supplies', 'Other'];
    const defaultConditions = ['Available', 'In Use', 'Maintenance', 'Retired'];
    const [categories, setCategories] = useState(defaultCategories);
    const [conditions, setConditions] = useState(defaultConditions);
    const [newCategory, setNewCategory] = useState('');
    const [newCondition, setNewCondition] = useState('');
    const [editingCategory, setEditingCategory] = useState(null);
    const [editingCondition, setEditingCondition] = useState(null);

    // Helper: per-user storage key
    const prefsKey = user?.id ? `user-prefs-${user.id}` : null;
    const notifPrefsKey = user?.id ? `notif-prefs-${user.id}` : null;
    const facultyPrefsKey = user?.id ? `faculty-prefs-${user.id}` : null;
    const staffPrefsKey = user?.id ? `staff-prefs-${user.id}` : null;
    const adminPrefsKey = user?.id ? `admin-prefs-${user.id}` : null;

    // Student/User Preferences state
    const [preferences, setPreferences] = useState({
        // Request defaults
        defaultQuantity: 1,
        defaultPriority: 'NORMAL',
        defaultPurpose: '',
        // Display preferences
        viewMode: 'table',
        itemsPerPage: 10,
        showImages: true,
        // Reminder settings
        dueDateReminder: true,
        reminderDays: 2,
        autoRenewRequests: false,
    });

    // Notification preferences state
    const [notifPrefs, setNotifPrefs] = useState({
        emailNewRequests: true,
        emailApprovals: true,
        emailInventory: false,
        browserPush: true,
        weeklySummary: false,
    });

    // Faculty settings state
    const [facultySettings, setFacultySettings] = useState({
        department: user?.department || '',
        courses: [],
        maxBorrowItems: 10,
        maxBorrowDays: 14,
        autoApproveOwnStudents: false,
        requireJustification: true,
    });

    // Staff settings state
    const [staffSettings, setStaffSettings] = useState({
        defaultCategory: 'Electronics',
        defaultLocation: '',
        defaultStatus: 'AVAILABLE',
        reportFormat: 'pdf',
        autoGenerateReports: false,
        reportSchedule: 'weekly',
    });

    // Admin settings state
    const [adminSettings, setAdminSettings] = useState({
        maintenanceMode: false,
        allowRegistration: true,
        requireEmailVerification: false,
        autoBackup: true,
        backupFrequency: 'daily',
        retentionDays: 30,
    });

    // Save success message
    const [saveMessage, setSaveMessage] = useState('');
    const [backupLoading, setBackupLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [unflagConfirmId, setUnflagConfirmId] = useState(null);

    // Load all saved settings from localStorage on mount
    useEffect(() => {
        if (!user?.id) return;

        try {
            const savedPrefs = localStorage.getItem(prefsKey);
            if (savedPrefs) setPreferences(prev => ({ ...prev, ...JSON.parse(savedPrefs) }));

            const savedNotif = localStorage.getItem(notifPrefsKey);
            if (savedNotif) setNotifPrefs(prev => ({ ...prev, ...JSON.parse(savedNotif) }));

            const savedFaculty = localStorage.getItem(facultyPrefsKey);
            if (savedFaculty) setFacultySettings(prev => ({ ...prev, ...JSON.parse(savedFaculty) }));

            const savedStaff = localStorage.getItem(staffPrefsKey);
            if (savedStaff) setStaffSettings(prev => ({ ...prev, ...JSON.parse(savedStaff) }));

            const savedAdmin = localStorage.getItem(adminPrefsKey);
            if (savedAdmin) setAdminSettings(prev => ({ ...prev, ...JSON.parse(savedAdmin) }));

            // Load system categories/conditions
            const savedSys = localStorage.getItem('sys-settings');
            if (savedSys) {
                const parsed = JSON.parse(savedSys);
                if (parsed.categories?.length) setCategories(parsed.categories);
                if (parsed.conditions?.length) setConditions(parsed.conditions);
            }
        } catch (e) {
            // failed to load settings — use defaults
        }
    }, [user?.id]);

    // Save settings helper
    const saveSettings = (key, data, label) => {
        if (!key) return;
        try {
            localStorage.setItem(key, JSON.stringify(data));
            setSaveMessage(`${label} saved successfully!`);
            setTimeout(() => setSaveMessage(''), 3000);
        } catch (e) {
            setSaveMessage('Failed to save settings');
            setTimeout(() => setSaveMessage(''), 3000);
        }
    };

    // Audit logs — fetch from backend (admin only)
    const [auditLogs, setAuditLogs] = useState([]);
    const [auditLogsLoading, setAuditLogsLoading] = useState(false);
    const [clearLogsConfirm, setClearLogsConfirm] = useState(false);

    const fetchAuditLogs = async () => {
        try {
            setAuditLogsLoading(true);
            const { data } = await api.get('/auth/audit-logs/?limit=200');
            setAuditLogs(data);
        } catch (err) {
            // audit log fetch failed — non-critical
        } finally {
            setAuditLogsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'admin') fetchAuditLogs();
    }, [activeTab]);

    // Daily auto-export: when admin opens admin tab, if 24h have passed, auto-export PDF
    useEffect(() => {
        if (activeTab !== 'admin' || auditLogs.length === 0) return;
        const lastExportKey = 'audit-last-auto-export';
        const lastExport = localStorage.getItem(lastExportKey);
        const now = Date.now();
        const ONE_DAY = 24 * 60 * 60 * 1000;
        if (lastExport && (now - parseInt(lastExport, 10)) < ONE_DAY) return;

        // Auto-export
        const headers = ['Action', 'User', 'Details', 'IP Address', 'Timestamp'];
        const rows = auditLogs.map(l => [
            l.action, l.user || '—', l.details || '—', l.ip_address || '—',
            new Date(l.timestamp).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }),
        ]);
        exportPDF('PLMun_Audit_Logs', 'Audit Log Report — Auto Export', headers, rows);
        localStorage.setItem(lastExportKey, String(now));
        setSaveMessage('✓ Daily audit log report exported automatically.');
        setTimeout(() => setSaveMessage(''), 4000);
    }, [activeTab, auditLogs]);

    const handleClearAuditLogs = async () => {
        try {
            const { data } = await api.delete('/auth/audit-logs/');
            setSaveMessage('✓ ' + (data.message || 'Audit logs cleared.'));
            setTimeout(() => setSaveMessage(''), 3000);
            fetchAuditLogs();
        } catch (err) {
            setSaveMessage('✗ ' + formatApiError(err, 'Failed to clear logs'));
            setTimeout(() => setSaveMessage(''), 5000);
        }
        setClearLogsConfirm(false);
    };

    const handleExportAuditLogs = () => {
        const headers = ['Action', 'User', 'Details', 'IP Address', 'Timestamp'];
        const rows = auditLogs.map(l => [
            l.action, l.user || '—', l.details || '—', l.ip_address || '—',
            new Date(l.timestamp).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }),
        ]);
        exportPDF('PLMun_Audit_Logs', 'Audit Log Report', headers, rows);
        localStorage.setItem('audit-last-auto-export', String(Date.now()));
    };

    const handleCreateUser = async () => {
        setCreateUserError('');
        const { fullName, email, username, password, password2, role, department } = createUserForm;
        if (!fullName || !email || !username || !password) {
            setCreateUserError('Full name, email, username, and password are required.');
            return;
        }
        if (password !== password2) {
            setCreateUserError('Passwords do not match.');
            return;
        }
        if (password.length < 6) {
            setCreateUserError('Password must be at least 6 characters.');
            return;
        }
        try {
            setCreateUserLoading(true);
            await api.post('/auth/register/', { fullName, email, username, password, password2, role, department });
            setSaveMessage(`✓ Account created for ${fullName} (${role})`);
            setTimeout(() => setSaveMessage(''), 4000);
            setShowCreateUserModal(false);
            setCreateUserForm({ fullName: '', email: '', username: '', password: '', password2: '', role: 'STUDENT', department: '' });
            fetchUsers();
        } catch (err) {
            const msg = formatApiError(err, 'Failed to create account.');
            setCreateUserError(msg || 'Failed to create account.');
        } finally {
            setCreateUserLoading(false);
        }
    };

    const handleProfileSave = async () => {
        await updateProfile(profileForm);
    };

    const handlePasswordChange = async () => {
        setPasswordError('');
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError('Passwords do not match!');
            return;
        }
        if (passwordForm.newPassword.length < 6) {
            setPasswordError('Password must be at least 6 characters.');
            return;
        }
        await changePassword(passwordForm);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    };

    const handleToggleUserStatus = async (userId) => {
        await toggleUserStatus(userId);
    };

    const handleDeleteUser = async (userId) => {
        await deleteUserAPI(userId);
        setShowDeleteModal(false);
        setSelectedUser(null);
    };

    const handleRoleChange = async (userId, newRole) => {
        await updateUserRole(userId, newRole);
    };

    const handleUnflagUser = async (userId) => {
        const result = await unflagUser(userId);
        if (result.success) {
            setSaveMessage(result.message || 'User unflagged successfully!');
            setTimeout(() => setSaveMessage(''), 3000);
            fetchUsers();
        } else {
            setSaveMessage(`✗ Failed to unflag user: ${result.error}`);
            setTimeout(() => setSaveMessage(''), 5000);
        }
        setUnflagConfirmId(null);
    };

    const handleBackupNow = async () => {
        if (backupLoading) return;
        setBackupLoading(true);
        setSaveMessage('');
        try {
            const response = await api.get('/auth/backup/', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/json' }));
            const link = document.createElement('a');
            const now = new Date();
            const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
            link.href = url;
            link.setAttribute('download', `plmun_nexus_backup_${ts}.json`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            setSaveMessage('✓ Backup downloaded successfully!');
            setTimeout(() => setSaveMessage(''), 5000);
        } catch (err) {
            const msg = formatApiError(err, 'Backup failed');
            setSaveMessage(`✗ Backup failed: ${msg}`);
            setTimeout(() => setSaveMessage(''), 5000);
        } finally {
            setBackupLoading(false);
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'profile':
                return (
                    <ProfileTab
                        user={user}
                        profileForm={profileForm}
                        setProfileForm={setProfileForm}
                        handleProfileSave={handleProfileSave}
                        updateAvatar={updateAvatar}
                        isLoading={isLoading}
                    />
                );

            case 'preferences':
                return (
                    <PreferencesTab
                        preferences={preferences}
                        setPreferences={setPreferences}
                        saveMessage={saveMessage}
                        saveSettings={saveSettings}
                        prefsKey={prefsKey}
                        viewMode={viewMode}
                        setViewMode={setViewMode}
                        itemsPerPage={itemsPerPage}
                        setItemsPerPage={setItemsPerPage}
                        showImages={showImages}
                        setShowImages={setShowImages}
                    />
                );

            case 'security':
                return (
                    <SecurityTab
                        passwordForm={passwordForm}
                        setPasswordForm={setPasswordForm}
                        showPasswords={showPasswords}
                        passwordError={passwordError}
                        setPasswordError={setPasswordError}
                        handlePasswordChange={handlePasswordChange}
                        isLoading={isLoading}
                    />
                );

            case 'notifications':
                return (
                    <NotificationsTab
                        notifPrefs={notifPrefs}
                        setNotifPrefs={setNotifPrefs}
                        saveMessage={saveMessage}
                        saveSettings={saveSettings}
                        notifPrefsKey={notifPrefsKey}
                    />
                );

            case 'appearance':
                return (
                    <AppearanceTab
                        theme={theme}
                        setTheme={setTheme}
                        backgroundEffect={backgroundEffect}
                        setBackgroundEffect={setBackgroundEffect}
                    />
                );

            case 'faculty':
                return (
                    <FacultyTab
                        facultySettings={facultySettings}
                        setFacultySettings={setFacultySettings}
                        saveSettings={saveSettings}
                        facultyPrefsKey={facultyPrefsKey}
                    />
                );

            case 'staff':
                return (
                    <StaffTab
                        staffSettings={staffSettings}
                        setStaffSettings={setStaffSettings}
                        categories={categories}
                        saveSettings={saveSettings}
                        staffPrefsKey={staffPrefsKey}
                    />
                );

            case 'system':
                return (
                    <SystemTab
                        categories={categories}
                        setCategories={setCategories}
                        conditions={conditions}
                        setConditions={setConditions}
                        editingCategory={editingCategory}
                        setEditingCategory={setEditingCategory}
                        editingCondition={editingCondition}
                        setEditingCondition={setEditingCondition}
                        newCategory={newCategory}
                        setNewCategory={setNewCategory}
                        newCondition={newCondition}
                        setNewCondition={setNewCondition}
                        setSaveMessage={setSaveMessage}
                    />
                );

            case 'users':
                return (
                    <UsersTab
                        users={users}
                        handleToggleUserStatus={handleToggleUserStatus}
                        handleRoleChange={handleRoleChange}
                        handleUnflagUser={handleUnflagUser}
                        setSelectedUser={setSelectedUser}
                        setShowDeleteModal={setShowDeleteModal}
                        setShowCreateUserModal={setShowCreateUserModal}
                        setCreateUserError={setCreateUserError}
                        unflagConfirmId={unflagConfirmId}
                        setUnflagConfirmId={setUnflagConfirmId}
                    />
                );

            case 'admin':
                return (
                    <AdminTab
                        adminSettings={adminSettings}
                        setAdminSettings={setAdminSettings}
                        saveMessage={saveMessage}
                        setSaveMessage={setSaveMessage}
                        saveSettings={saveSettings}
                        adminPrefsKey={adminPrefsKey}
                        users={users}
                        auditLogs={auditLogs}
                        auditLogsLoading={auditLogsLoading}
                        fetchAuditLogs={fetchAuditLogs}
                        handleClearAuditLogs={handleClearAuditLogs}
                        handleExportAuditLogs={handleExportAuditLogs}
                        handleBackupNow={handleBackupNow}
                        backupLoading={backupLoading}
                        clearLogsConfirm={clearLogsConfirm}
                        setClearLogsConfirm={setClearLogsConfirm}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    <SettingsIcon className="text-primary" />
                    Settings
                </h1>
                <p className="text-gray-500 mt-1">Manage your account and system preferences</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar Navigation */}
                <div className="lg:w-64 flex-shrink-0">
                    <Card className="p-2">
                        {visibleTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${activeTab === tab.id
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                <tab.icon size={20} />
                                <span className="font-medium">{tab.label}</span>
                                <ChevronRight size={16} className={`ml-auto transition-transform ${activeTab === tab.id ? 'rotate-90' : ''}`} />
                            </button>
                        ))}
                    </Card>
                </div>

                {/* Content Area */}
                <div className="flex-1">
                    <Card className="p-6">
                        {renderTabContent()}
                    </Card>
                </div>
            </div>

            {/* Create User Modal */}
            <Modal
                isOpen={showCreateUserModal}
                onClose={() => { setShowCreateUserModal(false); setCreateUserError(''); }}
                title="Create New Account"
            >
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label="Full Name"
                            icon={User}
                            placeholder="Juan Dela Cruz"
                            value={createUserForm.fullName}
                            onChange={(e) => setCreateUserForm({ ...createUserForm, fullName: e.target.value })}
                        />
                        <Input
                            label="Email"
                            icon={Mail}
                            type="email"
                            placeholder="juan@plm.edu.ph"
                            value={createUserForm.email}
                            onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label="Username"
                            icon={User}
                            placeholder="juandelacruz"
                            value={createUserForm.username}
                            onChange={(e) => setCreateUserForm({ ...createUserForm, username: e.target.value })}
                        />
                        <Input
                            label="Department"
                            icon={Building}
                            placeholder="e.g., CIT"
                            value={createUserForm.department}
                            onChange={(e) => setCreateUserForm({ ...createUserForm, department: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                        <select
                            value={createUserForm.role}
                            onChange={(e) => setCreateUserForm({ ...createUserForm, role: e.target.value })}
                            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="STUDENT">Student</option>
                            <option value="FACULTY">Faculty</option>
                            <option value="STAFF">Staff</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label="Password"
                            icon={Lock}
                            type="password"
                            placeholder="Min 6 characters"
                            value={createUserForm.password}
                            onChange={(e) => setCreateUserForm({ ...createUserForm, password: e.target.value })}
                        />
                        <Input
                            label="Confirm Password"
                            icon={Lock}
                            type="password"
                            placeholder="Re-enter password"
                            value={createUserForm.password2}
                            onChange={(e) => setCreateUserForm({ ...createUserForm, password2: e.target.value })}
                        />
                    </div>
                    {createUserError && (
                        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 px-3 py-2 rounded-lg">{createUserError}</p>
                    )}
                    <div className="flex gap-3 justify-end pt-2">
                        <Button variant="ghost" onClick={() => { setShowCreateUserModal(false); setCreateUserError(''); }}>
                            Cancel
                        </Button>
                        <Button icon={Plus} onClick={handleCreateUser} loading={createUserLoading}>
                            Create Account
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => { setShowDeleteModal(false); setSelectedUser(null); }}
                title="Delete User Account"
            >
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-red-500" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-800">Are you sure?</h3>
                            <p className="text-sm text-gray-500">This action cannot be undone.</p>
                        </div>
                    </div>

                    {selectedUser && (
                        <div className="bg-gray-50 rounded-xl p-4 mb-6">
                            <p className="text-sm text-gray-600">
                                You are about to delete the account for <span className="font-semibold">{selectedUser.fullName}</span> ({selectedUser.email}).
                            </p>
                        </div>
                    )}

                    <div className="flex gap-3 justify-end">
                        <Button variant="ghost" onClick={() => { setShowDeleteModal(false); setSelectedUser(null); }}>
                            Cancel
                        </Button>
                        <Button variant="danger" icon={Trash2} onClick={() => handleDeleteUser(selectedUser?.id)}>
                            Delete Account
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Settings;
