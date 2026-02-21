// StatCard.jsx - STAT CARD component para sa Dashboard
// Reusable card na may icon, title, value, at trend indicator (up/down)
// Ginagamit para i-display yung summary stats (Total Items, Pending Requests, etc.)

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const StatCard = ({
    title,
    value,
    icon: Icon,
    trend,
    trendValue,
    color = 'primary'
}) => {
    const colors = {
        primary: 'from-primary to-primary-dark',
        secondary: 'from-secondary to-secondary-dark',
        success: 'from-emerald-500 to-emerald-600',
        warning: 'from-amber-500 to-amber-600',
        danger: 'from-red-500 to-red-600',
    };

    const getTrendIcon = () => {
        if (trend === 'up') return <TrendingUp size={14} />;
        if (trend === 'down') return <TrendingDown size={14} />;
        return <Minus size={14} />;
    };

    const getTrendColor = () => {
        if (trend === 'up') return 'text-emerald-500 bg-emerald-50';
        if (trend === 'down') return 'text-red-500 bg-red-50';
        return 'text-gray-500 bg-gray-50';
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                    <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
                    {trendValue && (
                        <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full text-xs font-medium ${getTrendColor()}`}>
                            {getTrendIcon()}
                            {trendValue}
                        </div>
                    )}
                </div>
                {Icon && (
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${colors[color]} shadow-lg`}>
                        <Icon size={24} className="text-white" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatCard;
