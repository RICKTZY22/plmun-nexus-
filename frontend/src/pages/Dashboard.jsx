import React, { useEffect, useState } from 'react';
import { Package, FileText, AlertCircle, Clock, AlertTriangle, ExternalLink, Plus, ArrowRight, CheckCircle, RotateCcw } from 'lucide-react';
import { StatCard, BarChartComponent, PieChartComponent, LineChartComponent } from '../components/dashboard';
import { Card, Button } from '../components/ui';
import { FacultyOnly, StaffOnly } from '../components/auth';
import { useInventory, useRequests } from '../hooks';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { hasMinRole, ROLES } from '../utils/roles';

const Dashboard = () => {
    const { stats: inventoryStats, inventory, fetchInventory, fetchStats: fetchInventoryStats, getLowStockItems, LOW_STOCK_THRESHOLD, loading: inventoryLoading, error: inventoryError } = useInventory();
    const { stats: requestStats, requests, fetchRequests, loading: requestsLoading, error: requestsError } = useRequests();
    const [lowStockItems, setLowStockItems] = useState([]);
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const isFacultyPlus = hasMinRole(user?.role, ROLES.FACULTY);

    useEffect(() => {
        fetchInventory();
        fetchInventoryStats();
        fetchRequests();
    }, [fetchInventory, fetchInventoryStats, fetchRequests]);

    // Fetch low stock items (async)
    useEffect(() => {
        const fetchLowStock = async () => {
            try {
                const items = await getLowStockItems();
                setLowStockItems(items || []);
            } catch (err) {
                setLowStockItems([]);
            }
        };
        fetchLowStock();
    }, [getLowStockItems]);

    // Calculate category data from real inventory
    const categoryData = React.useMemo(() => {
        if (!inventory || inventory.length === 0) {
            return [{ name: 'No Data', value: 1 }];
        }
        const categories = {};
        inventory.forEach(item => {
            const cat = item.category || 'Uncategorized';
            categories[cat] = (categories[cat] || 0) + 1;
        });
        return Object.entries(categories).map(([name, value]) => ({ name, value }));
    }, [inventory]);

    // Calculate monthly trend data from real inventory and request data
    // Also compute per-category counts for the bar chart
    const CATEGORY_COLORS = {
        'ELECTRONICS': '#1e40af',
        'FURNITURE': '#7c3aed',
        'EQUIPMENT': '#0891b2',
        'SUPPLIES': '#ea580c',
        'OTHER': '#6b7280',
    };

    const monthlyData = React.useMemo(() => {
        const now = new Date();
        const allCategories = [...new Set(inventory.map(item => item.category || 'OTHER'))];

        // Pre-build 6 month buckets
        const buckets = [];
        for (let i = 5; i >= 0; i--) {
            const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
            buckets.push({
                month: start.toLocaleString('default', { month: 'short' }),
                start: start.getTime(),
                end: end.getTime(),
                total: 0,
                requests: 0,
                catCounts: new Map(allCategories.map(c => [c, 0])),
            });
        }

        // Single pass over inventory — O(N)
        for (const item of inventory) {
            const ts = new Date(item.dateAdded || item.created_at).getTime();
            const cat = item.category || 'OTHER';
            for (const b of buckets) {
                if (ts >= b.start && ts < b.end) {
                    b.total++;
                    b.catCounts.set(cat, (b.catCounts.get(cat) || 0) + 1);
                    break;
                }
            }
        }

        // Single pass over requests — O(R)
        for (const r of requests) {
            const ts = new Date(r.createdAt || r.created_at || r.requestDate).getTime();
            for (const b of buckets) {
                if (ts >= b.start && ts < b.end) {
                    b.requests++;
                    break;
                }
            }
        }

        const months = buckets.map(b => {
            const entry = { month: b.month, total: b.total, requests: b.requests };
            for (const [cat, count] of b.catCounts) entry[cat] = count;
            return entry;
        });

        return { months, categories: allCategories };
    }, [requests, inventory]);

    // Recent activity from actual requests
    const recentActivity = React.useMemo(() => {
        if (!requests || requests.length === 0) return [];
        const statusLabels = {
            PENDING: 'Request Created',
            APPROVED: 'Request Approved',
            COMPLETED: 'Request Completed',
            REJECTED: 'Request Rejected',
            RETURNED: 'Item Returned',
            CANCELLED: 'Request Cancelled',
            OVERDUE: 'Request Overdue',
        };
        return requests.slice(0, 5).map((req) => ({
            id: req.id,
            action: statusLabels[req.status] || `Status: ${req.status}`,
            item: req.itemName || req.item_name || 'Unknown Item',
            user: req.requestedBy || req.requester_name || 'Unknown User',
            time: new Date(req.requestDate || req.created_at).toLocaleDateString()
        }));
    }, [requests]);

    const isLoading = inventoryLoading || requestsLoading;
    const hasError = inventoryError || requestsError;

    // ── Student Dashboard ──
    if (!isFacultyPlus) {
        // Calculate student's personal stats
        const myRequests = requests.filter(r => r.requestedById === user?.id);
        const myStats = {
            pending: myRequests.filter(r => r.status === 'PENDING').length,
            approved: myRequests.filter(r => r.status === 'APPROVED').length,
            completed: myRequests.filter(r => r.status === 'COMPLETED' || r.status === 'RETURNED').length,
            overdue: myRequests.filter(r => r.isOverdue).length,
        };
        const myRecent = myRequests.slice(0, 5);

        const statusColors = {
            PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
            APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
            REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
            COMPLETED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
            RETURNED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
            CANCELLED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
        };

        return (
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Welcome back, {user?.fullName?.split(' ')[0] || 'User'}! Here's your activity overview.
                    </p>
                </div>

                {/* Loading */}
                {requestsLoading && !requests.length && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">Loading your data...</p>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-4 border-l-4 border-l-amber-500">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <Clock size={20} className="text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{myStats.pending}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4 border-l-4 border-l-emerald-500">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <CheckCircle size={20} className="text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{myStats.approved}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Approved</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-4 border-l-4 border-l-blue-500">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <RotateCcw size={20} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{myStats.completed}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
                            </div>
                        </div>
                    </Card>
                    <Card className={`p-4 border-l-4 ${myStats.overdue > 0 ? 'border-l-red-500' : 'border-l-gray-300 dark:border-l-gray-600'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${myStats.overdue > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                                <AlertTriangle size={20} className={myStats.overdue > 0 ? 'text-red-600' : 'text-gray-400'} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{myStats.overdue}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Overdue</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                        onClick={() => navigate('/requests', { state: { openNewRequest: true } })}
                        className="group flex items-center gap-4 p-5 bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-2xl border border-primary/20 hover:border-primary/40 transition-all duration-200 hover:shadow-lg hover:shadow-primary/10"
                    >
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Plus size={24} className="text-primary" />
                        </div>
                        <div className="text-left">
                            <p className="font-semibold text-gray-900 dark:text-white">New Request</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Request items for your needs</p>
                        </div>
                        <ArrowRight size={18} className="ml-auto text-gray-400 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <Link
                        to="/inventory"
                        className="group flex items-center gap-4 p-5 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 dark:from-emerald-500/20 dark:to-emerald-500/10 rounded-2xl border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/10"
                    >
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Package size={24} className="text-emerald-600" />
                        </div>
                        <div className="text-left">
                            <p className="font-semibold text-gray-900 dark:text-white">Browse Items</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">See what's available to request</p>
                        </div>
                        <ArrowRight size={18} className="ml-auto text-gray-400 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>

                {/* Recent Requests */}
                <Card>
                    <Card.Header>
                        <div className="flex items-center justify-between">
                            <Card.Title>My Recent Requests</Card.Title>
                            <Link to="/requests">
                                <Button variant="ghost" size="sm">
                                    View All <ArrowRight size={14} className="ml-1" />
                                </Button>
                            </Link>
                        </div>
                    </Card.Header>
                    <Card.Content>
                        {myRecent.length === 0 ? (
                            <div className="text-center py-8">
                                <Package size={40} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                                <p className="text-gray-500 dark:text-gray-400">No requests yet</p>
                                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Start by browsing available items!</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {myRecent.map((req) => (
                                    <div
                                        key={req.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                                        onClick={() => navigate('/requests')}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                <Package size={16} className="text-primary" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                    {req.itemName}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    Qty: {req.quantity} • {req.requestDate}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${statusColors[req.status] || 'bg-gray-100 text-gray-600'}`}>
                                            {req.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card.Content>
                </Card>
            </div>
        );
    }

    // ── Faculty+ Dashboard (existing) ──
    return (
        <>
            {/* Loading State */}
            {isLoading && !inventory.length && !requests.length && (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">Loading dashboard data...</p>
                </div>
            )}

            {/* Error State */}
            {hasError && !isLoading && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 mb-6">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="text-red-500" size={24} />
                        <div>
                            <h3 className="font-semibold text-red-700 dark:text-red-400">Failed to load dashboard data</h3>
                            <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                                {inventoryError || requestsError}. Please check if the backend server is running.
                            </p>
                        </div>
                    </div>
                </div>
            )}
            <div className="space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Welcome back! Here's what's happening today.</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Total Items"
                        value={inventoryStats?.total?.toString() || '0'}
                        icon={Package}
                        trend="up"
                        trendValue={`${inventoryStats?.available || 0} available`}
                        color="primary"
                    />
                    <StatCard
                        title="Pending Requests"
                        value={requestStats?.pending?.toString() || '0'}
                        icon={Clock}
                        trend={requestStats?.highPriority > 0 ? "up" : "down"}
                        trendValue={requestStats?.highPriority > 0 ? `${requestStats.highPriority} high priority` : 'No urgent requests'}
                        color="warning"
                    />
                    <StatCard
                        title="Total Requests"
                        value={requestStats?.total?.toString() || '0'}
                        icon={FileText}
                        trend="up"
                        trendValue={`${requestStats?.approved || 0} approved`}
                        color="secondary"
                    />
                    <StatCard
                        title="Low Stock Alerts"
                        value={lowStockItems.length.toString()}
                        icon={AlertCircle}
                        trend={lowStockItems.length > 0 ? "up" : "down"}
                        trendValue={lowStockItems.length > 0 ? `${inventoryStats?.maintenance || 0} in maintenance` : 'All stocked'}
                        color="danger"
                    />
                </div>

                {/* Low Stock Alert Panel - Only for Staff+ */}
                {lowStockItems.length > 0 && (
                    <StaffOnly>
                        <Card className="border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-900/10">
                            <Card.Header>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="text-red-500" size={20} />
                                        <Card.Title className="text-red-700 dark:text-red-400">
                                            Low Stock Alert ({lowStockItems.length} items)
                                        </Card.Title>
                                    </div>
                                    <Link to="/inventory">
                                        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-100">
                                            View Inventory <ExternalLink size={14} className="ml-1" />
                                        </Button>
                                    </Link>
                                </div>
                            </Card.Header>
                            <Card.Content>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {lowStockItems.slice(0, 6).map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium text-gray-800 dark:text-gray-100 truncate text-sm">
                                                    {item.name}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {item.category} • {item.location}
                                                </p>
                                            </div>
                                            <div className={`ml-3 px-2 py-1 rounded-full text-xs font-bold ${item.quantity <= 2
                                                ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                                }`}>
                                                {item.quantity} left
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {lowStockItems.length > 6 && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 text-center">
                                        ... and {lowStockItems.length - 6} more items
                                    </p>
                                )}
                            </Card.Content>
                        </Card>
                    </StaffOnly>
                )}

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <BarChartComponent
                        data={monthlyData.months}
                        bars={monthlyData.categories.map((cat, i) => ({
                            dataKey: cat,
                            name: cat.charAt(0) + cat.slice(1).toLowerCase(),
                            color: CATEGORY_COLORS[cat] || ['#6366f1', '#3b82f6', '#0891b2', '#10b981', '#f59e0b'][i % 5]
                        }))}
                        xAxisKey="month"
                        title="Items Added by Category"
                    />
                    <PieChartComponent
                        data={categoryData}
                        dataKey="value"
                        nameKey="name"
                        title="Items by Category"
                    />
                </div>

                {/* Line Chart and Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <LineChartComponent
                            data={monthlyData.months}
                            lines={[
                                { dataKey: 'total', name: 'Items Added' },
                                { dataKey: 'requests', name: 'Requests' }
                            ]}
                            xAxisKey="month"
                            title="Monthly Trends"
                        />
                    </div>

                    <Card>
                        <Card.Header>
                            <Card.Title>Recent Activity</Card.Title>
                        </Card.Header>
                        <Card.Content>
                            <div className="space-y-4">
                                {isLoading ? (
                                    <p className="text-sm text-gray-500 text-center py-4">Loading...</p>
                                ) : recentActivity.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
                                ) : (
                                    recentActivity.map((activity) => (
                                        <div key={activity.id} className="flex items-start gap-3">
                                            <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${(() => {
                                                    const a = activity.action;
                                                    if (a.includes('Approved')) return 'bg-emerald-500';
                                                    if (a.includes('Created')) return 'bg-amber-500';
                                                    if (a.includes('Completed') || a.includes('Returned')) return 'bg-blue-500';
                                                    if (a.includes('Cancelled') || a.includes('Overdue')) return 'bg-orange-500';
                                                    return 'bg-red-500';
                                                })()
                                                }`} />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                    {activity.action}
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{activity.item}</p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {activity.user} • {activity.time}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Card.Content>
                    </Card>
                </div>
            </div>
        </>
    );
};

export default Dashboard;
