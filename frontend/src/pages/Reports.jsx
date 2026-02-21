import React, { useEffect, useMemo, useState } from 'react';
import { Download, Calendar, FileText, BarChart2, Loader2, AlertTriangle } from 'lucide-react';
import { Button, Card } from '../components/ui';
import { BarChartComponent, LineChartComponent, PieChartComponent } from '../components/dashboard';
import { StaffOnly } from '../components/auth';
import { useInventory, useRequests } from '../hooks';
import { exportCSV, exportPDF } from '../utils/exportUtils';

const Reports = () => {
    const [dateRange, setDateRange] = useState('month');
    const { inventory, stats: inventoryStats, fetchInventory, fetchStats: fetchInventoryStats, loading: inventoryLoading } = useInventory();
    const { requests, stats: requestStats, fetchRequests, loading: requestsLoading } = useRequests();

    // Fetch real data on mount
    useEffect(() => {
        fetchInventory();
        fetchInventoryStats();
        fetchRequests();
    }, [fetchInventory, fetchInventoryStats, fetchRequests]);

    // Get the start date for the selected time period
    const getDateCutoff = (range) => {
        const now = new Date();
        switch (range) {
            case 'week': {
                const d = new Date(now);
                d.setDate(d.getDate() - d.getDay());
                d.setHours(0, 0, 0, 0);
                return d;
            }
            case 'month':
                return new Date(now.getFullYear(), now.getMonth(), 1);
            case 'quarter': {
                const qMonth = Math.floor(now.getMonth() / 3) * 3;
                return new Date(now.getFullYear(), qMonth, 1);
            }
            case 'year':
                return new Date(now.getFullYear(), 0, 1);
            default:
                return new Date(0);
        }
    };

    // Filter inventory by selected date range
    const filteredInventory = useMemo(() => {
        if (!inventory || inventory.length === 0) return [];
        const cutoff = getDateCutoff(dateRange);
        return inventory.filter(item => {
            const d = new Date(item.created_at || item.createdAt || item.dateAdded);
            return d >= cutoff;
        });
    }, [inventory, dateRange]);

    // Filter requests by selected date range
    const filteredRequests = useMemo(() => {
        if (!requests || requests.length === 0) return [];
        const cutoff = getDateCutoff(dateRange);
        return requests.filter(r => {
            const d = new Date(r.created_at || r.createdAt || r.requestDate);
            return d >= cutoff;
        });
    }, [requests, dateRange]);

    // Filtered summary stats for the cards
    const filteredStats = useMemo(() => {
        const inv = filteredInventory;
        const req = filteredRequests;
        const approved = req.filter(r => r.status === 'APPROVED' || r.status === 'COMPLETED').length;
        const rejected = req.filter(r => r.status === 'REJECTED').length;
        const total = approved + rejected;
        return {
            totalItems: inv.length,
            availableItems: inv.filter(i => i.status === 'AVAILABLE').length,
            totalRequests: req.length,
            approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
        };
    }, [filteredInventory, filteredRequests]);

    // Category distribution from filtered inventory
    const categoryDistribution = useMemo(() => {
        if (filteredInventory.length === 0) return [];
        const cats = {};
        filteredInventory.forEach(item => {
            const cat = item.category || 'Other';
            const label = cat.charAt(0) + cat.slice(1).toLowerCase();
            cats[label] = (cats[label] || 0) + 1;
        });
        return Object.entries(cats).map(([name, value]) => ({ name, value }));
    }, [filteredInventory]);

    // How many months of data to show in trend charts
    const getNumMonths = () => {
        switch (dateRange) {
            case 'week': return 1;
            case 'month': return 3;
            case 'quarter': return 4;
            case 'year': return 12;
            default: return 6;
        }
    };

    // Monthly request trends broken down by status
    const requestTrendData = useMemo(() => {
        if (!requests || requests.length === 0) return [];
        const now = new Date();
        const numMonths = getNumMonths();
        const months = [];
        for (let i = numMonths - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
            const monthName = date.toLocaleString('default', { month: 'short' });
            const monthReqs = requests.filter(r => {
                const d = new Date(r.created_at || r.createdAt || r.requestDate);
                return d >= date && d < nextMonth;
            });
            const approved = monthReqs.filter(r => r.status === 'APPROVED' || r.status === 'COMPLETED').length;
            const rejected = monthReqs.filter(r => r.status === 'REJECTED').length;
            const pending = monthReqs.filter(r => r.status === 'PENDING').length;
            const total = approved + rejected;
            months.push({
                month: monthName,
                approved,
                rejected,
                pending,
                approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
            });
        }
        return months;
    }, [requests, dateRange]);

    // Cumulative inventory trend with per-category breakdown
    const CATEGORY_COLORS = {
        'ELECTRONICS': '#1e40af',
        'FURNITURE': '#7c3aed',
        'EQUIPMENT': '#0891b2',
        'SUPPLIES': '#ea580c',
        'OTHER': '#6b7280',
    };

    const inventoryTrendData = useMemo(() => {
        if (!inventory || inventory.length === 0) return { months: [], categories: [] };
        const now = new Date();
        const numMonths = getNumMonths();
        const allCategories = [...new Set(inventory.map(item => item.category || 'OTHER'))];
        const months = [];
        for (let i = numMonths - 1; i >= 0; i--) {
            const cutoff = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
            const monthName = new Date(now.getFullYear(), now.getMonth() - i, 1)
                .toLocaleString('default', { month: 'short' });
            const entry = { month: monthName };
            entry.total = inventory.filter(item => {
                const d = new Date(item.created_at || item.dateAdded);
                return d < cutoff;
            }).length;
            allCategories.forEach(cat => {
                entry[cat] = inventory.filter(item => {
                    const itemCat = item.category || 'OTHER';
                    const d = new Date(item.created_at || item.dateAdded);
                    return itemCat === cat && d < cutoff;
                }).length;
            });
            months.push(entry);
        }
        return { months, categories: allCategories };
    }, [inventory, dateRange]);

    const approvalRate = filteredStats.approvalRate;

    // Top requested items from filtered requests
    const popularItems = useMemo(() => {
        if (filteredRequests.length === 0) return [];
        const itemCounts = {};
        filteredRequests.forEach(r => {
            const name = r.itemName || 'Unknown';
            itemCounts[name] = (itemCounts[name] || 0) + r.quantity;
        });
        return Object.entries(itemCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);
    }, [filteredRequests]);

    // Priority breakdown from filtered requests
    const priorityDistribution = useMemo(() => {
        if (filteredRequests.length === 0) return [];
        const counts = { LOW: 0, NORMAL: 0, HIGH: 0 };
        filteredRequests.forEach(r => {
            const p = (r.priority || 'NORMAL').toUpperCase();
            if (counts[p] !== undefined) counts[p]++;
        });
        return [
            { name: 'Low', value: counts.LOW },
            { name: 'Normal', value: counts.NORMAL },
            { name: 'High', value: counts.HIGH },
        ].filter(d => d.value > 0);
    }, [filteredRequests]);

    // Overdue requests from filtered data
    const overdueRequests = useMemo(() => {
        if (filteredRequests.length === 0) return [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return filteredRequests
            .filter(r => {
                if (!['APPROVED', 'COMPLETED'].includes(r.status)) return false;
                if (!r.expectedReturn) return false;
                const returnDate = new Date(r.expectedReturn);
                return returnDate < today;
            })
            .map(r => {
                const returnDate = new Date(r.expectedReturn);
                const daysOverdue = Math.floor((today - returnDate) / (1000 * 60 * 60 * 24));
                return { ...r, daysOverdue };
            })
            .sort((a, b) => b.daysOverdue - a.daysOverdue);
    }, [filteredRequests]);

    const isLoading = inventoryLoading || requestsLoading;
    const periodLabel = { week: 'This Week', month: 'This Month', quarter: 'This Quarter', year: 'This Year' }[dateRange];

    const handleExport = (format) => {
        const headers = ['Name', 'Category', 'Quantity', 'Status', 'Location'];
        const rows = (filteredInventory || []).map(item => [
            item.name,
            item.category,
            String(item.quantity),
            item.status,
            item.location || '',
        ]);

        if (format === 'csv') {
            exportCSV('inventory_report', headers, rows);
        } else if (format === 'pdf') {
            exportPDF('inventory_report', `Inventory Report (${periodLabel})`, headers, rows);
        }
    };

    return (
        <StaffOnly redirectTo="/requests" showAccessDenied>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
                        <p className="text-gray-500 mt-1">Analytics and insights for your inventory</p>
                    </div>
                    <div className="flex gap-3">
                        <select
                            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                        >
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                            <option value="quarter">This Quarter</option>
                            <option value="year">This Year</option>
                        </select>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleExport('pdf'); }}
                            className="px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer flex items-center gap-1"
                            style={{ position: 'relative', zIndex: 999 }}
                        >
                            <Download size={16} />
                            Export PDF
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleExport('csv'); }}
                            className="px-3 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer flex items-center gap-1"
                            style={{ position: 'relative', zIndex: 999 }}
                        >
                            <Download size={16} />
                            Export CSV
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <span className="ml-3 text-gray-500">Loading report data...</span>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <Card className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-primary/10">
                                    <FileText className="text-primary" size={24} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{filteredStats.totalItems}</p>
                                    <p className="text-sm text-gray-500">Items ({periodLabel})</p>
                                </div>
                            </Card>
                            <Card className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-emerald-500/10">
                                    <BarChart2 className="text-emerald-500" size={24} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{filteredStats.availableItems}</p>
                                    <p className="text-sm text-gray-500">Available ({periodLabel})</p>
                                </div>
                            </Card>
                            <Card className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-blue-500/10">
                                    <Calendar className="text-blue-500" size={24} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{filteredStats.totalRequests}</p>
                                    <p className="text-sm text-gray-500">Requests ({periodLabel})</p>
                                </div>
                            </Card>
                            <Card className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-amber-500/10">
                                    <Download className="text-amber-500" size={24} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{approvalRate}%</p>
                                    <p className="text-sm text-gray-500">Approval Rate</p>
                                </div>
                            </Card>
                            <Card className="flex items-center gap-4">
                                <div className="p-3 rounded-xl bg-red-500/10">
                                    <AlertTriangle className="text-red-500" size={24} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{overdueRequests.length}</p>
                                    <p className="text-sm text-gray-500">Overdue Returns</p>
                                </div>
                            </Card>
                        </div>

                        {/* Charts Row 1 — Inventory Trend + Request Approvals */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <LineChartComponent
                                data={inventoryTrendData.months || []}
                                lines={[
                                    ...(inventoryTrendData.categories || []).map(cat => ({
                                        dataKey: cat,
                                        name: cat.charAt(0) + cat.slice(1).toLowerCase(),
                                    }))
                                ]}
                                xAxisKey="month"
                                title="Inventory Trend by Category"
                            />
                            <BarChartComponent
                                data={requestTrendData}
                                bars={[
                                    { dataKey: 'approved', name: 'Approved', color: '#10b981' },
                                    { dataKey: 'rejected', name: 'Rejected', color: '#ef4444' },
                                    { dataKey: 'pending', name: 'Pending', color: '#f59e0b' },
                                ]}
                                xAxisKey="month"
                                title="Request Approvals by Status"
                            />
                        </div>

                        {/* Charts Row 2 — Category Pie + Approval Rate Trend */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {categoryDistribution.length > 0 ? (
                                <PieChartComponent
                                    data={categoryDistribution}
                                    dataKey="value"
                                    nameKey="name"
                                    title="Items by Category"
                                />
                            ) : (
                                <Card className="flex items-center justify-center h-[300px]">
                                    <p className="text-gray-400 dark:text-gray-500">No inventory data available</p>
                                </Card>
                            )}
                            {requestTrendData.length > 0 ? (
                                <LineChartComponent
                                    data={requestTrendData}
                                    lines={[
                                        { dataKey: 'approvalRate', name: 'Approval Rate (%)' },
                                    ]}
                                    xAxisKey="month"
                                    title="Monthly Approval Rate"
                                />
                            ) : (
                                <Card className="flex items-center justify-center h-[300px]">
                                    <p className="text-gray-400 dark:text-gray-500">No request data available</p>
                                </Card>
                            )}
                        </div>

                        {/* Charts Row 3 — Popular Items + Priority Distribution */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {popularItems.length > 0 ? (
                                <BarChartComponent
                                    data={popularItems}
                                    bars={[
                                        { dataKey: 'count', name: 'Times Requested', color: '#6366f1' },
                                    ]}
                                    xAxisKey="name"
                                    title="Most Requested Items"
                                />
                            ) : (
                                <Card className="flex items-center justify-center h-[300px]">
                                    <p className="text-gray-400 dark:text-gray-500">No request data available</p>
                                </Card>
                            )}
                            {priorityDistribution.length > 0 ? (
                                <PieChartComponent
                                    data={priorityDistribution}
                                    dataKey="value"
                                    nameKey="name"
                                    title="Requests by Priority"
                                />
                            ) : (
                                <Card className="flex items-center justify-center h-[300px]">
                                    <p className="text-gray-400 dark:text-gray-500">No request data available</p>
                                </Card>
                            )}
                        </div>

                        {/* Overdue Returns Table */}
                        {overdueRequests.length > 0 && (
                            <Card>
                                <Card.Header>
                                    <Card.Title className="flex items-center gap-2">
                                        <AlertTriangle className="text-red-500" size={20} />
                                        Overdue Returns ({overdueRequests.length})
                                    </Card.Title>
                                </Card.Header>
                                <Card.Content>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-gray-100">
                                                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Item</th>
                                                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Borrower</th>
                                                    <th className="text-right py-3 px-4 font-semibold text-gray-600">Qty</th>
                                                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Expected Return</th>
                                                    <th className="text-right py-3 px-4 font-semibold text-gray-600">Days Overdue</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {overdueRequests.map((req) => (
                                                    <tr key={req.id} className="border-b border-gray-50 hover:bg-red-50/30">
                                                        <td className="py-3 px-4 font-medium">{req.itemName}</td>
                                                        <td className="py-3 px-4">{req.requestedBy}</td>
                                                        <td className="text-right py-3 px-4">{req.quantity}</td>
                                                        <td className="py-3 px-4">{req.expectedReturn}</td>
                                                        <td className="text-right py-3 px-4">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${req.daysOverdue > 7 ? 'bg-red-100 text-red-700' :
                                                                req.daysOverdue > 3 ? 'bg-orange-100 text-orange-700' :
                                                                    'bg-amber-100 text-amber-700'
                                                                }`}>
                                                                {req.daysOverdue}d
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card.Content>
                            </Card>
                        )}

                        {/* Category Summary Table */}
                        {categoryDistribution.length > 0 && (
                            <Card>
                                <Card.Header>
                                    <Card.Title>Category Summary</Card.Title>
                                </Card.Header>
                                <Card.Content>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-gray-100">
                                                    <th className="text-left py-3 px-4 font-semibold text-gray-600">Category</th>
                                                    <th className="text-right py-3 px-4 font-semibold text-gray-600">Total Items</th>
                                                    <th className="text-right py-3 px-4 font-semibold text-gray-600">Percentage</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {categoryDistribution.map((cat) => (
                                                    <tr key={cat.name} className="border-b border-gray-50 hover:bg-gray-50">
                                                        <td className="py-3 px-4 font-medium">{cat.name}</td>
                                                        <td className="text-right py-3 px-4">{cat.value}</td>
                                                        <td className="text-right py-3 px-4">
                                                            <span className="text-primary font-medium">
                                                                {filteredInventory.length > 0 ? Math.round(cat.value / filteredInventory.length * 100) : 0}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card.Content>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </StaffOnly>
    );
};

export default Reports;
