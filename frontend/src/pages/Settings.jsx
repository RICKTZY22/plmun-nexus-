import React, { useState, useEffect } from 'react';
import {
    User,
    Lock,
    Bell,
    Palette,
    Database,
    Users,
    Shield,
    Settings as SettingsIcon,
    ChevronRight,
    Camera,
    Mail,
    Phone,
    Building,
    Save,
    Eye,
    EyeOff,
    Trash2,
    UserX,
    UserCheck,
    Edit3,
    AlertTriangle,
    Sun,
    Moon,
    Monitor,
    Sliders,
    LayoutGrid,
    List,
    Clock,
    FileText,
    Download,
    History,
    BookOpen,
    GraduationCap,
    Briefcase,
    Wrench,
    ShieldCheck
} from 'lucide-react';
import { Button, Input, Card, Modal } from '../components/ui';
import { AdminOnly, StaffOnly, FacultyOnly } from '../components/auth';
import useAuthStore from '../store/authStore';
import useUIStore from '../store/uiStore';
import { useUsers } from '../hooks';
import { ROLES, getRoleLabel, getRoleBadgeColor, hasMinRole } from '../utils/roles';
import api from '../services/api';
import { exportCSV } from '../utils/exportUtils';

// Settings navigation tabs - organized by role
const settingsTabs = [
    { id: 'profile', label: 'Profile', icon: User, minRole: null },
    { id: 'preferences', label: 'Preferences', icon: Sliders, minRole: null },
    { id: 'security', label: 'Security', icon: Lock, minRole: null },
    { id: 'notifications', label: 'Notifications', icon: Bell, minRole: null },
    { id: 'appearance', label: 'Appearance', icon: Palette, minRole: null },
    { id: 'faculty', label: 'Faculty Settings', icon: GraduationCap, exactRole: ROLES.FACULTY },
    { id: 'staff', label: 'Inventory Settings', icon: Wrench, minRole: ROLES.STAFF },
    { id: 'system', label: 'System', icon: Database, minRole: ROLES.STAFF },
    { id: 'users', label: 'User Management', icon: Users, minRole: ROLES.ADMIN },
    { id: 'admin', label: 'Administration', icon: Shield, minRole: ROLES.ADMIN },
];

// Users are now fetched from API via useUsers hook

const Settings = () => {
    const { user, updateProfile, updateAvatar, changePassword, isLoading, hasMinRole } = useAuthStore();
    const { theme, setTheme, backgroundEffect, setBackgroundEffect, viewMode, setViewMode, itemsPerPage, setItemsPerPage, showImages, setShowImages } = useUIStore();
    const { users, loading: usersLoading, fetchUsers, updateUserRole, toggleUserStatus, deleteUser: deleteUserAPI, unflagUser } = useUsers();
    const [activeTab, setActiveTab] = useState('profile');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

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
    const [categories, setCategories] = useState([
        'Electronics', 'Furniture', 'Equipment', 'Supplies', 'Other'
    ]);
    const [conditions, setConditions] = useState([
        'Available', 'In Use', 'Maintenance', 'Retired'
    ]);
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
        } catch (e) {
            console.error('Failed to load settings:', e);
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
            console.error('Failed to save settings:', e);
        }
    };

    // Audit logs — fetch from backend (admin only)
    const [auditLogs, setAuditLogs] = useState([]);
    const [auditLogsLoading, setAuditLogsLoading] = useState(false);

    useEffect(() => {
        const fetchAuditLogs = async () => {
            try {
                setAuditLogsLoading(true);
                const { data } = await api.get('/auth/audit-logs/?limit=50');
                setAuditLogs(data);
            } catch (err) {
                console.error('Failed to fetch audit logs:', err);
            } finally {
                setAuditLogsLoading(false);
            }
        };
        if (activeTab === 'system') fetchAuditLogs();
    }, [activeTab]);

    const handleProfileSave = async () => {
        await updateProfile(profileForm);
    };

    const handlePasswordChange = async () => {
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            alert('Passwords do not match!');
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
        if (window.confirm('Are you sure you want to unflag this user? This will reset their overdue count and restore their access.')) {
            const result = await unflagUser(userId);
            if (result.success) {
                alert(result.message || 'User unflagged successfully!');
                fetchUsers();
            } else {
                alert(`Failed to unflag user: ${result.error}`);
            }
        }
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
            const msg = err.response?.data?.error || err.response?.statusText || err.message;
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
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Profile Settings</h2>
                            <p className="text-gray-500 text-sm mt-1">Manage your personal information</p>
                        </div>

                        {/* Avatar Section */}
                        <div className="flex items-center gap-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                            <div className="relative">
                                {user?.avatar ? (
                                    <img
                                        src={user.avatar}
                                        alt="Profile"
                                        className="w-24 h-24 rounded-full object-cover ring-4 ring-primary/20"
                                    />
                                ) : (
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-3xl font-bold">
                                        {user?.fullName?.charAt(0) || 'U'}
                                    </div>
                                )}
                                <label className="absolute bottom-0 right-0 w-8 h-8 bg-white dark:bg-gray-700 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors cursor-pointer">
                                    <Camera size={16} className="text-gray-600 dark:text-gray-300" />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                if (file.size > 2 * 1024 * 1024) {
                                                    alert('Image must be less than 2MB');
                                                    return;
                                                }
                                                updateAvatar(file);
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-800 dark:text-gray-100">{user?.fullName}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user?.role)}`}>
                                    {getRoleLabel(user?.role)}
                                </span>
                                <p className="text-xs text-gray-400 mt-1">Click camera to upload photo</p>
                            </div>
                        </div>

                        {/* Profile Form */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Full Name"
                                icon={User}
                                value={profileForm.fullName}
                                onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                            />
                            <Input
                                label="Email Address"
                                icon={Mail}
                                type="email"
                                value={profileForm.email}
                                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                            />
                            <Input
                                label="Phone Number"
                                icon={Phone}
                                value={profileForm.phone}
                                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                            />
                            <Input
                                label="Department"
                                icon={Building}
                                value={profileForm.department}
                                onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                            />
                        </div>

                        <div className="flex justify-end">
                            <Button onClick={handleProfileSave} loading={isLoading} icon={Save}>
                                Save Changes
                            </Button>
                        </div>
                    </div>
                );

            case 'preferences':
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Preferences</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Customize your request and display settings</p>
                        </div>

                        {/* Request Defaults */}
                        <Card className="p-6">
                            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                                <FileText size={18} className="text-primary" />
                                Request Defaults
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default Quantity</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={preferences.defaultQuantity}
                                        onChange={(e) => setPreferences({ ...preferences, defaultQuantity: parseInt(e.target.value) || 1 })}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default Priority</label>
                                    <select
                                        value={preferences.defaultPriority}
                                        onChange={(e) => setPreferences({ ...preferences, defaultPriority: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    >
                                        <option value="LOW">Low</option>
                                        <option value="NORMAL">Normal</option>
                                        <option value="HIGH">High</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default Purpose Template</label>
                                    <textarea
                                        value={preferences.defaultPurpose}
                                        onChange={(e) => setPreferences({ ...preferences, defaultPurpose: e.target.value })}
                                        placeholder="Enter a default purpose message for your requests..."
                                        rows={2}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                                    />
                                </div>
                            </div>
                        </Card>

                        {/* Display Preferences — wired to uiStore for instant effect */}
                        <Card className="p-6">
                            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                                <LayoutGrid size={18} className="text-primary" />
                                Display Preferences
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">View Mode</label>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setViewMode('table')}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${viewMode === 'table'
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                                }`}
                                        >
                                            <List size={18} />
                                            Table View
                                        </button>
                                        <button
                                            onClick={() => setViewMode('card')}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${viewMode === 'card'
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                                }`}
                                        >
                                            <LayoutGrid size={18} />
                                            Card View
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Items Per Page</label>
                                    <select
                                        value={itemsPerPage}
                                        onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
                                        className="w-full max-w-xs px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    >
                                        <option value={5}>5 items</option>
                                        <option value={10}>10 items</option>
                                        <option value={20}>20 items</option>
                                        <option value={50}>50 items</option>
                                    </select>
                                </div>
                                <label className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl cursor-pointer transition-colors">
                                    <span className="text-gray-700 dark:text-gray-300">Show item images in lists</span>
                                    <input
                                        type="checkbox"
                                        checked={showImages}
                                        onChange={(e) => setShowImages(e.target.checked)}
                                        className="w-5 h-5 text-primary rounded focus:ring-primary"
                                    />
                                </label>
                            </div>
                        </Card>

                        {/* Reminder Settings */}
                        <Card className="p-6">
                            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                                <Clock size={18} className="text-primary" />
                                Reminder Settings
                            </h3>
                            <div className="space-y-4">
                                <label className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl cursor-pointer transition-colors">
                                    <div>
                                        <span className="text-gray-700 dark:text-gray-300 font-medium">Due date reminders</span>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Get notified before items are due</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={preferences.dueDateReminder}
                                        onChange={(e) => setPreferences({ ...preferences, dueDateReminder: e.target.checked })}
                                        className="w-5 h-5 text-primary rounded focus:ring-primary"
                                    />
                                </label>
                                {preferences.dueDateReminder && (
                                    <div className="pl-3">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Remind me this many days before due date</label>
                                        <select
                                            value={preferences.reminderDays}
                                            onChange={(e) => setPreferences({ ...preferences, reminderDays: parseInt(e.target.value) })}
                                            className="w-full max-w-xs px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                        >
                                            <option value={1}>1 day before</option>
                                            <option value={2}>2 days before</option>
                                            <option value={3}>3 days before</option>
                                            <option value={7}>1 week before</option>
                                        </select>
                                    </div>
                                )}
                                <label className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl cursor-pointer transition-colors">
                                    <div>
                                        <span className="text-gray-700 dark:text-gray-300 font-medium">Auto-renew requests</span>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Automatically extend borrowing period if available</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={preferences.autoRenewRequests}
                                        onChange={(e) => setPreferences({ ...preferences, autoRenewRequests: e.target.checked })}
                                        className="w-5 h-5 text-primary rounded focus:ring-primary"
                                    />
                                </label>
                            </div>
                        </Card>

                        <div className="flex items-center justify-end gap-3">
                            {saveMessage && (
                                <span className="text-sm text-emerald-600 font-medium animate-pulse">
                                    ✓ {saveMessage}
                                </span>
                            )}
                            <Button onClick={() => saveSettings(prefsKey, preferences, 'Preferences')} icon={Save}>
                                Save Preferences
                            </Button>
                        </div>
                    </div>
                );

            case 'security':
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Security Settings</h2>
                            <p className="text-gray-500 text-sm mt-1">Manage your password and security preferences</p>
                        </div>

                        <Card className="p-6">
                            <h3 className="font-semibold text-gray-800 mb-4">Change Password</h3>
                            <div className="space-y-4 max-w-md">
                                <div className="relative">
                                    <Input
                                        label="Current Password"
                                        type={showPasswords.current ? 'text' : 'password'}
                                        icon={Lock}
                                        value={passwordForm.currentPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                    />
                                </div>
                                <Input
                                    label="New Password"
                                    type={showPasswords.new ? 'text' : 'password'}
                                    icon={Lock}
                                    value={passwordForm.newPassword}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                />
                                <Input
                                    label="Confirm New Password"
                                    type={showPasswords.confirm ? 'text' : 'password'}
                                    icon={Lock}
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                />
                                <Button onClick={handlePasswordChange} loading={isLoading}>
                                    Update Password
                                </Button>
                            </div>
                        </Card>
                    </div>
                );

            case 'notifications':
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Notification Preferences</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Control how you receive notifications</p>
                        </div>

                        <Card className="p-6 space-y-4">
                            {[
                                { key: 'emailNewRequests', label: 'Email notifications for new requests' },
                                { key: 'emailApprovals', label: 'Email notifications for request approvals' },
                                { key: 'emailInventory', label: 'Email notifications for inventory updates' },
                                { key: 'browserPush', label: 'Browser push notifications' },
                                { key: 'weeklySummary', label: 'Weekly summary reports' },
                            ].map((item) => (
                                <label key={item.key} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl cursor-pointer transition-colors">
                                    <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                                    <input
                                        type="checkbox"
                                        checked={notifPrefs[item.key]}
                                        onChange={(e) => setNotifPrefs({ ...notifPrefs, [item.key]: e.target.checked })}
                                        className="w-5 h-5 text-primary rounded focus:ring-primary"
                                    />
                                </label>
                            ))}
                        </Card>

                        <div className="flex items-center justify-end gap-3">
                            {saveMessage && (
                                <span className="text-sm text-emerald-600 font-medium animate-pulse">
                                    ✓ {saveMessage}
                                </span>
                            )}
                            <Button onClick={() => saveSettings(notifPrefsKey, notifPrefs, 'Notification preferences')} icon={Save}>
                                Save Notification Settings
                            </Button>
                        </div>
                    </div>
                );

            case 'appearance':
                const themeOptions = [
                    { id: 'light', label: 'Light', icon: Sun, description: 'Light background with dark text' },
                    { id: 'dark', label: 'Dark', icon: Moon, description: 'Dark background with light text' },
                    { id: 'system', label: 'System', icon: Monitor, description: 'Follow system preference' },
                ];
                return (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Appearance Settings</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Customize the look and feel of the application</p>
                        </div>

                        <Card className="p-6">
                            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Theme</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {themeOptions.map((option) => {
                                    const Icon = option.icon;
                                    const isActive = theme === option.id;
                                    return (
                                        <button
                                            key={option.id}
                                            onClick={() => setTheme(option.id)}
                                            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${isActive
                                                ? 'border-primary bg-primary/10 dark:bg-primary/20'
                                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                                }`}
                                        >
                                            <Icon
                                                size={24}
                                                className={isActive ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}
                                            />
                                            <span className={`font-medium ${isActive ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {option.label}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                                {option.description}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                                Current theme: <span className="font-medium text-primary">{theme.charAt(0).toUpperCase() + theme.slice(1)}</span>
                            </p>
                        </Card>

                        {/* Background Effects */}
                        <Card className="p-6">
                            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">Background Effects</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Add animated effects to your dashboard</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                                {[
                                    { id: 'none', label: 'None', emoji: '⚪', desc: 'No animation' },
                                    { id: 'stars', label: 'Stars', emoji: '✨', desc: 'Twinkling stars' },
                                    { id: 'meteors', label: 'Meteors', emoji: '☄️', desc: 'Falling meteors' },
                                    { id: 'particles', label: 'Particles', emoji: '🫧', desc: 'Floating bubbles' },
                                    { id: 'aurora', label: 'Aurora', emoji: '🌌', desc: 'Northern lights' },
                                    { id: 'matrix', label: 'Matrix', emoji: '💻', desc: 'Digital rain' },
                                ].map((effect) => {
                                    const isActive = backgroundEffect === effect.id;
                                    return (
                                        <button
                                            key={effect.id}
                                            type="button"
                                            onClick={() => setBackgroundEffect(effect.id)}
                                            className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${isActive
                                                ? 'border-primary bg-primary/10 dark:bg-primary/20'
                                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                                }`}
                                        >
                                            <span className="text-2xl">{effect.emoji}</span>
                                            <span className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {effect.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                                Current effect: <span className="font-medium text-primary">{backgroundEffect.charAt(0).toUpperCase() + backgroundEffect.slice(1)}</span>
                            </p>
                        </Card>
                    </div>
                );

            case 'faculty':
                return (
                    <FacultyOnly showAccessDenied>
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Faculty Settings</h2>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Configure your teaching and borrowing preferences</p>
                            </div>

                            {/* Department & Courses */}
                            <Card className="p-6">
                                <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                                    <BookOpen size={18} className="text-primary" />
                                    Department & Courses
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Department</label>
                                        <input
                                            type="text"
                                            value={facultySettings.department}
                                            onChange={(e) => setFacultySettings({ ...facultySettings, department: e.target.value })}
                                            placeholder="e.g., College of Information Technology"
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Courses Taught</label>
                                        <p className="text-xs text-gray-500 mb-2">Enter course codes separated by commas</p>
                                        <input
                                            type="text"
                                            placeholder="e.g., IT101, IT201, CAPSTONE"
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                        />
                                    </div>
                                </div>
                            </Card>

                            {/* Borrowing Limits */}
                            <Card className="p-6">
                                <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                                    <Briefcase size={18} className="text-primary" />
                                    Borrowing Limits
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Maximum Items</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="50"
                                            value={facultySettings.maxBorrowItems}
                                            onChange={(e) => setFacultySettings({ ...facultySettings, maxBorrowItems: parseInt(e.target.value) || 1 })}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Max items you can borrow at once</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Maximum Days</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="90"
                                            value={facultySettings.maxBorrowDays}
                                            onChange={(e) => setFacultySettings({ ...facultySettings, maxBorrowDays: parseInt(e.target.value) || 1 })}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Max borrowing period in days</p>
                                    </div>
                                </div>
                            </Card>

                            {/* Approval Preferences */}
                            <Card className="p-6">
                                <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                                    <Shield size={18} className="text-primary" />
                                    Approval Preferences
                                </h3>
                                <div className="space-y-4">
                                    <label className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl cursor-pointer transition-colors">
                                        <div>
                                            <span className="text-gray-700 dark:text-gray-300 font-medium">Auto-approve student requests</span>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Automatically approve requests from your students</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={facultySettings.autoApproveOwnStudents}
                                            onChange={(e) => setFacultySettings({ ...facultySettings, autoApproveOwnStudents: e.target.checked })}
                                            className="w-5 h-5 text-primary rounded focus:ring-primary"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl cursor-pointer transition-colors">
                                        <div>
                                            <span className="text-gray-700 dark:text-gray-300 font-medium">Require justification</span>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Require students to provide detailed purpose</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={facultySettings.requireJustification}
                                            onChange={(e) => setFacultySettings({ ...facultySettings, requireJustification: e.target.checked })}
                                            className="w-5 h-5 text-primary rounded focus:ring-primary"
                                        />
                                    </label>
                                </div>
                            </Card>

                            <div className="flex justify-end">
                                <Button onClick={() => saveSettings(facultyPrefsKey, facultySettings, 'Faculty settings')} icon={Save}>
                                    Save Settings
                                </Button>
                            </div>
                        </div>
                    </FacultyOnly>
                );


            case 'staff':
                return (
                    <StaffOnly showAccessDenied>
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Inventory Settings</h2>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Configure inventory management and reporting preferences</p>
                            </div>

                            {/* Inventory Defaults */}
                            <Card className="p-6">
                                <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                                    <Database size={18} className="text-primary" />
                                    Inventory Defaults
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default Category</label>
                                        <select
                                            value={staffSettings.defaultCategory}
                                            onChange={(e) => setStaffSettings({ ...staffSettings, defaultCategory: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                        >
                                            {categories.map((cat) => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default Location</label>
                                        <input
                                            type="text"
                                            value={staffSettings.defaultLocation}
                                            onChange={(e) => setStaffSettings({ ...staffSettings, defaultLocation: e.target.value })}
                                            placeholder="e.g., Room 101"
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default Status</label>
                                        <select
                                            value={staffSettings.defaultStatus}
                                            onChange={(e) => setStaffSettings({ ...staffSettings, defaultStatus: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                        >
                                            <option value="AVAILABLE">Available</option>
                                            <option value="IN_USE">In Use</option>
                                            <option value="MAINTENANCE">Under Maintenance</option>
                                            <option value="RESERVED">Reserved</option>
                                        </select>
                                    </div>
                                </div>
                            </Card>

                            {/* Report Preferences */}
                            <Card className="p-6">
                                <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                                    <FileText size={18} className="text-primary" />
                                    Report Preferences
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Preferred Format</label>
                                        <div className="flex gap-4">
                                            {['pdf', 'csv', 'xlsx'].map((format) => (
                                                <button
                                                    key={format}
                                                    onClick={() => setStaffSettings({ ...staffSettings, reportFormat: format })}
                                                    className={`px-4 py-2.5 rounded-xl border-2 transition-all uppercase font-medium ${staffSettings.reportFormat === format
                                                        ? 'border-primary bg-primary/10 text-primary'
                                                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                                        }`}
                                                >
                                                    {format}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <label className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl cursor-pointer transition-colors">
                                        <div>
                                            <span className="text-gray-700 dark:text-gray-300 font-medium">Auto-generate reports</span>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Automatically generate and email reports</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={staffSettings.autoGenerateReports}
                                            onChange={(e) => setStaffSettings({ ...staffSettings, autoGenerateReports: e.target.checked })}
                                            className="w-5 h-5 text-primary rounded focus:ring-primary"
                                        />
                                    </label>
                                    {staffSettings.autoGenerateReports && (
                                        <div className="pl-3">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Report Schedule</label>
                                            <select
                                                value={staffSettings.reportSchedule}
                                                onChange={(e) => setStaffSettings({ ...staffSettings, reportSchedule: e.target.value })}
                                                className="w-full max-w-xs px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                            >
                                                <option value="daily">Daily</option>
                                                <option value="weekly">Weekly</option>
                                                <option value="monthly">Monthly</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </Card>

                            <div className="flex justify-end">
                                <Button onClick={() => saveSettings(staffPrefsKey, staffSettings, 'Inventory settings')} icon={Save}>
                                    Save Settings
                                </Button>
                            </div>
                        </div>
                    </StaffOnly>
                );

            case 'system':
                return (
                    <StaffOnly showAccessDenied>
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">System Settings</h2>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Configure inventory system settings</p>
                            </div>

                            <Card className="p-6">
                                <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Inventory Categories</h3>
                                <div className="space-y-2">
                                    {categories.map((cat, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                            {editingCategory === i ? (
                                                <input
                                                    type="text"
                                                    value={cat}
                                                    onChange={(e) => {
                                                        const updated = [...categories];
                                                        updated[i] = e.target.value;
                                                        setCategories(updated);
                                                    }}
                                                    onBlur={() => setEditingCategory(null)}
                                                    onKeyDown={(e) => e.key === 'Enter' && setEditingCategory(null)}
                                                    autoFocus
                                                    className="flex-1 bg-white dark:bg-gray-600 border border-primary rounded px-2 py-1 text-sm outline-none"
                                                />
                                            ) : (
                                                <span className="text-gray-800 dark:text-gray-200">{cat}</span>
                                            )}
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    icon={Edit3}
                                                    onClick={() => setEditingCategory(i)}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    icon={Trash2}
                                                    className="text-red-500 hover:text-red-600"
                                                    onClick={() => setCategories(categories.filter((_, idx) => idx !== i))}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <input
                                        type="text"
                                        placeholder="New category name"
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                        className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            if (newCategory.trim()) {
                                                setCategories([...categories, newCategory.trim()]);
                                                setNewCategory('');
                                            }
                                        }}
                                    >
                                        + Add
                                    </Button>
                                </div>
                            </Card>

                            <Card className="p-6">
                                <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Item Conditions</h3>
                                <div className="space-y-2">
                                    {conditions.map((condition, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                            {editingCondition === i ? (
                                                <input
                                                    type="text"
                                                    value={condition}
                                                    onChange={(e) => {
                                                        const updated = [...conditions];
                                                        updated[i] = e.target.value;
                                                        setConditions(updated);
                                                    }}
                                                    onBlur={() => setEditingCondition(null)}
                                                    onKeyDown={(e) => e.key === 'Enter' && setEditingCondition(null)}
                                                    autoFocus
                                                    className="flex-1 bg-white dark:bg-gray-600 border border-primary rounded px-2 py-1 text-sm outline-none"
                                                />
                                            ) : (
                                                <span className="text-gray-800 dark:text-gray-200">{condition}</span>
                                            )}
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    icon={Edit3}
                                                    onClick={() => setEditingCondition(i)}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    icon={Trash2}
                                                    className="text-red-500 hover:text-red-600"
                                                    onClick={() => setConditions(conditions.filter((_, idx) => idx !== i))}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <input
                                        type="text"
                                        placeholder="New condition name"
                                        value={newCondition}
                                        onChange={(e) => setNewCondition(e.target.value)}
                                        className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            if (newCondition.trim()) {
                                                setConditions([...conditions, newCondition.trim()]);
                                                setNewCondition('');
                                            }
                                        }}
                                    >
                                        + Add
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    </StaffOnly>
                );

            case 'users':
                return (
                    <AdminOnly showAccessDenied>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">User Management</h2>
                                    <p className="text-gray-500 text-sm mt-1">Manage user accounts and permissions</p>
                                </div>
                                <Button icon={Users}>Add User</Button>
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
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleUnflagUser(u.id)}
                                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 cursor-pointer transition-colors"
                                                                    title="Remove flag from this user"
                                                                >
                                                                    <ShieldCheck size={12} />
                                                                    Unflag
                                                                </button>
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

            case 'admin':
                return (
                    <AdminOnly showAccessDenied>
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Administration</h2>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">System configuration and advanced settings</p>
                            </div>

                            {/* System Controls */}
                            <Card className="p-6">
                                <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                                    <Shield size={18} className="text-primary" />
                                    System Controls
                                </h3>
                                <div className="space-y-4">
                                    <label className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl cursor-pointer transition-colors">
                                        <div>
                                            <span className="text-gray-700 dark:text-gray-300 font-medium">Maintenance Mode</span>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Disable access for non-admin users</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={adminSettings.maintenanceMode}
                                            onChange={(e) => setAdminSettings({ ...adminSettings, maintenanceMode: e.target.checked })}
                                            className="w-5 h-5 text-primary rounded focus:ring-primary"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl cursor-pointer transition-colors">
                                        <div>
                                            <span className="text-gray-700 dark:text-gray-300 font-medium">Allow Registration</span>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Allow new users to register</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={adminSettings.allowRegistration}
                                            onChange={(e) => setAdminSettings({ ...adminSettings, allowRegistration: e.target.checked })}
                                            className="w-5 h-5 text-primary rounded focus:ring-primary"
                                        />
                                    </label>
                                    <label className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl cursor-pointer transition-colors"
                                        onClick={(e) => {
                                            if (!adminSettings.requireEmailVerification) {
                                                e.preventDefault();
                                                alert('⚠️ Email verification requires an email service (e.g. Gmail SMTP) to be configured in the backend. This feature is not yet set up.');
                                            }
                                        }}
                                    >
                                        <div>
                                            <span className="text-gray-700 dark:text-gray-300 font-medium">Require Email Verification</span>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">New users must verify email before access</p>
                                            <p className="text-xs text-amber-500 mt-1">⚠️ Requires email service configuration</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={adminSettings.requireEmailVerification}
                                            onChange={(e) => setAdminSettings({ ...adminSettings, requireEmailVerification: e.target.checked })}
                                            className="w-5 h-5 text-primary rounded focus:ring-primary"
                                        />
                                    </label>
                                </div>
                            </Card>

                            {/* Backup Settings */}
                            <Card className="p-6">
                                <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                                    <Download size={18} className="text-primary" />
                                    Backup Settings
                                </h3>
                                <div className="space-y-4">
                                    <label className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl cursor-pointer transition-colors">
                                        <div>
                                            <span className="text-gray-700 dark:text-gray-300 font-medium">Automatic Backups</span>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Automatically backup database</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={adminSettings.autoBackup}
                                            onChange={(e) => setAdminSettings({ ...adminSettings, autoBackup: e.target.checked })}
                                            className="w-5 h-5 text-primary rounded focus:ring-primary"
                                        />
                                    </label>
                                    {adminSettings.autoBackup && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-3">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Backup Frequency</label>
                                                <select
                                                    value={adminSettings.backupFrequency}
                                                    onChange={(e) => setAdminSettings({ ...adminSettings, backupFrequency: e.target.value })}
                                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                                >
                                                    <option value="hourly">Hourly</option>
                                                    <option value="daily">Daily</option>
                                                    <option value="weekly">Weekly</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Retention (days)</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="365"
                                                    value={adminSettings.retentionDays}
                                                    onChange={(e) => setAdminSettings({ ...adminSettings, retentionDays: parseInt(e.target.value) || 30 })}
                                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            variant="outline"
                                            icon={Download}
                                            onClick={handleBackupNow}
                                            disabled={backupLoading}
                                        >
                                            {backupLoading ? 'Backing up...' : 'Backup Now'}
                                        </Button>
                                        <Button variant="outline" onClick={() => alert('To restore: import the backup JSON file through the Django admin panel or contact your system administrator.')}>
                                            Restore Backup
                                        </Button>
                                    </div>
                                </div>
                            </Card>

                            {/* Audit Logs */}
                            <Card className="p-6">
                                <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                                    <History size={18} className="text-primary" />
                                    Audit Logs
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                                <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">Action</th>
                                                <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">User</th>
                                                <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">Details</th>
                                                <th className="text-left py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">Timestamp</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {auditLogsLoading ? (
                                                <tr>
                                                    <td colSpan={4} className="py-10 text-center text-gray-400 text-sm">
                                                        <span className="inline-block w-5 h-5 border-2 border-gray-300 border-t-primary rounded-full animate-spin mr-2 align-middle" />
                                                        Loading audit logs…
                                                    </td>
                                                </tr>
                                            ) : auditLogs.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="py-10 text-center text-gray-400 text-sm">
                                                        No audit log entries yet.
                                                    </td>
                                                </tr>
                                            ) : auditLogs.map((log) => (
                                                <tr key={log.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                                    <td className="py-3 px-4">
                                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${log.action.includes('Login Failed') ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                                                            log.action.includes('Login') ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                                                                log.action.includes('Register') ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' :
                                                                    log.action.includes('Created') ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                                                                        log.action.includes('Approved') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' :
                                                                            log.action.includes('Changed') || log.action.includes('Update') ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                                                                                log.action.includes('Deleted') || log.action.includes('Rejected') ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                                                                                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                            }`}>
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400 font-medium">{log.user || '—'}</td>
                                                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{log.details || '—'}</td>
                                                    <td className="py-3 px-4 text-gray-500 dark:text-gray-500 text-xs whitespace-nowrap">
                                                        {new Date(log.timestamp).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <span className="text-sm text-gray-500">
                                        Showing {auditLogs.length} {auditLogs.length === 50 ? '(latest 50)' : ''} entries
                                    </span>
                                    <Button variant="ghost" size="sm" onClick={() => {
                                        setAuditLogsLoading(true);
                                        api.get('/auth/audit-logs/?limit=50').then(r => setAuditLogs(r.data)).finally(() => setAuditLogsLoading(false));
                                    }}>↻ Refresh</Button>
                                </div>
                            </Card>

                            {/* Quick Actions */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card className="p-6">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">System Information</h3>
                                    <div className="space-y-2 text-sm">
                                        <p><span className="text-gray-500">Version:</span> <span className="text-gray-800 dark:text-gray-200">1.0.0</span></p>
                                        <p><span className="text-gray-500">Environment:</span> <span className="text-gray-800 dark:text-gray-200">Production</span></p>
                                        <p><span className="text-gray-500">Last Backup:</span> <span className="text-gray-800 dark:text-gray-200">2 hours ago</span></p>
                                        <p><span className="text-gray-500">Database:</span> <span className="text-green-600">Connected</span></p>
                                    </div>
                                </Card>

                                <Card className="p-6">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">Quick Actions</h3>
                                    <div className="space-y-2">
                                        <Button variant="outline" fullWidth className="justify-start" onClick={async () => {
                                            try {
                                                const [inv, req, usr] = await Promise.all([
                                                    api.get('/inventory/items/'),
                                                    api.get('/requests/'),
                                                    api.get('/users/')
                                                ]);
                                                const items = inv.data?.results || inv.data || [];
                                                const reqs = req.data?.results || req.data || [];
                                                const users = usr.data?.results || usr.data || [];
                                                const headers = ['Type', 'Name/Subject', 'Status', 'Category/Role', 'Date'];
                                                const rows = [
                                                    ...items.map(i => ['Inventory', i.name, i.status, i.category, i.createdAt || i.created_at || '']),
                                                    ...reqs.map(r => ['Request', r.itemName || r.item_name || '', r.status, r.priority, r.createdAt || r.created_at || '']),
                                                    ...users.map(u => ['User', `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username, u.isActive ? 'Active' : 'Inactive', u.role, u.dateJoined || u.date_joined || '']),
                                                ];
                                                await exportCSV('PLMun_All_Data_Export', headers, rows);
                                            } catch (err) {
                                                alert('Export failed: ' + (err.message || 'Unknown error'));
                                            }
                                        }}>Export All Data</Button>
                                        <Button variant="outline" fullWidth className="justify-start" onClick={() => {
                                            alert('ℹ️ Email service is not yet configured.\n\nTo enable email features, configure an SMTP provider (e.g. Gmail) in the Django backend settings.py file:\n\nEMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"\nEMAIL_HOST = "smtp.gmail.com"\nEMAIL_PORT = 587\nEMAIL_USE_TLS = True\nEMAIL_HOST_USER = "your@gmail.com"\nEMAIL_HOST_PASSWORD = "app-password"');
                                        }}>Send Test Email</Button>
                                        <Button variant="outline" fullWidth className="justify-start text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => {
                                            const keys = Object.keys(localStorage).filter(k => k.startsWith('plmun-'));
                                            keys.forEach(k => localStorage.removeItem(k));
                                            alert(`✅ Cache cleared! Removed ${keys.length} cached setting(s).\nPage will reload.`);
                                            window.location.reload();
                                        }}>Clear Cache</Button>
                                    </div>
                                </Card>
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={() => saveSettings(adminPrefsKey, adminSettings, 'Admin settings')} icon={Save}>
                                    Save Settings
                                </Button>
                            </div>
                        </div>
                    </AdminOnly>
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
