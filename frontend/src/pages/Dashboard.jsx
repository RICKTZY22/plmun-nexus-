import React, { useEffect, useState } from 'react';
import { Package, FileText, AlertCircle, Clock, AlertTriangle, ExternalLink } from 'lucide-react';
import { StatCard, BarChartComponent, PieChartComponent, LineChartComponent } from '../components/dashboard';
import { Card, Button } from '../components/ui';
import { FacultyOnly, StaffOnly } from '../components/auth';
import { useInventory, useRequests } from '../hooks';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const { stats: inventoryStats, inventory, fetchInventory, fetchStats: fetchInventoryStats, getLowStockItems, LOW_STOCK_THRESHOLD, loading: inventoryLoading, error: inventoryError } = useInventory();
    const { stats: requestStats, requests, fetchRequests, loading: requestsLoading, error: requestsError } = useRequests();
    const [lowStockItems, setLowStockItems] = useState([]);

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
                console.error('Failed to fetch low stock items:', err);
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
        const months = [];
        // Collect unique categories from inventory
        const allCategories = [...new Set(inventory.map(item => item.category || 'OTHER'))];

        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
            const monthName = date.toLocaleString('default', { month: 'short' });

            // Count total inventory items created in this month
            const monthItems = inventory.filter(item => {
                const itemDate = new Date(item.dateAdded || item.created_at);
                return itemDate >= date && itemDate < nextMonth;
            }).length;

            // Count requests created in this month
            const monthRequests = requests.filter(r => {
                const reqDate = new Date(r.createdAt || r.created_at || r.requestDate);
                return reqDate >= date && reqDate < nextMonth;
            }).length;

            // Per-category counts
            const entry = { month: monthName, total: monthItems, requests: monthRequests };
            allCategories.forEach(cat => {
                entry[cat] = inventory.filter(item => {
                    const itemCat = item.category || 'OTHER';
                    const itemDate = new Date(item.dateAdded || item.created_at);
                    return itemCat === cat && itemDate >= date && itemDate < nextMonth;
                }).length;
            });

            months.push(entry);
        }
        return { months, categories: allCategories };
    }, [requests, inventory]);

    // Recent activity from actual requests
    const recentActivity = React.useMemo(() => {
        if (!requests || requests.length === 0) return [];
        return requests.slice(0, 5).map((req) => ({
            id: req.id,
            action: req.status === 'PENDING' ? 'Request Created' :
                req.status === 'APPROVED' ? 'Request Approved' :
                    req.status === 'COMPLETED' ? 'Request Completed' : 'Request Rejected',
            item: req.itemName || req.item_name || 'Unknown Item',
            user: req.requestedBy || req.requester_name || 'Unknown User',
            time: new Date(req.requestDate || req.created_at).toLocaleDateString()
        }));
    }, [requests]);

    const isLoading = inventoryLoading || requestsLoading;
    const hasError = inventoryError || requestsError;

    return (
        <FacultyOnly redirectTo="/requests" showAccessDenied>
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
                                color: CATEGORY_COLORS[cat] || ['#006837', '#1e40af', '#0891b2', '#7c3aed', '#db2777'][i % 5]
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
                                                <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${activity.action.includes('Approved') ? 'bg-emerald-500' :
                                                    activity.action.includes('Created') ? 'bg-amber-500' :
                                                        activity.action.includes('Completed') ? 'bg-blue-500' : 'bg-red-500'
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
        </FacultyOnly >
    );
};

export default Dashboard;
