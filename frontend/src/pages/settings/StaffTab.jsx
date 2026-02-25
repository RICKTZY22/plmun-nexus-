import React from 'react';
import { Database, FileText, Save } from 'lucide-react';
import { Button, Card } from '../../components/ui';
import { StaffOnly } from '../../components/auth';

const StaffTab = ({ staffSettings, setStaffSettings, categories, saveSettings, staffPrefsKey }) => {
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
                                {['pdf', 'csv'].map((format) => (
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
                                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">⏳ Coming Soon</p>
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
};

export default StaffTab;
