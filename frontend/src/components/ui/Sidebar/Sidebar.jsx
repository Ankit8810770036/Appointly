import React from 'react';
import { Link } from 'react-router-dom';
import {
    Sparkles, LayoutDashboard, Calendar, MessageSquare,
    Star, Briefcase, Clock, CreditCard, Settings,
    User, PlayCircle, LogOut, Home, Heart, Search,
    CheckCircle, UserRound
} from 'lucide-react';
import './Sidebar.css';

const ICON_MAP = {
    Sparkles, LayoutDashboard, Calendar, MessageSquare,
    Star, Briefcase, Clock, CreditCard, Settings,
    User, PlayCircle, LogOut, Home, Heart, Search,
    CheckCircle, UserRound
};

/**
 * Premium Sidebar Component
 * @param {Object} props
 * @param {Object} props.user - { name, email, avatar }
 * @param {Array} props.navItems - [ { id, icon, label, badgeCount } ]
 * @param {string} props.activeSection - Current active section ID
 * @param {Function} props.onNav - Navigation handler
 * @param {Array} props.footerItems - [ { id, icon, label, onClick, to, className } ]
 * @param {string} props.logoText - Brand name
 */
const Sidebar = ({
    user,
    navItems = [],
    activeSection,
    onNav,
    footerItems = [],
    logoText = 'Appointly'
}) => {

    const renderIcon = (icon) => {
        if (React.isValidElement(icon)) return icon;
        const IconComponent = ICON_MAP[icon];
        return IconComponent ? <IconComponent size={20} /> : null;
    };

    return (
        <aside className="premium-sidebar">
            <div className="sidebar-glass-glow"></div>

            {/* Branding */}
            <div className="sidebar-brand">
                <Link to="/" className="sidebar-logo">
                    <span className="logo-icon"><Sparkles size={22} /></span>
                    <span className="logo-text">{logoText}</span>
                </Link>
            </div>

            {/* User Profile */}
            <div className="sidebar-profile" onClick={() => onNav('settings')}>
                <div className="profile-avatar-wrapper">
                    <div className="avatar-glow"></div>
                    <div className="profile-avatar">
                        {React.isValidElement(user.avatar) ? (
                            user.avatar
                        ) : typeof user.avatar === 'string' && user.avatar.length < 5 ? (
                            <span className="avatar-emoji">{user.avatar}</span>
                        ) : (
                            <div className="avatar-placeholder">
                                {user.name?.charAt(0) || 'U'}
                            </div>
                        )}
                    </div>
                </div>
                <div className="profile-info">
                    <h4 className="profile-name">{user.name}</h4>
                    <p className="profile-email">{user.email}</p>
                </div>
                <div className="profile-action-icon">
                    <Settings size={14} />
                </div>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                <div className="nav-section-label">Main Menu</div>
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
                        onClick={() => onNav(item.id)}
                    >
                        <span className="nav-icon">
                            {renderIcon(item.icon)}
                        </span>
                        <span className="nav-label">{item.label}</span>
                        {item.badgeCount > 0 && (
                            <span className="nav-badge">{item.badgeCount}</span>
                        )}
                        {activeSection === item.id && <div className="active-pill"></div>}
                    </button>
                ))}
            </nav>

            {/* Footer Actions */}
            <div className="sidebar-footer">
                <div className="nav-section-label">System</div>
                {footerItems.map((item) => (
                    item.to ? (
                        <Link
                            key={item.id || item.label}
                            to={item.to}
                            className={`nav-item footer-item ${item.className || ''}`}
                        >
                            <span className="nav-icon">{renderIcon(item.icon)}</span>
                            <span className="nav-label">{item.label}</span>
                        </Link>
                    ) : (
                        <button
                            key={item.id || item.label}
                            type="button"
                            className={`nav-item footer-item ${item.className || ''}`}
                            onClick={item.onClick}
                        >
                            <span className="nav-icon">{renderIcon(item.icon)}</span>
                            <span className="nav-label">{item.label}</span>
                        </button>
                    )
                ))}
            </div>
        </aside>
    );
};

export default Sidebar;
