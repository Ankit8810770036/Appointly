import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { Eye, EyeOff } from 'lucide-react';
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
 * @param {boolean} showPasswordToggle
 */
const Input = forwardRef(({
    label,
    type = 'text',
    placeholder,
    error,
    hint,
    leftIcon,
    rightIcon,
    disabled = false,
    showPasswordToggle = false,
    id,
    className = '',
    ...props
}, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const internalInputRef = useRef(null);

    useImperativeHandle(ref, () => internalInputRef.current);

    const isPasswordType = type === 'password';
    const inputType = isPasswordType && showPasswordToggle && showPassword ? 'text' : type;

    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    const handleTogglePassword = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const inputEl = internalInputRef.current;
        setShowPassword((prev) => !prev);

        // Keep focus and position the cursor at the end of the written text
        setTimeout(() => {
            if (inputEl) {
                inputEl.focus();
                const len = inputEl.value ? inputEl.value.length : 0;
                try {
                    inputEl.setSelectionRange(len, len);
                } catch {
                    // Ignore for unsupported input types
                }
            }
        }, 0);
    };

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
                    ref={internalInputRef}
                    id={inputId}
                    type={inputType}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`input-field ${leftIcon ? 'input-field--has-left-icon' : ''} ${rightIcon || (isPasswordType && showPasswordToggle) ? 'input-field--has-right-icon' : ''}`}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
                    {...props}
                />
                {isPasswordType && showPasswordToggle ? (
                    <button
                        type="button"
                        className="input-icon input-icon--right input-password-toggle"
                        onMouseDown={(e) => e.preventDefault()} // Prevent input blur on click
                        onClick={handleTogglePassword}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                ) : (
                    rightIcon && (
                        <span className="input-icon input-icon--right" aria-hidden="true">
                            {rightIcon}
                        </span>
                    )
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
});

Input.displayName = 'Input';

export default Input;
