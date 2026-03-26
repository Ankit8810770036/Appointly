import './Input.css';

/**
 * Input component
 * @param {string} label
 * @param {string} type
 * @param {string} placeholder
 * @param {string} error
 * @param {string} hint
 * @param {React.ReactNode} leftIcon
 * @param {React.ReactNode} rightIcon
 * @param {boolean} disabled
 */
const Input = ({
    label,
    type = 'text',
    placeholder,
    error,
    hint,
    leftIcon,
    rightIcon,
    disabled = false,
    id,
    className = '',
    ...props
}) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
        <div className={`input-group ${error ? 'input-group--error' : ''} ${disabled ? 'input-group--disabled' : ''} ${className}`}>
            {label && (
                <label className="input-label" htmlFor={inputId}>
                    {label}
                </label>
            )}
            <div className="input-wrapper">
                {leftIcon && (
                    <span className="input-icon input-icon--left" aria-hidden="true">
                        {leftIcon}
                    </span>
                )}
                <input
                    id={inputId}
                    type={type}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`input-field ${leftIcon ? 'input-field--has-left-icon' : ''} ${rightIcon ? 'input-field--has-right-icon' : ''}`}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
                    {...props}
                />
                {rightIcon && (
                    <span className="input-icon input-icon--right" aria-hidden="true">
                        {rightIcon}
                    </span>
                )}
            </div>
            {error && (
                <p id={`${inputId}-error`} className="input-message input-message--error" role="alert">
                    {error}
                </p>
            )}
            {!error && hint && (
                <p id={`${inputId}-hint`} className="input-message input-message--hint">
                    {hint}
                </p>
            )}
        </div>
    );
};

export default Input;
