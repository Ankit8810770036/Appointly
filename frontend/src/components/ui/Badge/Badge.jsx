import './Badge.css';

/**
 * Badge component
 * @param {('default'|'primary'|'success'|'warning'|'danger'|'info')} variant
 * @param {boolean} dot - show a pulse dot instead of text
 */
const Badge = ({
    children,
    variant = 'default',
    dot = false,
    className = '',
    ...props
}) => {
    return (
        <span
            className={`badge badge--${variant} ${dot ? 'badge--dot' : ''} ${className}`}
            {...props}
        >
            {!dot && children}
        </span>
    );
};

export default Badge;
