// Charts.jsx - RECHARTS WRAPPER COMPONENTS for Dashboard and Reports
// Reusable chart components: BarChart, LineChart, AreaChart, PieChart
// Uses accent-aware color palette

import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    Legend,
    Area,
    AreaChart
} from 'recharts';

// Modern color palette that works well with accent colors
const COLORS = ['#6366f1', '#3b82f6', '#0891b2', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// Custom tooltip
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">{label}</p>
            {payload.map((entry, index) => (
                <p key={index} className="text-xs" style={{ color: entry.color }}>
                    {entry.name}: <span className="font-semibold">{entry.value}</span>
                </p>
            ))}
        </div>
    );
};

// Shared axis styling
const axisStyle = { fontSize: 11, fill: '#9ca3af' };
const gridStyle = { strokeDasharray: '3 3', stroke: '#e5e7eb', opacity: 0.5 };

// Bar Chart Component
export const BarChartComponent = ({ data, dataKey, bars, xAxisKey, title }) => (
    <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/50 p-5 shadow-card">
        {title && <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>}
        <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} barGap={2} barCategoryGap="20%">
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey={xAxisKey} tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                {bars ? (
                    <>
                        <Legend
                            verticalAlign="top"
                            height={32}
                            formatter={(value) => <span className="text-xs text-gray-500 dark:text-gray-400">{value}</span>}
                        />
                        {bars.map((bar, index) => (
                            <Bar
                                key={bar.dataKey}
                                dataKey={bar.dataKey}
                                name={bar.name || bar.dataKey}
                                fill={bar.color || COLORS[index % COLORS.length]}
                                radius={[4, 4, 0, 0]}
                            />
                        ))}
                    </>
                ) : (
                    <Bar dataKey={dataKey} fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                )}
            </BarChart>
        </ResponsiveContainer>
    </div>
);

// Line Chart Component
export const LineChartComponent = ({ data, lines, xAxisKey, title }) => (
    <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/50 p-5 shadow-card">
        {title && <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>}
        <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data}>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey={xAxisKey} tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    formatter={(value) => <span className="text-xs text-gray-500 dark:text-gray-400">{value}</span>}
                />
                {lines.map((line, index) => (
                    <Line
                        key={line.dataKey}
                        type="monotone"
                        dataKey={line.dataKey}
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth={2}
                        dot={{ fill: COLORS[index % COLORS.length], strokeWidth: 2, r: 3 }}
                        activeDot={{ r: 5, strokeWidth: 0 }}
                        name={line.name || line.dataKey}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    </div>
);

// Area Chart Component
export const AreaChartComponent = ({ data, dataKey, xAxisKey, title, color = COLORS[0] }) => (
    <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/50 p-5 shadow-card">
        {title && <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>}
        <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data}>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey={xAxisKey} tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                    type="monotone"
                    dataKey={dataKey}
                    stroke={color}
                    fill={`${color}15`}
                    strokeWidth={2}
                />
            </AreaChart>
        </ResponsiveContainer>
    </div>
);

// Pie Chart Component — with percentage labels
export const PieChartComponent = ({ data, dataKey, nameKey, title }) => {
    const total = data.reduce((sum, entry) => sum + (entry[dataKey] || 0), 0);

    const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, index }) => {
        if (total === 0) return null;
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        const percent = ((data[index]?.[dataKey] || 0) / total * 100).toFixed(0);
        if (percent < 5) return null;
        return (
            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
                {percent}%
            </text>
        );
    };

    return (
        <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/50 p-5 shadow-card">
            {title && <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>}
            <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey={dataKey}
                        nameKey={nameKey}
                        label={renderLabel}
                        labelLine={false}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        content={({ active, payload }) => {
                            if (!active || !payload || !payload[0]) return null;
                            const item = payload[0];
                            const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
                            return (
                                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
                                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{item.name}</p>
                                    <p className="text-xs" style={{ color: item.payload.fill }}>
                                        Count: <span className="font-semibold">{item.value}</span> ({pct}%)
                                    </p>
                                </div>
                            );
                        }}
                    />
                    <Legend
                        verticalAlign="bottom"
                        height={32}
                        formatter={(value) => {
                            const item = data.find(d => d[nameKey] === value);
                            const pct = item && total > 0 ? ((item[dataKey] / total) * 100).toFixed(0) : 0;
                            return <span className="text-xs text-gray-500 dark:text-gray-400">{value} ({pct}%)</span>;
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default {
    Bar: BarChartComponent,
    Line: LineChartComponent,
    Area: AreaChartComponent,
    Pie: PieChartComponent,
};
