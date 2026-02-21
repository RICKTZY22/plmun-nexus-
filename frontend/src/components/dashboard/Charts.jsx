// Charts.jsx - RECHARTS WRAPPER COMPONENTS for Dashboard and Reports
// Reusable chart components: BarChart, LineChart, AreaChart, PieChart
// All have Card wrapper, title, responsive container, and dark mode support
// Uses recharts library for data visualization

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

const COLORS = ['#006837', '#1e40af', '#0891b2', '#7c3aed', '#db2777', '#ea580c', '#65a30d'];

// Custom tooltip with dark mode support
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg p-3">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">{label}</p>
            {payload.map((entry, index) => (
                <p key={index} className="text-sm" style={{ color: entry.color }}>
                    {entry.name}: <span className="font-semibold">{entry.value}</span>
                </p>
            ))}
        </div>
    );
};

// Bar Chart Component - supports multiple bars via `bars` array
// bars: [{ dataKey: 'electronics', name: 'Electronics', color: '#006837' }, ...]
// Falls back to single `dataKey` prop for backwards compatibility
export const BarChartComponent = ({ data, dataKey, bars, xAxisKey, title }) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        {title && <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>}
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} barGap={2} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                <XAxis
                    dataKey={xAxisKey}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                {bars ? (
                    <>
                        <Legend
                            verticalAlign="top"
                            height={36}
                            formatter={(value) => <span className="text-sm text-gray-600 dark:text-gray-300">{value}</span>}
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
                    <Bar
                        dataKey={dataKey}
                        fill="#006837"
                        radius={[8, 8, 0, 0]}
                    />
                )}
            </BarChart>
        </ResponsiveContainer>
    </div>
);

// Line Chart Component
export const LineChartComponent = ({ data, lines, xAxisKey, title }) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        {title && <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>}
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                <XAxis
                    dataKey={xAxisKey}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    formatter={(value) => <span className="text-sm text-gray-600 dark:text-gray-300">{value}</span>}
                />
                {lines.map((line, index) => (
                    <Line
                        key={line.dataKey}
                        type="monotone"
                        dataKey={line.dataKey}
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth={2}
                        dot={{ fill: COLORS[index % COLORS.length], strokeWidth: 2 }}
                        name={line.name || line.dataKey}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    </div>
);

// Area Chart Component
export const AreaChartComponent = ({ data, dataKey, xAxisKey, title, color = '#006837' }) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        {title && <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>}
        <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                <XAxis
                    dataKey={xAxisKey}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                    type="monotone"
                    dataKey={dataKey}
                    stroke={color}
                    fill={`${color}20`}
                    strokeWidth={2}
                />
            </AreaChart>
        </ResponsiveContainer>
    </div>
);

// Pie Chart Component — with percentage labels on slices
export const PieChartComponent = ({ data, dataKey, nameKey, title }) => {
    const total = data.reduce((sum, entry) => sum + (entry[dataKey] || 0), 0);

    const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, index }) => {
        if (total === 0) return null;
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        const percent = ((data[index]?.[dataKey] || 0) / total * 100).toFixed(0);
        if (percent < 5) return null; // hide tiny slices
        return (
            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
                {percent}%
            </text>
        );
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
            {title && <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>}
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
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
                                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg p-3">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                                    <p className="text-sm" style={{ color: item.payload.fill }}>
                                        Count: <span className="font-semibold">{item.value}</span> ({pct}%)
                                    </p>
                                </div>
                            );
                        }}
                    />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value, entry) => {
                            const item = data.find(d => d[nameKey] === value);
                            const pct = item && total > 0 ? ((item[dataKey] / total) * 100).toFixed(0) : 0;
                            return <span className="text-sm text-gray-600 dark:text-gray-300">{value} ({pct}%)</span>;
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

// Export all as default object for convenience
export default {
    Bar: BarChartComponent,
    Line: LineChartComponent,
    Area: AreaChartComponent,
    Pie: PieChartComponent,
};
