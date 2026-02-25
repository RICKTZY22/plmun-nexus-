import React from 'react';
import { Lock } from 'lucide-react';
import { Button, Input, Card } from '../../components/ui';

const SecurityTab = ({ passwordForm, setPasswordForm, showPasswords, passwordError, setPasswordError, handlePasswordChange, isLoading }) => {
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
                        onChange={(e) => { setPasswordForm({ ...passwordForm, confirmPassword: e.target.value }); setPasswordError(''); }}
                    />
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
