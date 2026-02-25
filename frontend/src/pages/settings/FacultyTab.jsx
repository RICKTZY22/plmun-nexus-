import React from 'react';
import { BookOpen, Briefcase, Shield, Save } from 'lucide-react';
import { Button, Card } from '../../components/ui';
import { FacultyOnly } from '../../components/auth';

const FacultyTab = ({ facultySettings, setFacultySettings, saveSettings, facultyPrefsKey }) => {
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
                                value={(facultySettings.courses || []).join(', ')}
                                onChange={(e) => setFacultySettings({ ...facultySettings, courses: e.target.value.split(',').map(c => c.trim()).filter(Boolean) })}
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
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-3 font-medium">⏳ Coming Soon — limits will be enforced once backend integration is complete</p>
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
                    <p className="text-xs text-blue-600 dark:text-blue-400 mb-3 font-medium">⏳ Coming Soon — approval automation will be enabled in a future update</p>
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
};

export default FacultyTab;
