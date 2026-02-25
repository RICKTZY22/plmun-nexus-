import React from 'react';
import { Edit3, Trash2, Save } from 'lucide-react';
import { Button, Card } from '../../components/ui';
import { StaffOnly } from '../../components/auth';

const SystemTab = ({
    categories, setCategories, conditions, setConditions,
    editingCategory, setEditingCategory, editingCondition, setEditingCondition,
    newCategory, setNewCategory, newCondition, setNewCondition,
    setSaveMessage,
}) => {
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
                <div className="flex justify-end mt-4">
                    <Button onClick={() => {
                        try {
                            localStorage.setItem('sys-settings', JSON.stringify({ categories, conditions }));
                            setSaveMessage('System settings saved successfully!');
                            setTimeout(() => setSaveMessage(''), 3000);
                        } catch (e) {
                            setSaveMessage('Failed to save system settings');
                            setTimeout(() => setSaveMessage(''), 3000);
                        }
                    }} icon={Save}>
                        Save System Settings
                    </Button>
                </div>
            </div>
        </StaffOnly>
    );
};

export default SystemTab;
