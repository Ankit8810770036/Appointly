import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home, Copy, Check, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import './ErrorBoundary.css';

/**
 * Robust React Error Boundary with graceful recovery,
 * diagnostic reporting, and contextual fallback rendering.
 */
export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            showDetails: false,
            copied: false
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        console.error('[ErrorBoundary caught an unhandled runtime error]:', error, errorInfo);

        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            showDetails: false
        });

        if (this.props.onReset) {
            this.props.onReset();
        }
    };

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    handleCopyReport = () => {
        const { error, errorInfo } = this.state;
        const report = [
            `Appointly Error Report - ${new Date().toISOString()}`,
            `URL: ${window.location.href}`,
            `User Agent: ${navigator.userAgent}`,
            `Section: ${this.props.sectionName || 'Application Root'}`,
            `Error: ${error?.toString() || 'Unknown error'}`,
            `Stack: ${error?.stack || 'No stack trace'}`,
            `Component Stack: ${errorInfo?.componentStack || 'No component stack'}`
        ].join('\n\n');

        navigator.clipboard.writeText(report).then(() => {
            this.setState({ copied: true });
            setTimeout(() => this.setState({ copied: false }), 2500);
        }).catch(() => {});
    };

    render() {
        if (this.state.hasError) {
            // If custom fallback provided, render that
            if (this.props.fallback) {
                return typeof this.props.fallback === 'function'
                    ? this.props.fallback({ error: this.state.error, reset: this.handleReset })
                    : this.props.fallback;
            }

            const { error, errorInfo, showDetails, copied } = this.state;
            const { sectionName, isRoot = false } = this.props;

            return (
                <div className={`error-boundary-wrapper ${isRoot ? 'error-boundary-wrapper--root' : ''}`}>
                    <div className="error-boundary-card animate-fade-in">
                        {/* Header Glow Icon */}
                        <div className="error-boundary-icon-box">
                            <AlertTriangle size={32} className="error-boundary-icon" />
                        </div>

                        {/* Title & Context */}
                        <div className="error-boundary-header">
                            <h2 className="error-boundary-title">
                                {sectionName ? `${sectionName} Encountered a Problem` : 'Something Went Wrong'}
                            </h2>
                            <p className="error-boundary-subtitle">
                                Don't worry — your appointment data and session are completely safe. An unexpected component error was caught and isolated.
                            </p>
                        </div>

                        {/* Security Assurance Pill */}
                        <div className="error-boundary-assurance">
                            <ShieldCheck size={16} />
                            <span>Your session and credentials remain securely preserved</span>
                        </div>

                        {/* Primary Recovery Actions */}
                        <div className="error-boundary-actions">
                            <button
                                type="button"
                                className="eb-btn eb-btn--primary"
                                onClick={this.handleReset}
                            >
                                <RefreshCw size={15} /> Try Again
                            </button>

                            <button
                                type="button"
                                className="eb-btn eb-btn--secondary"
                                onClick={this.handleReload}
                            >
                                Reload Page
                            </button>

                            <button
                                type="button"
                                className="eb-btn eb-btn--ghost"
                                onClick={this.handleGoHome}
                            >
                                <Home size={15} /> Back to Home
                            </button>
                        </div>

                        {/* Technical Diagnostics Toggle */}
                        <div className="error-boundary-details-section">
                            <button
                                type="button"
                                className="eb-details-toggle"
                                onClick={() => this.setState({ showDetails: !showDetails })}
                            >
                                <span>Technical Diagnostics {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
                                <span
                                    className="eb-copy-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        this.handleCopyReport();
                                    }}
                                    title="Copy error report to clipboard"
                                >
                                    {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                                    {copied ? 'Copied Report!' : 'Copy Error Details'}
                                </span>
                            </button>

                            {showDetails && (
                                <div className="eb-details-content animate-fade-in">
                                    <div className="eb-details-label">Error Message:</div>
                                    <pre className="eb-code-block">{error?.toString()}</pre>

                                    {errorInfo?.componentStack && (
                                        <>
                                            <div className="eb-details-label">Component Stack:</div>
                                            <pre className="eb-code-block eb-code-block--stack">
                                                {errorInfo.componentStack}
                                            </pre>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
