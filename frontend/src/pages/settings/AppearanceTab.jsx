import React from 'react';
import { Sun, Moon, Monitor, Check, Palette } from 'lucide-react';
import { Card } from '../../components/ui';
import useUIStore, { ACCENT_PRESETS } from '../../store/uiStore';

const themeOptions = [
    { id: 'light', label: 'Light', icon: Sun, desc: 'Light mode' },
    { id: 'dark', label: 'Dark', icon: Moon, desc: 'Dark mode' },
    { id: 'system', label: 'System', icon: Monitor, desc: 'Auto' },
];

// Map accent names to visible hex colors for the swatch
const SWATCH_COLORS = {
    indigo: '#6366f1',
    violet: '#8b5cf6',
    blue: '#3b82f6',
    emerald: '#10b981',
    rose: '#f43f5e',
    amber: '#f59e0b',
    slate: '#64748b',
    green: '#22c55e',
};

const AppearanceTab = ({ theme, setTheme, backgroundEffect, setBackgroundEffect }) => {
    const { accentColor, setAccentColor, compactMode, setCompactMode } = useUIStore();

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Appearance</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Customize the interface</p>
            </div>

            {/* Theme */}
            <Card className="p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Theme</h3>
                <div className="grid grid-cols-3 gap-3">
                    {themeOptions.map((option) => {
                        const Icon = option.icon;
                        const isActive = theme === option.id;
                        return (
                            <button
                                key={option.id}
                                onClick={() => setTheme(option.id)}
                                className={`p-3 rounded-lg border transition-all flex flex-col items-center gap-1.5 ${isActive
                                    ? 'border-accent bg-accent/5 dark:bg-accent/10 ring-2 ring-accent/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                            >
                                <Icon
                                    size={20}
                                    className={isActive ? 'text-accent' : 'text-gray-400 dark:text-gray-500'}
                                />
                                <span className={`text-xs font-medium ${isActive ? 'text-accent' : 'text-gray-600 dark:text-gray-400'}`}>
                                    {option.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </Card>

            {/* Accent Color Picker */}
            <Card className="p-5">
                <div className="flex items-center gap-2 mb-3">
                    <Palette size={16} className="text-accent" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Accent Color</h3>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {Object.entries(ACCENT_PRESETS).map(([key, preset]) => {
                        const isActive = accentColor === key;
                        const hex = SWATCH_COLORS[key] || '#6366f1';
                        return (
                            <button
                                key={key}
                                onClick={() => setAccentColor(key)}
                                className={`group relative flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all ${isActive
                                    ? 'bg-gray-100 dark:bg-gray-700/50'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                                title={preset.label}
                            >
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${isActive ? 'scale-110 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800' : 'group-hover:scale-105'}`}
                                    style={{ backgroundColor: hex, ringColor: hex }}
                                >
                                    {isActive && <Check size={14} className="text-white" strokeWidth={3} />}
                                </div>
                                <span className={`text-[10px] font-medium ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {preset.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </Card>

            {/* Display Density */}
            <Card className="p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Display</h3>
                <label className="flex items-center justify-between cursor-pointer">
                    <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Compact Mode</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Tighter spacing for more content on screen</p>
                    </div>
                    <button
                        onClick={() => setCompactMode(!compactMode)}
                        className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative ${compactMode ? 'bg-accent' : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${compactMode ? 'translate-x-4' : ''
                            }`} />
                    </button>
                </label>
            </Card>

            {/* Background Effects */}
            <Card className="p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Background Effects</h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[
                        { id: 'none', label: 'None', emoji: '⚪' },
                        { id: 'stars', label: 'Stars', emoji: '✨' },
                        { id: 'meteors', label: 'Meteors', emoji: '☄️' },
                        { id: 'particles', label: 'Particles', emoji: '🫧' },
                        { id: 'aurora', label: 'Aurora', emoji: '🌌' },
                        { id: 'matrix', label: 'Matrix', emoji: '💻' },
                    ].map((effect) => {
                        const isActive = backgroundEffect === effect.id;
                        return (
                            <button
                                key={effect.id}
                                type="button"
                                onClick={() => setBackgroundEffect(effect.id)}
                                className={`p-2.5 rounded-lg border transition-all flex flex-col items-center gap-1 ${isActive
                                    ? 'border-accent bg-accent/5 dark:bg-accent/10'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                            >
                                <span className="text-xl">{effect.emoji}</span>
                                <span className={`text-[10px] font-medium ${isActive ? 'text-accent' : 'text-gray-600 dark:text-gray-400'}`}>
                                    {effect.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
};

export default AppearanceTab;
