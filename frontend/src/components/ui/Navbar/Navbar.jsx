import { useState } from 'react';
import './Navbar.css';

/**
 * Navbar component
 * @param {React.ReactNode} logo
 * @param {Array<{label: string, href: string, active?: boolean}>} links
 * @param {React.ReactNode} actions
 * @param {boolean} sticky
 */
const Navbar = ({
    logo,
    links = [],
    actions,
    sticky = true,
    className = '',
}) => {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <header className={`navbar ${sticky ? 'navbar--sticky' : ''} ${className}`} role="banner">
            <div className="navbar__inner">
                {/* Logo */}
                <div className="navbar__logo">
                    {logo}
                </div>

                {/* Desktop links */}
                <nav className="navbar__links" role="navigation" aria-label="Main navigation">
                    {links.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className={`navbar__link ${link.active ? 'navbar__link--active' : ''}`}
                        >
                            {link.label}
                        </a>
                    ))}
                </nav>

                {/* Actions slot (e.g. login button) */}
                {actions && (
                    <div className="navbar__actions">
                        {actions}
                    </div>
                )}

                {/* Mobile hamburger */}
                <button
                    className={`navbar__hamburger ${mobileOpen ? 'navbar__hamburger--open' : ''}`}
                    onClick={() => setMobileOpen((o) => !o)}
                    aria-expanded={mobileOpen}
                    aria-label="Toggle navigation"
                >
                    <span />
                    <span />
                    <span />
                </button>
            </div>

            {/* Mobile drawer */}
            <div className={`navbar__mobile-menu ${mobileOpen ? 'navbar__mobile-menu--open' : ''}`} aria-hidden={!mobileOpen}>
                <nav>
                    {links.map((link) => (
                        <a
                            key={link.href}
                            href={link.href}
                            className={`navbar__mobile-link ${link.active ? 'navbar__mobile-link--active' : ''}`}
                            onClick={() => setMobileOpen(false)}
                        >
                            {link.label}
                        </a>
                    ))}
                </nav>
                {actions && <div className="navbar__mobile-actions">{actions}</div>}
            </div>
        </header>
    );
};

export default Navbar;
