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
    ExternalLink, Users, Clock, AlertCircle
} from 'lucide-react';
import './AdminDashboard.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_ROOT = API_BASE.replace('/api', '');

const AdminDashboard = () => {
    const { token, user } = useAuth();
    const [activeTab, setActiveTab] = useState('verifications');
    const [verifications, setVerifications] = useState([]);
    const [users, setUsers] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            let data = null;
            if (activeTab === 'verifications') data = await adminApi.getPendingVerifications(token);
            else if (activeTab === 'users') data = await adminApi.getUsers(token);
            else if (activeTab === 'reviews') data = await adminApi.getReviews(token);
            else if (activeTab === 'stats') data = await adminApi.getStats(token);

            if (activeTab === 'verifications') setVerifications(data || []);
            else if (activeTab === 'users') setUsers(data || []);
            else if (activeTab === 'reviews') setReviews(data || []);
            else if (activeTab === 'stats') setStats(data);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }, [activeTab, token]);

    useEffect(() => {
        fetchData(false);
    }, [fetchData]);

    const handleVerify = async (providerId, status) => {
        setProcessingId(providerId);
        try {
            const data = await adminApi.verifyProvider(providerId, status, token);
            toast.success(data.message || 'Provider verification updated');
            setVerifications(prev => prev.filter(p => p.id !== providerId));
        } catch (err) {
            toast.error(err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
        setProcessingId(userId);
        try {
            const data = await adminApi.deleteUser(userId, token);
            toast.success(data.message || 'User deleted successfully');
            setUsers(prev => prev.filter(u => u.id !== userId));
        } catch (err) {
            toast.error(err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const handleDeleteReview = async (reviewId, type) => {
        if (!window.confirm('Delete this review?')) return;
        setProcessingId(reviewId);
        try {
            const data = await adminApi.deleteReview(reviewId, type, token);
            toast.success(data.message || 'Review deleted successfully');
            setReviews(prev => prev.filter(r => r.id !== reviewId));
        } catch (err) {
            toast.error(err.message);
        } finally {
            setProcessingId(null);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="admin-dashboard animate-fade-in">
            <header className="admin-header">
                <div className="admin-header__left">
                    <ShieldCheck className="admin-logo-icon" size={32} />
                    <div>
                        <h1>Admin Portal</h1>
                        <p>Appointly Verification Management</p>
                    </div>
                </div>
                <div className="admin-header__right">
                    <ThemeToggle />
                    <div className="admin-user-pill">
                        <div className="admin-avatar">AD</div>
                        <span>Admin Session</span>
                    </div>
                </div>
            </header>

            <main className="admin-content">
                <nav className="admin-tabs">
                    <button className={activeTab === 'verifications' ? 'active' : ''} onClick={() => setActiveTab('verifications')}>Verifications</button>
                    <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>User Management</button>
                    <button className={activeTab === 'reviews' ? 'active' : ''} onClick={() => setActiveTab('reviews')}>Reviews</button>
                    <button className={activeTab === 'stats' ? 'active' : ''} onClick={() => setActiveTab('stats')}>Platform Stats</button>
                </nav>

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
                                <p>No pending requests.</p>
                            </Card>
                        ) : (
                            <div className="verification-grid">
                                {verifications.map(provider => (
                                    <Card key={provider.id} variant="glass" className="verification-card">
                                        <div className="v-card-main">
                                            <div className="v-user-info">
                                                <div className="v-avatar">{provider.name.charAt(0)}</div>
                                                <div className="v-details">
                                                    <h3>{provider.name}</h3>
                                                    <p className="v-email">{provider.email}</p>
                                                    <Badge variant="primary">{provider.providerProfile?.specialty}</Badge>
                                                </div>
                                            </div>
                                            <div className="v-document">
                                                <div className="doc-preview-info">
                                                    <FileText size={20} />
                                                    <span>Document Attached</span>
                                                </div>
                                                <a href={`${API_ROOT}/${provider.providerProfile.verificationDocument}`} target="_blank" className="view-doc-link">View <ExternalLink size={14} /></a>
                                            </div>
                                        </div>
                                        <div className="v-card-actions">
                                            <Button variant="danger" size="sm" onClick={() => handleVerify(provider.id, 'rejected')} disabled={processingId === provider.id}>Reject</Button>
                                            <Button variant="primary" size="sm" onClick={() => handleVerify(provider.id, 'approved')} disabled={processingId === provider.id}>Approve</Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {activeTab === 'users' && (
                    <section className="users-section animate-fade-in">
                        <div className="section-header">
                            <h2>Manage Registered Users</h2>
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                className="admin-search-input"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
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
                                    ) : filteredUsers.map(u => (
                                        <tr key={u.id}>
                                            <td>{u.name}</td>
                                            <td>{u.email}</td>
                                            <td><Badge variant={u.role === 'PROVIDER' ? 'primary' : 'default'}>{u.role}</Badge></td>
                                            <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                <Button
                                                    variant="danger"
                                                    size="xs"
                                                    onClick={() => handleDeleteUser(u.id)}
                                                    disabled={u.email === user.email || processingId === u.id}
                                                >
                                                    Delete
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

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
            </main>
        </div>
    );
};

export default AdminDashboard;
