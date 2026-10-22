import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../utils/toast';
import { adminApi } from '../../api/admin';
import Card from '../../components/ui/Card/Card';
import Button from '../../components/ui/Button/Button';
import Badge from '../../components/ui/Badge/Badge';
import Skeleton from '../../components/ui/Skeleton/Skeleton';
import ThemeToggle from '../../components/ui/ThemeToggle/ThemeToggle';
import {
    ShieldCheck, FileText, CheckCircle, XCircle,
    ExternalLink, Users, Clock, AlertCircle,
    ShieldAlert, Activity, CheckCircle2, AlertTriangle,
    Search, Filter, Send, MessageSquare, Star, Check, Copy, Eye,
    ChevronLeft, ChevronRight, History, ScrollText, UserCheck, UserX, FileClock
} from 'lucide-react';
import BookingDetailsModal from '../../components/modals/BookingDetailsModal/BookingDetailsModal';
import './AdminDashboard.css';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');
const API_ROOT = API_BASE === '/api' ? '' : API_BASE.replace('/api', '');

const getPaginationItems = (current, total) => {
    if (total <= 6) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    const items = [];
    if (current <= 3) {
        for (let i = 1; i <= Math.min(4, total); i++) {
            items.push(i);
        }
        if (total > 4) {
            items.push('ellipsis-end');
            items.push(total);
        }
    } else if (current >= total - 2) {
        items.push(1);
        items.push('ellipsis-start');
        for (let i = total - 3; i <= total; i++) {
            if (i > 1) items.push(i);
        }
    } else {
        items.push(1);
        items.push('ellipsis-start');
        items.push(current - 1);
        items.push(current);
        items.push(current + 1);
        items.push('ellipsis-end');
        items.push(total);
    }
    return items;
};

const PaginationControls = ({ currentPage, totalPages, totalItems, limit, onPageChange, onLimitChange, itemName = "items" }) => {
    if (!totalItems || totalItems === 0) return null;
    const startItem = (currentPage - 1) * limit + 1;
    const endItem = Math.min(currentPage * limit, totalItems);
    const items = getPaginationItems(currentPage, totalPages);

    return (
        <div className="admin-pagination-bar">
            <div className="admin-pagination-info">
                Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of <strong>{totalItems}</strong> {itemName}
            </div>

            <div className="admin-pagination-actions">
                <div className="admin-pagination-limit">
                    <span>Show:</span>
                    <select
                        value={limit}
                        onChange={(e) => {
                            onLimitChange(Number(e.target.value));
                            onPageChange(1);
                        }}
                        className="admin-limit-select"
                    >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>

                <div className="admin-pagination-btns">
                    <button
                        className="admin-page-btn"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                        title="Previous Page"
                    >
                        <ChevronLeft size={16} />
                    </button>

                    {items.map((item, idx) => {
                        if (typeof item === 'string') {
                            return <span key={`ellipsis-${idx}`} className="admin-page-ellipsis">…</span>;
                        }
                        return (
                            <button
                                key={item}
                                className={`admin-page-btn ${item === currentPage ? 'active' : ''}`}
                                onClick={() => onPageChange(item)}
                            >
                                {item}
                            </button>
                        );
                    })}

                    <button
                        className="admin-page-btn"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        title="Next Page"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const AdminDashboard = () => {
    const { token, user } = useAuth();
    const [activeTab, setActiveTab] = useState('verifications');
    const [verifications, setVerifications] = useState([]);
    const [complaints, setComplaints] = useState([]);
    
    // Service Oversight (Appointments) State
    const [appointmentData, setAppointmentData] = useState({
        metrics: {},
        appointments: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 1 }
    });
    const [appointmentFilter, setAppointmentFilter] = useState('ALL');
    const [appointmentSearch, setAppointmentSearch] = useState('');
    const [appointmentPage, setAppointmentPage] = useState(1);
    const [appointmentLimit, setAppointmentLimit] = useState(10);

    // User Management State
    const [userData, setUserData] = useState({
        users: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 1 }
    });
    const [userRoleFilter, setUserRoleFilter] = useState('ALL');
    const [userSearch, setUserSearch] = useState('');
    const [userPage, setUserPage] = useState(1);
    const [userLimit, setUserLimit] = useState(10);

    // Audit Trail State
    const [auditData, setAuditData] = useState({
        logs: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 1 }
    });
    const [auditActionFilter, setAuditActionFilter] = useState('ALL');
    const [auditTypeFilter, setAuditTypeFilter] = useState('ALL');
    const [auditSearch, setAuditSearch] = useState('');
    const [auditPage, setAuditPage] = useState(1);
    const [auditLimit, setAuditLimit] = useState(10);

    const [reviews, setReviews] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    // Resolution Modal State
    const [resolvingComplaint, setResolvingComplaint] = useState(null);
    const [resolutionStatus, setResolutionStatus] = useState('RESOLVED');
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [savingResolution, setSavingResolution] = useState(false);

    // Inspector Modal State
    const [inspectingAppointmentId, setInspectingAppointmentId] = useState(null);

    const fetchData = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            let data = null;
            if (activeTab === 'verifications') {
                data = await adminApi.getPendingVerifications(token);
                setVerifications(data || []);
            } else if (activeTab === 'complaints') {
                data = await adminApi.getComplaints(token);
                setComplaints(data || []);
            } else if (activeTab === 'appointments') {
                data = await adminApi.getAllAppointments({
                    page: appointmentPage,
                    limit: appointmentLimit,
                    status: appointmentFilter !== 'ALL' ? appointmentFilter : undefined,
                    search: appointmentSearch
                }, token);
                setAppointmentData(data || { metrics: {}, appointments: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 1 } });
            } else if (activeTab === 'users') {
                data = await adminApi.getUsers({
                    page: userPage,
                    limit: userLimit,
                    role: userRoleFilter !== 'ALL' ? userRoleFilter : undefined,
                    search: userSearch
                }, token);
                if (Array.isArray(data)) {
                    setUserData({ users: data, pagination: { total: data.length, page: 1, limit: userLimit, totalPages: Math.ceil(data.length / userLimit) || 1 } });
                } else {
                    setUserData(data || { users: [], pagination: { total: 0, page: 1, limit: userLimit, totalPages: 1 } });
                }
            } else if (activeTab === 'reviews') {
                data = await adminApi.getReviews(token);
                setReviews(data || []);
            } else if (activeTab === 'stats') {
                data = await adminApi.getStats(token);
                setStats(data);
            } else if (activeTab === 'auditLogs') {
                data = await adminApi.getAuditLogs({
                    page: auditPage,
                    limit: auditLimit,
                    action: auditActionFilter !== 'ALL' ? auditActionFilter : undefined,
                    targetType: auditTypeFilter !== 'ALL' ? auditTypeFilter : undefined,
                    search: auditSearch
                }, token);
                setAuditData(data || { logs: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 1 } });
            }
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }, [
        activeTab,
        appointmentFilter,
        appointmentSearch,
        appointmentPage,
        appointmentLimit,
        userRoleFilter,
        userSearch,
        userPage,
        userLimit,
        auditActionFilter,
        auditTypeFilter,
        auditSearch,
        auditPage,
        auditLimit,
        token
    ]);

    useEffect(() => {
        fetchData(false);
    }, [fetchData]);

    const handleVerify = async (providerId, status) => {
        const isApproved = status === 'approved';
        const defaultPrompt = isApproved
            ? 'Specialist license and credentials verified'
            : 'Incomplete or unverified documentation';
        const promptMsg = isApproved
            ? 'Enter verification approval note for audit trail (optional):'
            : 'Enter reason for rejecting specialist verification (required for audit log & provider notification):';

        const reason = window.prompt(promptMsg, defaultPrompt);
        if (!isApproved && (!reason || !reason.trim())) {
            toast.warning('Rejection requires a documented reason for audit logging.');
            return;
        }

        setProcessingId(providerId);
        try {
            const data = await adminApi.verifyProvider(providerId, status, token, reason ? reason.trim() : null);
            toast.success(data.message || 'Provider verification updated');
            setVerifications(prev => prev.filter(p => p.id !== providerId));
        } catch (err) {
            toast.error(err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleOpenResolutionModal = (complaint) => {
        setResolvingComplaint(complaint);
        setResolutionStatus(complaint.status === 'PENDING' ? 'RESOLVED' : complaint.status);
        setResolutionNotes(complaint.adminNotes || '');
    };

    const handleSaveResolution = async (e) => {
        if (e) e.preventDefault();
        if (!resolvingComplaint) return;

        setSavingResolution(true);
        try {
            const res = await adminApi.updateComplaint(resolvingComplaint.id, {
                status: resolutionStatus,
                adminNotes: resolutionNotes
            }, token);

            toast.success('Complaint status and resolution note saved.');
            setComplaints(prev => prev.map(c => c.id === resolvingComplaint.id ? res.complaint : c));
            setResolvingComplaint(null);
        } catch (err) {
            toast.error(err.message || 'Failed to update complaint');
        } finally {
            setSavingResolution(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        const reason = window.prompt('Are you sure you want to permanently delete this user? Enter reason for audit log:', 'Account removed by Administrator');
        if (!reason || !reason.trim()) return;

        setProcessingId(userId);
        try {
            const data = await adminApi.deleteUser(userId, token, reason.trim());
            toast.success(data.message || 'User deleted successfully');
            fetchData(false);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleDeleteReview = async (reviewId, type) => {
        const reason = window.prompt('Delete this review? Enter reason for audit trail:', 'Review removed for platform policy compliance');
        if (!reason || !reason.trim()) return;

        setProcessingId(reviewId);
        try {
            const data = await adminApi.deleteReview(reviewId, type, token, reason.trim());
            toast.success(data.message || 'Review deleted successfully');
            setReviews(prev => prev.filter(r => r.id !== reviewId));
        } catch (err) {
            toast.error(err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const pendingComplaintsCount = complaints.filter(c => c.status === 'PENDING').length;

    return (
        <div className="admin-dashboard animate-fade-in">
            <header className="admin-header">
                <div className="admin-header__left">
                    <ShieldCheck className="admin-logo-icon" size={32} />
                    <div>
                        <h1>Admin Portal</h1>
                        <p>Appointly Operations, Verification & Service Oversight</p>
                    </div>
                </div>
                <div className="admin-header__right">
                    <ThemeToggle />
                    <div className="admin-user-pill">
                        <div className="admin-avatar">AD</div>
                        <span>Admin: {user?.name || 'Administrator'}</span>
                    </div>
                </div>
            </header>

            <main className="admin-content">
                <nav className="admin-tabs">
                    <button className={activeTab === 'verifications' ? 'active' : ''} onClick={() => setActiveTab('verifications')}>
                        Verifications {verifications.length > 0 && <span className="tab-badge">{verifications.length}</span>}
                    </button>
                    <button className={activeTab === 'complaints' ? 'active' : ''} onClick={() => setActiveTab('complaints')}>
                        Complaints & Disputes {pendingComplaintsCount > 0 && <span className="tab-badge">{pendingComplaintsCount}</span>}
                    </button>
                    <button className={activeTab === 'appointments' ? 'active' : ''} onClick={() => setActiveTab('appointments')}>
                        Service Oversight
                    </button>
                    <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
                        User Management
                    </button>
                    <button className={activeTab === 'reviews' ? 'active' : ''} onClick={() => setActiveTab('reviews')}>
                        Reviews
                    </button>
                    <button className={activeTab === 'stats' ? 'active' : ''} onClick={() => setActiveTab('stats')}>
                        Platform Stats
                    </button>
                    <button className={activeTab === 'auditLogs' ? 'active' : ''} onClick={() => setActiveTab('auditLogs')}>
                        <History size={15} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                        Audit Trail
                    </button>
                </nav>

                {/* ── 1. Verifications Tab ── */}
                {activeTab === 'verifications' && (
                    <section className="verifications-section animate-fade-in">
                        <div className="section-header">
                            <h2>Pending Professional Verifications</h2>
                            <Button variant="ghost" size="sm" onClick={fetchData}>Refresh</Button>
                        </div>

                        {loading ? (
                            <Skeleton height="120px" count={3} />
                        ) : verifications.length === 0 ? (
                            <Card variant="default" className="empty-state">
                                <CheckCircle size={48} className="empty-icon" />
                                <h3>All Caught Up!</h3>
                                <p>No pending verification requests from service providers.</p>
                            </Card>
                        ) : (
                            <div className="verification-grid">
                                {verifications.map(provider => (
                                    <Card key={provider.id} variant="glass" className="verification-card">
                                        <div className="v-card-main">
                                            <div className="v-user-info">
                                                <div className="v-avatar" style={{ overflow: 'hidden' }}>
                                                    {provider.avatarUrl ? (
                                                        <img src={provider.avatarUrl} alt={provider.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                                    ) : (
                                                        provider.name.charAt(0)
                                                    )}
                                                </div>
                                                <div className="v-details">
                                                    <h3>{provider.name}</h3>
                                                    <p className="v-email">{provider.email}</p>
                                                    <Badge variant="primary">{provider.providerProfile?.specialty || 'Specialist'}</Badge>
                                                </div>
                                            </div>
                                            <div className="v-document">
                                                <div className="doc-preview-info">
                                                    <FileText size={20} />
                                                    <span>Medical / License Document</span>
                                                </div>
                                                {provider.providerProfile?.verificationDocument ? (
                                                    <a
                                                        href={
                                                            provider.providerProfile.verificationDocument.startsWith('http')
                                                                ? provider.providerProfile.verificationDocument
                                                                : `${API_ROOT}/${provider.providerProfile.verificationDocument}`
                                                        }
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="view-doc-link"
                                                    >
                                                        View Doc <ExternalLink size={14} />
                                                    </a>
                                                ) : (
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No document</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="v-card-actions">
                                            <Button variant="danger" size="sm" onClick={() => handleVerify(provider.id, 'rejected')} disabled={processingId === provider.id}>Reject</Button>
                                            <Button variant="primary" size="sm" onClick={() => handleVerify(provider.id, 'approved')} disabled={processingId === provider.id}>Approve & Verify</Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* ── 2. Complaints & Disputes Tab (Step 10) ── */}
                {activeTab === 'complaints' && (
                    <section className="animate-fade-in">
                        <div className="section-header">
                            <div>
                                <h2>Direct Client Complaints & Disputes</h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                                    Review client escalations, investigate provider issues, and send formal resolution updates.
                                </p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={fetchData}>Refresh</Button>
                        </div>

                        {loading ? (
                            <Skeleton height="140px" count={3} />
                        ) : complaints.length === 0 ? (
                            <Card variant="default" className="empty-state">
                                <CheckCircle2 size={48} className="empty-icon" color="#10b981" />
                                <h3>No Client Complaints</h3>
                                <p>All client appointments and service experiences are currently dispute-free.</p>
                            </Card>
                        ) : (
                            <div className="admin-complaints-list">
                                {complaints.map(c => {
                                    const statusColors = {
                                        PENDING: { label: 'Pending Review', color: '#e2892f', bg: 'rgba(226, 137, 47, 0.15)' },
                                        UNDER_REVIEW: { label: 'Under Review', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' },
                                        RESOLVED: { label: 'Resolved', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
                                        DISMISSED: { label: 'Dismissed', color: '#9ba3af', bg: 'rgba(155, 163, 175, 0.15)' },
                                    };
                                    const st = statusColors[c.status] || statusColors.PENDING;
                                    const dateStr = new Date(c.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                                    const provUser = c.appointment?.provider?.user;

                                    return (
                                        <Card key={c.id} variant="glass" className="admin-complaint-card">
                                            <div className="ac-header">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span className="ac-category">{c.category?.replace('_', ' ') || 'ISSUE'}</span>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ticket #{c.id.slice(0, 8)}</span>
                                                </div>
                                                <div className="ac-status-pill" style={{ color: st.color, background: st.bg, border: `1px solid ${st.color}40` }}>
                                                    ● {st.label}
                                                </div>
                                            </div>

                                            <h3 className="ac-title">{c.subject}</h3>
                                            <p className="ac-description">{c.description}</p>

                                            <div className="ac-parties-grid">
                                                <div className="ac-party">
                                                    <span className="ac-party-label">Filing Client</span>
                                                    <strong>{c.client?.name || 'Client'}</strong>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.client?.email} {c.client?.phone ? `• ${c.client.phone}` : ''}</span>
                                                </div>
                                                <div className="ac-party">
                                                    <span className="ac-party-label">Involved Provider</span>
                                                    <strong>{provUser?.name || 'Assigned Provider'}</strong>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{provUser?.email || 'On file'}</span>
                                                </div>
                                                {c.appointment && (
                                                    <div className="ac-party">
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span className="ac-party-label">Associated Service</span>
                                                            <button
                                                                type="button"
                                                                className="admin-complaint-inspect-link"
                                                                onClick={() => setInspectingAppointmentId(c.appointmentId || c.appointment?.id)}
                                                            >
                                                                <Eye size={12} /> Inspect Booking (#{c.appointment.id.slice(0, 8).toUpperCase()})
                                                            </button>
                                                        </div>
                                                        <strong>{c.appointment.service?.name} (₹{c.appointment.service?.price})</strong>
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status: {c.appointment.status}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {c.adminNotes && (
                                                <div className="ac-admin-note-box">
                                                    <div className="ac-admin-note-header">✓ Current Admin Resolution:</div>
                                                    <div>{c.adminNotes}</div>
                                                </div>
                                            )}

                                            <div className="ac-footer">
                                                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Filed on: {dateStr}</span>
                                                <Button variant="primary" size="sm" onClick={() => handleOpenResolutionModal(c)}>
                                                    Review & Update Resolution
                                                </Button>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                )}

                {/* ── 3. Service Oversight Tab (Step 11) ── */}
                {activeTab === 'appointments' && (
                    <section className="animate-fade-in">
                        <div className="section-header">
                            <div>
                                <h2>Service Oversight & Quality Monitoring</h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                                    Monitor all platform consultations, verify completed services, and audit satisfaction rates.
                                </p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={fetchData}>Refresh</Button>
                        </div>

                        {/* Metrics Bar */}
                        {appointmentData.metrics && (
                            <div className="oversight-metrics-grid">
                                <Card variant="glass" className="oversight-metric-card">
                                    <div className="metric-icon-box info"><Activity size={22} /></div>
                                    <div>
                                        <h3 className="oversight-metric-val">{appointmentData.metrics.total || 0}</h3>
                                        <p className="oversight-metric-label">Total Bookings</p>
                                    </div>
                                </Card>
                                <Card variant="glass" className="oversight-metric-card">
                                    <div className="metric-icon-box success"><CheckCircle2 size={22} /></div>
                                    <div>
                                        <h3 className="oversight-metric-val">{appointmentData.metrics.completed || 0}</h3>
                                        <p className="oversight-metric-label">Successfully Completed ({appointmentData.metrics.successRate || 100}%)</p>
                                    </div>
                                </Card>
                                <Card variant="glass" className="oversight-metric-card">
                                    <div className="metric-icon-box warning"><Clock size={22} /></div>
                                    <div>
                                        <h3 className="oversight-metric-val">{(appointmentData.metrics.pending || 0) + (appointmentData.metrics.confirmed || 0)}</h3>
                                        <p className="oversight-metric-label">Active / Pending</p>
                                    </div>
                                </Card>
                                <Card variant="glass" className="oversight-metric-card">
                                    <div className="metric-icon-box danger"><AlertTriangle size={22} /></div>
                                    <div>
                                        <h3 className="oversight-metric-val">{appointmentData.metrics.withComplaints || 0}</h3>
                                        <p className="oversight-metric-label">Disputed Bookings</p>
                                    </div>
                                </Card>
                            </div>
                        )}

                        {/* Filter Bar */}
                        <div className="oversight-filter-bar">
                            <div className="filter-pills">
                                {['ALL', 'COMPLETED', 'CONFIRMED', 'PENDING', 'CANCELLED'].map(f => (
                                    <button
                                        key={f}
                                        className={`filter-pill ${appointmentFilter === f ? 'active' : ''}`}
                                        onClick={() => {
                                            setAppointmentFilter(f);
                                            setAppointmentPage(1);
                                        }}
                                    >
                                        {f === 'ALL' ? 'All Services' : f}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="text"
                                placeholder="Search by Booking ID (#APT-...), client, provider, service..."
                                className="admin-search-input"
                                value={appointmentSearch}
                                onChange={(e) => {
                                    setAppointmentSearch(e.target.value);
                                    setAppointmentPage(1);
                                }}
                            />
                        </div>

                        {/* Appointments Table */}
                        <div className="admin-table-wrapper">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Booking Ref</th>
                                        <th>Service & Price</th>
                                        <th>Client</th>
                                        <th>Provider</th>
                                        <th>Date & Location</th>
                                        <th>Status</th>
                                        <th>Quality & Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="7"><Skeleton height="30px" count={5} /></td></tr>
                                    ) : (appointmentData.appointments || []).length === 0 ? (
                                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No bookings matching the filter criteria.</td></tr>
                                    ) : (
                                        appointmentData.appointments.map(a => {
                                            const provUser = a.provider?.user;
                                            const hasReview = !!a.review;
                                            const hasDispute = a.complaints && a.complaints.length > 0;

                                            return (
                                                <tr key={a.id}>
                                                    <td>
                                                        <div
                                                            className="admin-booking-id-pill"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(a.id);
                                                                toast.success(`Copied Booking ID: #APT-${a.id.slice(0, 8).toUpperCase()}`);
                                                            }}
                                                            title="Click to copy full Booking ID"
                                                        >
                                                            <span>#APT-{a.id.slice(0, 8).toUpperCase()}</span>
                                                            <Copy size={11} />
                                                        </div>
                                                        <button
                                                            className="admin-inspect-btn"
                                                            onClick={() => setInspectingAppointmentId(a.id)}
                                                            title="Inspect Full Booking Details & Manage"
                                                        >
                                                            <Eye size={12} /> Inspect
                                                        </button>
                                                    </td>
                                                    <td>
                                                        <strong>{a.service?.name || 'Service'}</strong>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>₹{a.service?.price || 0} • {a.service?.duration || 30} mins</div>
                                                    </td>
                                                    <td>
                                                        <div>{a.client?.name}</div>
                                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{a.client?.email}</div>
                                                    </td>
                                                    <td>
                                                        <div>{provUser?.name}</div>
                                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{provUser?.email}</div>
                                                    </td>
                                                    <td>
                                                        <div>{new Date(a.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{a.serviceAddress || provUser?.location || 'Consultation'}</div>
                                                    </td>
                                                    <td>
                                                        <span className={`service-status-tag service-status-tag--${a.status.toLowerCase()}`}>
                                                            {a.status === 'COMPLETED' && '✓ Done'}
                                                            {a.status === 'CONFIRMED' && '● Confirmed'}
                                                            {a.status === 'PENDING' && 'Pending'}
                                                            {a.status === 'CANCELLED' && '✕ Cancelled'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                            {a.status === 'COMPLETED' && (
                                                                <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>
                                                                    ✓ Service Verified Done
                                                                </span>
                                                            )}
                                                            {hasReview && (
                                                                <span style={{ fontSize: '0.76rem', color: '#e2892f' }}>
                                                                    Rating: {a.review.rating}/5 "{a.review.comment?.slice(0, 30)}..."
                                                                </span>
                                                            )}
                                                            {hasDispute && (
                                                                <span style={{ fontSize: '0.76rem', color: '#ef4444', fontWeight: 600 }}>
                                                                    {a.complaints.length} Complaint(s) Logged
                                                                </span>
                                                            )}
                                                            {!hasReview && !hasDispute && a.status === 'COMPLETED' && (
                                                                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                                                    No issues reported
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Bar */}
                        <PaginationControls
                            currentPage={appointmentPage}
                            totalPages={appointmentData.pagination?.totalPages || 1}
                            totalItems={appointmentData.pagination?.total || 0}
                            limit={appointmentLimit}
                            onPageChange={setAppointmentPage}
                            onLimitChange={setAppointmentLimit}
                            itemName="bookings"
                        />
                    </section>
                )}

                {/* ── 4. Users Tab ── */}
                {activeTab === 'users' && (
                    <section className="users-section animate-fade-in">
                        <div className="section-header">
                            <div>
                                <h2>Manage Registered Users</h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                                    View and manage all registered clients, specialists, and platform administrators.
                                </p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={fetchData}>Refresh</Button>
                        </div>

                        <div className="oversight-filter-bar">
                            <div className="filter-pills">
                                {['ALL', 'CLIENT', 'PROVIDER', 'ADMIN'].map(r => (
                                    <button
                                        key={r}
                                        className={`filter-pill ${userRoleFilter === r ? 'active' : ''}`}
                                        onClick={() => {
                                            setUserRoleFilter(r);
                                            setUserPage(1);
                                        }}
                                    >
                                        {r === 'ALL' ? 'All Roles' : `${r.charAt(0) + r.slice(1).toLowerCase()}s`}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="text"
                                placeholder="Search by name, email, or phone..."
                                className="admin-search-input"
                                value={userSearch}
                                onChange={(e) => {
                                    setUserSearch(e.target.value);
                                    setUserPage(1);
                                }}
                            />
                        </div>

                        <div className="admin-table-wrapper">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Joined</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="5"><Skeleton height="30px" count={5} /></td></tr>
                                    ) : (userData.users || []).length === 0 ? (
                                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No users found matching the search criteria.</td></tr>
                                    ) : (
                                        userData.users.map(u => (
                                            <tr key={u.id}>
                                                <td>
                                                    <strong>{u.name}</strong>
                                                    {u.phone && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.phone}</div>}
                                                </td>
                                                <td>{u.email}</td>
                                                <td>
                                                    <Badge variant={u.role === 'ADMIN' ? 'danger' : u.role === 'PROVIDER' ? 'primary' : 'default'}>
                                                        {u.role}
                                                    </Badge>
                                                </td>
                                                <td>{new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                                <td>
                                                    <Button
                                                        variant="danger"
                                                        size="xs"
                                                        onClick={() => handleDeleteUser(u.id)}
                                                        disabled={u.email === user?.email || processingId === u.id}
                                                    >
                                                        Delete
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Bar */}
                        <PaginationControls
                            currentPage={userPage}
                            totalPages={userData.pagination?.totalPages || 1}
                            totalItems={userData.pagination?.total || 0}
                            limit={userLimit}
                            onPageChange={setUserPage}
                            onLimitChange={setUserLimit}
                            itemName="users"
                        />
                    </section>
                )}

                {/* ── 5. Reviews Tab ── */}
                {activeTab === 'reviews' && (
                    <section className="reviews-section animate-fade-in">
                        <div className="section-header">
                            <h2>Moderation Queue</h2>
                        </div>

                        <div className="reviews-list">
                            {loading ? (
                                <Skeleton height="80px" count={4} />
                            ) : reviews.length === 0 ? (
                                <p>No reviews found.</p>
                            ) : reviews.map(r => (
                                <Card key={r.id} variant="glass" className="moderation-review-card">
                                    <div className="m-review-header">
                                        <div>
                                            <strong>{r.name}</strong>
                                            <Badge variant="ghost" style={{ marginLeft: '1rem' }}>{r.type}</Badge>
                                            {r.providerName && <span style={{ marginLeft: '1rem', opacity: 0.6 }}>for {r.providerName}</span>}
                                        </div>
                                        <div className="m-rating">{'⭐'.repeat(r.rating)}</div>
                                    </div>
                                    <p className="m-comment">{r.comment}</p>
                                    <div className="m-actions">
                                        <Button variant="danger" size="xs" onClick={() => handleDeleteReview(r.id, r.type)} disabled={processingId === r.id}>Remove Review</Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </section>
                )}

                {/* ── 6. Platform Stats Tab ── */}
                {activeTab === 'stats' && stats && (
                    <section className="admin-stats-grid animate-fade-in">
                        <Card variant="glass" className="stat-card">
                            <div className="stat-icon total"><Users size={24} /></div>
                            <div className="stat-info">
                                <h3>{stats.users}</h3>
                                <p>Total Users</p>
                            </div>
                        </Card>
                        <Card variant="glass" className="stat-card">
                            <div className="stat-icon"><ShieldCheck size={24} /></div>
                            <div className="stat-info">
                                <h3>{stats.providers}</h3>
                                <p>Providers</p>
                            </div>
                        </Card>
                        <Card variant="glass" className="stat-card">
                            <div className="stat-icon pending"><Clock size={24} /></div>
                            <div className="stat-info">
                                <h3>{stats.appointments}</h3>
                                <p>Total Bookings</p>
                            </div>
                        </Card>
                        <Card variant="glass" className="stat-card">
                            <div className="stat-icon"><FileText size={24} /></div>
                            <div className="stat-info">
                                <h3>{stats.totalReviews}</h3>
                                <p>Total Reviews</p>
                            </div>
                        </Card>
                    </section>
                )}

                {/* ── 7. Audit Trail / Activity History Tab ── */}
                {activeTab === 'auditLogs' && (
                    <section className="admin-audit-section animate-fade-in">
                        <div className="section-header" style={{ marginBottom: '1.25rem' }}>
                            <div>
                                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <History size={22} color="#3b82f6" /> Immutable Admin Activity Audit Trail
                                </h2>
                                <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    Every administrative decision, verification override, deletion, and dispute action is tracked with timestamp and justification.
                                </p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => fetchData(true)}>Refresh</Button>
                        </div>

                        {/* Audit Search and Filters Bar */}
                        <div className="admin-audit-filters-bar">
                            <div className="admin-search-wrapper" style={{ flex: '1 1 280px' }}>
                                <Search size={16} className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search by Admin, Action, Target ID, or Reason..."
                                    value={auditSearch}
                                    onChange={(e) => {
                                        setAuditSearch(e.target.value);
                                        setAuditPage(1);
                                    }}
                                    className="admin-search-input"
                                />
                                {auditSearch && (
                                    <button
                                        type="button"
                                        onClick={() => { setAuditSearch(''); setAuditPage(1); }}
                                        className="search-clear-btn"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                <select
                                    value={auditActionFilter}
                                    onChange={(e) => {
                                        setAuditActionFilter(e.target.value);
                                        setAuditPage(1);
                                    }}
                                    className="admin-audit-select"
                                >
                                    <option value="ALL">All Actions</option>
                                    <option value="SPECIALIST_VERIFIED">Specialist Verified</option>
                                    <option value="SPECIALIST_REJECTED">Specialist Rejected</option>
                                    <option value="APPOINTMENT_OVERRIDE">Booking Override</option>
                                    <option value="USER_DELETED">User Deleted</option>
                                    <option value="COMPLAINT_RESOLVED">Complaint Resolved</option>
                                    <option value="REVIEW_DELETED">Review Deleted</option>
                                </select>

                                <select
                                    value={auditTypeFilter}
                                    onChange={(e) => {
                                        setAuditTypeFilter(e.target.value);
                                        setAuditPage(1);
                                    }}
                                    className="admin-audit-select"
                                >
                                    <option value="ALL">All Entity Types</option>
                                    <option value="SPECIALIST">Specialist</option>
                                    <option value="USER">User</option>
                                    <option value="APPOINTMENT">Appointment</option>
                                    <option value="COMPLAINT">Complaint</option>
                                    <option value="REVIEW">Review</option>
                                </select>
                            </div>
                        </div>

                        {/* Audit Log Table */}
                        {loading ? (
                            <Skeleton height="60px" count={6} />
                        ) : auditData.logs.length === 0 ? (
                            <Card variant="default" className="empty-state">
                                <History size={48} className="empty-icon" style={{ opacity: 0.5 }} />
                                <h3>No Audit Logs Found</h3>
                                <p>No administrative activity records match the selected filter criteria.</p>
                            </Card>
                        ) : (
                            <div className="admin-table-container">
                                <table className="admin-table admin-audit-table">
                                    <thead>
                                        <tr>
                                            <th>Timestamp</th>
                                            <th>Admin User</th>
                                            <th>Action Taken</th>
                                            <th>Target Entity</th>
                                            <th>Reason & Justification</th>
                                            <th>IP Address</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {auditData.logs.map(log => {
                                            const logDate = new Date(log.createdAt);
                                            return (
                                                <tr key={log.id} className="admin-audit-row">
                                                    <td className="audit-col-time">
                                                        <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                                                            {logDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </div>
                                                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                                            {logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div className="admin-audit-avatar">
                                                                {log.admin?.name?.charAt(0) || 'A'}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{log.admin?.name || 'Administrator'}</div>
                                                                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{log.admin?.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`admin-audit-action-tag admin-audit-action-tag--${log.action.toLowerCase()}`}>
                                                            {log.action.replace(/_/g, ' ')}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                            <span className="admin-audit-target-badge">{log.targetType}</span>
                                                            {log.targetId && (
                                                                <span
                                                                    className="admin-audit-target-id"
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(log.targetId);
                                                                        toast.success(`Copied ID: ${log.targetId.slice(0, 8)}`);
                                                                    }}
                                                                    title="Click to copy full ID"
                                                                >
                                                                    #{log.targetId.slice(0, 8)} <Copy size={10} />
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="admin-audit-reason-box">
                                                            <div className="admin-audit-reason-text">
                                                                {log.reason || 'No specific reason documented'}
                                                            </div>
                                                            {log.details && (
                                                                <div className="admin-audit-details-text">
                                                                    {log.details}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="admin-audit-ip-badge">
                                                            {log.ipAddress || 'Internal'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Audit Pagination Bar */}
                        <PaginationControls
                            currentPage={auditPage}
                            totalPages={auditData.pagination.totalPages}
                            totalItems={auditData.pagination.total}
                            limit={auditLimit}
                            onPageChange={setAuditPage}
                            onLimitChange={setAuditLimit}
                            itemName="audit events"
                        />
                    </section>
                )}
            </main>

            {/* ── Admin Resolution Modal ── */}
            {resolvingComplaint && (
                <div className="admin-modal-overlay" onClick={() => setResolvingComplaint(null)}>
                    <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>Resolve Complaint #{resolvingComplaint.id.slice(0, 8)}</h3>
                            <button onClick={() => setResolvingComplaint(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
                        </div>

                        <div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Subject:</span>
                            <div style={{ fontWeight: 600 }}>{resolvingComplaint.subject}</div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>{resolvingComplaint.description}</p>
                        </div>

                        <form onSubmit={handleSaveResolution} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Update Status</label>
                                <select
                                    value={resolutionStatus}
                                    onChange={e => setResolutionStatus(e.target.value)}
                                    style={{
                                        background: 'var(--panel-2, #1D222B)',
                                        color: '#fff',
                                        border: '1px solid var(--line, #272B34)',
                                        padding: '0.6rem',
                                        borderRadius: '8px'
                                    }}
                                >
                                    <option value="UNDER_REVIEW">Under Review (Investigating)</option>
                                    <option value="RESOLVED">Resolved (Issue Addressed)</option>
                                    <option value="DISMISSED">Dismissed (No Action Required)</option>
                                    <option value="PENDING">Pending (Reset)</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Admin Resolution Notes (Sent to Client)</label>
                                <textarea
                                    value={resolutionNotes}
                                    onChange={e => setResolutionNotes(e.target.value)}
                                    placeholder="Explain findings, refund actions, warning issued to provider, or resolution outcome..."
                                    rows={4}
                                    style={{
                                        background: 'var(--panel-2, #1D222B)',
                                        color: '#fff',
                                        border: '1px solid var(--line, #272B34)',
                                        padding: '0.6rem',
                                        borderRadius: '8px',
                                        resize: 'vertical'
                                    }}
                                    required
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <Button variant="secondary" type="button" onClick={() => setResolvingComplaint(null)}>Cancel</Button>
                                <Button variant="primary" type="submit" disabled={savingResolution}>
                                    {savingResolution ? 'Saving...' : 'Save Resolution & Notify Client'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Booking Details Inspector Modal ── */}
            {inspectingAppointmentId && (
                <BookingDetailsModal
                    appointmentId={inspectingAppointmentId}
                    onClose={() => setInspectingAppointmentId(null)}
                    onStatusUpdated={(updatedAppt) => {
                        setAppointmentData(prev => ({
                            ...prev,
                            appointments: (prev.appointments || []).map(a =>
                                a.id === updatedAppt.id ? { ...a, ...updatedAppt } : a
                            )
                        }));
                    }}
                    onOpenDisputeResolution={(comp) => {
                        setActiveTab('complaints');
                        handleOpenResolutionModal(comp);
                    }}
                />
            )}
        </div>
    );
};

export default AdminDashboard;
