import React from 'react';
import { User, Camera, Mail, Phone, Building, Save } from 'lucide-react';
import { Button, Input } from '../../components/ui';
import { getRoleLabel, getRoleBadgeColor } from '../../utils/roles';

const ProfileTab = ({ user, profileForm, setProfileForm, handleProfileSave, updateAvatar, isLoading }) => {
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
};

export default ProfileTab;
