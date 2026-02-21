import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Check, X, Clock, CheckCircle, Package, Lock, Eye, FileText, User, Calendar, MapPin, RotateCcw, Trash2, AlertTriangle, Timer } from 'lucide-react';
import { Button, Input, Card, Modal, Table, CommentBox } from '../components/ui';
import { StaffOnly } from '../components/auth';
import { useRequests, useInventory } from '../hooks';
import useAuthStore from '../store/authStore';
import { hasMinRole, ROLES } from '../utils/roles';

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

const Requests = () => {
    const {
        requests,
        loading,
        stats,
        fetchRequests,
        approveRequest,
        rejectRequest,
        returnRequest,
        clearCompleted,
        createRequest,
        addComment,
        getComments,
        checkOverdue
    } = useRequests();
    const { getAccessibleItems, fetchInventory } = useInventory();
    const { user } = useAuthStore();

    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [selectedRequestId, setSelectedRequestId] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [detailRequest, setDetailRequest] = useState(null);
    const [detailComments, setDetailComments] = useState([]);
    const [commentLoading, setCommentLoading] = useState(false);

    const [itemSearch, setItemSearch] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);

    const [formData, setFormData] = useState({
        itemName: '',
        item: null,
        quantity: 1,
        purpose: '',
        priority: 'NORMAL',
    });

    useEffect(() => {
        fetchRequests({ search, status: filterStatus });
    }, [search, filterStatus, fetchRequests]);

    // Auto-trigger overdue check on page load (staff/admin only)
    useEffect(() => {
        if (hasMinRole(user?.role, ROLES.STAFF)) {
            checkOverdue();
        }
    }, [checkOverdue, user?.role]);

    // Fetch inventory items so the item search dropdown works
    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    const filteredItems = useMemo(() => {
        if (!user?.role) return [];
        return getAccessibleItems(user.role, itemSearch);
    }, [user?.role, itemSearch, getAccessibleItems]);

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
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedItem) {
            alert('Please select an item from the list');
            return;
        }
        const payload = {
            item: formData.item,
            itemName: formData.itemName,
            quantity: formData.quantity,
            purpose: formData.purpose,
            priority: formData.priority,
        };
        await createRequest(payload);
        setIsModalOpen(false);
        setFormData({ itemName: '', item: null, quantity: 1, purpose: '', priority: 'NORMAL' });
        setItemSearch('');
        setSelectedItem(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Requests</h1>
                    <p className="text-gray-500 mt-1">Manage borrowing and reservation requests</p>
                </div>
                <div className="flex gap-2">
                    <StaffOnly>
                        <Button variant="outline" icon={Trash2} onClick={() => clearCompleted()} className="text-gray-600">
                            Clear Completed
                        </Button>
                    </StaffOnly>
                    <Button icon={Plus} onClick={() => setIsModalOpen(true)}>
                        New Request
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <Card className="text-center py-4">
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    <p className="text-sm text-gray-500">Total</p>
                </Card>
                <Card className="text-center py-4">
                    <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                    <p className="text-sm text-gray-500">Pending</p>
                </Card>
                <Card className="text-center py-4">
                    <p className="text-2xl font-bold text-emerald-600">{stats.approved}</p>
                    <p className="text-sm text-gray-500">Approved</p>
                </Card>
                <Card className="text-center py-4">
                    <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
                    <p className="text-sm text-gray-500">Completed</p>
                </Card>
                <Card className="text-center py-4">
                    <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                    <p className="text-sm text-gray-500">Rejected</p>
                </Card>
                <Card className="text-center py-4">
                    <p className="text-2xl font-bold text-orange-600">{stats.overdue || 0}</p>
                    <p className="text-sm text-gray-500">Overdue</p>
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

            {/* Table */}
            <Table>
                <Table.Header>
                    <Table.Row>
                        <Table.Head>Item</Table.Head>
                        <Table.Head>Requested By</Table.Head>
                        <Table.Head>Quantity</Table.Head>
                        <Table.Head>Purpose</Table.Head>
                        <Table.Head>Date</Table.Head>
                        <Table.Head>Status</Table.Head>
                        <Table.Head className="text-right">Actions</Table.Head>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {loading ? (
                        <Table.Empty message="Loading..." colSpan={7} />
                    ) : requests.length === 0 ? (
                        <Table.Empty message="No requests found" colSpan={7} />
                    ) : (
                        requests.map((request) => {
                            const StatusIcon = statusIcons[request.status];
                            return (
                                <Table.Row key={request.id}>
                                    <Table.Cell className="font-medium">{request.itemName}</Table.Cell>
                                    <Table.Cell>{request.requestedBy}</Table.Cell>
                                    <Table.Cell>{request.quantity}</Table.Cell>
                                    <Table.Cell className="max-w-[200px] truncate">{request.purpose}</Table.Cell>
                                    <Table.Cell>{request.requestDate}</Table.Cell>
                                    <Table.Cell>
                                        <div className="flex items-center gap-1">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[request.status]}`}>
                                                <StatusIcon size={12} />
                                                {request.status}
                                            </span>
                                            {request.isOverdue && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700" title="Overdue">
                                                    <AlertTriangle size={12} />
                                                    OVERDUE
                                                </span>
                                            )}
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <div className="flex justify-end gap-2">
                                            {/* View Details - All users */}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={async () => {
                                                    setDetailRequest(request);
                                                    setDetailModalOpen(true);
                                                    // Fetch comments from API
                                                    const cmts = await getComments(request.id);
                                                    setDetailComments(cmts);
                                                }}
                                                className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                title="View Details"
                                            >
                                                <Eye size={16} />
                                            </Button>
                                            {request.status === 'PENDING' && (
                                                <StaffOnly>
                                                    {/* Prevent self-approval: hide buttons for the requester's own requests */}
                                                    {request.requestedById !== user?.id && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleApprove(request.id)}
                                                                className="text-emerald-600 hover:bg-emerald-50"
                                                            >
                                                                <Check size={16} />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleRejectClick(request.id)}
                                                                className="text-red-600 hover:bg-red-50"
                                                            >
                                                                <X size={16} />
                                                            </Button>
                                                        </>
                                                    )}
                                                </StaffOnly>
                                            )}
                                            {/* Return button - for approved/completed returnable items */}
                                            {(request.status === 'APPROVED' || request.status === 'COMPLETED') && request.isReturnable && (
                                                <StaffOnly>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => returnRequest(request.id)}
                                                        className="text-purple-600 hover:bg-purple-50"
                                                        title="Return Item"
                                                    >
                                                        <RotateCcw size={16} />
                                                    </Button>
                                                </StaffOnly>
                                            )}
                                        </div>
                                    </Table.Cell>
                                </Table.Row>
                            );
                        })
                    )}
                </Table.Body>
            </Table>

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
