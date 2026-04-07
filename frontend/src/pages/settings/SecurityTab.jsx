import React from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { Button, Input, Card } from '../../components/ui';

const SecurityTab = ({ passwordForm, setPasswordForm, showPasswords, setShowPasswords, passwordError, setPasswordError, handlePasswordChange, isLoading }) => {
    const toggleVisibility = (field) => {
        if (setShowPasswords) {
            setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Security Settings</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage your password and security preferences</p>
            </div>

            <Card className="p-6">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Change Password</h3>
                <div className="space-y-4 max-w-md">
                    <div className="relative">
                        <Input
                            label="Current Password"
                            type={showPasswords?.current ? 'text' : 'password'}
                            icon={Lock}
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        />
                        <button
                            type="button"
                            onClick={() => toggleVisibility('current')}
                            className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            tabIndex={-1}
                        >
                            {showPasswords?.current ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    <div className="relative">
                        <Input
                            label="New Password"
                            type={showPasswords?.new ? 'text' : 'password'}
                            icon={Lock}
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        />
                        <button
                            type="button"
                            onClick={() => toggleVisibility('new')}
                            className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            tabIndex={-1}
                        >
                            {showPasswords?.new ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    <div className="relative">
                        <Input
                            label="Confirm New Password"
                            type={showPasswords?.confirm ? 'text' : 'password'}
                            icon={Lock}
                            value={passwordForm.confirmPassword}
                            onChange={(e) => { setPasswordForm({ ...passwordForm, confirmPassword: e.target.value }); setPasswordError(''); }}
                        />
                        <button
                            type="button"
                            onClick={() => toggleVisibility('confirm')}
                            className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            tabIndex={-1}
                        >
                            {showPasswords?.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    {passwordError && (
                        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 px-3 py-2 rounded-lg">{passwordError}</p>
                    )}
                    <Button onClick={handlePasswordChange} loading={isLoading}>
                        Update Password
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default SecurityTab;
