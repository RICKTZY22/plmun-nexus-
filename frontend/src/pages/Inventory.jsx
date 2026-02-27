import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Filter, Package, Edit, Trash2, Download, Printer, AlertTriangle, QrCode, FileText, MapPin, Clock, Timer, Eye, ArrowRight, RotateCcw, X, ChevronDown, ChevronRight, TrendingDown, CheckCircle, XCircle, Wrench, RefreshCw, Power, Calendar, Star } from 'lucide-react';
import { Button, Input, Card, Modal, Table, ImageUpload, QRCodeModal } from '../components/ui';
import { useInventory } from '../hooks';
import { FacultyOnly, StaffOnly } from '../components/auth';
import { exportCSV, exportPDF } from '../utils/exportUtils';
import useUIStore from '../store/uiStore';
import useAuthStore from '../store/authStore';
import { resolveImageUrl } from '../utils/imageUtils';
import { useNavigate } from 'react-router-dom';
import { hasMinRole, ROLES } from '../utils/roles';

const statusColors = {
    AVAILABLE: 'bg-emerald-100 text-emerald-700',
    IN_USE: 'bg-blue-100 text-blue-700',
    MAINTENANCE: 'bg-amber-100 text-amber-700',
    RETIRED: 'bg-gray-100 text-gray-700',
};

const categoryIcons = {
    ELECTRONICS: '💻',
    FURNITURE: '🪑',
    EQUIPMENT: '🔧',
    SUPPLIES: '📦',
    OTHER: '📋',
};

const Inventory = () => {
    const { inventory, loading, stats, fetchInventory, addItem, updateItem, deleteItem, changeItemStatus } = useInventory();
    const { viewMode, itemsPerPage, showImages } = useUIStore();
    const { user } = useAuthStore();

    // Load saved staff defaults from Settings → Inventory Settings tab
    const staffDefaults = useMemo(() => {
        if (!user?.id) return {};
        try {
            const raw = localStorage.getItem(`staff-prefs-${user.id}`);
            return raw ? JSON.parse(raw) : {};
        } catch { return {}; }
    }, [user?.id]);

    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const defaultFormData = {
        name: '',
        category: staffDefaults.defaultCategory || 'ELECTRONICS',
        quantity: 1,
        status: staffDefaults.defaultStatus || 'AVAILABLE',
        location: staffDefaults.defaultLocation || '',
        description: '',
        imageUrl: null,
        accessLevel: 'STUDENT',
        isReturnable: true,
        borrowDuration: '',
        borrowDurationUnit: 'DAYS',
    };
    const [formData, setFormData] = useState(defaultFormData);
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [qrItem, setQrItem] = useState(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteItemId, setDeleteItemId] = useState(null);
    const [detailItem, setDetailItem] = useState(null);
    const [collapsedSections, setCollapsedSections] = useState({});

    // F-09: Favorites system
    const [favorites, setFavorites] = useState([]);
    useEffect(() => {
        if (!user?.id) return;
        try {
            const stored = JSON.parse(localStorage.getItem(`favorites-${user.id}`) || '[]');
            setFavorites(stored);
        } catch { setFavorites([]); }
    }, [user?.id]);
    const toggleFavorite = (e, itemId) => {
        e.stopPropagation();
        e.preventDefault();
        if (!user?.id) return;
        const next = favorites.includes(itemId) ? favorites.filter(id => id !== itemId) : [...favorites, itemId];
        setFavorites(next);
        localStorage.setItem(`favorites-${user.id}`, JSON.stringify(next));
    };

    // Status change modal state
    const [statusModal, setStatusModal] = useState({ open: false, item: null, targetStatus: '' });
    const [statusNote, setStatusNote] = useState('');
    const [maintenanceEta, setMaintenanceEta] = useState('');

    // Centralized filtered items — used by both card/table views and pagination
    const filteredItems = useMemo(() => {
        if (!inventory) return [];
        return inventory.filter(item => {
            const matchSearch = !search || item.name?.toLowerCase().includes(search.toLowerCase()) || item.category?.toLowerCase().includes(search.toLowerCase());
            const matchCategory = !filterCategory || item.category === filterCategory;
            const matchStatus = !filterStatus || item.status === filterStatus;
            return matchSearch && matchCategory && matchStatus;
        });
    }, [inventory, search, filterCategory, filterStatus]);

    // Stock-level groups
    const LOW_STOCK_THRESHOLD = 5;
    const stockGroups = useMemo(() => [
        {
            key: 'OUT_OF_STOCK',
            label: 'Out of Stock',
            icon: XCircle,
            color: 'bg-red-500',
            textColor: 'text-red-700 dark:text-red-400',
            bgLight: 'bg-red-50 dark:bg-red-900/10',
            borderColor: 'border-red-200 dark:border-red-800/30',
            filter: item => item.quantity === 0,
        },
        {
            key: 'LOW_STOCK',
            label: 'Low Stock',
            icon: TrendingDown,
            color: 'bg-amber-500',
            textColor: 'text-amber-700 dark:text-amber-400',
            bgLight: 'bg-amber-50 dark:bg-amber-900/10',
            borderColor: 'border-amber-200 dark:border-amber-800/30',
            filter: item => item.quantity > 0 && item.quantity <= LOW_STOCK_THRESHOLD,
        },
        {
            key: 'NORMAL_STOCK',
            label: 'Normal Stock',
            icon: CheckCircle,
            color: 'bg-emerald-500',
            textColor: 'text-emerald-700 dark:text-emerald-400',
            bgLight: 'bg-emerald-50 dark:bg-emerald-900/10',
            borderColor: 'border-emerald-200 dark:border-emerald-800/30',
            filter: item => item.quantity > LOW_STOCK_THRESHOLD,
        },
    ], []);
    const navigate = useNavigate();
    const isStaffPlus = hasMinRole(user?.role, ROLES.STAFF);

    // F-04: Navigate to Requests with item pre-filled
    const handleRequestItem = (item, e) => {
        e?.stopPropagation();
        navigate('/requests', { state: { prefillItem: item } });
    };

    useEffect(() => {
        fetchInventory({ search, category: filterCategory, status: filterStatus });
    }, [search, filterCategory, filterStatus, fetchInventory]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (editingItem) {
            await updateItem(editingItem.id, formData);
        } else {
            await addItem(formData);
        }
        setIsAddModalOpen(false);
        setEditingItem(null);
        setFormData(defaultFormData);
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({
            name: item.name || '',
            category: item.category || 'ELECTRONICS',
            quantity: item.quantity || 1,
            status: item.status || 'AVAILABLE',
            location: item.location || '',
            description: item.description || '',
            imageUrl: null, // Don't send existing URL back as a file
            accessLevel: item.accessLevel || 'STUDENT',
            isReturnable: item.isReturnable !== undefined ? item.isReturnable : true,
            borrowDuration: item.borrowDuration || '',
            borrowDurationUnit: item.borrowDurationUnit || 'DAYS',
        });
        setIsAddModalOpen(true);
    };

    const handleDelete = (id) => {
        setDeleteItemId(id);
        setDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (deleteItemId) {
            const result = await deleteItem(deleteItemId);
            if (!result.success) {
                alert(result.error || 'Failed to delete item');
            }
        }
        setDeleteModalOpen(false);
        setDeleteItemId(null);
    };

    // ── Status change helpers ──
    const openStatusModal = (item, targetStatus, e) => {
        e?.stopPropagation();
        setStatusModal({ open: true, item, targetStatus });
        setStatusNote('');
        setMaintenanceEta('');
    };

    const handleStatusChange = async () => {
        if (!statusModal.item) return;
        const result = await changeItemStatus(statusModal.item.id, {
            status: statusModal.targetStatus,
            note: statusNote,
            maintenanceEta: statusModal.targetStatus === 'MAINTENANCE' ? maintenanceEta : null,
        });
        if (result.success) {
            // Also refresh detail modal if it's showing this item
            if (detailItem?.id === statusModal.item.id) {
                const updated = inventory.find(i => i.id === statusModal.item.id);
                if (updated) setDetailItem(updated);
            }
        } else {
            alert(result.error || 'Failed to change status');
        }
        setStatusModal({ open: false, item: null, targetStatus: '' });
    };

    // Quick-action: go straight to AVAILABLE without modal
    const handleQuickReturn = async (item, e) => {
        e?.stopPropagation();
        const result = await changeItemStatus(item.id, {
            status: 'AVAILABLE',
            note: `Returned to available from ${item.status}`,
        });
        if (!result.success) alert(result.error || 'Failed to change status');
    };

    // Status action config for quick buttons
    const getStatusActions = (item) => {
        const actions = [];
        switch (item.status) {
            case 'IN_USE':
                actions.push({ label: 'Mark Returned', icon: RotateCcw, color: 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20', onClick: (e) => handleQuickReturn(item, e) });
                break;
            case 'MAINTENANCE':
                actions.push({ label: 'Mark Fixed', icon: CheckCircle, color: 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20', onClick: (e) => handleQuickReturn(item, e) });
                break;
            case 'RETIRED':
                actions.push({ label: 'Reactivate', icon: RefreshCw, color: 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20', onClick: (e) => handleQuickReturn(item, e) });
                break;
            case 'AVAILABLE':
                actions.push({ label: 'Set Maintenance', icon: Wrench, color: 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20', onClick: (e) => openStatusModal(item, 'MAINTENANCE', e) });
                actions.push({ label: 'Retire', icon: Power, color: 'text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900/20', onClick: (e) => openStatusModal(item, 'RETIRED', e) });
                break;
            default:
                break;
        }
        return actions;
    };

    // Export to CSV
    const handleExportCSV = () => {
        const headers = ['Name', 'Category', 'Quantity', 'Status', 'Location', 'Description', 'Date Added'];
        const rows = inventory.map(item => [
            item.name || '',
            item.category || '',
            item.quantity || 0,
            item.status || '',
            item.location || '',
            item.description || '',
            item.dateAdded || item.created_at || '',
        ]);
        exportCSV('inventory', headers, rows);
    };

    // Export to PDF
    const handleExportPDF = () => {
        const headers = ['Name', 'Category', 'Qty', 'Status', 'Location'];
        const rows = inventory.map(item => [
            item.name || '',
            item.category || '',
            item.quantity || 0,
            item.status || '',
            item.location || '',
        ]);
        const summary = {
            'Total Items': stats?.total || inventory.length,
            'Available': stats?.available || 0,
            'In Use': stats?.inUse || 0,
            'Maintenance': stats?.maintenance || 0,
        };
        exportPDF('inventory_report', 'PLMun Inventory Report', headers, rows, { summary });
    };

    // Print inventory
    const handlePrint = () => {
        const printContent = `
            <html>
            <head>
                <title>PLMun Inventory Report</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #1a1a1a; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f5f5f5; }
                    .stats { display: flex; gap: 20px; margin-bottom: 20px; }
                    .stat { padding: 10px; background: #f5f5f5; border-radius: 8px; }
                </style>
            </head>
            <body>
                <h1>PLMun Inventory Report</h1>
                <p>Generated on: ${new Date().toLocaleString()}</p>
                <div class="stats">
                    <div class="stat"><strong>Total:</strong> ${stats.total}</div>
                    <div class="stat"><strong>Available:</strong> ${stats.available}</div>
                    <div class="stat"><strong>In Use:</strong> ${stats.inUse}</div>
                    <div class="stat"><strong>Maintenance:</strong> ${stats.maintenance}</div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Category</th>
                            <th>Quantity</th>
                            <th>Status</th>
                            <th>Location</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${inventory.map(item => `
                            <tr>
                                <td>${item.name}</td>
                                <td>${item.category}</td>
                                <td>${item.quantity}</td>
                                <td>${item.status}</td>
                                <td>${item.location}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
    };

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your inventory items</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <StaffOnly>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleExportCSV(); }}
                                className="px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer flex items-center gap-1.5 transition-colors"
                            >
                                <Download size={16} />
                                CSV
                            </button>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleExportPDF(); }}
                                className="px-3 py-2 text-sm font-medium bg-primary/10 text-primary rounded-xl hover:bg-primary/20 cursor-pointer flex items-center gap-1.5 transition-colors"
                            >
                                <FileText size={16} />
                                PDF
                            </button>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handlePrint(); }}
                                className="px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer flex items-center gap-1.5 transition-colors"
                            >
                                <Printer size={16} />
                                Print
                            </button>
                        </StaffOnly>
                        <FacultyOnly>
                            <Button icon={Plus} onClick={() => setIsAddModalOpen(true)}>
                                Add Item
                            </Button>
                        </FacultyOnly>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Card className="relative overflow-hidden py-5 px-4">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 dark:bg-primary/10 rounded-bl-full" />
                        <Package size={20} className="text-primary mb-2" />
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Items</p>
                    </Card>
                    <Card className="relative overflow-hidden py-5 px-4">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-bl-full" />
                        <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        </div>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.available}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Available</p>
                    </Card>
                    <Card className="relative overflow-hidden py-5 px-4">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 dark:bg-blue-500/10 rounded-bl-full" />
                        <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                        </div>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.inUse}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">In Use</p>
                    </Card>
                    <Card className="relative overflow-hidden py-5 px-4">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 dark:bg-amber-500/10 rounded-bl-full" />
                        <TrendingDown size={20} className="text-amber-500 mb-2" />
                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{filteredItems.filter(i => i.quantity > 0 && i.quantity <= LOW_STOCK_THRESHOLD).length}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Low Stock</p>
                    </Card>
                    <Card className="relative overflow-hidden py-5 px-4">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/5 dark:bg-red-500/10 rounded-bl-full" />
                        <XCircle size={20} className="text-red-500 mb-2" />
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">{filteredItems.filter(i => i.quantity === 0).length}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Out of Stock</p>
                    </Card>
                </div>

                {/* Filters */}
                <Card>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <Input
                                icon={Search}
                                placeholder="Search items..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <select
                            className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-primary outline-none transition-colors"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                        >
                            <option value="">All Categories</option>
                            <option value="ELECTRONICS">Electronics</option>
                            <option value="FURNITURE">Furniture</option>
                            <option value="EQUIPMENT">Equipment</option>
                            <option value="SUPPLIES">Supplies</option>
                            <option value="OTHER">Other</option>
                        </select>
                        <select
                            className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-primary outline-none transition-colors"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="">All Status</option>
                            <option value="AVAILABLE">Available</option>
                            <option value="IN_USE">In Use</option>
                            <option value="MAINTENANCE">Maintenance</option>
                            <option value="RETIRED">Retired</option>
                        </select>
                    </div>
                </Card>

                {/* Items Display — Grouped by Stock Level */}
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                        <span className="ml-3 text-gray-500 dark:text-gray-400">Loading inventory...</span>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <Card className="py-12 text-center">
                        <Package size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No items found matching your filters</p>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {stockGroups.map(group => {
                            const groupItems = filteredItems.filter(group.filter);
                            if (groupItems.length === 0) return null;
                            const isCollapsed = collapsedSections[group.key];
                            const GroupIcon = group.icon;
                            const paginatedItems = groupItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

                            return (
                                <div key={group.key} className={`rounded-xl border ${group.borderColor} overflow-hidden`}>
                                    {/* Group header — clickable to collapse */}
                                    <button
                                        type="button"
                                        onClick={() => setCollapsedSections(prev => ({ ...prev, [group.key]: !prev[group.key] }))}
                                        className={`w-full flex items-center justify-between px-4 py-3 ${group.bgLight} cursor-pointer hover:opacity-90 transition-opacity`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${group.color} text-white`}>
                                                <GroupIcon size={16} />
                                            </span>
                                            <span className={`font-semibold text-sm ${group.textColor}`}>{group.label}</span>
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${group.color} text-white`}>
                                                {groupItems.length}
                                            </span>
                                        </div>
                                        {isCollapsed ? <ChevronRight size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                                    </button>

                                    {/* Group body */}
                                    {!isCollapsed && (
                                        viewMode === 'card' ? (
                                            /* ===== CARD VIEW ===== */
                                            <div className="p-4">
                                                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                                                    {groupItems.map(item => (
                                                        <Card key={item.id} className={`relative overflow-hidden p-0 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group/card ${item.status === 'RETIRED' ? 'opacity-60 grayscale-[30%]' : ''}`} onClick={() => setDetailItem(item)}>
                                                            {showImages && (
                                                                <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center relative overflow-hidden">
                                                                    {item.imageUrl ? (
                                                                        <img src={resolveImageUrl(item.imageUrl)} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110" onError={(e) => { e.target.style.display = 'none'; }} />
                                                                    ) : (
                                                                        <span className="text-4xl transition-transform duration-300 group-hover/card:scale-110">{categoryIcons[item.category] || '📋'}</span>
                                                                    )}
                                                                    <div className="absolute inset-0 bg-primary/0 group-hover/card:bg-primary/10 transition-colors duration-300 flex items-center justify-center">
                                                                        <Eye size={24} className="text-white opacity-0 group-hover/card:opacity-80 transition-all duration-300 drop-shadow-lg" />
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <div className="p-4 space-y-3">
                                                                <div>
                                                                    <div className="flex items-center justify-between">
                                                                        <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover/card:text-primary transition-colors duration-200">{item.name}</h3>
                                                                        <button onClick={(e) => toggleFavorite(e, item.id)} className={`flex-shrink-0 p-1 rounded-full transition-colors ${favorites.includes(item.id) ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600 hover:text-amber-400'}`} title={favorites.includes(item.id) ? 'Remove from favorites' : 'Add to favorites'}>
                                                                            <Star size={14} fill={favorites.includes(item.id) ? 'currentColor' : 'none'} />
                                                                        </button>
                                                                    </div>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                                                                        {categoryIcons[item.category] || '📋'} {item.category}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center justify-between">
                                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[item.status]}`}>
                                                                        {item.status}
                                                                    </span>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className={`text-sm font-bold ${item.quantity <= 5 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                                                            Qty: {item.quantity}
                                                                        </span>
                                                                        {item.quantity <= 5 && item.quantity > 0 && <AlertTriangle size={14} className="text-amber-500" />}
                                                                        {item.quantity === 0 && <XCircle size={14} className="text-red-500" />}
                                                                    </div>
                                                                </div>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                                                                    <MapPin size={12} />
                                                                    {item.location || 'No location'}
                                                                </p>
                                                                <div className="flex items-center justify-center gap-1.5 text-xs text-primary/60 group-hover/card:text-primary transition-colors duration-200 pt-1">
                                                                    <span>View Details</span>
                                                                    <ArrowRight size={12} className="transition-transform duration-200 group-hover/card:translate-x-1" />
                                                                </div>
                                                                <div className="flex gap-1 pt-2 border-t border-gray-100 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                                                                    {item.status === 'AVAILABLE' && item.quantity > 0 && (
                                                                        <Button variant="ghost" size="sm" onClick={(e) => handleRequestItem(item, e)} title="Request This Item" className="flex-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:scale-105 transition-transform">
                                                                            <FileText size={14} className="mr-1" />
                                                                            {!isStaffPlus && <span className="text-xs">Request</span>}
                                                                        </Button>
                                                                    )}
                                                                    {item.status !== 'AVAILABLE' && item.quantity > 0 && (
                                                                        <span className="flex-1 flex items-center justify-center text-[10px] text-gray-400 dark:text-gray-500 italic">
                                                                            {item.status === 'IN_USE' ? '🔵 In Use' : item.status === 'MAINTENANCE' ? '🟡 Maintenance' : item.status === 'RETIRED' ? '⚫ Retired' : ''}
                                                                        </span>
                                                                    )}
                                                                    <FacultyOnly>
                                                                        {getStatusActions(item).map((action, idx) => {
                                                                            const ActionIcon = action.icon;
                                                                            return (
                                                                                <Button key={idx} variant="ghost" size="sm" onClick={action.onClick} title={action.label} className={`flex-1 hover:scale-105 transition-transform ${action.color}`}>
                                                                                    <ActionIcon size={14} />
                                                                                </Button>
                                                                            );
                                                                        })}
                                                                        <Button variant="ghost" size="sm" onClick={() => { setQrItem(item); setQrModalOpen(true); }} title="QR Code" className="flex-1 hover:scale-105 transition-transform"><QrCode size={14} className="text-primary" /></Button>
                                                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(item)} title="Edit" className="flex-1 hover:scale-105 transition-transform"><Edit size={14} /></Button>
                                                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} title="Delete" className="flex-1 hover:scale-105 transition-transform"><Trash2 size={14} className="text-red-500" /></Button>
                                                                    </FacultyOnly>
                                                                </div>
                                                            </div>
                                                        </Card>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            /* ===== TABLE VIEW ===== */
                                            <Table>
                                                <Table.Header>
                                                    <Table.Row>
                                                        <Table.Head>Item</Table.Head>
                                                        <Table.Head>Category</Table.Head>
                                                        <Table.Head>Quantity</Table.Head>
                                                        <Table.Head>Status</Table.Head>
                                                        <Table.Head>Location</Table.Head>
                                                        <Table.Head className="text-right"><FacultyOnly>Actions</FacultyOnly></Table.Head>
                                                    </Table.Row>
                                                </Table.Header>
                                                <Table.Body>
                                                    {groupItems.map(item => (
                                                        <Table.Row key={item.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200" onClick={() => setDetailItem(item)}>
                                                            <Table.Cell>
                                                                <div className="flex items-center gap-3">
                                                                    {showImages && (
                                                                        item.imageUrl ? (
                                                                            <img src={resolveImageUrl(item.imageUrl)} alt={item.name} className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-gray-600 transition-transform duration-200 hover:scale-110" onError={(e) => { e.target.style.display = 'none'; }} />
                                                                        ) : (
                                                                            <span className="text-xl">{categoryIcons[item.category] || '📋'}</span>
                                                                        )
                                                                    )}
                                                                    <span className="font-medium hover:text-primary transition-colors">{item.name}</span>
                                                                </div>
                                                            </Table.Cell>
                                                            <Table.Cell>
                                                                <span className="inline-flex items-center gap-1 text-sm">
                                                                    {categoryIcons[item.category] || '📋'} {item.category}
                                                                </span>
                                                            </Table.Cell>
                                                            <Table.Cell>
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`font-semibold ${item.quantity === 0 ? 'text-red-600 dark:text-red-400' : item.quantity <= 5 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                                                        {item.quantity}
                                                                    </span>
                                                                </div>
                                                            </Table.Cell>
                                                            <Table.Cell>
                                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[item.status]}`}>
                                                                    {item.status}
                                                                </span>
                                                            </Table.Cell>
                                                            <Table.Cell>
                                                                <div className="flex items-center gap-1 text-sm">
                                                                    <MapPin size={12} className="text-gray-400" />
                                                                    {item.location || '—'}
                                                                </div>
                                                            </Table.Cell>
                                                            <Table.Cell onClick={(e) => e.stopPropagation()}>
                                                                <div className="flex justify-end gap-1">
                                                                    {item.status === 'AVAILABLE' && item.quantity > 0 && (
                                                                        <Button variant="ghost" size="sm" onClick={(e) => handleRequestItem(item, e)} title="Request This Item" className="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"><FileText size={16} /></Button>
                                                                    )}
                                                                    <FacultyOnly>
                                                                        {getStatusActions(item).map((action, idx) => {
                                                                            const ActionIcon = action.icon;
                                                                            return (
                                                                                <Button key={idx} variant="ghost" size="sm" onClick={action.onClick} title={action.label} className={action.color}>
                                                                                    <ActionIcon size={16} />
                                                                                </Button>
                                                                            );
                                                                        })}
                                                                        <Button variant="ghost" size="sm" onClick={() => { setQrItem(item); setQrModalOpen(true); }} title="QR Code"><QrCode size={16} className="text-primary" /></Button>
                                                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(item)} title="Edit"><Edit size={16} /></Button>
                                                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} title="Delete"><Trash2 size={16} className="text-red-500" /></Button>
                                                                    </FacultyOnly>
                                                                </div>
                                                            </Table.Cell>
                                                        </Table.Row>
                                                    ))}
                                                </Table.Body>
                                            </Table>
                                        )
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Summary footer */}
                {!loading && filteredItems.length > 0 && (
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                        <p>Showing {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''} across {stockGroups.filter(g => filteredItems.some(g.filter)).length} group{stockGroups.filter(g => filteredItems.some(g.filter)).length !== 1 ? 's' : ''}</p>
                    </div>
                )}

                {/* Add/Edit Modal */}
                <Modal
                    isOpen={isAddModalOpen}
                    onClose={() => {
                        setIsAddModalOpen(false);
                        setEditingItem(null);
                        setFormData({ name: '', category: 'ELECTRONICS', quantity: 1, status: 'AVAILABLE', location: '', description: '', imageUrl: null, accessLevel: 'STUDENT', isReturnable: true, borrowDuration: '', borrowDurationUnit: 'DAYS' });
                    }}
                    title={editingItem ? 'Edit Item' : 'Add New Item'}
                    description={editingItem ? 'Update the inventory item details' : 'Add a new item to your inventory'}
                >
                    <form onSubmit={handleSubmit} className="space-y-2.5">
                        <Input
                            label="Item Name"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Enter item name"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase ml-1">Category</label>
                                <select
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                >
                                    <option value="ELECTRONICS">Electronics</option>
                                    <option value="FURNITURE">Furniture</option>
                                    <option value="EQUIPMENT">Equipment</option>
                                    <option value="SUPPLIES">Supplies</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                            <Input
                                label="Quantity"
                                type="number"
                                min="1"
                                required
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase ml-1">Status</label>
                                <select
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="AVAILABLE">Available</option>
                                    <option value="IN_USE">In Use</option>
                                    <option value="MAINTENANCE">Maintenance</option>
                                    <option value="RETIRED">Retired</option>
                                </select>
                            </div>
                            <Input
                                label="Location"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                placeholder="Storage location"
                            />
                        </div>
                        <ImageUpload
                            value={formData.imageUrl}
                            onChange={(imageUrl) => setFormData({ ...formData, imageUrl })}
                            compact
                        />
                        <label className="flex items-center gap-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isReturnable}
                                onChange={(e) => setFormData({ ...formData, isReturnable: e.target.checked, borrowDuration: e.target.checked ? formData.borrowDuration : '' })}
                                className="w-4 h-4 rounded text-primary"
                            />
                            <div>
                                <span className="text-sm font-medium text-gray-700">Returnable Item</span>
                                <p className="text-xs text-gray-500">Borrowers must return this item</p>
                            </div>
                        </label>
                        {formData.isReturnable && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase ml-1">Borrow Duration</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                                        value={formData.borrowDuration}
                                        onChange={(e) => setFormData({ ...formData, borrowDuration: parseInt(e.target.value) || '' })}
                                        placeholder="e.g. 3"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-gray-500 uppercase ml-1">Unit</label>
                                    <select
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                                        value={formData.borrowDurationUnit}
                                        onChange={(e) => setFormData({ ...formData, borrowDurationUnit: e.target.value })}
                                    >
                                        <option value="MINUTES">Minutes</option>
                                        <option value="HOURS">Hours</option>
                                        <option value="DAYS">Days</option>
                                        <option value="MONTHS">Months</option>
                                    </select>
                                </div>
                            </div>
                        )}
                        <div className="flex gap-3 pt-3">
                            <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsAddModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1">
                                {editingItem ? 'Update' : 'Add'} Item
                            </Button>
                        </div>
                    </form>
                </Modal>

                {/* QR Code Modal */}
                <QRCodeModal
                    isOpen={qrModalOpen}
                    onClose={() => {
                        setQrModalOpen(false);
                        setQrItem(null);
                    }}
                    item={qrItem}
                />

                {/* Delete Confirmation Modal */}
                <Modal
                    isOpen={deleteModalOpen}
                    onClose={() => {
                        setDeleteModalOpen(false);
                        setDeleteItemId(null);
                    }}
                    title="Delete Item"
                    description="Are you sure you want to delete this item? This action cannot be undone."
                    size="sm"
                >
                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            className="flex-1"
                            onClick={() => {
                                setDeleteModalOpen(false);
                                setDeleteItemId(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            className="flex-1"
                            onClick={handleDeleteConfirm}
                        >
                            <Trash2 size={16} className="mr-1" />
                            Delete
                        </Button>
                    </div>
                </Modal>

                {/* ===== Item Detail Modal ===== */}
                <Modal
                    isOpen={!!detailItem}
                    onClose={() => setDetailItem(null)}
                    title="Item Details"
                    size="md"
                >
                    {detailItem && (
                        <div className="space-y-4" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
                            {/* Item Image / Icon Header */}
                            <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800">
                                {detailItem.imageUrl ? (
                                    <img
                                        src={resolveImageUrl(detailItem.imageUrl)}
                                        alt={detailItem.name}
                                        className="w-full h-48 object-cover"
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                ) : (
                                    <div className="w-full h-36 flex items-center justify-center">
                                        <span className="text-6xl">{categoryIcons[detailItem.category] || '📋'}</span>
                                    </div>
                                )}
                                {/* Status badge overlay */}
                                <div className="absolute top-3 right-3">
                                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-lg ${statusColors[detailItem.status]}`}>
                                        {detailItem.status}
                                    </span>
                                </div>
                            </div>

                            {/* Name + Category */}
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{detailItem.name}</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-1">
                                    <span>{categoryIcons[detailItem.category] || '📋'}</span>
                                    {detailItem.category}
                                </p>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* Location */}
                                <div className="flex items-center gap-2.5 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                    <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-800/40 flex items-center justify-center">
                                        <MapPin size={18} className="text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Location</p>
                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                            {detailItem.location || 'Not specified'}
                                        </p>
                                    </div>
                                </div>

                                {/* Quantity */}
                                <div className={`flex items-center gap-2.5 p-3 rounded-xl ${detailItem.quantity <= 5 && detailItem.quantity > 0
                                    ? 'bg-amber-50 dark:bg-amber-900/20'
                                    : detailItem.quantity === 0
                                        ? 'bg-red-50 dark:bg-red-900/20'
                                        : 'bg-emerald-50 dark:bg-emerald-900/20'
                                    }`}>
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${detailItem.quantity <= 5 && detailItem.quantity > 0
                                        ? 'bg-amber-100 dark:bg-amber-800/40'
                                        : detailItem.quantity === 0
                                            ? 'bg-red-100 dark:bg-red-800/40'
                                            : 'bg-emerald-100 dark:bg-emerald-800/40'
                                        }`}>
                                        <Package size={18} className={`${detailItem.quantity <= 5 && detailItem.quantity > 0
                                            ? 'text-amber-600'
                                            : detailItem.quantity === 0
                                                ? 'text-red-600'
                                                : 'text-emerald-600'
                                            }`} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Quantity</p>
                                        <div className="flex items-center gap-1.5">
                                            <p className={`text-sm font-bold ${detailItem.quantity <= 5 ? 'text-red-600' : 'text-gray-800 dark:text-gray-100'
                                                }`}>{detailItem.quantity}</p>
                                            {detailItem.quantity <= 5 && detailItem.quantity > 0 && (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded font-bold">LOW</span>
                                            )}
                                            {detailItem.quantity === 0 && (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-red-200 text-red-800 rounded font-bold">OUT</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Returnable */}
                                <div className={`flex items-center gap-2.5 p-3 rounded-xl ${detailItem.isReturnable
                                    ? 'bg-purple-50 dark:bg-purple-900/20'
                                    : 'bg-gray-50 dark:bg-gray-800/50'
                                    }`}>
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${detailItem.isReturnable
                                        ? 'bg-purple-100 dark:bg-purple-800/40'
                                        : 'bg-gray-200 dark:bg-gray-700'
                                        }`}>
                                        <RotateCcw size={18} className={detailItem.isReturnable ? 'text-purple-600' : 'text-gray-400'} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Returnable</p>
                                        <p className={`text-sm font-semibold ${detailItem.isReturnable ? 'text-purple-700 dark:text-purple-300' : 'text-gray-500'
                                            }`}>
                                            {detailItem.isReturnable ? 'Yes' : 'No'}
                                        </p>
                                    </div>
                                </div>

                                {/* Borrow Duration */}
                                {detailItem.isReturnable && detailItem.borrowDuration && (
                                    <div className="flex items-center gap-2.5 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                                        <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-800/40 flex items-center justify-center">
                                            <Timer size={18} className="text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Borrow Limit</p>
                                            <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                                                {detailItem.borrowDuration} {detailItem.borrowDurationUnit?.toLowerCase()}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            {detailItem.description && (
                                <div className="p-3 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-700/50 rounded-xl">
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold mb-1">Description</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                        {detailItem.description}
                                    </p>
                                </div>
                            )}

                            {/* Status Metadata */}
                            {(detailItem.statusNote || detailItem.statusChangedAt || detailItem.maintenanceEta) && (
                                <div className="p-3 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-700/30 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700/50">
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold flex items-center gap-1">
                                        <Clock size={10} /> Status History
                                    </p>
                                    {detailItem.statusNote && (
                                        <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                                            "​{detailItem.statusNote}"
                                        </p>
                                    )}
                                    {detailItem.statusChangedByName && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Changed by <span className="font-semibold text-gray-700 dark:text-gray-300">{detailItem.statusChangedByName}</span>
                                            {detailItem.statusChangedAt && (
                                                <> on {new Date(detailItem.statusChangedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</>
                                            )}
                                        </p>
                                    )}
                                    {detailItem.maintenanceEta && detailItem.status === 'MAINTENANCE' && (
                                        <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                            <Calendar size={14} className="text-amber-600" />
                                            <div>
                                                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase">Expected Back</p>
                                                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                                                    {new Date(detailItem.maintenanceEta).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    {new Date(detailItem.maintenanceEta) > new Date() && (
                                                        <span className="ml-1 text-xs font-normal text-amber-500">
                                                            ({Math.ceil((new Date(detailItem.maintenanceEta) - new Date()) / (1000 * 60 * 60 * 24))} days left)
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Detail Modal — Quick Actions (staff+) */}
                            {isStaffPlus && detailItem.status !== 'AVAILABLE' && (
                                <div className="flex gap-2">
                                    {getStatusActions(detailItem).map((action, idx) => {
                                        const ActionIcon = action.icon;
                                        return (
                                            <button
                                                key={idx}
                                                onClick={(e) => { action.onClick(e); setDetailItem(null); }}
                                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${action.color} bg-opacity-10`}
                                                style={{ backgroundColor: 'var(--tw-bg-opacity, 0.05)' }}
                                            >
                                                <ActionIcon size={16} />
                                                {action.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Close Button */}
                            <button
                                onClick={() => setDetailItem(null)}
                                className="w-full py-2.5 rounded-xl bg-primary/10 text-primary font-semibold text-sm hover:bg-primary/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </Modal>

                {/* ===== Status Change Modal ===== */}
                <Modal
                    isOpen={statusModal.open}
                    onClose={() => setStatusModal({ open: false, item: null, targetStatus: '' })}
                    title={`Change Status to ${statusModal.targetStatus?.replace('_', ' ')}`}
                    size="sm"
                >
                    <div className="space-y-4 pt-2">
                        {/* Status badge preview */}
                        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                            <span className="text-sm text-gray-600 dark:text-gray-300">Item:</span>
                            <span className="font-semibold text-sm text-gray-900 dark:text-white">{statusModal.item?.name}</span>
                            <ArrowRight size={14} className="text-gray-400" />
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[statusModal.targetStatus] || 'bg-gray-100 text-gray-700'}`}>
                                {statusModal.targetStatus?.replace('_', ' ')}
                            </span>
                        </div>

                        {/* Reason / Note */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                Reason / Note <span className="text-gray-400">(optional)</span>
                            </label>
                            <textarea
                                value={statusNote}
                                onChange={(e) => setStatusNote(e.target.value)}
                                rows={3}
                                placeholder={statusModal.targetStatus === 'MAINTENANCE' ? 'e.g., Screen cracked — sent for repair' : statusModal.targetStatus === 'RETIRED' ? 'e.g., Obsolete, beyond economical repair' : 'Enter a reason...'}
                                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            />
                        </div>

                        {/* Maintenance ETA date picker */}
                        {statusModal.targetStatus === 'MAINTENANCE' && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                                    <Calendar size={12} className="inline mr-1" />
                                    Estimated Return Date <span className="text-gray-400">(optional)</span>
                                </label>
                                <input
                                    type="datetime-local"
                                    value={maintenanceEta}
                                    onChange={(e) => setMaintenanceEta(e.target.value)}
                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-3 pt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                className="flex-1"
                                onClick={() => setStatusModal({ open: false, item: null, targetStatus: '' })}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleStatusChange}
                            >
                                Confirm Change
                            </Button>
                        </div>
                    </div>
                </Modal>
            </div>
        </>
    );
};

export default Inventory;
