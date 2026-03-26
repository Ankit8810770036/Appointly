import './Button.css';

/**
 * Button component
 * @param {('primary'|'secondary'|'outline'|'ghost'|'danger')} variant
 * @param {('sm'|'md'|'lg')} size
 * @param {boolean} loading
 * @param {boolean} disabled
 * @param {React.ReactNode} leftIcon
 * @param {React.ReactNode} rightIcon
 */
const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    leftIcon,
    rightIcon,
    className = '',
    ...props
}) => {
    return (
        <button
            className={`btn btn--${variant} btn--${size} ${loading ? 'btn--loading' : ''} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading && (
                <span className="btn__spinner" aria-hidden="true" />
            )}
            {!loading && leftIcon && (
                <span className="btn__icon btn__icon--left">{leftIcon}</span>
            )}
            <span className="btn__label">{children}</span>
            {!loading && rightIcon && (
                <span className="btn__icon btn__icon--right">{rightIcon}</span>
            )}
        </button>
    );
};

export default Button;
