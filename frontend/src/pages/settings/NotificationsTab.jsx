import React from 'react';
import { Save } from 'lucide-react';
import { Button, Card } from '../../components/ui';

const NotificationsTab = ({ notifPrefs, setNotifPrefs, saveMessage, saveSettings, notifPrefsKey }) => {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Notification Preferences</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Control how you receive notifications</p>
            </div>

            <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-sm text-blue-700 dark:text-blue-300">
                <strong>Coming Soon</strong> — Email and push notification delivery is not yet active. Your preferences will be saved and applied once the notification service is enabled.
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
};

export default NotificationsTab;
