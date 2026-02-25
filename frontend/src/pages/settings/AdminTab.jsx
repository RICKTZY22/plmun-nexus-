import React from 'react';
import { Shield, Clock, Download, History, Printer, Trash2, Save } from 'lucide-react';
import { Button, Card } from '../../components/ui';
import { AdminOnly } from '../../components/auth';
import api from '../../services/api';
import { exportCSV } from '../../utils/exportUtils';

const AdminTab = ({
    adminSettings, setAdminSettings, saveMessage, setSaveMessage,
    saveSettings, adminPrefsKey, users,
    auditLogs, auditLogsLoading, fetchAuditLogs,
    handleClearAuditLogs, handleExportAuditLogs, handleBackupNow, backupLoading,
    clearLogsConfirm, setClearLogsConfirm,
}) => {
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
                                <p className="text-sm text-gray-500 dark:text-gray-400">Block Students & Faculty — only Staff and Admin can access</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={adminSettings.maintenanceMode}
                                onChange={(e) => {
                                    const enabled = e.target.checked;
                                    setAdminSettings({ ...adminSettings, maintenanceMode: enabled });
                                    if (!enabled) {
                                        localStorage.removeItem('plmun-maintenance');
                                        setSaveMessage('✓ Maintenance mode disabled.');
                                        setTimeout(() => setSaveMessage(''), 3000);
                                    }
                                }}
                                className="w-5 h-5 text-primary rounded focus:ring-primary"
                            />
                        </label>
                        {adminSettings.maintenanceMode && (
                            <div className="ml-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700/50 space-y-3">
                                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                                    <Clock size={16} />
                                    Set Maintenance Duration
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { label: '30 min', mins: 30 },
                                        { label: '1 hour', mins: 60 },
                                        { label: '2 hours', mins: 120 },
                                        { label: '4 hours', mins: 240 },
                                        { label: '8 hours', mins: 480 },
                                    ].map(opt => (
                                        <button
                                            key={opt.mins}
                                            type="button"
                                            onClick={() => {
                                                const endTime = Date.now() + opt.mins * 60 * 1000;
                                                localStorage.setItem('plmun-maintenance', JSON.stringify({ enabled: true, endTime }));
                                                setSaveMessage(`✓ Maintenance mode enabled for ${opt.label}. Students & Faculty are now blocked.`);
                                                setTimeout(() => setSaveMessage(''), 5000);
                                            }}
                                            className="px-3 py-1.5 text-sm rounded-lg bg-amber-100 dark:bg-amber-800/40 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-700/40 transition-colors font-medium"
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="number"
                                        min="1"
                                        max="1440"
                                        placeholder="Custom minutes"
                                        className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const mins = parseInt(e.target.value, 10);
                                                if (mins > 0) {
                                                    const endTime = Date.now() + mins * 60 * 1000;
                                                    localStorage.setItem('plmun-maintenance', JSON.stringify({ enabled: true, endTime }));
                                                    setSaveMessage(`✓ Maintenance mode enabled for ${mins} minute(s).`);
                                                    setTimeout(() => setSaveMessage(''), 5000);
                                                    e.target.value = '';
                                                }
                                            }
                                        }}
                                    />
                                    <span className="text-xs text-gray-500">Press Enter to set</span>
                                </div>
                                {(() => {
                                    try {
                                        const m = JSON.parse(localStorage.getItem('plmun-maintenance') || '{}');
                                        if (m.enabled && m.endTime > Date.now()) {
                                            const remaining = Math.ceil((m.endTime - Date.now()) / 60000);
                                            const hrs = Math.floor(remaining / 60);
                                            const mins = remaining % 60;
                                            return (
                                                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                                                    ⏱ Active — ends in {hrs > 0 ? `${hrs}h ` : ''}{mins}m
                                                </p>
                                            );
                                        }
                                    } catch { }
                                    return null;
                                })()}
                            </div>
                        )}
                        <label className="flex items-center justify-between p-3 rounded-xl opacity-60 cursor-not-allowed">
                            <div>
                                <span className="text-gray-700 dark:text-gray-300 font-medium">Allow Registration</span>
                                <span className="ml-2 inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Coming Soon</span>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Allow new users to register (requires backend enforcement)</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={adminSettings.allowRegistration}
                                disabled
                                className="w-5 h-5 text-gray-400 rounded cursor-not-allowed"
                            />
                        </label>
                        <label className="flex items-center justify-between p-3 rounded-xl opacity-60 cursor-not-allowed">
                            <div>
                                <span className="text-gray-700 dark:text-gray-300 font-medium">Require Email Verification</span>
                                <span className="ml-2 inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Coming Soon</span>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Requires SMTP configuration in Django settings</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={adminSettings.requireEmailVerification}
                                disabled
                                className="w-5 h-5 text-gray-400 rounded cursor-not-allowed"
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
                        <label className="flex items-center justify-between p-3 rounded-xl opacity-60 cursor-not-allowed">
                            <div>
                                <span className="text-gray-700 dark:text-gray-300 font-medium">Automatic Backups</span>
                                <span className="ml-2 inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Coming Soon</span>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Automatically backup database (requires backend scheduler)</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={false}
                                disabled
                                className="w-5 h-5 text-gray-400 rounded cursor-not-allowed"
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
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            To restore a backup, import the JSON file through the Django admin panel or contact your system administrator.
                        </p>
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
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${(() => {
                                                const ACTION_COLORS = [
                                                    ['Login Failed', 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'],
                                                    ['Login', 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'],
                                                    ['Register', 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'],
                                                    ['Created', 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'],
                                                    ['Approved', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'],
                                                    ['Changed', 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'],
                                                    ['Update', 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'],
                                                    ['Deleted', 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'],
                                                    ['Rejected', 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'],
                                                ];
                                                return ACTION_COLORS.find(([k]) => log.action.includes(k))?.[1]
                                                    || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
                                            })()}`}>
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
                            Showing {auditLogs.length} {auditLogs.length >= 200 ? '(latest 200)' : ''} entries
                        </span>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={fetchAuditLogs}>↻ Refresh</Button>
                            <Button variant="ghost" size="sm" icon={Printer} onClick={handleExportAuditLogs} disabled={auditLogs.length === 0}>Print / Export</Button>
                            {clearLogsConfirm ? (
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={handleClearAuditLogs}>✓ Confirm Clear</Button>
                                    <Button variant="ghost" size="sm" onClick={() => setClearLogsConfirm(false)}>✗ Cancel</Button>
                                </div>
                            ) : (
                                <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" icon={Trash2} onClick={() => setClearLogsConfirm(true)} disabled={auditLogs.length === 0}>Clear Logs</Button>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="p-6">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">System Information</h3>
                        <div className="space-y-2 text-sm">
                            <p><span className="text-gray-500">Version:</span> <span className="text-gray-800 dark:text-gray-200">1.0.0</span></p>
                            <p><span className="text-gray-500">Environment:</span> <span className="text-gray-800 dark:text-gray-200">{import.meta.env.MODE || 'development'}</span></p>
                            <p><span className="text-gray-500">Total Users:</span> <span className="text-gray-800 dark:text-gray-200">{users.length || '—'}</span></p>
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
                                    const usrs = usr.data?.results || usr.data || [];
                                    const headers = ['Type', 'Name/Subject', 'Status', 'Category/Role', 'Date'];
                                    const rows = [
                                        ...items.map(i => ['Inventory', i.name, i.status, i.category, i.createdAt || i.created_at || '']),
                                        ...reqs.map(r => ['Request', r.itemName || r.item_name || '', r.status, r.priority, r.createdAt || r.created_at || '']),
                                        ...usrs.map(u => ['User', `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username, u.isActive ? 'Active' : 'Inactive', u.role, u.dateJoined || u.date_joined || '']),
                                    ];
                                    await exportCSV('PLMun_All_Data_Export', headers, rows);
                                    setSaveMessage('✓ Data exported successfully!');
                                    setTimeout(() => setSaveMessage(''), 3000);
                                } catch (err) {
                                    setSaveMessage('✗ Export failed. Please try again.');
                                    setTimeout(() => setSaveMessage(''), 5000);
                                }
                            }}>Export All Data</Button>
                            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                <p className="text-xs text-gray-500 dark:text-gray-400">📧 Email service is not yet configured. To enable, add SMTP settings to Django <code className="text-primary">settings.py</code>.</p>
                            </div>
                            <Button variant="outline" fullWidth className="justify-start text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => {
                                const keys = Object.keys(localStorage).filter(k => k.startsWith('plmun-') || k.startsWith('user-prefs-') || k.startsWith('notif-prefs-') || k.startsWith('faculty-prefs-') || k.startsWith('staff-prefs-') || k.startsWith('admin-prefs-') || k.startsWith('ui-prefs-') || k === 'sys-settings');
                                keys.forEach(k => localStorage.removeItem(k));
                                setSaveMessage(`✓ Cache cleared! Removed ${keys.length} cached setting(s). Reloading...`);
                                setTimeout(() => window.location.reload(), 1500);
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
};

export default AdminTab;
