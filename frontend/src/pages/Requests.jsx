import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Check, X, Clock, CheckCircle, Package, Lock, Eye, FileText, User, Calendar, MapPin, RotateCcw, Trash2, AlertTriangle, Timer, Ban, ChevronDown, ChevronRight } from 'lucide-react';
import { Button, Input, Card, Modal, Table, CommentBox } from '../components/ui';
import { StaffOnly } from '../components/auth';
import { useRequests, useInventory } from '../hooks';
import { useIsMobile } from '../hooks';
import useAuthStore from '../store/authStore';
import { hasMinRole, ROLES } from '../utils/roles';
import { useLocation } from 'react-router-dom';

const statusColors = {
    PENDING: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red-700',
    COMPLETED: 'bg-blue-100 text-blue-700',
    RETURNED: 'bg-purple-100 text-purple-700',
    CANCELLED: 'bg-gray-100 text-gray-700',
};

const statusIcons = {
    PENDING: Clock,
    APPROVED: CheckCircle,
    REJECTED: X,
    COMPLETED: Check,
    RETURNED: RotateCcw,
    CANCELLED: X,
};

// Responsive group body — cards on mobile, table on desktop
const RequestGroupBody = ({ groupRequests, user, isStaffPlus, handleApprove, handleRejectClick, handleCancelClick, returnRequest, setDetailRequest, setDetailModalOpen, getComments, setDetailComments }) => {
    const isMobile = useIsMobile();
    const priorityColor = { HIGH: 'text-red-600 bg-red-50 dark:bg-red-900/20', LOW: 'text-gray-500 bg-gray-50 dark:bg-gray-700', NORMAL: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' };

    if (isMobile) {
        return (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {groupRequests.map(request => {
                    const isOwnRequest = request.requestedById === user?.id;
                    const prio = (request.priority || 'NORMAL').toUpperCase();
                    return (
                        <div key={request.id} className="p-3 space-y-2">
                            {/* Row 1: Item name + priority */}
                            <div className="flex items-center justify-between gap-2">
                                <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{request.itemName}</p>
                                <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${priorityColor[prio] || priorityColor.NORMAL}`}>{prio}</span>
                            </div>
                            {/* Row 2: Meta info */}
                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1"><User size={12} />{request.requestedBy}</span>
                                <span className="flex items-center gap-1"><Calendar size={12} />{request.requestDate}</span>
                                <span>×{request.quantity}</span>
                            </div>
                            {/* Row 3: Purpose */}
                            {request.purpose && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{request.purpose}</p>}
                            {/* Row 4: Actions */}
                            <div className="flex gap-1 pt-1">
                                <Button variant="ghost" size="sm" onClick={async () => { setDetailRequest(request); setDetailModalOpen(true); const cmts = await getComments(request.id); setDetailComments(cmts); }} className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20" title="View"><Eye size={14} /><span className="text-xs ml-1">View</span></Button>
                                {request.status === 'PENDING' && isOwnRequest && (
                                    <Button variant="ghost" size="sm" onClick={() => handleCancelClick(request.id)} className="text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" title="Cancel"><Ban size={14} /></Button>
                                )}
                                {request.status === 'PENDING' && isStaffPlus && !isOwnRequest && (
                                    <>
                                        <Button variant="ghost" size="sm" onClick={() => handleApprove(request.id)} className="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" title="Approve"><Check size={14} /><span className="text-xs ml-1">Approve</span></Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleRejectClick(request.id)} className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Reject"><X size={14} /></Button>
                                    </>
                                )}
                                {(request.status === 'APPROVED' || request.status === 'COMPLETED') && request.isReturnable && isStaffPlus && (
                                    <Button variant="ghost" size="sm" onClick={() => returnRequest(request.id)} className="text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20" title="Return"><RotateCcw size={14} /></Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    // Desktop table view
    return (
        <Table>
            <Table.Header>
                <Table.Row>
                    <Table.Head>Item</Table.Head>
                    <Table.Head>Requested By</Table.Head>
                    <Table.Head>Qty</Table.Head>
                    <Table.Head>Purpose</Table.Head>
                    <Table.Head>Date</Table.Head>
                    <Table.Head>Priority</Table.Head>
                    <Table.Head className="text-right">Actions</Table.Head>
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {groupRequests.map(request => {
                    const isOwnRequest = request.requestedById === user?.id;
                    const prio = (request.priority || 'NORMAL').toUpperCase();
                    return (
                        <Table.Row key={request.id}>
                            <Table.Cell className="font-medium">{request.itemName}</Table.Cell>
                            <Table.Cell>{request.requestedBy}</Table.Cell>
                            <Table.Cell>{request.quantity}</Table.Cell>
                            <Table.Cell className="max-w-[180px] truncate">{request.purpose}</Table.Cell>
                            <Table.Cell className="text-xs">{request.requestDate}</Table.Cell>
                            <Table.Cell>
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${priorityColor[prio] || priorityColor.NORMAL}`}>
                                    {prio}
                                </span>
                            </Table.Cell>
                            <Table.Cell>
                                <div className="flex justify-end gap-1">
                                    <Button variant="ghost" size="sm" onClick={async () => { setDetailRequest(request); setDetailModalOpen(true); const cmts = await getComments(request.id); setDetailComments(cmts); }} className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20" title="View Details"><Eye size={16} /></Button>
                                    {request.status === 'PENDING' && isOwnRequest && (
                                        <Button variant="ghost" size="sm" onClick={() => handleCancelClick(request.id)} className="text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" title="Cancel Request"><Ban size={16} /></Button>
                                    )}
                                    {request.status === 'PENDING' && (
                                        <StaffOnly>
                                            {!isOwnRequest && (
                                                <>
                                                    <Button variant="ghost" size="sm" onClick={() => handleApprove(request.id)} className="text-emerald-600 hover:bg-emerald-50" title="Approve"><Check size={16} /></Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleRejectClick(request.id)} className="text-red-600 hover:bg-red-50" title="Reject"><X size={16} /></Button>
                                                </>
                                            )}
                                        </StaffOnly>
                                    )}
                                    {(request.status === 'APPROVED' || request.status === 'COMPLETED') && request.isReturnable && (
                                        <StaffOnly>
                                            <Button variant="ghost" size="sm" onClick={() => returnRequest(request.id)} className="text-purple-600 hover:bg-purple-50" title="Return Item"><RotateCcw size={16} /></Button>
                                        </StaffOnly>
                                    )}
                                </div>
                            </Table.Cell>
                        </Table.Row>
                    );
                })}
            </Table.Body>
        </Table>
    );
};

const Requests = () => {
    const isMobile = useIsMobile();
    const {
        requests,
        loading,
        stats,
        fetchRequests,
        approveRequest,
        rejectRequest,
        cancelRequest,
        returnRequest,
        clearCompleted,
        createRequest,
        addComment,
        getComments,
        checkOverdue
    } = useRequests();
    const { getAccessibleItems, fetchInventory } = useInventory();
    const { user } = useAuthStore();
    const location = useLocation();

    // F-01: View mode — Students default to "mine", Staff+ to "all"
    const isStaffPlus = hasMinRole(user?.role, ROLES.STAFF);
    const [viewMode, setViewMode] = useState(isStaffPlus ? 'all' : 'mine');

    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [selectedRequestId, setSelectedRequestId] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    // F-02: Cancel confirmation modal
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [cancelRequestId, setCancelRequestId] = useState(null);

    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [detailRequest, setDetailRequest] = useState(null);
    const [detailComments, setDetailComments] = useState([]);
    const [commentLoading, setCommentLoading] = useState(false);

    // Collapsed status sections
    const [collapsedSections, setCollapsedSections] = useState({});

    const [itemSearch, setItemSearch] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);

    // Load saved preferences from Settings → Preferences tab
    const savedPrefsKey = user?.id ? `user-prefs-${user.id}` : null;
    const savedPrefs = useMemo(() => {
        if (!savedPrefsKey) return {};
        try {
            const raw = localStorage.getItem(savedPrefsKey);
            return raw ? JSON.parse(raw) : {};
        } catch { return {}; }
    }, [savedPrefsKey]);

    const [formData, setFormData] = useState({
        itemName: '',
        item: null,
        quantity: savedPrefs.defaultQuantity || 1,
        purpose: savedPrefs.defaultPurpose || '',
        priority: savedPrefs.defaultPriority || 'NORMAL',
    });
    const [formError, setFormError] = useState('');

    useEffect(() => {
        fetchRequests({ search, status: filterStatus });
    }, [search, filterStatus, fetchRequests]);

    // Auto-trigger overdue check on page load (all authenticated users)
    useEffect(() => {
        checkOverdue();
    }, [checkOverdue]);

    // Fetch inventory items so the item search dropdown works
    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    // F-04: Handle prefilled item from Items page navigation
    useEffect(() => {
        const prefill = location.state?.prefillItem;
        if (prefill) {
            setSelectedItem(prefill);
            setItemSearch(prefill.name);
            setFormData(prev => ({ ...prev, itemName: prefill.name, item: prefill.id }));
            setIsModalOpen(true);
            // Clear state so it doesn't re-trigger on navigation
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const filteredItems = useMemo(() => {
        if (!user?.role) return [];
        return getAccessibleItems(user.role, itemSearch);
    }, [user?.role, itemSearch, getAccessibleItems]);

    // F-01: Filter requests based on view mode, search, and status filter
    const displayedRequests = useMemo(() => {
        let result = requests;
        if (viewMode === 'mine') {
            result = result.filter(r => r.requestedById === user?.id);
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(r =>
                (r.itemName || '').toLowerCase().includes(q) ||
                (r.requestedBy || '').toLowerCase().includes(q) ||
                (r.purpose || '').toLowerCase().includes(q)
            );
        }
        if (filterStatus) {
            result = result.filter(r => r.status === filterStatus);
        }
        return result;
    }, [requests, viewMode, user?.id, search, filterStatus]);

    // Stats for the current view
    const displayedStats = useMemo(() => {
        const items = displayedRequests;
        return {
            total: items.length,
            pending: items.filter(r => r.status === 'PENDING').length,
            approved: items.filter(r => r.status === 'APPROVED').length,
            completed: items.filter(r => r.status === 'COMPLETED').length,
            rejected: items.filter(r => r.status === 'REJECTED').length,
            overdue: items.filter(r => r.isOverdue).length,
        };
    }, [displayedRequests]);

    const handleApprove = async (id) => {
        await approveRequest(id);
    };

    const handleRejectClick = (id) => {
        setSelectedRequestId(id);
        setRejectModalOpen(true);
    };

    const handleRejectConfirm = async () => {
        await rejectRequest(selectedRequestId, rejectReason);
        setRejectModalOpen(false);
        setRejectReason('');
        setSelectedRequestId(null);
    };

    const handleSelectItem = (inventoryItem) => {
        setSelectedItem(inventoryItem);
        setItemSearch(inventoryItem.name);
        setFormData({ ...formData, itemName: inventoryItem.name, item: inventoryItem.id });
        setShowDropdown(false);
        setFormError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedItem) {
            setFormError('Please select an item from the list');
            return;
        }
        setFormError('');
        const payload = {
            item: formData.item,
            itemName: formData.itemName,
            quantity: formData.quantity,
            purpose: formData.purpose,
            priority: formData.priority,
        };
        await createRequest(payload);
        setIsModalOpen(false);
        setFormData({ itemName: '', item: null, quantity: savedPrefs.defaultQuantity || 1, purpose: savedPrefs.defaultPurpose || '', priority: savedPrefs.defaultPriority || 'NORMAL' });
        setItemSearch('');
        setSelectedItem(null);
    };

    // F-02: Cancel handlers
    const handleCancelClick = (id) => {
        setCancelRequestId(id);
        setCancelModalOpen(true);
    };

    const handleCancelConfirm = async () => {
        if (cancelRequestId) {
            await cancelRequest(cancelRequestId);
        }
        setCancelModalOpen(false);
        setCancelRequestId(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Requests</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">Manage borrowing and reservation requests</p>
                </div>
                <div className="flex gap-2">
                    <StaffOnly>
                        <Button variant="outline" icon={Trash2} onClick={() => clearCompleted()} className="text-gray-600">
                            <span className="hidden md:inline">Clear Completed</span>
                        </Button>
                    </StaffOnly>
                    <Button icon={Plus} onClick={() => setIsModalOpen(true)}>
                        <span className="hidden sm:inline">New </span>Request
                    </Button>
                </div>
            </div>

            {/* F-01: View Mode Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
                <button
                    onClick={() => setViewMode('mine')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${viewMode === 'mine'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    My Requests
                    {viewMode === 'mine' && <span className="ml-1.5 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{displayedStats.total}</span>}
                </button>
                {isStaffPlus && (
                    <button
                        onClick={() => setViewMode('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${viewMode === 'all'
                            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        All Requests
                        {viewMode === 'all' && <span className="ml-1.5 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{displayedStats.total}</span>}
                    </button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
                <Card className="text-center py-2.5 md:py-4">
                    <p className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white">{displayedStats.total}</p>
                    <p className="text-[10px] md:text-sm text-gray-500 dark:text-gray-400">Total</p>
                </Card>
                <Card className="text-center py-2.5 md:py-4">
                    <p className="text-lg md:text-2xl font-bold text-amber-600">{displayedStats.pending}</p>
                    <p className="text-[10px] md:text-sm text-gray-500 dark:text-gray-400">Pending</p>
                </Card>
                <Card className="text-center py-2.5 md:py-4">
                    <p className="text-lg md:text-2xl font-bold text-emerald-600">{displayedStats.approved}</p>
                    <p className="text-[10px] md:text-sm text-gray-500 dark:text-gray-400">Approved</p>
                </Card>
                <Card className="text-center py-2.5 md:py-4">
                    <p className="text-lg md:text-2xl font-bold text-blue-600">{displayedStats.completed}</p>
                    <p className="text-[10px] md:text-sm text-gray-500 dark:text-gray-400">Completed</p>
                </Card>
                <Card className="text-center py-2.5 md:py-4">
                    <p className="text-lg md:text-2xl font-bold text-red-600">{displayedStats.rejected}</p>
                    <p className="text-[10px] md:text-sm text-gray-500 dark:text-gray-400">Rejected</p>
                </Card>
                <Card className="text-center py-2.5 md:py-4">
                    <p className="text-lg md:text-2xl font-bold text-orange-600">{displayedStats.overdue}</p>
                    <p className="text-[10px] md:text-sm text-gray-500 dark:text-gray-400">Overdue</p>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            icon={Search}
                            placeholder="Search requests..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="">All Status</option>
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="RETURNED">Returned</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>
                </div>
            </Card>

            {/* Grouped by Status */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                    <span className="ml-3 text-gray-500">Loading requests...</span>
                </div>
            ) : displayedRequests.length === 0 ? (
                <Card className="py-12 text-center">
                    <Package size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm">
                        {viewMode === 'mine'
                            ? "You haven't made any requests yet. Browse items and request what you need!"
                            : 'No requests found'}
                    </p>
                </Card>
            ) : (() => {
                // Define status groups in display order
                const statusGroups = [
                    { key: 'OVERDUE', label: 'Overdue', icon: AlertTriangle, color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50 dark:bg-orange-900/10', borderColor: 'border-orange-200 dark:border-orange-800/30', filter: r => r.isOverdue },
                    { key: 'PENDING', label: 'Pending', icon: Clock, color: 'bg-amber-500', textColor: 'text-amber-700', bgLight: 'bg-amber-50 dark:bg-amber-900/10', borderColor: 'border-amber-200 dark:border-amber-800/30', filter: r => r.status === 'PENDING' && !r.isOverdue },
                    { key: 'APPROVED', label: 'Approved', icon: CheckCircle, color: 'bg-emerald-500', textColor: 'text-emerald-700', bgLight: 'bg-emerald-50 dark:bg-emerald-900/10', borderColor: 'border-emerald-200 dark:border-emerald-800/30', filter: r => r.status === 'APPROVED' && !r.isOverdue },
                    { key: 'COMPLETED', label: 'Completed', icon: Check, color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50 dark:bg-blue-900/10', borderColor: 'border-blue-200 dark:border-blue-800/30', filter: r => r.status === 'COMPLETED' && !r.isOverdue },
                    { key: 'RETURNED', label: 'Returned', icon: RotateCcw, color: 'bg-purple-500', textColor: 'text-purple-700', bgLight: 'bg-purple-50 dark:bg-purple-900/10', borderColor: 'border-purple-200 dark:border-purple-800/30', filter: r => r.status === 'RETURNED' },
                    { key: 'REJECTED', label: 'Rejected', icon: X, color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50 dark:bg-red-900/10', borderColor: 'border-red-200 dark:border-red-800/30', filter: r => r.status === 'REJECTED' },
                    { key: 'CANCELLED', label: 'Cancelled', icon: Ban, color: 'bg-gray-400', textColor: 'text-gray-600', bgLight: 'bg-gray-50 dark:bg-gray-800/30', borderColor: 'border-gray-200 dark:border-gray-700', filter: r => r.status === 'CANCELLED' },
                ];

                return statusGroups.map(group => {
                    const groupRequests = displayedRequests.filter(group.filter);
                    if (groupRequests.length === 0) return null;
                    const isCollapsed = collapsedSections[group.key];
                    const GroupIcon = group.icon;

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
                                        {groupRequests.length}
                                    </span>
                                </div>
                                {isCollapsed ? <ChevronRight size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                            </button>

                            {/* Group body */}
                            {!isCollapsed && (
                                <RequestGroupBody
                                    groupRequests={groupRequests}
                                    user={user}
                                    isStaffPlus={isStaffPlus}
                                    handleApprove={handleApprove}
                                    handleRejectClick={handleRejectClick}
                                    handleCancelClick={handleCancelClick}
                                    returnRequest={returnRequest}
                                    setDetailRequest={setDetailRequest}
                                    setDetailModalOpen={setDetailModalOpen}
                                    getComments={getComments}
                                    setDetailComments={setDetailComments}
                                />
                            )}
                        </div>
                    );
                });
            })()}

            {/* New Request Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="New Request"
                description="Create a new borrowing or reservation request"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Item Autocomplete */}
                    <div className="space-y-1 relative">
                        <label className="block text-xs font-bold text-gray-500 uppercase ml-1">Select Item *</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={itemSearch}
                                onChange={(e) => {
                                    setItemSearch(e.target.value);
                                    setShowDropdown(true);
                                    if (!e.target.value) {
                                        setSelectedItem(null);
                                        setFormData({ ...formData, itemName: '', itemId: null });
                                    }
                                }}
                                onFocus={() => setShowDropdown(true)}
                                placeholder="Type to search available items..."
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                            />
                            <Package size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                        {formError && (
                            <p className="text-xs text-red-500 mt-1 ml-1">{formError}</p>
                        )}

                        {/* Dropdown */}
                        {showDropdown && itemSearch && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                {filteredItems.length === 0 ? (
                                    <div className="p-4 text-center text-gray-500 text-sm">
                                        <Lock size={20} className="mx-auto mb-2 text-gray-400" />
                                        No items available for your role or matching your search
                                    </div>
                                ) : (
                                    filteredItems.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => handleSelectItem(item)}
                                            className={`w-full text-left px-4 py-3 hover:bg-primary/10 flex items-center justify-between transition-colors ${selectedItem?.id === item.id ? 'bg-primary/10' : ''
                                                }`}
                                        >
                                            <div>
                                                <p className="font-medium text-gray-800">{item.name}</p>
                                                <p className="text-xs text-gray-500">{item.category} • {item.location}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs font-medium text-emerald-600">{item.quantity} available</span>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Selected item badge */}
                        {selectedItem && (
                            <div className="flex items-center gap-2 mt-2 p-2 bg-emerald-50 rounded-lg">
                                <Check size={16} className="text-emerald-600" />
                                <span className="text-sm text-emerald-700">Selected: {selectedItem.name}</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedItem(null);
                                        setItemSearch('');
                                        setFormData({ ...formData, itemName: '', itemId: null });
                                    }}
                                    className="ml-auto text-emerald-600 hover:text-emerald-800"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Requester (auto-filled) */}
                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase ml-1">Requested By</label>
                        <div className="px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-600">
                            {user?.fullName || 'Unknown User'}
                        </div>
                    </div>

                    <Input
                        label="Quantity"
                        type="number"
                        min="1"
                        max={selectedItem?.quantity || 99}
                        required
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    />

                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase ml-1">Purpose *</label>
                        <textarea
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
                            rows="3"
                            required
                            value={formData.purpose}
                            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                            placeholder="Describe the purpose of this request"
                        />
                    </div>

                    {/* Priority selector */}
                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase ml-1">Priority</label>
                        <select
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        >
                            <option value="LOW">Low</option>
                            <option value="NORMAL">Normal</option>
                            <option value="HIGH">High</option>
                        </select>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-1">
                            Submit Request
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Reject Modal */}
            <Modal
                isOpen={rejectModalOpen}
                onClose={() => setRejectModalOpen(false)}
                title="Reject Request"
                description="Please provide a reason for rejecting this request"
                size="sm"
            >
                <div className="space-y-4">
                    <textarea
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
                        rows="3"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Enter rejection reason"
                    />
                    <div className="flex gap-3">
                        <Button type="button" variant="ghost" className="flex-1" onClick={() => setRejectModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="danger" className="flex-1" onClick={handleRejectConfirm}>
                            Reject Request
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* F-02: Cancel Confirmation Modal */}
            <Modal
                isOpen={cancelModalOpen}
                onClose={() => setCancelModalOpen(false)}
                title="Cancel Request"
                description="Are you sure you want to cancel this request?"
                size="sm"
            >
                <div className="space-y-4">
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700/50">
                        <p className="text-sm text-amber-800 dark:text-amber-300 text-center">
                            ⚠️ This action cannot be undone. The request will be permanently cancelled.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button type="button" variant="ghost" className="flex-1" onClick={() => setCancelModalOpen(false)}>
                            Keep Request
                        </Button>
                        <Button variant="danger" className="flex-1" onClick={handleCancelConfirm}>
                            <Ban size={16} className="mr-2" />
                            Cancel Request
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Request Details Modal */}
            <Modal
                isOpen={detailModalOpen}
                onClose={() => {
                    setDetailModalOpen(false);
                    setDetailRequest(null);
                }}
                title="Request Details"
                description="Full information about this request"
                size="lg"
            >
                {detailRequest && (
                    <div className="space-y-4">
                        {/* Status Badge + ID */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[detailRequest.status]}`}>
                                    {detailRequest.status}
                                </span>
                                {detailRequest.isOverdue && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                        <AlertTriangle size={12} />
                                        OVERDUE
                                    </span>
                                )}
                            </div>
                            <span className="text-sm text-gray-500">ID: #{detailRequest.id}</span>
                        </div>

                        {/* Item Info */}
                        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                            <div className="flex items-center gap-3">
                                <Package className="text-primary" size={22} />
                                <div>
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">{detailRequest.itemName}</h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Quantity: {detailRequest.quantity}</p>
                                </div>
                            </div>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <User className="text-blue-600" size={18} />
                                <div>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Requested By</p>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{detailRequest.requestedBy}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                <Calendar className="text-amber-600" size={18} />
                                <div>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Request Date</p>
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                                        {detailRequest.requestDate}
                                        {detailRequest.createdAt && (
                                            <span className="text-xs text-gray-400 ml-1">
                                                {new Date(detailRequest.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Borrow Duration + Expected Return */}
                        {detailRequest.isReturnable && (
                            <div className="grid grid-cols-2 gap-3">
                                {detailRequest.borrowDuration && (
                                    <div className="flex items-center gap-2 p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                        <Timer className="text-purple-600" size={18} />
                                        <div>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Borrow Limit</p>
                                            <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                                                {detailRequest.borrowDuration} {detailRequest.borrowDurationUnit?.toLowerCase()}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {detailRequest.expectedReturn && (
                                    <div className={`flex items-center gap-2 p-2.5 rounded-lg ${detailRequest.isOverdue
                                        ? 'bg-red-50 dark:bg-red-900/20 border border-red-200'
                                        : 'bg-green-50 dark:bg-green-900/20'
                                        }`}>
                                        <Clock className={detailRequest.isOverdue ? 'text-red-600' : 'text-green-600'} size={18} />
                                        <div>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">Due Date</p>
                                            <p className={`text-sm font-medium ${detailRequest.isOverdue ? 'text-red-700' : 'text-gray-800 dark:text-gray-100'}`}>
                                                {new Date(detailRequest.expectedReturn).toLocaleDateString()} {new Date(detailRequest.expectedReturn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Purpose */}
                        <div className="p-3 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 rounded-xl">
                            <div className="flex items-center gap-2 mb-1">
                                <FileText className="text-primary" size={16} />
                                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Purpose</h4>
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                                {detailRequest.purpose || 'No purpose specified'}
                            </p>
                        </div>

                        {/* Rejection Reason */}
                        {detailRequest.status === 'REJECTED' && detailRequest.rejectionReason && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <X className="text-red-600" size={18} />
                                    <h4 className="font-semibold text-red-700 dark:text-red-400">Rejection Reason</h4>
                                </div>
                                <p className="text-red-600 dark:text-red-300 text-sm">
                                    {detailRequest.rejectionReason}
                                </p>
                            </div>
                        )}

                        {/* Comments */}
                        <div className="border-t dark:border-gray-600 pt-4">
                            <CommentBox
                                comments={detailComments}
                                currentUserId={user?.id}
                                loading={commentLoading}
                                onAddComment={async (text) => {
                                    setCommentLoading(true);
                                    const result = await addComment(detailRequest.id, text);
                                    if (result.success) {
                                        // Refresh comments from API to get full author data
                                        const cmts = await getComments(detailRequest.id);
                                        setDetailComments(cmts);
                                    }
                                    setCommentLoading(false);
                                }}
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4 border-t dark:border-gray-600">
                            {detailRequest.status === 'PENDING' && hasMinRole(user?.role, ROLES.STAFF) && detailRequest.requestedById !== user?.id && (
                                <>
                                    <Button
                                        className="flex-1"
                                        onClick={() => {
                                            handleApprove(detailRequest.id);
                                            setDetailModalOpen(false);
                                        }}
                                    >
                                        <Check size={16} className="mr-2" />
                                        Approve
                                    </Button>
                                    <Button
                                        variant="danger"
                                        className="flex-1"
                                        onClick={() => {
                                            setDetailModalOpen(false);
                                            handleRejectClick(detailRequest.id);
                                        }}
                                    >
                                        <X size={16} className="mr-2" />
                                        Reject
                                    </Button>
                                </>
                            )}
                            {detailRequest.status !== 'PENDING' && (
                                <Button variant="ghost" className="flex-1" onClick={() => setDetailModalOpen(false)}>
                                    Close
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Requests;
