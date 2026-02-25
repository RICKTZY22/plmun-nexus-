import React from 'react';
import { FileText, Clock, LayoutGrid, List, Save } from 'lucide-react';
import { Button, Card } from '../../components/ui';

const PreferencesTab = ({
    preferences, setPreferences, saveMessage, saveSettings, prefsKey,
    viewMode, setViewMode, itemsPerPage, setItemsPerPage, showImages, setShowImages,
}) => {
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

            {/* Display Preferences */}
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
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">⏳ Coming Soon</p>
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
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">⏳ Coming Soon</p>
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
};

export default PreferencesTab;
