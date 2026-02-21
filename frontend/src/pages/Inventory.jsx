import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Package, Edit, Trash2, Download, Printer, AlertTriangle, QrCode, FileText, MapPin, Clock, Timer, Eye, ArrowRight, RotateCcw, X } from 'lucide-react';
import { Button, Input, Card, Modal, Table, ImageUpload, QRCodeModal } from '../components/ui';
import { useInventory } from '../hooks';
import { FacultyOnly, StaffOnly } from '../components/auth';
import { exportCSV, exportPDF } from '../utils/exportUtils';
import useUIStore from '../store/uiStore';

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

// Resolve relative image URLs from Django backend
const BACKEND_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000';
const resolveImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

const Inventory = () => {
    const { inventory, loading, stats, fetchInventory, addItem, updateItem, deleteItem } = useInventory();
    const { viewMode, itemsPerPage, showImages } = useUIStore();
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        category: 'ELECTRONICS',
        quantity: 1,
        status: 'AVAILABLE',
        location: '',
        description: '',
        imageUrl: null,
        accessLevel: 'STUDENT',
        isReturnable: true,
        borrowDuration: '',
        borrowDurationUnit: 'DAYS',
    });
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [qrItem, setQrItem] = useState(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteItemId, setDeleteItemId] = useState(null);
    const [detailItem, setDetailItem] = useState(null);

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
        setFormData({ name: '', category: 'ELECTRONICS', quantity: 1, status: 'AVAILABLE', location: '', description: '', imageUrl: null, accessLevel: 'STUDENT', isReturnable: true, borrowDuration: '', borrowDurationUnit: 'DAYS' });
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                        <AlertTriangle size={20} className="text-amber-500 mb-2" />
                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.maintenance}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Maintenance</p>
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

                {/* Items Display — Table or Card View */}
                {viewMode === 'card' ? (
                    /* ===== CARD VIEW ===== */
                    <div>
                        {loading ? (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>
                        ) : inventory.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-400">No items found</div>
                        ) : (
                            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                                {inventory
                                    .filter(item => {
                                        const matchSearch = !search || item.name?.toLowerCase().includes(search.toLowerCase()) || item.category?.toLowerCase().includes(search.toLowerCase());
                                        const matchCategory = !filterCategory || item.category === filterCategory;
                                        const matchStatus = !filterStatus || item.status === filterStatus;
                                        return matchSearch && matchCategory && matchStatus;
                                    })
                                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                    .map((item) => (
                                        <Card key={item.id} className="relative overflow-hidden p-0 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group/card" onClick={() => setDetailItem(item)}>
                                            {/* Card Header — Image or Icon */}
                                            {showImages && (
                                                <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center relative overflow-hidden">
                                                    {item.imageUrl ? (
                                                        <img src={resolveImageUrl(item.imageUrl)} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110" onError={(e) => { e.target.style.display = 'none'; }} />
                                                    ) : (
                                                        <span className="text-4xl transition-transform duration-300 group-hover/card:scale-110">{categoryIcons[item.category] || '📋'}</span>
                                                    )}
                                                    {/* Hover overlay */}
                                                    <div className="absolute inset-0 bg-primary/0 group-hover/card:bg-primary/10 transition-colors duration-300 flex items-center justify-center">
                                                        <Eye size={24} className="text-white opacity-0 group-hover/card:opacity-80 transition-all duration-300 drop-shadow-lg" />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Card Body */}
                                            <div className="p-4 space-y-3">
                                                {/* Name + Category */}
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover/card:text-primary transition-colors duration-200">{item.name}</h3>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                                                        {categoryIcons[item.category] || '📋'} {item.category}
                                                    </p>
                                                </div>

                                                {/* Status + Quantity Row */}
                                                <div className="flex items-center justify-between">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[item.status]}`}>
                                                        {item.status}
                                                    </span>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`text-sm font-bold ${item.quantity <= 5 ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}`}>
                                                            Qty: {item.quantity}
                                                        </span>
                                                        {item.quantity <= 5 && item.quantity > 0 && (
                                                            <AlertTriangle size={14} className="text-red-500" />
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Location */}
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                                                    <MapPin size={12} />
                                                    {item.location || 'No location'}
                                                </p>

                                                {/* View Details hint */}
                                                <div className="flex items-center justify-center gap-1.5 text-xs text-primary/60 group-hover/card:text-primary transition-colors duration-200 pt-1">
                                                    <span>View Details</span>
                                                    <ArrowRight size={12} className="transition-transform duration-200 group-hover/card:translate-x-1" />
                                                </div>

                                                {/* Actions */}
                                                <FacultyOnly>
                                                    <div className="flex gap-1 pt-2 border-t border-gray-100 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                                                        <Button variant="ghost" size="sm" onClick={() => { setQrItem(item); setQrModalOpen(true); }} title="QR Code" className="flex-1 hover:scale-105 transition-transform">
                                                            <QrCode size={14} className="text-primary" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(item)} title="Edit" className="flex-1 hover:scale-105 transition-transform">
                                                            <Edit size={14} />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} title="Delete" className="flex-1 hover:scale-105 transition-transform">
                                                            <Trash2 size={14} className="text-red-500" />
                                                        </Button>
                                                    </div>
                                                </FacultyOnly>
                                            </div>
                                        </Card>
                                    ))}
                            </div>
                        )}
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
                            {loading ? (
                                <Table.Empty message="Loading..." colSpan={6} />
                            ) : inventory.length === 0 ? (
                                <Table.Empty message="No items found" colSpan={6} />
                            ) : (
                                inventory
                                    .filter(item => {
                                        const matchSearch = !search || item.name?.toLowerCase().includes(search.toLowerCase()) || item.category?.toLowerCase().includes(search.toLowerCase());
                                        const matchCategory = !filterCategory || item.category === filterCategory;
                                        const matchStatus = !filterStatus || item.status === filterStatus;
                                        return matchSearch && matchCategory && matchStatus;
                                    })
                                    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                    .map((item) => (
                                        <Table.Row key={item.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200" onClick={() => setDetailItem(item)}>
                                            <Table.Cell>
                                                <div className="flex items-center gap-3">
                                                    {showImages && (
                                                        item.imageUrl ? (
                                                            <img
                                                                src={resolveImageUrl(item.imageUrl)}
                                                                alt={item.name}
                                                                className="w-10 h-10 rounded-lg object-cover border border-gray-200 transition-transform duration-200 hover:scale-110"
                                                                onError={(e) => { e.target.style.display = 'none'; }}
                                                            />
                                                        ) : (
                                                            <span className="text-xl">{categoryIcons[item.category] || '📋'}</span>
                                                        )
                                                    )}
                                                    <span className="font-medium hover:text-primary transition-colors">{item.name}</span>
                                                </div>
                                            </Table.Cell>
                                            <Table.Cell>{item.category}</Table.Cell>
                                            <Table.Cell>
                                                <div className="flex items-center gap-2">
                                                    <span className={item.quantity <= 5 ? 'font-bold text-red-600' : ''}>
                                                        {item.quantity}
                                                    </span>
                                                    {item.quantity <= 5 && item.quantity > 0 && (
                                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                                            <AlertTriangle size={12} />
                                                            Low
                                                        </span>
                                                    )}
                                                    {item.quantity === 0 && (
                                                        <span className="px-2 py-0.5 bg-gray-800 text-white rounded-full text-xs font-medium">
                                                            Out
                                                        </span>
                                                    )}
                                                </div>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[item.status]}`}>
                                                    {item.status}
                                                </span>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <div className="flex items-center gap-1">
                                                    <MapPin size={12} className="text-gray-400" />
                                                    {item.location}
                                                </div>
                                            </Table.Cell>
                                            <FacultyOnly>
                                                <Table.Cell onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setQrItem(item);
                                                                setQrModalOpen(true);
                                                            }}
                                                            title="Generate QR Code"
                                                            className="hover:scale-110 transition-transform"
                                                        >
                                                            <QrCode size={16} className="text-primary" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(item)} className="hover:scale-110 transition-transform">
                                                            <Edit size={16} />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="hover:scale-110 transition-transform">
                                                            <Trash2 size={16} className="text-red-500" />
                                                        </Button>
                                                    </div>
                                                </Table.Cell>
                                            </FacultyOnly>
                                        </Table.Row>
                                    ))
                            )}
                        </Table.Body>
                    </Table>
                )}

                {/* Pagination */}
                {(() => {
                    const filtered = inventory.filter(item => {
                        const matchSearch = !search || item.name?.toLowerCase().includes(search.toLowerCase()) || item.category?.toLowerCase().includes(search.toLowerCase());
                        const matchCategory = !filterCategory || item.category === filterCategory;
                        const matchStatus = !filterStatus || item.status === filterStatus;
                        return matchSearch && matchCategory && matchStatus;
                    });
                    const totalPages = Math.ceil(filtered.length / itemsPerPage);
                    if (totalPages <= 1) return null;
                    return (
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filtered.length)}–{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} items
                            </p>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
                                >
                                    Prev
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${currentPage === i + 1
                                            ? 'bg-primary text-white'
                                            : 'border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    );
                })()}

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

                {/* Detail Modal Animation */}
                <style>{`
                    @keyframes fadeInUp {
                        from { opacity: 0; transform: translateY(12px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}</style>
            </div>
        </>
    );
};

export default Inventory;
